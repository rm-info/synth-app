import { useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react'
import { pointsToPeriodicWave } from '../audio'
import FreqInput from './FreqInput'
import { PianoKeyboard, OctaveSelector, NOTE_NAMES } from './PianoKeyboard'
import { KEY_CODE_TO_NOTE_INDEX } from '../lib/keyboardMap'
import './WaveformEditor.css'

const POINTS_RESOLUTION = 600

function noteToFrequency(noteIndex, octave) {
  const midi = (octave + 1) * 12 + noteIndex
  return 440 * Math.pow(2, (midi - 69) / 12)
}


const FREQ_MIN = 16
const FREQ_MAX = 32768
const FREQ_MIN_LOG = Math.log(FREQ_MIN)
const FREQ_MAX_LOG = Math.log(FREQ_MAX)

function sliderToFreq(v) {
  return Math.exp(FREQ_MIN_LOG + v * (FREQ_MAX_LOG - FREQ_MIN_LOG))
}
function freqToSlider(hz) {
  const clamped = Math.max(FREQ_MIN, Math.min(FREQ_MAX, hz))
  return (Math.log(clamped) - FREQ_MIN_LOG) / (FREQ_MAX_LOG - FREQ_MIN_LOG)
}
function formatFreq(hz) {
  const r = Math.round(hz * 10) / 10
  if (Number.isInteger(r)) return `${r} Hz`
  return `${r.toFixed(1)} Hz`
}

const ADSR_W = 400
const ADSR_H = 120
const ADSR_MAX_MS = 500
const ADSR_SEGMENT_PX = 80
const ADSR_SUSTAIN_PX = ADSR_W * 0.4
const ADSR_PEAK_Y = ADSR_H * 0.05
const ADSR_HIT_RADIUS = 10
const ADSR_HANDLE_RADIUS = 4

function stripSuffix(name) {
  let s = name
  for (;;) {
    const m = s.match(/^(.*?)\s*\(\d+\)$/)
    if (!m) return s
    s = m[1]
  }
}

function nextAvailableName(rawBase, existingPatches) {
  const base = stripSuffix(rawBase)
  const taken = new Set(existingPatches.map((p) => p.name))
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base} (${i})`)) i++
  return `${base} (${i})`
}

function blankPointsArray() {
  return new Array(POINTS_RESOLUTION).fill(0)
}

function generatePresetPoints(type) {
  const pts = new Array(POINTS_RESOLUTION).fill(0)
  for (let i = 0; i < POINTS_RESOLUTION; i++) {
    const t = i / POINTS_RESOLUTION
    switch (type) {
      case 'sine': pts[i] = Math.sin(2 * Math.PI * t); break
      case 'square': pts[i] = t < 0.5 ? 1 : -1; break
      case 'sawtooth': pts[i] = 2 * t - 1; break
      case 'triangle': pts[i] = t < 0.5 ? 4 * t - 1 : 3 - 4 * t; break
    }
  }
  return pts
}

// Dirty check : on compare uniquement les champs stockés sur le Patch
// (points + ADSR + amplitude + preset). Les champs test* sont volatils et
// ne participent pas au dirty (ils n'affectent pas le patch sauvegardé).
function patchFieldsEqual(a, b) {
  if (!a || !b) return false
  if (a.amplitude !== b.amplitude) return false
  if (a.preset !== b.preset) return false
  if (a.attack !== b.attack) return false
  if (a.decay !== b.decay) return false
  if (a.sustain !== b.sustain) return false
  if (a.release !== b.release) return false
  if (a.points.length !== b.points.length) return false
  for (let i = 0; i < a.points.length; i++) {
    if (a.points[i] !== b.points[i]) return false
  }
  return true
}

function snapshotPatchFields(editor) {
  return {
    points: Array.from(editor.points),
    amplitude: editor.amplitude,
    preset: editor.preset,
    attack: editor.attack,
    decay: editor.decay,
    sustain: editor.sustain,
    release: editor.release,
  }
}

function patchToReference(patch) {
  return {
    points: Array.from(patch.points),
    amplitude: patch.amplitude,
    preset: patch.preset,
    attack: patch.attack,
    decay: patch.decay,
    sustain: patch.sustain,
    release: patch.release,
  }
}

/**
 * WaveformEditor — éditeur de patch.
 *
 * Depuis itération E : un patch ne porte plus de fréquence ni de note. Le
 * clavier + sélecteur d'octave + slider fréquence ne pilotent que la preview
 * (test* fields du state editor). Au drop d'un patch sur la timeline, la
 * note courante du clavier devient celle du clip créé.
 */
function WaveformEditor({
  editor,
  editorActions,
  activeTab,
  onSavePatch,
  onUpdatePatch,
  onRequestNew,
  nextPatchName,
  currentPatch,
  patches,
  onPatchCreated,
  spectrogramVisible,
  onToggleSpectrogram,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  ref,
  children,
}) {
  const [draftPoints, setDraftPoints] = useState(null)
  const [draftAdsr, setDraftAdsr] = useState(null)
  const [draftAmp, setDraftAmp] = useState(null)
  const [draftFreq, setDraftFreq] = useState(null)

  const points = draftPoints ?? editor.points
  const amplitude = draftAmp ?? editor.amplitude
  const testFrequency = draftFreq ?? editor.testFrequency
  const attack = draftAdsr?.attack ?? editor.attack
  const decay = draftAdsr?.decay ?? editor.decay
  const sustain = draftAdsr?.sustain ?? editor.sustain
  const release = draftAdsr?.release ?? editor.release

  const { testTuningSystem, testNoteIndex, testOctave, preset: activePreset } = editor
  const freeMode = testTuningSystem === 'free'

  const frequency = freeMode ? testFrequency : noteToFrequency(testNoteIndex, testOctave)
  const defaultName = nextPatchName

  const canvasRef = useRef(null)
  const canvasContainerRef = useRef(null)
  const adsrCanvasRef = useRef(null)
  const adsrContainerRef = useRef(null)
  const audioCtxRef = useRef(null)

  // Instrument (E.3) : une voix par note jouée, indexée par noteIndex. Un
  // second appui sur la même touche (retrigger) coupe la voix existante
  // avant d'en démarrer une nouvelle. Le octave est mémorisé sur chaque voix
  // pour que le release utilise la bonne fréquence si testOctave a bougé.
  const activeNotesMapRef = useRef(new Map()) // Map<idx, { osc, gain, octave }>
  const [activeNoteIndices, setActiveNoteIndices] = useState(() => new Set())

  // Pédale de sustain (Espace) : pendant qu'elle est active, les releases
  // sont différés dans `sustainedNotesRef`. Au relâchement de la pédale,
  // toutes ces notes entrent en release simultanément.
  const sustainActiveRef = useRef(false)
  const sustainedNotesRef = useRef(new Set())
  const [sustainActive, setSustainActive] = useState(false)

  const [isDrawing, setIsDrawing] = useState(false)
  const [draggingHandle, setDraggingHandle] = useState(null)
  const [saveMessage, setSaveMessage] = useState('')
  const saveMsgTimerRef = useRef(null)

  // Refs miroir des valeurs courantes pour les handlers audio (évite les
  // closures périmées dans les listeners window/clavier).
  const instrumentParamsRef = useRef(null)
  instrumentParamsRef.current = {
    attack, decay, sustain, release, amplitude,
    testOctave, testTuningSystem, testFrequency,
  }

  const referenceRef = useRef(snapshotPatchFields(editor))
  const referencedPatchIdRef = useRef(null)

  useEffect(() => {
    const incomingId = currentPatch?.id ?? null
    if (incomingId === referencedPatchIdRef.current) return
    referencedPatchIdRef.current = incomingId
    referenceRef.current = currentPatch
      ? patchToReference(currentPatch)
      : { ...snapshotPatchFields(editor), points: Array.from(blankPointsArray()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatch])

  const stateSnapshotRef = useRef(null)
  stateSnapshotRef.current = {
    points, amplitude, preset: activePreset, attack, decay, sustain, release,
  }

  useImperativeHandle(ref, () => ({
    isDirty: () => {
      if (!stateSnapshotRef.current) return false
      return !patchFieldsEqual(stateSnapshotRef.current, referenceRef.current)
    },
  }), [])

  const pointsRef = useRef(points)
  useEffect(() => { pointsRef.current = points }, [points])

  const drawCanvas = useCallback((pts) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return
    const ctx = canvas.getContext('2d')
    const midY = H / 2

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = '#2a2a4a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, midY)
    ctx.lineTo(W, midY)
    ctx.stroke()

    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, midY - H / 4)
    ctx.lineTo(W, midY - H / 4)
    ctx.moveTo(0, midY + H / 4)
    ctx.lineTo(W, midY + H / 4)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x < W; x++) {
      const ptFloat = (x / W) * POINTS_RESOLUTION
      const ptIdx = Math.min(Math.floor(ptFloat), POINTS_RESOLUTION - 1)
      const y = midY - pts[ptIdx] * (H / 2)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)'
    ctx.lineWidth = 6
    ctx.beginPath()
    for (let x = 0; x < W; x++) {
      const ptFloat = (x / W) * POINTS_RESOLUTION
      const ptIdx = Math.min(Math.floor(ptFloat), POINTS_RESOLUTION - 1)
      const y = midY - pts[ptIdx] * (H / 2)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [])

  useEffect(() => {
    drawCanvas(points)
  }, [points, drawCanvas])

  useEffect(() => {
    const container = canvasContainerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        const h = Math.floor(entry.contentRect.height)
        if (!w || !h) continue
        if (w !== canvas.width || h !== canvas.height) {
          canvas.width = w
          canvas.height = h
          drawCanvas(pointsRef.current)
        }
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [drawCanvas])

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const xPct = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
    const yPct = (e.clientY - rect.top) / rect.height
    const normalized = -(yPct * 2 - 1)
    const x = Math.floor(xPct * POINTS_RESOLUTION)
    return {
      x: Math.max(0, Math.min(POINTS_RESOLUTION - 1, x)),
      value: Math.max(-1, Math.min(1, normalized)),
    }
  }

  const lastPointRef = useRef(null)

  const handleMouseDown = (e) => {
    setIsDrawing(true)
    const pt = getCanvasPoint(e)
    lastPointRef.current = pt
    const next = Array.from(points)
    next[pt.x] = pt.value
    setDraftPoints(next)
  }

  const handleMouseMove = (e) => {
    if (!isDrawing) return
    const pt = getCanvasPoint(e)
    const last = lastPointRef.current
    if (last) {
      const next = Array.from(draftPoints ?? points)
      const dx = pt.x - last.x
      const steps = Math.max(Math.abs(dx), 1)
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = Math.round(last.x + dx * t)
        const v = last.value + (pt.value - last.value) * t
        if (x >= 0 && x < POINTS_RESOLUTION) next[x] = v
      }
      setDraftPoints(next)
    }
    lastPointRef.current = pt
  }

  const commitDraftPoints = () => {
    if (draftPoints) {
      const same = draftPoints.length === editor.points.length &&
        draftPoints.every((v, i) => v === editor.points[i])
      if (!same) editorActions.setPoints(draftPoints)
      setDraftPoints(null)
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    lastPointRef.current = null
    commitDraftPoints()
  }

  const handleMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false)
      lastPointRef.current = null
      commitDraftPoints()
    }
  }

  // --- Instrument live (E.3) : play at mousedown, release at mouseup ---

  const ensureAudioCtx = () => {
    const ctx = audioCtxRef.current || new AudioContext()
    audioCtxRef.current = ctx
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  const playInstrumentNote = (idx) => {
    const params = instrumentParamsRef.current
    // Mode libre : on ne joue pas via le clavier (édition via slider Hz).
    if (params.testTuningSystem === 'free') return

    // Retrigger : si une voix existe déjà pour cette idx (sustainée ou non),
    // on la coupe net avant de démarrer la nouvelle.
    if (activeNotesMapRef.current.has(idx)) {
      const existing = activeNotesMapRef.current.get(idx)
      try { existing.osc.stop() } catch { /* already */ }
      try { existing.osc.disconnect() } catch { /* already */ }
      try { existing.gain.disconnect() } catch { /* already */ }
      activeNotesMapRef.current.delete(idx)
      sustainedNotesRef.current.delete(idx)
    }

    const ctx = ensureAudioCtx()
    const oct = params.testOctave
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.setPeriodicWave(pointsToPeriodicWave(pointsRef.current, ctx))

    const freq = noteToFrequency(idx, oct)
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(freq, now)

    const a = params.attack / 1000
    const d = params.decay / 1000
    const sustainLevel = params.sustain * params.amplitude

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(params.amplitude, now + a)
    gain.gain.linearRampToValueAtTime(sustainLevel, now + a + d)
    // Sustain hold indéfini jusqu'au release.

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)

    activeNotesMapRef.current.set(idx, { osc, gain, octave: oct })
    setActiveNoteIndices(new Set(activeNotesMapRef.current.keys()))
  }

  // Exécute le release réel (rampe ADSR) — contournable par le sustain.
  const performRelease = (idx) => {
    const node = activeNotesMapRef.current.get(idx)
    if (!node) return
    const ctx = audioCtxRef.current
    if (!ctx) return
    const params = instrumentParamsRef.current
    const now = ctx.currentTime
    const r = params.release / 1000
    // Capture la valeur courante AVANT cancelScheduledValues : l'annulation
    // fait retomber le param sur le dernier setValueAtTime antérieur à now
    // (ici 0, posé au start), donc lire .value après le cancel renverrait 0.
    const currentGain = node.gain.gain.value
    node.gain.gain.cancelScheduledValues(now)
    node.gain.gain.setValueAtTime(currentGain, now)
    node.gain.gain.linearRampToValueAtTime(0, now + r)
    // Marge pour garantir que l'osc ne soit pas coupé avant la fin de la rampe.
    try { node.osc.stop(now + r + 0.02) } catch { /* already stopped */ }
    node.osc.onended = () => {
      try { node.osc.disconnect() } catch { /* already */ }
      try { node.gain.disconnect() } catch { /* already */ }
    }
    activeNotesMapRef.current.delete(idx)
    setActiveNoteIndices(new Set(activeNotesMapRef.current.keys()))
  }

  const releaseInstrumentNote = (idx) => {
    // Sustain actif : on diffère le release, la voix continue de sonner.
    if (sustainActiveRef.current) {
      sustainedNotesRef.current.add(idx)
      return
    }
    performRelease(idx)
  }

  // Sustain sur/off. Au off, les notes différées entrent en release ensemble.
  const activateSustain = () => {
    if (sustainActiveRef.current) return
    sustainActiveRef.current = true
    setSustainActive(true)
  }
  const deactivateSustain = () => {
    if (!sustainActiveRef.current) return
    sustainActiveRef.current = false
    setSustainActive(false)
    const toRelease = Array.from(sustainedNotesRef.current)
    sustainedNotesRef.current.clear()
    for (const idx of toRelease) performRelease(idx)
  }

  // Stop toutes les voix (changement de patch, unmount, etc.) sans fade.
  const stopAllInstrumentNotes = () => {
    for (const node of activeNotesMapRef.current.values()) {
      try { node.osc.stop() } catch { /* already stopped */ }
      try { node.osc.disconnect() } catch { /* already */ }
      try { node.gain.disconnect() } catch { /* already */ }
    }
    activeNotesMapRef.current.clear()
    sustainedNotesRef.current.clear()
    sustainActiveRef.current = false
    setActiveNoteIndices(new Set())
    setSustainActive(false)
  }

  useEffect(() => {
    return () => {
      stopAllInstrumentNotes()
    }
  }, [])

  // Stoppe les voix actives quand on change de patch : la forme d'onde et
  // l'ADSR changent, inutile de laisser des notes fantômes avec l'ancien son.
  const currentPatchIdRef = useRef(currentPatch?.id ?? null)
  useEffect(() => {
    const newId = currentPatch?.id ?? null
    if (newId !== currentPatchIdRef.current) {
      currentPatchIdRef.current = newId
      stopAllInstrumentNotes()
    }
  }, [currentPatch])

  // Pont stable entre les listeners clavier (attachés une seule fois par
  // activeTab) et les fonctions instrument qui elles sont recréées à chaque
  // render. Le ref lit les valeurs "fraîches" à la volée.
  const instrumentBridgeRef = useRef(null)
  instrumentBridgeRef.current = {
    play: playInstrumentNote,
    release: releaseInstrumentNote,
    setTestNoteIndex: editorActions.setTestNoteIndex,
    activateSustain,
    deactivateSustain,
  }

  // Raccourcis QWERTY (event.code) pour jouer les notes au clavier physique
  // dans le Designer. Actif uniquement quand l'onglet Designer est visible.
  // Ignore event.repeat (sinon la note se relance en boucle).
  //
  // La gestion Shift/Ctrl pour décaler l'octave est désormais dans App.jsx —
  // elle s'applique aussi au Composer (phase E.4.1).
  useEffect(() => {
    if (activeTab !== 'designer') {
      // En quittant le Designer, on coupe toute voix active pour éviter des
      // notes fantômes qui continueraient pendant le Composer.
      stopAllInstrumentNotes()
      return
    }

    const isFormField = (target) => {
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      return !!target?.isContentEditable
    }

    const onKeyDown = (e) => {
      if (isFormField(e.target)) return

      // Espace : pédale de sustain (maintenue). preventDefault → pas de scroll.
      if (e.code === 'Space') {
        e.preventDefault()
        if (!e.repeat) instrumentBridgeRef.current?.activateSustain()
        return
      }

      if (e.repeat) return
      const idx = KEY_CODE_TO_NOTE_INDEX[e.code]
      if (idx === undefined) return
      e.preventDefault()
      const bridge = instrumentBridgeRef.current
      if (!bridge) return
      bridge.setTestNoteIndex(idx)
      bridge.play(idx)
    }

    const onKeyUp = (e) => {
      if (isFormField(e.target)) return

      if (e.code === 'Space') {
        e.preventDefault()
        instrumentBridgeRef.current?.deactivateSustain()
        return
      }

      const idx = KEY_CODE_TO_NOTE_INDEX[e.code]
      if (idx === undefined) return
      const bridge = instrumentBridgeRef.current
      if (!bridge) return
      bridge.release(idx)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [activeTab])

  const clearCanvas = () => {
    editorActions.setPoints(blankPointsArray())
  }

  const loadPreset = (type) => {
    const pts = generatePresetPoints(type)
    editorActions.applyPreset(type, pts)
  }

  const flashMessage = (msg) => {
    setSaveMessage(msg)
    if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current)
    saveMsgTimerRef.current = setTimeout(() => setSaveMessage(''), 2000)
  }

  useEffect(() => () => {
    if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current)
  }, [])

  const buildPayload = (name) => ({
    name,
    preset: activePreset,
    points: Array.from(points),
    amplitude,
    attack,
    decay,
    sustain,
    release,
  })

  const handleSaveAsNew = () => {
    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      flashMessage('Canvas vide')
      return
    }

    const proposedName = currentPatch
      ? nextAvailableName(`Copie de ${currentPatch.name}`, patches ?? [])
      : defaultName

    const result = onSavePatch(buildPayload(proposedName))
    referenceRef.current = stateSnapshotRef.current
    if (result?.id) {
      referencedPatchIdRef.current = result.id
      onPatchCreated?.(result.id)
    }
    flashMessage(currentPatch ? 'Nouveau patch enregistré' : 'Patch enregistré')
  }

  const handleUpdate = () => {
    if (!currentPatch) return
    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      flashMessage('Canvas vide')
      return
    }
    onUpdatePatch(currentPatch.id, buildPayload(currentPatch.name))
    referenceRef.current = stateSnapshotRef.current
    flashMessage('Patch mis à jour')
  }

  const handleNew = () => {
    const dirty = !patchFieldsEqual(stateSnapshotRef.current, referenceRef.current)
    if (dirty) {
      const ok = window.confirm('Modifications non sauvegardées, continuer ?')
      if (!ok) return
    }
    stopAllInstrumentNotes()
    onRequestNew?.()
  }

  const attackPx = (attack / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const decayPx = (decay / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const releasePx = (release / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const sustainY = (1 - sustain) * ADSR_H

  const p1 = { x: attackPx, y: ADSR_PEAK_Y }
  const p2 = { x: attackPx + decayPx, y: sustainY }
  const p3 = { x: attackPx + decayPx + ADSR_SUSTAIN_PX, y: sustainY }
  const p4 = { x: attackPx + decayPx + ADSR_SUSTAIN_PX + releasePx, y: ADSR_H }

  const drawAdsr = useCallback(() => {
    const canvas = adsrCanvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return
    const ctx = canvas.getContext('2d')
    ctx.setTransform(W / ADSR_W, 0, 0, H / ADSR_H, 0, 0)

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, ADSR_W, ADSR_H)

    ctx.strokeStyle = '#2a2a4a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H - 0.5)
    ctx.lineTo(ADSR_W, ADSR_H - 0.5)
    ctx.stroke()

    ctx.fillStyle = 'rgba(0, 212, 255, 0.12)'
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H)
    ctx.lineTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.lineTo(p4.x, p4.y)
    ctx.lineTo(p4.x, ADSR_H)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H)
    ctx.lineTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.lineTo(p4.x, p4.y)
    ctx.stroke()

    const handles = [p1, p2, p3, p4]
    for (const h of handles) {
      ctx.beginPath()
      ctx.arc(h.x, h.y, ADSR_HANDLE_RADIUS, 0, 2 * Math.PI)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#00d4ff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }, [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y])

  useEffect(() => {
    drawAdsr()
  }, [drawAdsr])

  useEffect(() => {
    const container = adsrContainerRef.current
    const canvas = adsrCanvasRef.current
    if (!container || !canvas || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        const h = Math.floor(entry.contentRect.height)
        if (!w || !h) continue
        if (w !== canvas.width || h !== canvas.height) {
          canvas.width = w
          canvas.height = h
          drawAdsr()
        }
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [drawAdsr])

  const getAdsrPos = (e) => {
    const canvas = adsrCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * ADSR_W,
      y: ((e.clientY - rect.top) / rect.height) * ADSR_H,
    }
  }

  const pxToMs = (px) => Math.round((px / ADSR_SEGMENT_PX) * ADSR_MAX_MS)

  const applyHandleDrag = (handleIdx, pos) => {
    setDraftAdsr((prev) => {
      const next = { ...(prev ?? {}) }
      if (handleIdx === 1) {
        const newAttackPx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x))
        next.attack = pxToMs(newAttackPx)
      } else if (handleIdx === 2) {
        const baseAtk = next.attack ?? attack
        const baseAtkPx = (baseAtk / ADSR_MAX_MS) * ADSR_SEGMENT_PX
        const newDecayPx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x - baseAtkPx))
        next.decay = pxToMs(newDecayPx)
        const newSustain = Math.max(0, Math.min(1, 1 - pos.y / ADSR_H))
        next.sustain = Math.round(newSustain * 100) / 100
      } else if (handleIdx === 4) {
        const baseAtk = next.attack ?? attack
        const baseDec = next.decay ?? decay
        const base = ((baseAtk + baseDec) / ADSR_MAX_MS) * ADSR_SEGMENT_PX + ADSR_SUSTAIN_PX
        const newReleasePx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x - base))
        next.release = pxToMs(newReleasePx)
      }
      return next
    })
  }

  const handleAdsrMouseDown = (e) => {
    const pos = getAdsrPos(e)
    const candidates = [
      { idx: 1, point: p1 },
      { idx: 2, point: p2 },
      { idx: 4, point: p4 },
    ]
    let picked = null
    let minDist = ADSR_HIT_RADIUS
    for (const c of candidates) {
      const dx = pos.x - c.point.x
      const dy = pos.y - c.point.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) {
        minDist = dist
        picked = c.idx
      }
    }
    if (picked !== null) {
      setDraggingHandle(picked)
      applyHandleDrag(picked, pos)
    }
  }

  const handleAdsrMouseMove = (e) => {
    if (!draggingHandle) return
    applyHandleDrag(draggingHandle, getAdsrPos(e))
  }

  const commitDraftAdsr = () => {
    if (draftAdsr && Object.keys(draftAdsr).length > 0) {
      const patch = {}
      for (const k of Object.keys(draftAdsr)) {
        if (draftAdsr[k] !== editor[k]) patch[k] = draftAdsr[k]
      }
      if (Object.keys(patch).length > 0) editorActions.setAdsr(patch)
      setDraftAdsr(null)
    }
  }

  const endAdsrDrag = () => {
    if (draggingHandle !== null) {
      setDraggingHandle(null)
      commitDraftAdsr()
    }
  }

  const sliderCommitter = (commit) => ({
    onPointerUp: commit,
    onMouseUp: commit,
    onTouchEnd: commit,
    onKeyUp: commit,
    onBlur: commit,
  })

  const commitDraftAmp = () => {
    if (draftAmp != null) {
      if (draftAmp !== editor.amplitude) editorActions.setAmplitude(draftAmp)
      setDraftAmp(null)
    }
  }
  const commitDraftFreq = () => {
    if (draftFreq != null) {
      if (draftFreq !== editor.testFrequency) editorActions.setTestFrequency(draftFreq)
      setDraftFreq(null)
    }
  }
  const commitDraftAdsrSlider = () => {
    commitDraftAdsr()
  }

  const renderCanvasArea = () => (
    <div className="we-canvas-area">
      <header className="we-area-header">
        <div className="we-header-left">
          <h3 className="we-area-title">Waveform</h3>
          <span className="we-sound-tag">
            {currentPatch ? `Édition : ${currentPatch.name}` : defaultName}
          </span>
        </div>
        <div className="we-header-right">
          {(onUndo || onRedo) && (
            <div className="we-history">
              <button
                type="button"
                className="we-history-btn"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Annuler"
                title="Annuler (Ctrl+Z)"
              >⟲</button>
              <button
                type="button"
                className="we-history-btn"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="Rétablir"
                title="Rétablir (Ctrl+Shift+Z)"
              >⟳</button>
            </div>
          )}
          {onToggleSpectrogram && (
            <label className="spectro-toggle" title="Afficher le spectrogramme à côté">
              <input
                type="checkbox"
                checked={!!spectrogramVisible}
                onChange={(e) => onToggleSpectrogram(e.target.checked)}
              />
              <span>Spectro</span>
            </label>
          )}
        </div>
      </header>
      <div className="presets">
        <button onClick={() => loadPreset('sine')}>Sine</button>
        <button onClick={() => loadPreset('square')}>Square</button>
        <button onClick={() => loadPreset('sawtooth')}>Sawtooth</button>
        <button onClick={() => loadPreset('triangle')}>Triangle</button>
        <button onClick={clearCanvas}>Clear</button>
      </div>
      <div className="canvas-container" ref={canvasContainerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        <span className="label top">+1</span>
        <span className="label middle">0</span>
        <span className="label bottom">-1</span>
      </div>
    </div>
  )

  const renderParamsArea = () => (
    <div className="we-params-area">
      <header className="we-area-header">
        <h3 className="we-area-title">Paramètres</h3>
      </header>

      <div className="we-params-fields">
        <div className="control-group">
          <label className="system-label" htmlFor="tuning-system">Système de test</label>
          <select
            id="tuning-system"
            className="tuning-system-select"
            value={testTuningSystem}
            onChange={(e) => editorActions.setTestTuningSystem(e.target.value)}
          >
            <option value="12-TET">12-TET (Tempérament égal occidental)</option>
            <option value="free">Libre (Hz)</option>
          </select>
        </div>

        <div className="control-group">
          {freeMode ? (
            <>
              <div className="freq-label">
                Fréquence libre :{' '}
                <FreqInput
                  value={testFrequency}
                  onChange={editorActions.setTestFrequency}
                  min={FREQ_MIN}
                  max={FREQ_MAX}
                  className="freq-input"
                />
                <span className="freq-unit"> Hz</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={freqToSlider(testFrequency)}
                onChange={(e) => {
                  const hz = sliderToFreq(Number(e.target.value))
                  setDraftFreq(Math.round(hz * 10) / 10)
                }}
                {...sliderCommitter(commitDraftFreq)}
              />
            </>
          ) : (
            <>
              <PianoKeyboard
                noteIndex={testNoteIndex}
                activeNotes={activeNoteIndices}
                onSelectNote={editorActions.setTestNoteIndex}
                onKeyPress={playInstrumentNote}
                onKeyRelease={releaseInstrumentNote}
              />
              <OctaveSelector
                octave={testOctave}
                onSelectOctave={editorActions.setTestOctave}
              />
              <div className="freq-label">
                Note : <strong>{formatFreq(frequency)}</strong>
                <span className="note-display">
                  {' '}— {NOTE_NAMES[testNoteIndex]}{testOctave}
                </span>
                {sustainActive && (
                  <span className="sustain-badge" title="Sustain actif (Espace)">
                    SUSTAIN
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="control-group">
          <label>
            Amplitude: <strong>{Math.round(amplitude * 100)}%</strong>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={amplitude}
            onChange={(e) => setDraftAmp(Number(e.target.value))}
            {...sliderCommitter(commitDraftAmp)}
          />
        </div>
      </div>

      <div className="we-params-spacer" />

      <div className="control-buttons">
        <button type="button" className="new-btn" onClick={handleNew} title="Nouveau patch (réinitialise l'éditeur)">
          Nouveau
        </button>
        {currentPatch && (
          <button className="update-btn" onClick={handleUpdate}>
            Mettre à jour
          </button>
        )}
        <button className="save-btn" onClick={handleSaveAsNew}>
          {currentPatch ? 'Enregistrer comme nouveau' : 'Sauvegarder le patch'}
        </button>
      </div>

      <div className="save-message-slot">
        {saveMessage && <span className="save-message">{saveMessage}</span>}
      </div>
    </div>
  )

  const renderAdsrArea = () => {
    const renderSlider = (key, label, max, step, format) => (
      <div className="adsr-slider">
        <label htmlFor={`adsr-${key}`}>
          {label} <strong>{format(editor[key], { attack, decay, sustain, release }[key])}</strong>
        </label>
        <input
          id={`adsr-${key}`}
          type="range"
          min="0"
          max={max}
          step={step}
          value={{ attack, decay, sustain, release }[key]}
          onChange={(e) => {
            const val = Number(e.target.value)
            setDraftAdsr((prev) => ({ ...(prev ?? {}), [key]: val }))
          }}
          {...sliderCommitter(commitDraftAdsrSlider)}
        />
      </div>
    )

    return (
      <div className="we-adsr-area">
        <header className="we-area-header">
          <h3 className="we-area-title">Enveloppe ADSR</h3>
        </header>
        <div className="adsr-canvas-container" ref={adsrContainerRef}>
          <canvas
            ref={adsrCanvasRef}
            className="adsr-canvas"
            onMouseDown={handleAdsrMouseDown}
            onMouseMove={handleAdsrMouseMove}
            onMouseUp={endAdsrDrag}
            onMouseLeave={endAdsrDrag}
          />
        </div>
        <div className="adsr-sliders">
          {renderSlider('attack', 'Attack', 500, 1, (_, v) => `${v} ms`)}
          {renderSlider('decay', 'Decay', 500, 1, (_, v) => `${v} ms`)}
          {renderSlider('sustain', 'Sustain', 1, 0.01, (_, v) => `${Math.round(v * 100)}%`)}
          {renderSlider('release', 'Release', 500, 1, (_, v) => `${v} ms`)}
        </div>
      </div>
    )
  }

  return children({ renderCanvasArea, renderParamsArea, renderAdsrArea })
}

export default WaveformEditor
