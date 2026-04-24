import { useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react'
import { pointsToPeriodicWave, MIN_ATTACK } from '../audio'
import FreqInput from './FreqInput'
import NumberInput from './NumberInput'
import { PianoKeyboard, OctaveSelector } from './PianoKeyboard'
import { getTuningSystem, TUNING_SYSTEMS } from '../lib/tuningSystems'
import './WaveformEditor.css'

const POINTS_RESOLUTION = 600

// Durée (secondes) du micro-fade-out appliqué à la voix précédente quand
// une note est retriggerée (rejouée alors qu'elle est déjà active ou
// sustainée). Un stop() net produirait un clic : l'osc serait coupé au
// milieu d'un cycle à amplitude élevée. 8 ms reste perçu comme net mais
// supprime la discontinuité. La nouvelle voix démarre immédiatement.
const RETRIGGER_FADE = 0.008

// Preview du Designer : passe par le registre des tempéraments pour que toute
// divergence avec le moteur de lecture (live/WAV) soit impossible par
// construction.
function previewNoteFrequency(tuningSystemId, noteIndex, octave, a4Ref) {
  const sys = getTuningSystem(tuningSystemId)
  if (!sys.freq) return null
  return sys.freq(noteIndex, octave, a4Ref)
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

const ADSR_H = 120
// F.3.11 : range A/D/R étendu à 1000 ms. À max-range, ADSR_SEGMENT_PX
// reste à 80 — un segment "long" (1000 ms) occupe les 80 px alloués, donc
// les valeurs courantes (50-300 ms) tiennent dans une fraction. C'est
// voulu : on réserve l'espace graphique pour les enveloppes lentes.
const ADSR_MAX_MS = 1000
const ADSR_SEGMENT_PX = 80
// F.3.13.3 : plateau sustain restauré comme indicateur SYMBOLIQUE de la
// phase (tracé en tirets), de longueur fixe courte. Ne représente pas une
// durée audio (le sustain dure tant que la note dure). 4 segments
// pleins + 1 segment symbolique → ADSR_W = 380.
const ADSR_SUSTAIN_PX = 60
const ADSR_W = 4 * ADSR_SEGMENT_PX + ADSR_SUSTAIN_PX
const ADSR_PEAK_Y = ADSR_H * 0.05
const ADSR_HIT_RADIUS = 11
const ADSR_HANDLE_RADIUS = 5

// Mappe un niveau d'amplitude [0, 1] vers une coordonnée Y du canvas ADSR.
// level=1 → ADSR_PEAK_Y (haut), level=0 → ADSR_H (baseline). Encapsule
// l'inversion de Y (le canvas a Y croissant vers le bas).
function adsrLevelToY(level) {
  return ADSR_PEAK_Y + (1 - level) * (ADSR_H - ADSR_PEAK_Y)
}

// Libellés des handles ADSR (F.3.13.2). Indexation alignée sur le hit-test :
// 1=P1 (attack+amp), 5=P1h (hold), 2=P2 (decay+sustain), 4=P4 (release).
const ADSR_HANDLE_LABELS = {
  1: 'Attack + Amplitude',
  5: 'Hold',
  2: 'Decay + Sustain',
  4: 'Release',
}

const ADSR_TOOLTIP_OFFSET = 12

// Tooltip flottant au survol d'un handle ADSR. Coords px calculées à
// event-time par le parent (sinon ESLint react-hooks/refs interdit l'accès
// au ref pendant le render). Bascule sous le handle si proche du bord haut
// (sinon le tooltip serait clippé par overflow:hidden du container).
function AdsrTooltip({ handleIdx, px, py }) {
  if (handleIdx == null) return null
  const flip = py < 28
  return (
    <div
      className={`adsr-tooltip${flip ? ' adsr-tooltip-flipped' : ''}`}
      style={{
        left: `${px}px`,
        top: flip ? `${py + ADSR_TOOLTIP_OFFSET}px` : `${py - ADSR_TOOLTIP_OFFSET}px`,
      }}
      role="tooltip"
    >
      {ADSR_HANDLE_LABELS[handleIdx]}
    </div>
  )
}

// Parsers/formatters pour NumberInput dans la zone ADSR (F.3.11.2).
// % stocké en [0, 1] : "75" → 0.75, format → "75%". Permissif sur "%" et
// la virgule décimale. Arrondi à 2 décimales pour rester dans le pas du
// slider (step 0.01).
function parsePercent(raw) {
  if (typeof raw !== 'string') return NaN
  const s = raw.replace(/%/g, '').trim().replace(',', '.')
  if (s === '') return NaN
  const v = parseFloat(s)
  if (!Number.isFinite(v)) return NaN
  return Math.round(v) / 100
}
function formatPercent(v) {
  return `${Math.round(v * 100)}%`
}

// ms entières [0, ADSR_MAX_MS]. Permissif sur "ms" suffix et la virgule.
function parseMs(raw) {
  if (typeof raw !== 'string') return NaN
  const s = raw.replace(/ms/gi, '').trim().replace(',', '.')
  if (s === '') return NaN
  const v = parseFloat(s)
  if (!Number.isFinite(v)) return NaN
  return Math.round(v)
}
function formatMs(v) {
  return `${v} ms`
}

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
  if (a.hold !== b.hold) return false
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
    hold: editor.hold,
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
    hold: patch.hold ?? 0,
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
  a4Ref,
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
  const hold = draftAdsr?.hold ?? editor.hold ?? 0
  const decay = draftAdsr?.decay ?? editor.decay
  const sustain = draftAdsr?.sustain ?? editor.sustain
  const release = draftAdsr?.release ?? editor.release

  const { testTuningSystem, testNoteIndex, testOctave, preset: activePreset } = editor
  const freeMode = testTuningSystem === 'free'

  const frequency = freeMode
    ? testFrequency
    : previewNoteFrequency(testTuningSystem, testNoteIndex, testOctave, a4Ref)
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
  // F.3.13.2 : handle survolé + position px du centre (pour le tooltip).
  // Calcul à event-time (la lecture du ref pendant le render serait refusée
  // par ESLint react-hooks/refs). Re-render au plus 4 fois par geste de la
  // souris — négligeable.
  const [hover, setHover] = useState(null) // { idx, px, py } | null
  const [saveMessage, setSaveMessage] = useState('')
  const saveMsgTimerRef = useRef(null)

  // Refs miroir des valeurs courantes pour les handlers audio (évite les
  // closures périmées dans les listeners window/clavier).
  const instrumentParamsRef = useRef(null)
  instrumentParamsRef.current = {
    attack, hold, decay, sustain, release, amplitude,
    testOctave, testTuningSystem, testFrequency, a4Ref,
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
    points, amplitude, preset: activePreset, attack, hold, decay, sustain, release,
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
    // on la fade-out en RETRIGGER_FADE ms. La nouvelle voix démarre tout
    // de suite ; les deux se superposent brièvement — imperceptible mais
    // évite le clic qu'une coupe franche produirait.
    if (activeNotesMapRef.current.has(idx)) {
      const existing = activeNotesMapRef.current.get(idx)
      const prevCtx = audioCtxRef.current
      const prevNow = prevCtx.currentTime
      const currentGain = existing.gain.gain.value
      existing.gain.gain.cancelScheduledValues(prevNow)
      existing.gain.gain.setValueAtTime(currentGain, prevNow)
      existing.gain.gain.linearRampToValueAtTime(0, prevNow + RETRIGGER_FADE)
      try { existing.osc.stop(prevNow + RETRIGGER_FADE + 0.02) } catch { /* already */ }
      existing.osc.onended = () => {
        try { existing.osc.disconnect() } catch { /* already */ }
        try { existing.gain.disconnect() } catch { /* already */ }
      }
      activeNotesMapRef.current.delete(idx)
      sustainedNotesRef.current.delete(idx)
    }

    const ctx = ensureAudioCtx()
    const oct = params.testOctave
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.setPeriodicWave(pointsToPeriodicWave(pointsRef.current, ctx))

    const freq = previewNoteFrequency(params.testTuningSystem, idx, oct, params.a4Ref)
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(freq, now)

    const a = Math.max(params.attack / 1000, MIN_ATTACK)
    const h = (params.hold ?? 0) / 1000
    const d = params.decay / 1000
    const sustainLevel = params.sustain * params.amplitude

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(params.amplitude, now + a)
    // Plateau hold (F.3.12) : la rampe vers le même niveau crée un segment
    // horizontal sans discontinuité côté Web Audio.
    gain.gain.linearRampToValueAtTime(params.amplitude, now + a + h)
    gain.gain.linearRampToValueAtTime(sustainLevel, now + a + h + d)
    // Sustain indéfini jusqu'au release.

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

      // Guard modificateurs sur le handler note (cf. F.3) : pas de Shift
      // (réservé aux durées), Ctrl/Alt/Meta (raccourcis métier/navigateur).
      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return
      const keyboardMap = getTuningSystem(testTuningSystem).keyboardMap
      if (!keyboardMap) return
      const idx = keyboardMap[e.code]
      if (idx === undefined) return
      // preventDefault AVANT le check repeat : Firefox déclenche son
      // QuickFind sur ' (AZERTY Digit4) à chaque keydown répété, on doit
      // bloquer toute la séquence — pas seulement la première frappe.
      e.preventDefault()
      if (e.repeat) return
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

      const keyboardMap = getTuningSystem(testTuningSystem).keyboardMap
      if (!keyboardMap) return
      const idx = keyboardMap[e.code]
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
  }, [activeTab, testTuningSystem])

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
    hold,
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
  const holdPx = (hold / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const decayPx = (decay / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const releasePx = (release / ADSR_MAX_MS) * ADSR_SEGMENT_PX

  // F.3.11.1 : graph fidèle au signal joué. P1.y reflète amplitude (peak),
  // P2.y reflète amp × sustain (le sustain est un ratio du peak, pas un
  // absolu). Avec amp=0.5 et sustain=1, P2 atteint exactement P1 → le
  // drop decay disparaît visuellement, comme dans le signal audio.
  // F.3.12.2 : handle P1h = fin du plateau hold.
  // F.3.13.4 : à hold=0, P1 et P1h sont coplanaires — la priorité est
  // gérée par z-order (P1h dessiné après P1) + ordre de hit-test (P1h
  // testé avant P1). P3 géométrique non-draggable, fin du plateau sustain
  // symbolique en tirets entre P2 et P3.
  const sustainLevel = amplitude * sustain
  const peakY = adsrLevelToY(amplitude)
  const p1 = { x: attackPx, y: peakY }
  const p1h = { x: attackPx + holdPx, y: peakY }
  const p2 = { x: attackPx + holdPx + decayPx, y: adsrLevelToY(sustainLevel) }
  const p3 = { x: p2.x + ADSR_SUSTAIN_PX, y: p2.y }
  const p4 = { x: p3.x + releasePx, y: ADSR_H }

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

    // Remplissage : on suit la silhouette logique (ligne plateau à peakY,
    // pas à p1h.y qui est décalé visuellement vers le haut). P2→P3
    // horizontal pour matérialiser la phase sustain, puis release P3→P4.
    ctx.fillStyle = 'rgba(0, 212, 255, 0.12)'
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H)
    ctx.lineTo(p1.x, peakY)
    ctx.lineTo(p1h.x, peakY)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.lineTo(p4.x, p4.y)
    ctx.lineTo(p4.x, ADSR_H)
    ctx.closePath()
    ctx.fill()

    // Segments solides : baseline → P1 → plateau peak → P2 (decay).
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H)
    ctx.lineTo(p1.x, peakY)
    ctx.lineTo(p1h.x, peakY)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()

    // Plateau sustain : tirets symboliques (la durée n'a pas de sens
    // physique, le sustain dure tant que la note dure). F.3.13.3.
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.stroke()

    // Release : solide, P3 → P4 → baseline.
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(p3.x, p3.y)
    ctx.lineTo(p4.x, p4.y)
    ctx.stroke()

    // F.3.13.2 : handles dessinés en coords PHYSIQUES (px DOM) après reset
    // du transform, sinon le scale anisotrope (W/ADSR_W ≠ H/ADSR_H) les
    // déforme en ellipses. Cercles isotropes peu importe le ratio canvas.
    // P3 n'est PAS un handle — purement géométrique (fin du plateau
    // sustain symbolique).
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const sx = W / ADSR_W
    const sy = H / ADSR_H
    const handles = [p1, p1h, p2, p4]
    for (const handle of handles) {
      ctx.beginPath()
      ctx.arc(handle.x * sx, handle.y * sy, ADSR_HANDLE_RADIUS, 0, 2 * Math.PI)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#00d4ff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }, [p1.x, p1.y, p1h.x, p1h.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y, peakY])

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

  // Convertit une coordonnée Y du canvas vers un niveau d'amplitude [0, 1].
  // Inverse de adsrLevelToY ; clampé pour rester dans le domaine valide.
  const yToLevel = (y) => {
    const span = ADSR_H - ADSR_PEAK_Y
    if (span <= 0) return 0
    return Math.max(0, Math.min(1, 1 - (y - ADSR_PEAK_Y) / span))
  }

  const applyHandleDrag = (handleIdx, pos) => {
    if (handleIdx === 1) {
      // P1 : 2D. X édite attack, Y édite amplitude. Deux drafts séparés
      // (draftAdsr + draftAmp) — commités ensemble au mouseup.
      const newAttackPx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x))
      setDraftAdsr((prev) => ({ ...(prev ?? {}), attack: pxToMs(newAttackPx) }))
      const newAmp = Math.round(yToLevel(pos.y) * 100) / 100
      setDraftAmp(newAmp)
      return
    }
    if (handleIdx === 5) {
      // P1h : 1D — X édite hold (delta après attack), Y ignoré.
      // F.3.13.1 : P1h n'édite plus l'amplitude (la double édition P1/P1h
      // était confuse). Le slider Hold ou le NumberInput restent
      // disponibles pour démarrer le hold quand P1h est superposé à P1
      // (hold=0).
      const baseAtk = (draftAdsr?.attack ?? attack)
      const baseAtkPx = (baseAtk / ADSR_MAX_MS) * ADSR_SEGMENT_PX
      const newHoldPx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x - baseAtkPx))
      setDraftAdsr((prev) => ({ ...(prev ?? {}), hold: pxToMs(newHoldPx) }))
      return
    }
    setDraftAdsr((prev) => {
      const next = { ...(prev ?? {}) }
      if (handleIdx === 2) {
        const baseAtk = next.attack ?? attack
        const baseHold = next.hold ?? hold
        const baseStartPx = ((baseAtk + baseHold) / ADSR_MAX_MS) * ADSR_SEGMENT_PX
        const newDecayPx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x - baseStartPx))
        next.decay = pxToMs(newDecayPx)
        // Y édite sustain via inverse : sustain = level / amp. amp courant
        // = draftAmp si dragué récemment, sinon valeur committée. amp=0
        // rend le ratio indéterminé (graph plat sur la baseline) → no-op.
        const baseAmp = draftAmp ?? amplitude
        if (baseAmp > 0) {
          const targetLevel = yToLevel(pos.y)
          const newSustain = Math.max(0, Math.min(1, targetLevel / baseAmp))
          next.sustain = Math.round(newSustain * 100) / 100
        }
      } else if (handleIdx === 4) {
        // F.3.13.3 : le plateau sustain symbolique (ADSR_SUSTAIN_PX) est
        // réintégré entre P2 et P4 — P4.x doit donc être translaté de
        // ADSR_SUSTAIN_PX par rapport à la fin du decay.
        const baseAtk = next.attack ?? attack
        const baseHold = next.hold ?? hold
        const baseDec = next.decay ?? decay
        const base = ((baseAtk + baseHold + baseDec) / ADSR_MAX_MS) * ADSR_SEGMENT_PX + ADSR_SUSTAIN_PX
        const newReleasePx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x - base))
        next.release = pxToMs(newReleasePx)
      }
      return next
    })
  }

  const handleAdsrMouseDown = (e) => {
    const pos = getAdsrPos(e)
    // F.3.13.4 : à hold=0, P1 et P1h se superposent ; minDist tie-break
    // au PREMIER candidat testé. On teste P1h en premier → drag depuis
    // l'overlap démarre le hold (l'action principale qu'on voudrait à
    // hold=0 : "tirer" le hold à partir de zéro). P1 reste accessible
    // via les sliders Attack/Amp ou en augmentant d'abord le hold.
    const candidates = [
      { idx: 5, point: p1h },
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

  // Détecte le handle survolé via hit-test géométrique. Retourne l'idx du
  // handle (1, 5, 2, 4) ou null. Même logique que handleAdsrMouseDown mais
  // sans déclencher de drag.
  const findHoveredHandle = (pos) => {
    // F.3.13.4 : P1h en tête → tie-break à hold=0 favorise P1h. Cohérent
    // avec l'ordre de dessin (P1h dessiné après P1, donc sur le dessus).
    const candidates = [
      { idx: 5, point: p1h },
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
    return picked
  }

  const handleAdsrMouseMove = (e) => {
    const pos = getAdsrPos(e)
    if (draggingHandle) {
      applyHandleDrag(draggingHandle, pos)
      return
    }
    const idx = findHoveredHandle(pos)
    if (idx === null) {
      if (hover !== null) setHover(null)
      return
    }
    // Coords px DOM du centre du handle, pour positionner le tooltip dans
    // le repère du container (CSS left/top relatifs au position:relative
    // ancestor). Calcul fait ici (event-time) parce que le rect du canvas
    // n'est lisible que via getBoundingClientRect, pas accessible pendant
    // le render (ESLint react-hooks/refs).
    const canvas = adsrCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const points = { 1: p1, 5: p1h, 2: p2, 4: p4 }
    const point = points[idx]
    const px = point.x * (rect.width / ADSR_W)
    const py = point.y * (rect.height / ADSR_H)
    if (!hover || hover.idx !== idx || hover.px !== px || hover.py !== py) {
      setHover({ idx, px, py })
    }
  }

  const handleAdsrMouseLeave = () => {
    setHover(null)
    endAdsrDrag()
  }

  // Filtre no-op partagé : ne garde que les clés du patch dont la valeur
  // diffère réellement de l'éditeur courant. Évite de produire un snapshot
  // undo "vide" si l'utilisateur termine un drag sans bouger d'axe.
  const filterAdsrPatch = (draft) => {
    if (!draft) return {}
    const patch = {}
    for (const k of Object.keys(draft)) {
      if (draft[k] !== editor[k]) patch[k] = draft[k]
    }
    return patch
  }

  const commitDraftAdsr = () => {
    if (draftAdsr && Object.keys(draftAdsr).length > 0) {
      const patch = filterAdsrPatch(draftAdsr)
      if (Object.keys(patch).length > 0) editorActions.setAdsr(patch)
      setDraftAdsr(null)
    }
  }

  // F.3.11.3 : drag P1 diagonal écrit dans draftAdsr (attack) ET draftAmp.
  // Si on commit séparément (deux dispatch), withUndo crée deux snapshots
  // → 2 Ctrl+Z pour annuler un geste utilisateur unique. On bifurque vers
  // l'action combinée SET_EDITOR_ADSR_AND_AMP quand les deux drafts ont
  // bougé. Pour les drags P2/P4 (ADSR seul) ou les sliders Amp (amp seul),
  // on garde les chemins existants.
  const endAdsrDrag = () => {
    if (draggingHandle === null) return
    setDraggingHandle(null)
    const adsrPatch = filterAdsrPatch(draftAdsr)
    const ampChanged = draftAmp != null && draftAmp !== editor.amplitude
    const adsrChanged = Object.keys(adsrPatch).length > 0
    if (adsrChanged && ampChanged) {
      editorActions.setAdsrAndAmp({ adsr: adsrPatch, amplitude: draftAmp })
    } else if (adsrChanged) {
      editorActions.setAdsr(adsrPatch)
    } else if (ampChanged) {
      editorActions.setAmplitude(draftAmp)
    }
    setDraftAdsr(null)
    setDraftAmp(null)
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
            {Object.values(TUNING_SYSTEMS).map((sys) => (
              <option key={sys.id} value={sys.id}>{sys.label}</option>
            ))}
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
                tuningSystem={testTuningSystem}
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
                  {' '}— {getTuningSystem(testTuningSystem).noteNames?.[testNoteIndex] ?? ''}{testOctave}
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
    // Commit depuis l'input ADSR : applique la valeur, et nettoie cette clé
    // dans draftAdsr si un drag de slider était en cours (sinon le slider
    // afficherait la valeur draft pré-input après commit). Les autres clés
    // du draft sont préservées (drag d'un slider en parallèle d'un edit
    // input sur une autre clé reste cohérent).
    const commitInputAdsr = (key, v) => {
      setDraftAdsr((prev) => {
        if (!prev) return null
        const next = { ...prev }
        delete next[key]
        return Object.keys(next).length === 0 ? null : next
      })
      editorActions.setAdsr({ [key]: v })
    }
    const commitInputAmp = (v) => {
      setDraftAmp(null)
      editorActions.setAmplitude(v)
    }

    const liveValue = (key) => ({ attack, hold, decay, sustain, release }[key])

    const renderMsSlider = (key, label) => (
      <div className="adsr-slider">
        <label htmlFor={`adsr-${key}`}>
          <span>{label}</span>
          <NumberInput
            value={liveValue(key)}
            onChange={(v) => commitInputAdsr(key, v)}
            min={0}
            max={ADSR_MAX_MS}
            parse={parseMs}
            format={formatMs}
            className="adsr-value-input"
            ariaLabel={`${label} en millisecondes`}
          />
        </label>
        <input
          id={`adsr-${key}`}
          type="range"
          min="0"
          max={ADSR_MAX_MS}
          step={1}
          value={liveValue(key)}
          onChange={(e) => {
            const val = Number(e.target.value)
            setDraftAdsr((prev) => ({ ...(prev ?? {}), [key]: val }))
          }}
          {...sliderCommitter(commitDraftAdsrSlider)}
        />
      </div>
    )

    const renderSustainSlider = () => (
      <div className="adsr-slider">
        <label htmlFor="adsr-sustain">
          <span>Sustain</span>
          <NumberInput
            value={sustain}
            onChange={(v) => commitInputAdsr('sustain', v)}
            min={0}
            max={1}
            parse={parsePercent}
            format={formatPercent}
            className="adsr-value-input"
            ariaLabel="Sustain en pourcentage"
          />
        </label>
        <input
          id="adsr-sustain"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={sustain}
          onChange={(e) => {
            const val = Number(e.target.value)
            setDraftAdsr((prev) => ({ ...(prev ?? {}), sustain: val }))
          }}
          {...sliderCommitter(commitDraftAdsrSlider)}
        />
      </div>
    )

    // L'amplitude vit dans son propre draft (draftAmp / commitDraftAmp).
    // Slider rendu inline ici pour partager le layout colonne avec A/D/S/R
    // sans le forcer dans le pipeline draftAdsr.
    const renderAmpSlider = () => (
      <div className="adsr-slider">
        <label htmlFor="adsr-amplitude">
          <span>Amp</span>
          <NumberInput
            value={amplitude}
            onChange={commitInputAmp}
            min={0}
            max={1}
            parse={parsePercent}
            format={formatPercent}
            className="adsr-value-input"
            ariaLabel="Amplitude en pourcentage"
          />
        </label>
        <input
          id="adsr-amplitude"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={amplitude}
          onChange={(e) => setDraftAmp(Number(e.target.value))}
          {...sliderCommitter(commitDraftAmp)}
        />
      </div>
    )

    return (
      <div className="we-adsr-area">
        <header className="we-area-header">
          <h3 className="we-area-title">Enveloppe ADSR</h3>
        </header>
        <div className="adsr-body">
          <div className="adsr-canvas-container" ref={adsrContainerRef}>
            <canvas
              ref={adsrCanvasRef}
              className="adsr-canvas"
              style={{
                cursor: draggingHandle ? 'grabbing' : (hover ? 'grab' : 'default'),
              }}
              onMouseDown={handleAdsrMouseDown}
              onMouseMove={handleAdsrMouseMove}
              onMouseUp={endAdsrDrag}
              onMouseLeave={handleAdsrMouseLeave}
            />
            <AdsrTooltip
              handleIdx={draggingHandle ? null : hover?.idx}
              px={hover?.px}
              py={hover?.py}
            />
          </div>
          <div className="adsr-sliders">
            {renderAmpSlider()}
            {renderMsSlider('attack', 'Attack')}
            {renderMsSlider('hold', 'Hold')}
            {renderMsSlider('decay', 'Decay')}
            {renderSustainSlider()}
            {renderMsSlider('release', 'Release')}
          </div>
        </div>
      </div>
    )
  }

  return children({ renderCanvasArea, renderParamsArea, renderAdsrArea })
}

export default WaveformEditor
