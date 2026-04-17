import { useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react'
import { pointsToPeriodicWave } from '../audio'
import FreqInput from './FreqInput'
import './WaveformEditor.css'

// Résolution logique du tableau de points (indépendante de la taille pixel
// du canvas). Le canvas peut avoir n'importe quelle taille, on échantillonne
// pts à ptIdx = floor((x/W) * POINTS_RESOLUTION) pour chaque colonne.
const POINTS_RESOLUTION = 600

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const OCTAVES = [1, 2, 3, 4, 5, 6, 7]

function noteToFrequency(noteIndex, octave) {
  const midi = (octave + 1) * 12 + noteIndex
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Plage fréquence libre : 20 Hz → 20 kHz (bande audible). Slider linéaire
// 0..1 mappé en log pour rendre les basses accessibles.
const FREQ_MIN = 20
const FREQ_MAX = 20000
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

// ADSR : coordonnées VIRTUELLES (le canvas peut avoir n'importe quelle taille,
// on applique setTransform(W/ADSR_W, H/ADSR_H) avant de dessiner, et toute la
// logique de positions/interactions reste en 400×120).
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

function nextAvailableName(rawBase, existingSounds) {
  const base = stripSuffix(rawBase)
  const taken = new Set(existingSounds.map((s) => s.name))
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

function statesEqual(a, b) {
  if (!a || !b) return false
  if (a.amplitude !== b.amplitude) return false
  if (a.freeMode !== b.freeMode) return false
  if (a.noteIndex !== b.noteIndex) return false
  if (a.octave !== b.octave) return false
  if (a.freeFrequency !== b.freeFrequency) return false
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

function snapshotEditor(editor) {
  return {
    points: Array.from(editor.points),
    freeMode: editor.freeMode,
    noteIndex: editor.noteIndex,
    octave: editor.octave,
    freeFrequency: editor.freeFrequency,
    amplitude: editor.amplitude,
    preset: editor.preset,
    attack: editor.attack,
    decay: editor.decay,
    sustain: editor.sustain,
    release: editor.release,
  }
}

function soundToReference(sound) {
  return {
    points: Array.from(sound.points),
    freeMode: sound.mode === 'free',
    noteIndex: sound.noteIndex ?? 9,
    octave: sound.octave ?? 4,
    freeFrequency: sound.mode === 'free' ? sound.frequency : 440,
    amplitude: sound.amplitude,
    preset: sound.preset,
    attack: sound.attack,
    decay: sound.decay,
    sustain: sound.sustain,
    release: sound.release,
  }
}

/**
 * WaveformEditor — vue de l'éditeur de son.
 *
 * Phase 6.1 : state remonté dans App via reducer. Les valeurs courantes
 * arrivent en prop `editor` ; les mutations passent par `editorActions`
 * (qui dispatchent dans le reducer). Pendant un geste continu (drag du
 * canvas, drag de poignées ADSR, slide d'un range), on garde un draft
 * local pour préserver la fluidité ; le dispatch n'a lieu qu'au mouseup
 * (un seul snapshot dans l'historique).
 *
 * Le composant garde aussi en local : refs audio (oscillateur, gain,
 * AudioContext), refs des canvases, état de lecture (preview), message
 * flash de save, et la « référence de dirty check » (snapshot du state
 * au moment du dernier save / hydrate).
 */
function WaveformEditor({
  editor,
  editorActions,
  onSaveSound,
  onUpdateSound,
  onRequestNew,
  nextSoundName,
  currentSound,
  savedSounds,
  onSoundCreated,
  spectrogramVisible,
  onToggleSpectrogram,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  ref,
  children,
}) {
  // --- Drafts pour les gestes continus ---
  const [draftPoints, setDraftPoints] = useState(null)
  const [draftAdsr, setDraftAdsr] = useState(null) // { attack?, decay?, sustain?, release? }
  const [draftAmp, setDraftAmp] = useState(null)
  const [draftFreq, setDraftFreq] = useState(null)

  // --- Valeurs effectives (props écrasées par draft si actif) ---
  const points = draftPoints ?? editor.points
  const amplitude = draftAmp ?? editor.amplitude
  const freeFrequency = draftFreq ?? editor.freeFrequency
  const attack = draftAdsr?.attack ?? editor.attack
  const decay = draftAdsr?.decay ?? editor.decay
  const sustain = draftAdsr?.sustain ?? editor.sustain
  const release = draftAdsr?.release ?? editor.release

  const { freeMode, noteIndex, octave, preset: activePreset } = editor

  const frequency = freeMode ? freeFrequency : noteToFrequency(noteIndex, octave)
  const defaultName = freeMode ? nextSoundName : `${NOTE_NAMES[noteIndex]}${octave}`

  // --- Refs locales (audio + canvas + dirty) ---
  const canvasRef = useRef(null)
  const canvasContainerRef = useRef(null)
  const adsrCanvasRef = useRef(null)
  const adsrContainerRef = useRef(null)
  const audioCtxRef = useRef(null)
  const oscRef = useRef(null)
  const gainRef = useRef(null)

  const [isDrawing, setIsDrawing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [draggingHandle, setDraggingHandle] = useState(null)
  const [saveMessage, setSaveMessage] = useState('')
  const saveMsgTimerRef = useRef(null)

  const referenceRef = useRef(snapshotEditor(editor))
  const referencedSoundIdRef = useRef(null)

  // Sync de la référence (dirty check) sur changement de currentSound : on
  // capture l'état attendu pour comparer ensuite l'éditeur en cours.
  useEffect(() => {
    const incomingId = currentSound?.id ?? null
    if (incomingId === referencedSoundIdRef.current) return
    referencedSoundIdRef.current = incomingId
    referenceRef.current = currentSound
      ? soundToReference(currentSound)
      : { ...snapshotEditor(editor), points: Array.from(blankPointsArray()) }
    // Note: on ne s'inscrit PAS sur editor dans les deps, sinon on resyncrhoniserait
    // la référence à chaque modif (et le dirty check ne dirait jamais "dirty").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSound])

  // Snapshot live pour le dirty check (mis à jour à chaque render).
  const stateSnapshotRef = useRef(null)
  stateSnapshotRef.current = {
    points, freeMode, noteIndex, octave, freeFrequency,
    amplitude, preset: activePreset, attack, decay, sustain, release,
  }

  useImperativeHandle(ref, () => ({
    isDirty: () => {
      if (!stateSnapshotRef.current) return false
      return !statesEqual(stateSnapshotRef.current, referenceRef.current)
    },
  }), [])

  // --- Refs miroirs des valeurs courantes pour le moteur audio ---
  const pointsRef = useRef(points)
  useEffect(() => { pointsRef.current = points }, [points])

  // --- Canvas waveform ---
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

  // --- Drawing (canvas) ---
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
      // Skip si rien n'a réellement bougé (drag sans modification = clic statique)
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
    updateOscillator()
  }

  const handleMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false)
      lastPointRef.current = null
      commitDraftPoints()
      updateOscillator()
    }
  }

  // --- Audio (preview / Test) ---
  const updateOscillator = useCallback(() => {
    if (!oscRef.current || !audioCtxRef.current) return
    const wave = pointsToPeriodicWave(pointsRef.current, audioCtxRef.current)
    oscRef.current.setPeriodicWave(wave)
  }, [])

  const togglePlay = () => {
    if (isPlaying) stopAudio()
    else startAudio()
  }

  const startAudio = () => {
    const ctx = audioCtxRef.current || new AudioContext()
    audioCtxRef.current = ctx
    if (ctx.state === 'suspended') ctx.resume()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const wave = pointsToPeriodicWave(pointsRef.current, ctx)
    osc.setPeriodicWave(wave)
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(frequency, now)

    const a = attack / 1000
    const d = decay / 1000
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(amplitude, now + a)
    gain.gain.linearRampToValueAtTime(sustain * amplitude, now + a + d)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()

    oscRef.current = osc
    gainRef.current = gain
    setIsPlaying(true)
  }

  const stopAudio = () => {
    const ctx = audioCtxRef.current
    const osc = oscRef.current
    const gain = gainRef.current
    if (osc && gain && ctx) {
      const now = ctx.currentTime
      const r = release / 1000
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + r)
      osc.stop(now + r)
      osc.onended = () => {
        try { osc.disconnect() } catch { /* already */ }
        try { gain.disconnect() } catch { /* already */ }
      }
    }
    oscRef.current = null
    gainRef.current = null
    setIsPlaying(false)
  }

  useEffect(() => {
    if (oscRef.current && audioCtxRef.current) {
      oscRef.current.frequency.setValueAtTime(frequency, audioCtxRef.current.currentTime)
    }
  }, [frequency])

  useEffect(() => {
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setValueAtTime(amplitude, audioCtxRef.current.currentTime)
    }
  }, [amplitude])

  useEffect(() => {
    return () => {
      if (oscRef.current) { oscRef.current.stop(); oscRef.current.disconnect() }
      if (gainRef.current) gainRef.current.disconnect()
    }
  }, [])

  useEffect(() => {
    if (isPlaying && oscRef.current && audioCtxRef.current) {
      const wave = pointsToPeriodicWave(points, audioCtxRef.current)
      oscRef.current.setPeriodicWave(wave)
    }
  }, [points, isPlaying])

  // --- Presets / Clear ---
  const clearCanvas = () => {
    editorActions.setPoints(blankPointsArray())
    if (isPlaying) updateOscillator()
  }

  const loadPreset = (type) => {
    const pts = generatePresetPoints(type)
    editorActions.applyPreset(type, pts)
  }

  // --- Save / Update / New ---
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
    mode: freeMode ? 'free' : 'note',
    noteIndex: freeMode ? null : noteIndex,
    octave: freeMode ? null : octave,
    preset: activePreset,
    points: Array.from(points),
    frequency,
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

    const isExplicitDuplicate = !!currentSound
    let proposedName
    if (isExplicitDuplicate) {
      const base = currentSound.mode === 'note'
        ? currentSound.name
        : `Copie de ${currentSound.name}`
      proposedName = nextAvailableName(base, savedSounds ?? [])
    } else {
      proposedName = defaultName
    }

    const result = onSaveSound(
      buildPayload(proposedName),
      { allowDuplicate: isExplicitDuplicate },
    )
    if (result?.duplicate) {
      flashMessage('Ce son existe déjà')
      return
    }
    referenceRef.current = stateSnapshotRef.current
    if (result?.id) {
      referencedSoundIdRef.current = result.id
      onSoundCreated?.(result.id)
    }
    flashMessage('Nouveau son enregistré')
  }

  const handleUpdate = () => {
    if (!currentSound) return
    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      flashMessage('Canvas vide')
      return
    }
    onUpdateSound(currentSound.id, buildPayload(currentSound.name))
    referenceRef.current = stateSnapshotRef.current
    flashMessage('Son mis à jour')
  }

  const handleNew = () => {
    const dirty = !statesEqual(stateSnapshotRef.current, referenceRef.current)
    if (dirty) {
      const ok = window.confirm('Modifications non sauvegardées, continuer ?')
      if (!ok) return
    }
    if (isPlaying) stopAudio()
    onRequestNew?.()
    // La référence sera resync via l'effet sur currentSound (qui passe à null).
  }

  // --- ADSR canvas ---
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
      // Garder uniquement les clés qui diffèrent du state courant
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

  // --- Helpers de slider draftés ---
  // Pattern : pendant le drag (mouse down) on met à jour un draft local pour
  // garder le rendu fluide ; au mouseup/touchend/keyup le draft est commité.
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
      if (draftFreq !== editor.freeFrequency) editorActions.setFrequency(draftFreq)
      setDraftFreq(null)
    }
  }
  const commitDraftAdsrSlider = () => {
    commitDraftAdsr()
  }

  // --- Render areas (render-prop) ---

  const renderCanvasArea = () => (
    <div className="we-canvas-area">
      <header className="we-area-header">
        <div className="we-header-left">
          <h3 className="we-area-title">Waveform</h3>
          <span className="we-sound-tag">
            {currentSound ? `Édition : ${currentSound.name}` : defaultName}
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
          <div className="freq-header">
            <div className="freq-label">
              {freeMode ? 'Fréquence libre' : 'Note'}:{' '}
              {freeMode ? (
                <>
                  <FreqInput
                    value={freeFrequency}
                    onChange={editorActions.setFrequency}
                    min={FREQ_MIN}
                    max={FREQ_MAX}
                    className="freq-input"
                  />
                  <span className="freq-unit"> Hz</span>
                </>
              ) : (
                <>
                  <strong>{formatFreq(frequency)}</strong>
                  <span className="note-display">
                    {' '}— {NOTE_NAMES[noteIndex]}{octave}
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              className="mode-toggle"
              onClick={editorActions.toggleFreeMode}
              title="Basculer entre note tempérée et fréquence libre"
            >
              {freeMode ? 'Mode note' : 'Mode libre'}
            </button>
          </div>

          {freeMode ? (
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={freqToSlider(freeFrequency)}
              onChange={(e) => {
                const hz = sliderToFreq(Number(e.target.value))
                setDraftFreq(Math.round(hz * 10) / 10)
              }}
              {...sliderCommitter(commitDraftFreq)}
            />
          ) : (
            <div className="note-selectors">
              <select
                value={noteIndex}
                onChange={(e) => editorActions.setNoteIndex(Number(e.target.value))}
                aria-label="Note"
              >
                {NOTE_NAMES.map((n, i) => (
                  <option key={n} value={i}>{n}</option>
                ))}
              </select>
              <select
                value={octave}
                onChange={(e) => editorActions.setOctave(Number(e.target.value))}
                aria-label="Octave"
              >
                {OCTAVES.map((o) => (
                  <option key={o} value={o}>Octave {o}</option>
                ))}
              </select>
            </div>
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
        <button
          type="button"
          className={`test-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          title="Preview du son en cours d'édition"
        >
          {isPlaying ? 'Stop' : 'Test'}
        </button>
        <button type="button" className="new-btn" onClick={handleNew} title="Nouveau son (réinitialise l'éditeur)">
          Nouveau
        </button>
        {currentSound && (
          <button className="update-btn" onClick={handleUpdate}>
            Mettre à jour
          </button>
        )}
        <button className="save-btn" onClick={handleSaveAsNew}>
          {currentSound ? 'Enregistrer comme nouveau' : 'Sauvegarder le son'}
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
