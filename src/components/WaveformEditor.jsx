import { useRef, useState, useCallback, useEffect, useImperativeHandle, useMemo } from 'react'
import { Plus, Save, SaveAll, Undo2, Redo2, Sliders, X, Lock } from 'lucide-react'
import { pointsToPeriodicWave, MIN_ATTACK, HARMONIC_COUNT, harmonicsToPoints, canonicalToBars } from '../audio'
import { CAP_MIN, CAP_MAX, SPLINE_ANCHOR_MIN, SPLINE_ANCHOR_MAX } from '../reducer'
import useWindowSize from '../hooks/useWindowSize'
import FreqInput from './FreqInput'
import NumberInput from './NumberInput'
import { PianoKeyboard, OctaveSelector } from './PianoKeyboard'
import ShortLabelSelect from './ShortLabelSelect'
import {
  DEFAULT_X_EDO_N,
  X_EDO_MAX,
  X_EDO_MIN,
  getKeyboardMap,
  getNoteNames,
  getNotesPerOctave,
  getTuningSystem,
  TUNING_SYSTEMS,
  TUNING_CATEGORIES,
  getCategoryOfSystem,
} from '../lib/tuningSystems'
import XEdoInput from './XEdoInput'
import { xEdoShiftedKeyboardMapForN } from '../lib/xEdoLayouts'
import { NOTE_GUARD_KEYS } from '../lib/keyboardCandidates'
import { matchesShortcut } from '../lib/shortcuts'
import {
  VISUAL_CUE_PATTERNS,
  cuedNoteIndices,
  systemSupportsVisualCues,
} from '../lib/visualCues'
import { themeColor } from '../lib/themeColor'
import { withSavedCtx } from '../lib/canvas'
import { STRINGS } from '../lib/strings'
import ConfirmDialog from './ConfirmDialog'
import PresetPicker from './PresetPicker'
import SplineEditor from './SplineEditor'
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
function previewNoteFrequency(tuningSystemId, noteIndex, octave, a4Ref, xEdoN) {
  const sys = getTuningSystem(tuningSystemId)
  if (!sys.freq) return null
  return sys.freq(noteIndex, octave, a4Ref, xEdoN)
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

// v1.1.0 : breakpoint en dessous duquel la row de contrôles Instrument
// (Catégorie / Système musical / X-EDO / Repère / Tonique) est remplacée
// par un bouton qui ouvre une modale centrée avec les mêmes contrôles.
// Calibré à 950 px : la row ne tient plus sur une ligne en dessous, et
// la zone Instrument peut alors déborder verticalement quand la hauteur
// de fenêtre est aussi serrée.
const INSTRUMENT_COLLAPSE_WIDTH = 950

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
  1: STRINGS.adsr.handleP1,
  5: STRINGS.adsr.handleHold,
  2: STRINGS.adsr.handleP2,
  4: STRINGS.adsr.handleRelease,
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

// Définition (iter-M phase-1) : entier dans [1, HARMONIC_COUNT]. Le clamp
// final est fait par NumberInput ; ici on parse permissivement et on arrondit.
function parseDefinition(raw) {
  if (typeof raw !== 'string') return NaN
  const s = raw.trim()
  if (s === '') return NaN
  const v = parseInt(s, 10)
  return Number.isFinite(v) ? v : NaN
}
function formatDefinition(v) {
  return String(v)
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

// Dirty check (modèle unifié M rattrapage) : on compare les champs stockés sur
// le Patch — canonical (vérité audio) + cap + lentille spline (anchors +
// interpolation) + ADSR + amplitude + preset. Le résidu dérive de
// canonical/anchors, donc inutile de le comparer. Les champs test* sont
// volatils et ne participent pas au dirty.
function patchFieldsEqual(a, b) {
  if (!a || !b) return false
  if (a.amplitude !== b.amplitude) return false
  if (a.preset !== b.preset) return false
  if (a.attack !== b.attack) return false
  if (a.hold !== b.hold) return false
  if (a.decay !== b.decay) return false
  if (a.sustain !== b.sustain) return false
  if (a.release !== b.release) return false
  if ((a.cap ?? HARMONIC_COUNT) !== (b.cap ?? HARMONIC_COUNT)) return false
  if ((a.interpolation ?? 'soft') !== (b.interpolation ?? 'soft')) return false
  const aan = a.anchors ?? []
  const ban = b.anchors ?? []
  if (aan.length !== ban.length) return false
  for (let i = 0; i < aan.length; i++) {
    if (aan[i].x !== ban[i].x || aan[i].y !== ban[i].y) return false
  }
  const ac = a.canonical ?? []
  const bc = b.canonical ?? []
  if (ac.length !== bc.length) return false
  for (let i = 0; i < ac.length; i++) if (ac[i] !== bc[i]) return false
  return true
}

function cloneAnchors(anchors) {
  return (anchors ?? []).map((a) => ({ x: a.x, y: a.y }))
}

function snapshotPatchFields(editor) {
  return {
    canonical: Array.from(editor.canonical),
    cap: editor.cap,
    anchors: cloneAnchors(editor.anchors),
    interpolation: editor.interpolation ?? 'soft',
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
    canonical: Array.from(patch.canonical),
    cap: patch.cap,
    anchors: cloneAnchors(patch.anchors),
    interpolation: patch.interpolation ?? 'soft',
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
  xEdoN = DEFAULT_X_EDO_N,
  onConvertXEdoTo,
  activeTab,
  onSavePatch,
  onUpdatePatch,
  onRequestNew,
  onRequestSavePopup,
  nextPatchName,
  currentPatch,
  patches,
  onPatchCreated,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  analyserRef,
  activeVoicesCountRef,
  // iter-M phase-2-as : auto-sizing (essai). Quand ON, le guard est levé par
  // DesignerColumns le temps du geste qui *change* le focus → l'édition est
  // suppriméee sur ce mousedown-là (règle AS.3.2), elle reprend au geste
  // suivant (la colonne est désormais à 60 %, le contenu ne reflue plus).
  autoSizing,
  autoSizeFocusGuardRef,
  ref,
  children,
}) {
  const [draftPoints, setDraftPoints] = useState(null)
  const [draftAdsr, setDraftAdsr] = useState(null)
  const [draftAmp, setDraftAmp] = useState(null)
  const [draftDefinition, setDraftDefinition] = useState(null)
  // iter-M phase-r.2.4 : draft du nombre d'ancres (slider du header Forme
  // d'onde). Commit au relâchement → un seul SET_EDITOR_ANCHOR_COUNT (un re-fit
  // + un cran d'undo par geste, pas par cran de slider).
  const [draftAnchorCount, setDraftAnchorCount] = useState(null)
  const [draftFreq, setDraftFreq] = useState(null)
  // iter-M phase-2.3 : draft des amplitudes harmoniques (geste continu de drag
  // sur une barre, à la draftPoints). Commit au mouseup → un seul snapshot.
  const [draftAmplitudes, setDraftAmplitudes] = useState(null)
  // Confirmation "abandonner modifs" pour handleNew
  const [confirmNewOpen, setConfirmNewOpen] = useState(false)
  // iter-M phase-r.2.2 : confirmation systématique du Reset du timbre (bouton
  // Reset de la barre du haut). Pas de détection « dirty » — trop coûteuse
  // pour le gain, l'action est undoable de toute façon.
  const [confirmResetWaveformOpen, setConfirmResetWaveformOpen] = useState(false)
  // iter-M phase-4 : picker de presets de timbre + garde-fou dirty. Le preset
  // en attente est gardé le temps de la confirmation d'écrasement.
  const [presetPickerOpen, setPresetPickerOpen] = useState(false)
  const [pendingPresetPatch, setPendingPresetPatch] = useState(null)

  // Modèle unifié (M rattrapage) : la canonical est la vérité audio affichée.
  // La lentille active (currentLens) ne change que l'UI ; on la mappe vers les
  // anciennes valeurs de `mode` (free→draw, bars→harmonic, spline→spline) pour
  // garder le reste du composant inchangé (M.r.3 câblera la coexistence vivante).
  const currentLens = editor.currentLens ?? 'free'
  const mode = currentLens === 'bars' ? 'harmonic' : currentLens === 'spline' ? 'spline' : 'draw'
  const anchors = editor.anchors ?? []
  const interpolation = editor.interpolation ?? 'soft'
  const amplitude = draftAmp ?? editor.amplitude
  // `cap` (ex-definition/N) borne désormais toutes les lentilles à la synthèse.
  const definition = draftDefinition ?? editor.cap ?? HARMONIC_COUNT
  const effectiveDefinition = definition
  const N = definition
  // Barres = amplitudes véritables des harmoniques 1..cap de la canonical
  // (canonicalToBars double les magnitudes FFT bilatérales pour les remettre
  // dans la convention de harmonicsToPoints). Pendant un drag de barre,
  // draftAmplitudes prime.
  const canonicalBars = useMemo(
    () => canonicalToBars(editor.canonical, definition),
    [editor.canonical, definition],
  )
  const amplitudes = draftAmplitudes ?? canonicalBars
  // Courbe affichée = canonical (draft pendant un tracé libre ; reconstruction
  // iDFT pendant un drag de barre — cohérent avec ce que produira le reducer).
  const points = draftPoints
    ?? (draftAmplitudes ? harmonicsToPoints(draftAmplitudes, draftAmplitudes.length) : editor.canonical)
  const testFrequency = draftFreq ?? editor.testFrequency
  const attack = draftAdsr?.attack ?? editor.attack
  const hold = draftAdsr?.hold ?? editor.hold ?? 0
  const decay = draftAdsr?.decay ?? editor.decay
  const sustain = draftAdsr?.sustain ?? editor.sustain
  const release = draftAdsr?.release ?? editor.release

  const {
    testTuningSystem, testNoteIndex, testOctave, preset: activePreset,
    visualCuePattern, visualCueTonic,
  } = editor
  const freeMode = testTuningSystem === 'free'

  // F.4.4 : repères visuels sur le clavier. Le calcul est borné (≤ 7
  // intervalles × snap O(N×11) avec N ≤ 31), donc useMemo suffit pour
  // éviter de recompute à chaque render. Set vide si pattern 'none' ou
  // si le système ne supporte pas — appelable sans guard côté layout.
  const cuedNotes = useMemo(() => {
    if (!visualCuePattern || visualCuePattern === 'none') return new Set()
    if (!systemSupportsVisualCues(testTuningSystem)) return new Set()
    return cuedNoteIndices(visualCuePattern, visualCueTonic, testTuningSystem, a4Ref, xEdoN)
  }, [visualCuePattern, visualCueTonic, testTuningSystem, a4Ref, xEdoN])

  const showCuesBar = systemSupportsVisualCues(testTuningSystem)
  const cueTonicMax = getNotesPerOctave(getTuningSystem(testTuningSystem), xEdoN) ?? 0

  const frequency = freeMode
    ? testFrequency
    : previewNoteFrequency(testTuningSystem, testNoteIndex, testOctave, a4Ref, xEdoN)
  const defaultName = nextPatchName
  // iter-M phase-r.2.1 : identité du patch affichée dans la barre du haut
  // (DesignerToolbar), plus dans le header de la zone Forme d'onde.
  const patchLabel = currentPatch ? `Édition : ${currentPatch.name}` : defaultName

  const canvasRef = useRef(null)
  const canvasContainerRef = useRef(null)
  const adsrCanvasRef = useRef(null)
  const adsrContainerRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserGainRef = useRef(null)

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
  // iter-L phase-1.4.a : verrou Sustain (pastille cliquable). État runtime
  // uniquement (non persisté). spaceHeldRef tracke l'état physique d'Espace
  // pour permettre à toggleSustainLock(false) de relâcher correctement.
  const spaceHeldRef = useRef(false)
  const sustainLockedRef = useRef(false)
  const sustainedNotesRef = useRef(new Set())
  const [sustainActive, setSustainActive] = useState(false)
  const [sustainLocked, setSustainLocked] = useState(false)

  const [isDrawing, setIsDrawing] = useState(false)
  const [draggingHandle, setDraggingHandle] = useState(null)
  // F.3.13.2 : handle survolé + position px du centre (pour le tooltip).
  // Calcul à event-time (la lecture du ref pendant le render serait refusée
  // par ESLint react-hooks/refs). Re-render au plus 4 fois par geste de la
  // souris — négligeable.
  const [hover, setHover] = useState(null) // { idx, px, py } | null
  const [saveMessage, setSaveMessage] = useState('')
  const saveMsgTimerRef = useRef(null)

  // v1.1.0 : largeur de fenêtre → bascule responsive de la zone
  // Instrument. < 950 px : row de contrôles remplacée par un bouton
  // qui ouvre une modale centrée.
  const { w: windowWidth } = useWindowSize()
  const instrumentCollapsed = windowWidth < INSTRUMENT_COLLAPSE_WIDTH
  const [systemModalOpen, setSystemModalOpen] = useState(false)
  // Si la fenêtre grandit pendant que la modale est ouverte, on la
  // ferme (le bouton qui l'a ouverte est désormais caché). State
  // résiduel = wasteful mais inoffensif si on ne ferme pas — on ferme
  // tout de même pour propreté.
  if (!instrumentCollapsed && systemModalOpen) {
    // Conditional setter dans le render — accepté ici car idempotent
    // (passe à false uniquement si déjà true au render précédent).
    // Pattern recommandé par la doc React pour cleanup state
    // "dérivé" sans useEffect.
    setSystemModalOpen(false)
  }
  // Escape ferme la modale.
  useEffect(() => {
    if (!systemModalOpen) return
    const onEscape = (e) => {
      if (e.key === 'Escape') setSystemModalOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [systemModalOpen])

  // Refs miroir des valeurs courantes pour les handlers audio (évite les
  // closures périmées dans les listeners window/clavier).
  const instrumentParamsRef = useRef(null)
  instrumentParamsRef.current = {
    attack, hold, decay, sustain, release, amplitude, definition: effectiveDefinition,
    testOctave, testTuningSystem, testFrequency, a4Ref, xEdoN,
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
    points, amplitude, definition, preset: activePreset, attack, hold, decay, sustain, release,
    mode, N, amplitudes, anchors, interpolation,
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

    withSavedCtx(ctx, () => {
    ctx.fillStyle = themeColor('canvas-bg')
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = themeColor('canvas-grid-secondary')
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

    ctx.strokeStyle = themeColor('accent')
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

    ctx.strokeStyle = themeColor('accent-bg-soft')
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
    })
  }, [])

  // iter-M phase-r.2.5.1 : `currentLens` en dépendance. Au switch Ancres→Libre,
  // renderCanvasArea passe de <SplineEditor> à un <canvas> nu → React démonte/
  // remonte le canvas Libre. `points` est inchangé au switch (même canonical),
  // donc sans cette dépendance l'effet ne se redéclenche pas et le canvas
  // fraîchement monté reste vide jusqu'à une modif. La relancer force un draw.
  useEffect(() => {
    drawCanvas(points)
  }, [points, drawCanvas, currentLens])

  // iter-M phase-r.2.5.1 : idem — re-keyer sur `currentLens` réattache le
  // ResizeObserver au NOUVEAU container/canvas après remount (l'ancien
  // observer pointait sur un noeud détaché) ; l'observe initial refixe
  // width/height et redessine.
  useEffect(() => {
    const container = canvasContainerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas || typeof ResizeObserver === 'undefined') return
    let raf1 = 0
    let raf2 = 0
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        const h = Math.floor(entry.contentRect.height)
        if (!w || !h) continue
        if (w !== canvas.width || h !== canvas.height) {
          canvas.width = w
          canvas.height = h
          drawCanvas(pointsRef.current)
          cancelAnimationFrame(raf1)
          cancelAnimationFrame(raf2)
          raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => drawCanvas(pointsRef.current))
          })
        }
      }
    })
    ro.observe(container)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      ro.disconnect()
    }
  }, [drawCanvas, currentLens])

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
    // AS.3.2 : si ce mousedown vient de donner le focus à la colonne Forme
    // d'onde (auto-sizing), il ne fait que focuser — pas de tracé.
    if (autoSizing && autoSizeFocusGuardRef?.current) return
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
      const same = draftPoints.length === editor.canonical.length &&
        draftPoints.every((v, i) => v === editor.canonical[i])
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

  // --- iter-M phase-2.3 : édition des barres d'harmoniques (mode harmonic) ---
  // Une barre à la fois : le mousedown verrouille l'index (depuis x), le drag
  // n'ajuste plus que sa hauteur (depuis y). Commit unique au mouseup → un
  // seul cran undo par geste. (Le sweep horizontal multi-barres est différé,
  // cf. BACKLOG.)
  const harmonicsContainerRef = useRef(null)
  const dragBarRef = useRef(null)
  // Valeur de la barre AVANT le drag (lue sur canonical), capturée au mousedown.
  // Sert de référence pour décider si le drag a effectivement modifié la barre :
  // pendant le drag, `amplitudes` pointe sur `draftAmplitudes`, donc on ne peut
  // pas comparer à `amplitudes[index]` (toujours égal à `draftAmplitudes[index]`).
  const dragBarInitialRef = useRef(null)

  const harmonicAmplitudeFromEvent = (e) => {
    const el = harmonicsContainerRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const yPct = (e.clientY - rect.top) / rect.height
    return Math.max(0, Math.min(1, 1 - yPct))
  }
  const harmonicIndexFromEvent = (e, count) => {
    const el = harmonicsContainerRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const xPct = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
    return Math.min(count - 1, Math.floor(xPct * count))
  }

  const handleHarmonicMouseDown = (e) => {
    // AS.3.2 : si ce mousedown vient de donner le focus à la colonne
    // Harmoniques (auto-sizing), il ne fait que focuser — pas d'édition de barre.
    if (autoSizing && autoSizeFocusGuardRef?.current) return
    const index = harmonicIndexFromEvent(e, amplitudes.length)
    dragBarRef.current = index
    dragBarInitialRef.current = amplitudes[index]
    const next = Array.from(draftAmplitudes ?? amplitudes)
    next[index] = harmonicAmplitudeFromEvent(e)
    setDraftAmplitudes(next)
  }
  const handleHarmonicMouseMove = (e) => {
    if (dragBarRef.current === null) return
    const index = dragBarRef.current
    const next = Array.from(draftAmplitudes ?? amplitudes)
    next[index] = harmonicAmplitudeFromEvent(e)
    setDraftAmplitudes(next)
  }
  const commitHarmonicDraft = () => {
    const index = dragBarRef.current
    const initial = dragBarInitialRef.current
    dragBarRef.current = null
    dragBarInitialRef.current = null
    if (draftAmplitudes && index !== null && draftAmplitudes[index] !== initial) {
      editorActions.setHarmonicAmplitude(index, draftAmplitudes[index])
    }
    setDraftAmplitudes(null)
  }
  const handleHarmonicMouseUp = () => commitHarmonicDraft()
  const handleHarmonicMouseLeave = () => {
    if (dragBarRef.current !== null) commitHarmonicDraft()
  }

  // --- Instrument live (E.3) : play at mousedown, release at mouseup ---

  const ensureAudioCtx = () => {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      return ctx
    }
    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    // Tap analyser pour le Spectrogram Designer (live FFT mode, iter I).
    // Les voix se connectent à analyserGain au lieu de ctx.destination ;
    // analyserGain → analyser (lecture passive) et analyserGain → ctx.destination
    // (sortie audible inchangée).
    const analyserGain = ctx.createGain()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.75
    analyser.minDecibels = -90
    analyser.maxDecibels = -10
    analyserGain.connect(analyser)
    analyserGain.connect(ctx.destination)

    analyserGainRef.current = analyserGain
    if (analyserRef) analyserRef.current = analyser

    // Reset compteur de voix à la création d'un nouveau context.
    if (activeVoicesCountRef) activeVoicesCountRef.current = 0

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
      // Le décrément du compteur est fait manuellement ci-dessous (cleanup forcé) ;
      // on neutralise le onended existant pour ne pas re-décrémenter en double.
      existing.osc.onended = () => {
        try { existing.osc.disconnect() } catch { /* already */ }
        try { existing.gain.disconnect() } catch { /* already */ }
      }
      activeNotesMapRef.current.delete(idx)
      sustainedNotesRef.current.delete(idx)
      // Retrigger : la voix précédente est en train d'être stoppée,
      // on décrémente le compteur. La nouvelle incrémentation arrive
      // après la création de la voix ci-dessous.
      if (activeVoicesCountRef) {
        activeVoicesCountRef.current = Math.max(0, activeVoicesCountRef.current - 1)
      }
    }

    const ctx = ensureAudioCtx()
    const oct = params.testOctave
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.setPeriodicWave(pointsToPeriodicWave(pointsRef.current, ctx, params.definition))

    const freq = previewNoteFrequency(params.testTuningSystem, idx, oct, params.a4Ref, params.xEdoN)
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
    gain.connect(analyserGainRef.current)

    // Décrément réel à la fin de la voix : osc.onended fire quand
    // l'oscillator s'arrête effectivement (release naturel OU osc.stop()
    // forcé via retrigger / stopAll). Plus précis que setTimeout planifié
    // sur la durée nominale ADSR, qui se désaligne dès qu'on sustain.
    // Assigné avant osc.start() pour être sûr d'être en place.
    osc.onended = () => {
      if (activeVoicesCountRef) {
        activeVoicesCountRef.current = Math.max(0, activeVoicesCountRef.current - 1)
      }
    }
    osc.start(now)

    activeNotesMapRef.current.set(idx, { osc, gain, octave: oct })
    setActiveNoteIndices(new Set(activeNotesMapRef.current.keys()))

    // Compteur de voix actives (iter I) : incrément à la création.
    // Le décrément se fait via osc.onended ci-dessus (réel, pas planifié).
    if (activeVoicesCountRef) {
      activeVoicesCountRef.current += 1
    }
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
    // Le onended posé par playInstrumentNote (décrément du compteur)
    // serait écrasé par cette réassignation : on intègre le décrément ici
    // pour que la voix soit comptabilisée jusqu'à la fin réelle du release.
    node.osc.onended = () => {
      try { node.osc.disconnect() } catch { /* already */ }
      try { node.gain.disconnect() } catch { /* already */ }
      if (activeVoicesCountRef) {
        activeVoicesCountRef.current = Math.max(0, activeVoicesCountRef.current - 1)
      }
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
  // iter-L phase-1.4.a : si verrouillé, deactivateSustain est no-op (Espace
  // ne casse pas le verrou). spaceHeldRef tracké pour que le clic
  // "déverrouiller" ne libère pas les notes si l'utilisateur tient Espace
  // simultanément.
  const activateSustain = () => {
    spaceHeldRef.current = true
    if (sustainActiveRef.current) return
    sustainActiveRef.current = true
    setSustainActive(true)
  }
  const deactivateSustain = () => {
    spaceHeldRef.current = false
    if (sustainLockedRef.current) return
    if (!sustainActiveRef.current) return
    sustainActiveRef.current = false
    setSustainActive(false)
    const toRelease = Array.from(sustainedNotesRef.current)
    sustainedNotesRef.current.clear()
    for (const idx of toRelease) performRelease(idx)
  }
  // Toggle du verrou via clic sur la pastille. Sémantique d'une pédale
  // verrouillable de piano numérique : verrouiller = activer + tenir,
  // déverrouiller = relâcher (sauf si Espace tient déjà la pédale).
  const toggleSustainLock = () => {
    const next = !sustainLockedRef.current
    sustainLockedRef.current = next
    setSustainLocked(next)
    if (next) {
      if (!sustainActiveRef.current) {
        sustainActiveRef.current = true
        setSustainActive(true)
      }
    } else if (!spaceHeldRef.current && sustainActiveRef.current) {
      sustainActiveRef.current = false
      setSustainActive(false)
      const toRelease = Array.from(sustainedNotesRef.current)
      sustainedNotesRef.current.clear()
      for (const idx of toRelease) performRelease(idx)
    }
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
    sustainLockedRef.current = false
    spaceHeldRef.current = false
    setActiveNoteIndices(new Set())
    setSustainActive(false)
    setSustainLocked(false)
    // Voix Libre éventuelle (iter G phase 1.3) : même traitement sans fade.
    stopFreeVoiceImmediate()
    if (activeVoicesCountRef) activeVoicesCountRef.current = 0
  }

  // === Mode Libre : test de la fréquence courante (iter G phase 1.3) ===
  //
  // Dette technique de longue date : depuis E.3 le Designer est un instrument
  // polyphonique, mais playInstrumentNote prend un noteIndex et délègue
  // à sys.freq — ce qui exclut le système Libre (sys.freq === null). Un seul
  // canal mono suffit : on stocke la voix active dans freeVoiceRef, et le
  // bouton Test / la touche 's' déclenchent play+release.
  const freeVoiceRef = useRef(null) // { osc, gain } | null
  const [freeNoteActive, setFreeNoteActive] = useState(false)

  const stopFreeVoiceImmediate = () => {
    const v = freeVoiceRef.current
    if (!v) return
    try { v.osc.stop() } catch { /* already */ }
    try { v.osc.disconnect() } catch { /* already */ }
    try { v.gain.disconnect() } catch { /* already */ }
    freeVoiceRef.current = null
    setFreeNoteActive(false)
  }

  const playFreeNote = () => {
    const params = instrumentParamsRef.current
    if (params.testTuningSystem !== 'free') return
    // Retrigger : même fade que pour les notes-grille.
    if (freeVoiceRef.current) {
      const existing = freeVoiceRef.current
      const prevCtx = audioCtxRef.current
      const prevNow = prevCtx.currentTime
      const currentGain = existing.gain.gain.value
      existing.gain.gain.cancelScheduledValues(prevNow)
      existing.gain.gain.setValueAtTime(currentGain, prevNow)
      existing.gain.gain.linearRampToValueAtTime(0, prevNow + RETRIGGER_FADE)
      try { existing.osc.stop(prevNow + RETRIGGER_FADE + 0.02) } catch { /* already */ }
      // Le décrément du compteur est fait manuellement ci-dessous (cleanup forcé) ;
      // on neutralise le onended existant pour ne pas re-décrémenter en double.
      existing.osc.onended = () => {
        try { existing.osc.disconnect() } catch { /* already */ }
        try { existing.gain.disconnect() } catch { /* already */ }
      }
      freeVoiceRef.current = null
      if (activeVoicesCountRef) {
        activeVoicesCountRef.current = Math.max(0, activeVoicesCountRef.current - 1)
      }
    }
    const ctx = ensureAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.setPeriodicWave(pointsToPeriodicWave(pointsRef.current, ctx, params.definition))
    const freq = params.testFrequency
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(freq, now)

    const a = Math.max(params.attack / 1000, MIN_ATTACK)
    const h = (params.hold ?? 0) / 1000
    const d = params.decay / 1000
    const sustainLevel = params.sustain * params.amplitude

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(params.amplitude, now + a)
    gain.gain.linearRampToValueAtTime(params.amplitude, now + a + h)
    gain.gain.linearRampToValueAtTime(sustainLevel, now + a + h + d)

    osc.connect(gain)
    gain.connect(analyserGainRef.current)

    // Décrément réel à la fin de la voix : osc.onended fire quand
    // l'oscillator s'arrête effectivement (release naturel OU osc.stop()
    // forcé via retrigger / stopAll). Plus précis que setTimeout planifié
    // sur la durée nominale ADSR, qui se désaligne dès qu'on sustain.
    // Assigné avant osc.start() pour être sûr d'être en place.
    osc.onended = () => {
      if (activeVoicesCountRef) {
        activeVoicesCountRef.current = Math.max(0, activeVoicesCountRef.current - 1)
      }
    }
    osc.start(now)

    freeVoiceRef.current = { osc, gain }
    setFreeNoteActive(true)

    // Compteur de voix actives (iter I) : symétrique à playInstrumentNote.
    if (activeVoicesCountRef) {
      activeVoicesCountRef.current += 1
    }
  }

  const releaseFreeNote = () => {
    const node = freeVoiceRef.current
    if (!node) return
    const ctx = audioCtxRef.current
    if (!ctx) return
    const params = instrumentParamsRef.current
    const now = ctx.currentTime
    const r = params.release / 1000
    const currentGain = node.gain.gain.value
    node.gain.gain.cancelScheduledValues(now)
    node.gain.gain.setValueAtTime(currentGain, now)
    node.gain.gain.linearRampToValueAtTime(0, now + r)
    try { node.osc.stop(now + r + 0.02) } catch { /* already */ }
    // Le onended posé par playFreeNote (décrément du compteur) serait
    // écrasé par cette réassignation : on intègre le décrément ici pour
    // que la voix soit comptabilisée jusqu'à la fin réelle du release.
    node.osc.onended = () => {
      try { node.osc.disconnect() } catch { /* already */ }
      try { node.gain.disconnect() } catch { /* already */ }
      if (activeVoicesCountRef) {
        activeVoicesCountRef.current = Math.max(0, activeVoicesCountRef.current - 1)
      }
    }
    freeVoiceRef.current = null
    setFreeNoteActive(false)
  }

  useEffect(() => {
    return () => {
      stopAllInstrumentNotes()
      // Cleanup analyser tap (iter I) : reset des refs partagées pour que le
      // Spectrogram ne pointe pas sur des nodes orphelins après unmount.
      if (activeVoicesCountRef) activeVoicesCountRef.current = 0
      if (analyserRef) analyserRef.current = null
      analyserGainRef.current = null
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
    playFree: playFreeNote,
    releaseFree: releaseFreeNote,
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
      if (matchesShortcut(e, 'designer-sustain')) {
        e.preventDefault()
        if (!e.repeat) instrumentBridgeRef.current?.activateSustain()
        return
      }

      // Modificateurs OS / a11y : laisser passer (Ctrl+F, Cmd+W, Alt-shortcuts
      // screen reader). Shift n'est pas exempté ici : il est réservé aux
      // durées dans le Composer, sans usage dans le Designer — son guard
      // métier vient plus bas, après le preventDefault navigateur.
      if (e.ctrlKey || e.altKey || e.metaKey) return

      // Mode Libre (iter G phase 1.3) : 's' déclenche playFree (un seul
      // canal mono, retrigger géré). Pas de noteIndex à fixer.
      if (testTuningSystem === 'free' && matchesShortcut(e, 'designer-test-free')) {
        e.preventDefault()
        if (!e.repeat) instrumentBridgeRef.current?.playFree()
        return
      }

      // Posture mode note (F.7.5) : preventDefault SYSTÉMATIQUEMENT sur les
      // touches candidates au mode note, même si elles ne sont pas mappées
      // par le système courant. Sinon Firefox QuickFind happe ' (Digit4
      // AZERTY) en 12-TET, où Digit4 n'est pas mappé. F.3.6 conditionnait
      // le preventDefault au lookup keyboardMap — fix incomplet.
      if (NOTE_GUARD_KEYS.has(e.code)) e.preventDefault()

      // F.8.2.2 : en mode SHIFT_ANCHOR (X-EDO N≥44), Shift+touche désigne
      // le degré "shifted" (moitié droite de la cellule) ; sinon Shift est
      // réservé aux durées Composer (F.3.4). Les layouts SHIFT_ANCHOR
      // n'utilisent pas la rangée digit, donc pas de collision avec
      // Shift+Digit (durées).
      const sys = getTuningSystem(testTuningSystem)
      const useShiftMode = testTuningSystem === 'x-edo' && xEdoN >= 44
      const keyboardMap = e.shiftKey
        ? (useShiftMode ? xEdoShiftedKeyboardMapForN(xEdoN) : null)
        : getKeyboardMap(sys, xEdoN)
      if (!keyboardMap) return
      const idx = keyboardMap[e.code]
      if (idx === undefined) return
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

      // Mode Libre : 's' relâche la voix Libre. Idempotent si pas active.
      if (testTuningSystem === 'free' && e.code === 'KeyS') {
        e.preventDefault()
        instrumentBridgeRef.current?.releaseFree()
        return
      }

      // F.8.2.2 : on relâche AUSSI BIEN le degré base que le degré shifted
      // pour la touche en question, parce que l'état de Shift au keyup peut
      // différer de celui au keydown (utilisateur relâche Shift en premier
      // ou en dernier). `bridge.release(idx)` est no-op pour un degré non
      // actif, donc relâcher les deux est sûr.
      const sys = getTuningSystem(testTuningSystem)
      const baseMap = getKeyboardMap(sys, xEdoN)
      const useShiftMode = testTuningSystem === 'x-edo' && xEdoN >= 44
      const shiftedMap = useShiftMode ? xEdoShiftedKeyboardMapForN(xEdoN) : null
      const baseIdx = baseMap?.[e.code]
      const shiftedIdx = shiftedMap?.[e.code]
      const bridge = instrumentBridgeRef.current
      if (!bridge) return
      if (baseIdx !== undefined) bridge.release(baseIdx)
      if (shiftedIdx !== undefined) bridge.release(shiftedIdx)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [activeTab, testTuningSystem, xEdoN])

  const clearCanvas = () => {
    editorActions.setPoints(blankPointsArray())
  }

  const loadPreset = (type) => {
    const pts = generatePresetPoints(type)
    editorActions.applyPreset(type, pts)
  }

  // iter-M phase-4 : chargement d'un preset de timbre. Garde-fou dirty — si le
  // draft diffère du patch de référence, on confirme avant d'écraser (même
  // signal dirty que handleNew). LOAD_PRESET côté reducer remplace le draft
  // (un seul cran undo).
  const handlePickPreset = (preset) => {
    setPresetPickerOpen(false)
    const dirty = !patchFieldsEqual(stateSnapshotRef.current, referenceRef.current)
    if (dirty) {
      setPendingPresetPatch(preset.patch)
      return
    }
    editorActions.loadPreset(preset.patch)
  }

  const confirmLoadPreset = () => {
    if (pendingPresetPatch) editorActions.loadPreset(pendingPresetPatch)
    setPendingPresetPatch(null)
  }

  // iter-M phase-r.2.2 : déclencheurs exposés à la barre du haut (DesignerToolbar
  // via l'API children). Le picker de presets et le dialog de reset restent
  // montés dans cette fenêtre — la barre ne fait que piloter leur ouverture.
  const openPresetPicker = () => setPresetPickerOpen(true)
  const requestResetWaveform = () => setConfirmResetWaveformOpen(true)
  // iter-M phase-r.2.3 : Normaliser — toujours cliquable en M.r.2, pas de
  // confirmation (undoable). La désactivation conditionnelle arrive en M.r.4.
  const normalizeWaveform = () => editorActions.normalize()
  const doResetWaveform = () => {
    setConfirmResetWaveformOpen(false)
    editorActions.resetWaveform()
  }

  const flashMessage = (msg) => {
    setSaveMessage(msg)
    if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current)
    saveMsgTimerRef.current = setTimeout(() => setSaveMessage(''), 2000)
  }

  useEffect(() => () => {
    if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current)
  }, [])

  // iter G phase 2.4 : un patch porte désormais son **système musical par
  // défaut** (testTuningSystem courant de l'éditeur au moment de l'enreg).
  // Utilisé par App.handleAddClip pour proposer ce système par défaut quand
  // on tire le patch depuis la bibliothèque. Écrasable via Propriétés.
  const buildPayload = (name) => ({
    name,
    preset: activePreset,
    amplitude,
    // Modèle unifié (M rattrapage) : le patch porte canonical + cap + lentille
    // spline (anchors + interpolation + residual).
    canonical: Array.from(points),
    cap: definition,
    anchors: cloneAnchors(anchors),
    interpolation,
    residual: Array.from(editor.residual ?? []),
    attack,
    hold,
    decay,
    sustain,
    release,
    defaultTuningSystem: testTuningSystem,
  })

  const handleSaveAsNew = () => {
    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      flashMessage(STRINGS.editor.canvasEmpty)
      return
    }

    // Si onRequestSavePopup est dispo : on délègue au popup côté App
    if (onRequestSavePopup) {
      onRequestSavePopup({
        patchData: buildPayload(''),  // name sera surchargé par le popup
        sourcePatch: currentPatch,    // null si canvas vierge
      })
      return
    }

    // Fallback sans popup (contexte embarqué sans onRequestSavePopup)
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
      flashMessage(STRINGS.editor.canvasEmpty)
      return
    }
    onUpdatePatch(currentPatch.id, buildPayload(currentPatch.name))
    referenceRef.current = stateSnapshotRef.current
    flashMessage('Patch mis à jour')
  }

  const handleNew = () => {
    const dirty = !patchFieldsEqual(stateSnapshotRef.current, referenceRef.current)
    if (dirty) {
      setConfirmNewOpen(true)
      return
    }
    stopAllInstrumentNotes()
    onRequestNew?.()
  }

  const doNew = () => {
    setConfirmNewOpen(false)
    stopAllInstrumentNotes()
    onRequestNew?.()
  }

  // Raccourcis clavier Designer : CustomEvents dispatchés par App.jsx.
  // On utilise des refs stables pour éviter de re-enregistrer les listeners
  // à chaque render (les fonctions const sont re-créées à chaque render).
  const handleSaveAsNewRef = useRef(handleSaveAsNew)
  const handleUpdateRef = useRef(handleUpdate)
  const handleNewRef = useRef(handleNew)
  const currentPatchRef = useRef(currentPatch)
  handleSaveAsNewRef.current = handleSaveAsNew
  handleUpdateRef.current = handleUpdate
  handleNewRef.current = handleNew
  currentPatchRef.current = currentPatch

  useEffect(() => {
    const onSave = () => {
      if (currentPatchRef.current) handleUpdateRef.current()
      else handleSaveAsNewRef.current()
    }
    const onSaveAs = () => handleSaveAsNewRef.current()
    const onNew = () => handleNewRef.current()
    document.addEventListener('designer:save-shortcut', onSave)
    document.addEventListener('designer:save-as-shortcut', onSaveAs)
    document.addEventListener('designer:new-shortcut', onNew)
    return () => {
      document.removeEventListener('designer:save-shortcut', onSave)
      document.removeEventListener('designer:save-as-shortcut', onSaveAs)
      document.removeEventListener('designer:new-shortcut', onNew)
    }
  }, [])

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
    withSavedCtx(ctx, () => {
    ctx.setTransform(W / ADSR_W, 0, 0, H / ADSR_H, 0, 0)

    ctx.fillStyle = themeColor('canvas-bg')
    ctx.fillRect(0, 0, ADSR_W, ADSR_H)

    ctx.strokeStyle = themeColor('canvas-grid-secondary')
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H - 0.5)
    ctx.lineTo(ADSR_W, ADSR_H - 0.5)
    ctx.stroke()

    // Remplissage : on suit la silhouette logique (ligne plateau à peakY,
    // pas à p1h.y qui est décalé visuellement vers le haut). P2→P3
    // horizontal pour matérialiser la phase sustain, puis release P3→P4.
    ctx.fillStyle = themeColor('accent-bg-medium')
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
    ctx.strokeStyle = themeColor('accent')
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
      ctx.fillStyle = themeColor('canvas-marker')
      ctx.fill()
      ctx.strokeStyle = themeColor('accent')
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    })
  }, [p1.x, p1.y, p1h.x, p1h.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y, peakY])

  // Sync canvas buffer ↔ container + draw. Sur Firefox, après `canvas.width = N`
  // le backing store est invalidé et alloué seulement sur le paint suivant —
  // les ops 2D entre les deux sont silencieusement avalées. Vérifié empiriquement :
  // `getImageData` retourne (0,0,0,0) en sync post-fillRect, devient correct
  // ~80ms plus tard. Single rAF tire AVANT le paint allocateur, donc insuffisant.
  // Double rAF : 1er rAF laisse le paint allocateur passer, 2e rAF dessine
  // sur un buffer alloué. Chromium n'a pas ce problème mais le double rAF
  // y est inoffensif (~32ms de latence au mount, invisible).
  useEffect(() => {
    const canvas = adsrCanvasRef.current
    const container = adsrContainerRef.current
    if (canvas && container) {
      const rect = container.getBoundingClientRect()
      const w = Math.floor(rect.width)
      const h = Math.floor(rect.height)
      if (w && h && (w !== canvas.width || h !== canvas.height)) {
        canvas.width = w
        canvas.height = h
      }
    }
    drawAdsr()
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => drawAdsr())
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [drawAdsr, activeTab])

  // iter-K phase-3.f15 : repaint waveform et ADSR au changement de thème.
  // Les deux canvas ne sont pas en RAF continu — ils se redrawent uniquement
  // sur changement de props. Sans ce listener, les anciennes couleurs
  // restent gravées jusqu'à la prochaine édition (point d'onde, ADSR slider).
  useEffect(() => {
    const repaint = () => {
      drawCanvas(pointsRef.current)
      drawAdsr()
    }
    window.addEventListener('themechange', repaint)
    return () => window.removeEventListener('themechange', repaint)
  }, [drawCanvas, drawAdsr])

  useEffect(() => {
    const container = adsrContainerRef.current
    const canvas = adsrCanvasRef.current
    if (!container || !canvas || typeof ResizeObserver === 'undefined') return
    let raf1 = 0
    let raf2 = 0
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        const h = Math.floor(entry.contentRect.height)
        if (!w || !h) continue
        if (w !== canvas.width || h !== canvas.height) {
          canvas.width = w
          canvas.height = h
          drawAdsr()
          cancelAnimationFrame(raf1)
          cancelAnimationFrame(raf2)
          raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => drawAdsr())
          })
        }
      }
    })
    ro.observe(container)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      ro.disconnect()
    }
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
  const commitDraftDefinition = () => {
    if (draftDefinition != null) {
      if (draftDefinition !== editor.cap) editorActions.setCap(draftDefinition)
      setDraftDefinition(null)
    }
  }
  const commitDraftAnchorCount = () => {
    if (draftAnchorCount != null) {
      if (draftAnchorCount !== anchors.length) editorActions.setAnchorCount(draftAnchorCount)
      setDraftAnchorCount(null)
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

  // iter-M phase-r.2.4 : contrôles du header de la zone Forme d'onde, partagés
  // entre les deux modes d'édition (Libre = tracé main levée ; Ancres =
  // spline). Le switch Libre/Ancres bascule `currentLens` entre 'free' et
  // 'spline'. En mode Ancres on ajoute le toggle Doux/Anguleux + le nombre
  // d'ancres (remonté ici depuis l'intérieur de SplineEditor). Pas de chemin
  // vers 'bars' : l'édition de barres se fait directement dans la zone
  // Harmoniques (toujours éditable).
  const renderWaveformHeaderControls = () => {
    const anchorCount = draftAnchorCount ?? anchors.length
    return (
      <>
        <div className="we-lens-switch" role="group" aria-label={STRINGS.editor.lensSwitchLabel}>
          <button
            type="button"
            className={`we-lens-btn${currentLens !== 'spline' ? ' is-active' : ''}`}
            onClick={() => editorActions.setCurrentLens('free')}
            aria-pressed={currentLens !== 'spline'}
          >{STRINGS.editor.lensFree}</button>
          <button
            type="button"
            className={`we-lens-btn${currentLens === 'spline' ? ' is-active' : ''}`}
            onClick={() => editorActions.setCurrentLens('spline')}
            aria-pressed={currentLens === 'spline'}
          >{STRINGS.editor.lensAnchors}</button>
        </div>
        {currentLens === 'spline' && (
          <>
            <div className="spline-interp-toggle" role="group" aria-label={STRINGS.editor.splineInterpolation}>
              <button
                type="button"
                className={`spline-interp-btn${interpolation !== 'hard' ? ' is-active' : ''}`}
                onClick={() => editorActions.setSplineInterpolation('soft')}
                title={STRINGS.editor.splineSoftTitle}
                aria-pressed={interpolation !== 'hard'}
              >{STRINGS.editor.splineSoft}</button>
              <button
                type="button"
                className={`spline-interp-btn${interpolation === 'hard' ? ' is-active' : ''}`}
                onClick={() => editorActions.setSplineInterpolation('hard')}
                title={STRINGS.editor.splineHardTitle}
                aria-pressed={interpolation === 'hard'}
              >{STRINGS.editor.splineHard}</button>
            </div>
            <label className="we-anchor-count" title={STRINGS.editor.anchorCountTitle}>
              <span className="we-anchor-count-label">{STRINGS.editor.anchorCount} :</span>
              <input
                type="range"
                min={SPLINE_ANCHOR_MIN}
                max={SPLINE_ANCHOR_MAX}
                step="1"
                value={anchorCount}
                onChange={(e) => setDraftAnchorCount(Number(e.target.value))}
                {...sliderCommitter(commitDraftAnchorCount)}
                className="we-anchor-count-slider"
                aria-label={STRINGS.editor.anchorCountTitle}
              />
              <span className="we-anchor-count-readout">{anchorCount} / {SPLINE_ANCHOR_MAX}</span>
            </label>
          </>
        )}
      </>
    )
  }

  // iter-M phase-r.2.4 : la colonne Forme d'onde a deux modes d'édition
  // exclusifs pilotés par le switch Libre/Ancres du header. Le header (switch +
  // extras spline) est partagé : rendu ici en mode Libre, passé à SplineEditor
  // via `headerControls` en mode Ancres.
  const renderCanvasArea = () => {
    if (currentLens === 'spline') {
      return (
        <SplineEditor
          points={points}
          anchors={anchors}
          interpolation={interpolation}
          onMoveAnchor={editorActions.moveSplineAnchor}
          onAddAnchor={editorActions.addSplineAnchor}
          onRemoveAnchor={editorActions.removeSplineAnchor}
          autoSizing={autoSizing}
          autoSizeFocusGuardRef={autoSizeFocusGuardRef}
          headerControls={renderWaveformHeaderControls()}
        />
      )
    }
    return (
      <div className="we-canvas-area" data-anchor="designer-waveform">
        <header className="we-area-header">
          <div className="we-header-left">
            <h3 className="we-area-title">{STRINGS.editor.waveformTitle}</h3>
          </div>
          <div className="spline-header-controls">
            {renderWaveformHeaderControls()}
          </div>
        </header>
        <div className="presets">
          <button onClick={() => loadPreset('sine')}>{STRINGS.presets.sine}</button>
          <button onClick={() => loadPreset('square')}>{STRINGS.presets.square}</button>
          <button onClick={() => loadPreset('sawtooth')}>{STRINGS.presets.sawtooth}</button>
          <button onClick={() => loadPreset('triangle')}>{STRINGS.presets.triangle}</button>
          <button onClick={clearCanvas}>{STRINGS.editor.clear}</button>
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
  }

  // iter-M phase-r.2.4 : colonne Harmoniques (centre du layout 3-vues). Éditeur
  // direct, TOUJOURS éditable (drag vertical = amplitude [0..1]), indépendant de
  // la lentille active — il n'y a plus de chemin vers 'bars'. Le header porte le
  // contrôle unique du `cap` (slider + readout « Harmoniques : N / 256 ») qui
  // remplace l'ancien NumberInput N + le slider Définition de la sidebar.
  const renderHarmonicsArea = () => {
    // Modèle unifié : les barres sont les magnitudes DFT de la canonical
    // tronquées au cap (déjà dérivées dans `amplitudes`).
    const bars = amplitudes
    return (
      <div className="we-harmonics-area" data-anchor="designer-harmonics">
        <header className="we-area-header">
          <div className="we-header-left">
            <h3 className="we-area-title">{STRINGS.editor.harmonicsTitle}</h3>
          </div>
          <div className="we-harmonics-controls">
            <label className="we-cap-control" title={STRINGS.editor.harmonicCountTitle}>
              <input
                type="range"
                min={CAP_MIN}
                max={CAP_MAX}
                step="1"
                value={definition}
                onChange={(e) => setDraftDefinition(Number(e.target.value))}
                {...sliderCommitter(commitDraftDefinition)}
                className="we-cap-slider"
                aria-label={STRINGS.editor.harmonicCountTitle}
              />
              <span className="we-cap-readout">
                <NumberInput
                  value={definition}
                  onChange={(v) => { setDraftDefinition(null); editorActions.setCap(v) }}
                  min={CAP_MIN}
                  max={CAP_MAX}
                  parse={parseDefinition}
                  format={formatDefinition}
                  className="we-cap-value-input"
                  ariaLabel={STRINGS.editor.harmonicCountTitle}
                />
                <span className="we-cap-suffix">/ {CAP_MAX}</span>
              </span>
            </label>
          </div>
        </header>
        <div
          className="we-harmonics-bars"
          ref={harmonicsContainerRef}
          onMouseDown={handleHarmonicMouseDown}
          onMouseMove={handleHarmonicMouseMove}
          onMouseUp={handleHarmonicMouseUp}
          onMouseLeave={handleHarmonicMouseLeave}
        >
          {bars.map((v, i) => (
            <div key={i} className="we-bar">
              <div
                className="we-bar-fill"
                style={{ height: `${Math.max(0, Math.min(1, v)) * 100}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // v1.1.0 : Row de contrôles Instrument (Catégorie / Système musical /
  // X-EDO / Repère / Tonique). Extrait en sous-fonction pour réutilisation
  // entre le rendu direct (>=950px) et le rendu dans la modale (<950px).
  // Le mot "musical" du label "Système musical" est wrappé dans un span
  // dédié pour pouvoir être masqué par CSS @media < 1170px (le label
  // wrappait à 2 lignes sur sidebar étroite).
  const renderInstrumentControls = () => (
    <div className="instrument-system-row" data-anchor="designer-system-selector">
      <div className="instrument-system-field">
        <span className="instrument-system-field-label">Catégorie</span>
        <ShortLabelSelect
          ariaLabel="Catégorie de système musical"
          value={getCategoryOfSystem(testTuningSystem)}
          options={Object.values(TUNING_CATEGORIES).map((cat) => ({
            id: cat.id,
            label: cat.label,
            shortLabel: cat.shortLabel,
          }))}
          onChange={(catId) => {
            const cat = TUNING_CATEGORIES[catId]
            if (!cat) return
            // Bascule vers le premier système de la nouvelle catégorie.
            editorActions.setTestTuningSystem(cat.systems[0])
          }}
        />
      </div>
      <div className="instrument-system-field">
        <span className="instrument-system-field-label">
          Système<span className="instrument-label-extension"> musical</span>
        </span>
        <ShortLabelSelect
          ariaLabel="Système musical"
          value={testTuningSystem}
          options={TUNING_CATEGORIES[getCategoryOfSystem(testTuningSystem)].systems.map((sysId) => ({
            id: sysId,
            label: TUNING_SYSTEMS[sysId].label,
            shortLabel: TUNING_SYSTEMS[sysId].shortLabel,
          }))}
          onChange={editorActions.setTestTuningSystem}
        />
      </div>
      {testTuningSystem === 'x-edo' && (
        <div
          className="instrument-system-field instrument-xedo-field"
          title={`Nombre de degrés du système X-EDO — flèches haut/bas pour ±1, +Shift pour ±5. Fourchette ${X_EDO_MIN}-${X_EDO_MAX}.`}
        >
          <span className="instrument-system-field-label">X</span>
          <XEdoInput value={xEdoN} onChange={editorActions.setXEdoN} className="xedo-input-designer" />
        </div>
      )}
      {showCuesBar && (
        <div className="instrument-system-field">
          <span className="instrument-system-field-label">Repère</span>
          <ShortLabelSelect
            ariaLabel="Repère pédagogique"
            value={visualCuePattern}
            options={Object.entries(VISUAL_CUE_PATTERNS).map(([id, pattern]) => ({
              id,
              label: pattern.label,
              shortLabel: pattern.shortLabel,
            }))}
            onChange={editorActions.setVisualCuePattern}
          />
        </div>
      )}
      {showCuesBar && visualCuePattern !== 'none' && cueTonicMax > 0 && (
        <div className="instrument-system-field instrument-tonic-field">
          <span className="instrument-system-field-label">Tonique</span>
          <ShortLabelSelect
            ariaLabel="Degré tonique"
            value={visualCueTonic}
            options={Array.from({ length: cueTonicMax }, (_, i) => ({
              id: i,
              label: String(i + 1),
              shortLabel: String(i + 1),
            }))}
            onChange={(deg) => editorActions.setVisualCueTonic(Number(deg))}
          />
        </div>
      )}
    </div>
  )

  const renderParamsArea = () => (
    <div className="we-params-area">
      <header className="we-area-header">
        <h3 className="we-area-title">Instrument</h3>
      </header>

      <div className="we-params-fields">
        {/* v1.1.0 : < 950 px, la row de contrôles est remplacée par un
            bouton qui ouvre une modale centrée avec les mêmes contrôles.
            La modale est dans le même arbre React (pas de portal) — son
            backdrop fixed couvre toute la fenêtre via z-index élevé. */}
        {instrumentCollapsed ? (
          <button
            type="button"
            className="instrument-collapse-trigger"
            onClick={() => setSystemModalOpen(true)}
            title="Ouvrir les paramètres du système musical"
          >
            <Sliders size={16} strokeWidth={2} />
            <span>Paramètres du système musical</span>
          </button>
        ) : (
          renderInstrumentControls()
        )}
        {instrumentCollapsed && systemModalOpen && (
          <div
            className="instrument-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="instrument-modal-title"
            onClick={() => setSystemModalOpen(false)}
          >
            <div className="instrument-modal" onClick={(e) => e.stopPropagation()}>
              <header className="instrument-modal-header">
                <h3 id="instrument-modal-title">Paramètres du système musical</h3>
                <button
                  type="button"
                  className="instrument-modal-close"
                  onClick={() => setSystemModalOpen(false)}
                  title="Fermer"
                  aria-label="Fermer"
                ><X size={14} strokeWidth={2.2} /></button>
              </header>
              <div className="instrument-modal-body">
                {renderInstrumentControls()}
              </div>
            </div>
          </div>
        )}

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
              {/* iter G phase 1.3 : bouton Test (mode Libre uniquement).
                  Calé sur testFrequency, raccourci 's'. mouseUp + mouseLeave
                  garantissent le release même si la souris quitte le bouton
                  avant le relâchement. onContextMenu désactivé pour éviter
                  un menu contextuel qui mange le mouseup. */}
              <button
                type="button"
                className={`free-test-btn${freeNoteActive ? ' is-active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); playFreeNote() }}
                onMouseUp={releaseFreeNote}
                onMouseLeave={() => { if (freeNoteActive) releaseFreeNote() }}
                onContextMenu={(e) => e.preventDefault()}
                title="Tester le son à la fréquence courante (touche s)"
                aria-pressed={freeNoteActive}
                data-anchor="designer-test-free-button"
              >
                {STRINGS.editor.test} <span className="free-test-shortcut">(s)</span>
              </button>
            </>
          ) : (
            <>
              {/* iter G phase 2.3 : Repère + Tonique migrés dans
                  instrument-system-row au-dessus (ligne unifiée). */}
              {testTuningSystem === 'x-edo' && (xEdoN === 12 || xEdoN === 24) && onConvertXEdoTo && (
                <div className="x-edo-banner" role="status">
                  <span className="x-edo-banner-text">
                    Correspond à {xEdoN === 12 ? '12-TET' : '24-TET équipartite'}.
                  </span>
                  {' '}
                  <button
                    type="button"
                    className="x-edo-banner-link"
                    onClick={() => onConvertXEdoTo(xEdoN === 12 ? '12-TET' : '24-tet-equal')}
                  >
                    Utiliser le layout dédié.
                  </button>
                </div>
              )}
              {/* iter G phase 2.5 : OctaveSelector au-dessus du clavier, avec
                  libellé "Octaves". Le clavier remplit ensuite l'espace
                  vertical disponible (we-keyboard-area est flex:1). La ligne
                  Note est ancrée en bas (margin-top:auto). */}
              <div className="we-octave-row" data-anchor="designer-octave-selector">
                <span className="we-octave-label">Octaves</span>
                <OctaveSelector
                  octave={testOctave}
                  onSelectOctave={editorActions.setTestOctave}
                />
              </div>
              <div className="we-keyboard-area" data-anchor="designer-keyboard">
                <PianoKeyboard
                  tuningSystem={testTuningSystem}
                  xEdoN={xEdoN}
                  noteIndex={testNoteIndex}
                  activeNotes={activeNoteIndices}
                  cuedNotes={cuedNotes}
                  onSelectNote={editorActions.setTestNoteIndex}
                  onKeyPress={playInstrumentNote}
                  onKeyRelease={releaseInstrumentNote}
                />
              </div>
              <div className="freq-label we-note-row">
                Note : <strong>{formatFreq(frequency)}</strong>
                <span className="note-display">
                  {' '}— {getNoteNames(getTuningSystem(testTuningSystem), xEdoN)?.[testNoteIndex] ?? ''}{testOctave}
                </span>
                {/* iter-L phase-1.4.a : pastille Sustain permanente. États
                    inactif (gris) / actif (orange, Espace maintenue) /
                    verrouillé (orange + cadenas). Clic = toggle verrou. */}
                <button
                  type="button"
                  className={`sustain-pastille${sustainActive ? ' is-active' : ''}${sustainLocked ? ' is-locked' : ''}`}
                  onClick={toggleSustainLock}
                  title={sustainLocked
                    ? 'Maintien verrouillé — clic pour relâcher'
                    : sustainActive
                      ? 'Maintien actif (Espace) — clic pour verrouiller'
                      : 'Maintien — clic pour verrouiller (Espace : maintenir)'}
                  aria-pressed={sustainActive}
                  data-anchor="designer-sustain-pastille"
                >
                  {STRINGS.adsr.sustain}
                  {sustainLocked && <Lock size={11} strokeWidth={2.5} aria-hidden="true" />}
                </button>
              </div>
            </>
          )}
        </div>

      </div>

    </div>
  )

  // Phase 1 (iter G) : panneau Actions extrait du bas de l'Instrument et
  // déplacé dans la sidebar gauche. Le children-API expose `renderActions`
  // pour qu'App.jsx le place entre la Bibliothèque et le MiniPlayer ; les
  // handlers handleNew/handleUpdate/handleSaveAsNew + saveMessage restent
  // encapsulés ici.
  const renderActions = ({ collapsed = false } = {}) => {
    if (collapsed) {
      return (
        <div className="designer-actions-icons">
          {/* Groupe 1 : patch actions */}
          <button
            type="button"
            className="actions-icon-btn new-btn-icon"
            onClick={handleNew}
            title="Nouveau patch (réinitialise l'éditeur)"
            aria-label="Nouveau"
            data-anchor="designer-new-button"
          ><Plus size={17} strokeWidth={2} /></button>
          {currentPatch && (
            <button
              type="button"
              className="actions-icon-btn update-btn-icon"
              onClick={handleUpdate}
              title="Mettre à jour le patch courant"
              aria-label="Mettre à jour"
              data-anchor="designer-save-button"
            ><Save size={16} strokeWidth={2} /></button>
          )}
          <button
            type="button"
            className="actions-icon-btn save-btn-icon"
            onClick={handleSaveAsNew}
            title={currentPatch ? 'Enregistrer comme nouveau patch' : 'Sauvegarder le patch'}
            aria-label="Enregistrer comme nouveau"
            data-anchor="designer-save-as-button"
          ><SaveAll size={16} strokeWidth={2} /></button>
          {/* Mini-séparateur entre les 3 sous-groupes (cohérent avec le mode
              ouvert qui sépare patch / historique / import-export). */}
          {(onUndo || onRedo) && (
            <>
              <div className="actions-mini-divider" aria-hidden="true" />
              <button
                type="button"
                className="actions-icon-btn"
                onClick={onUndo}
                disabled={!canUndo}
                title="Annuler (Ctrl+Z)"
                aria-label="Annuler"
                data-anchor="global-undo-button-designer"
              ><Undo2 size={16} strokeWidth={2} /></button>
              <button
                type="button"
                className="actions-icon-btn"
                onClick={onRedo}
                disabled={!canRedo}
                title="Rétablir (Ctrl+Shift+Z)"
                aria-label="Rétablir"
                data-anchor="global-redo-button-designer"
              ><Redo2 size={16} strokeWidth={2} /></button>
            </>
          )}
        </div>
      )
    }
    return (
      <div className="designer-actions-panel">
        <div className="designer-actions-header">Actions</div>
        <div className="designer-actions-row">
          {/* Groupe 1 : patch actions (G.2.8 : icônes 18-19 pour matcher
              les boutons 34×34). */}
          <div className="designer-actions-group">
            <button
              type="button"
              className="actions-icon-btn new-btn-icon"
              onClick={handleNew}
              title="Nouveau patch (réinitialise l'éditeur)"
              aria-label="Nouveau patch"
              data-anchor="designer-new-button"
            ><Plus size={19} strokeWidth={2} /></button>
            {currentPatch && (
              <button
                type="button"
                className="actions-icon-btn update-btn-icon"
                onClick={handleUpdate}
                title="Mettre à jour le patch courant"
                aria-label="Mettre à jour"
                data-anchor="designer-save-button"
              ><Save size={18} strokeWidth={2} /></button>
            )}
            <button
              type="button"
              className="actions-icon-btn save-btn-icon"
              onClick={handleSaveAsNew}
              title={currentPatch ? 'Enregistrer comme nouveau patch' : 'Sauvegarder le patch'}
              aria-label="Enregistrer comme nouveau"
              data-anchor="designer-save-as-button"
            ><SaveAll size={18} strokeWidth={2} /></button>
          </div>
          {/* Groupe 2 : historique Designer */}
          {(onUndo || onRedo) && (
            <div className="designer-actions-group">
              <button
                type="button"
                className="actions-icon-btn"
                onClick={onUndo}
                disabled={!canUndo}
                title="Annuler (Ctrl+Z)"
                aria-label="Annuler"
                data-anchor="global-undo-button-designer"
              ><Undo2 size={18} strokeWidth={2} /></button>
              <button
                type="button"
                className="actions-icon-btn"
                onClick={onRedo}
                disabled={!canRedo}
                title="Rétablir (Ctrl+Shift+Z)"
                aria-label="Rétablir"
                data-anchor="global-redo-button-designer"
              ><Redo2 size={18} strokeWidth={2} /></button>
            </div>
          )}
        </div>
        <div className="save-message-slot">
          {saveMessage && <span className="save-message">{saveMessage}</span>}
        </div>
      </div>
    )
  }

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
          <span>{STRINGS.adsr.sustain}</span>
          <NumberInput
            value={sustain}
            onChange={(v) => commitInputAdsr('sustain', v)}
            min={0}
            max={1}
            parse={parsePercent}
            format={formatPercent}
            className="adsr-value-input"
            ariaLabel={`${STRINGS.adsr.sustain} en pourcentage`}
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

    // iter-M phase-r.2.4 : le slider Définition (cap) a migré dans le header de
    // la zone Harmoniques (contrôle unique). Plus de double UI cap.

    // L'amplitude vit dans son propre draft (draftAmp / commitDraftAmp).
    // Slider rendu inline ici pour partager le layout colonne avec A/D/S/R
    // sans le forcer dans le pipeline draftAdsr.
    const renderAmpSlider = () => (
      <div className="adsr-slider" data-anchor="designer-amplitude">
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
      <div className="we-adsr-area" data-anchor="designer-adsr">
        <header className="we-area-header">
          <h3 className="we-area-title">Enveloppe AHDSR</h3>
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
            {renderMsSlider('attack', STRINGS.adsr.attack)}
            {renderMsSlider('hold', STRINGS.adsr.hold)}
            {renderMsSlider('decay', STRINGS.adsr.decay)}
            {renderSustainSlider()}
            {renderMsSlider('release', STRINGS.adsr.release)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {children({ renderCanvasArea, renderHarmonicsArea, renderParamsArea, renderAdsrArea, renderActions, patchLabel, openPresetPicker, requestResetWaveform, normalizeWaveform })}
      <ConfirmDialog
        open={confirmNewOpen}
        title="Nouveau patch ?"
        message="Modifications non sauvegardées, continuer ?"
        confirmLabel="Continuer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={doNew}
        onCancel={() => setConfirmNewOpen(false)}
      />
      {/* iter-M phase-r.2.2 : confirmation du Reset du timbre (barre du haut). */}
      <ConfirmDialog
        open={confirmResetWaveformOpen}
        title="Réinitialiser le timbre ?"
        message="Tracé, harmoniques et ancres reviendront à leur état neutre (sinusoïde fondamentale)."
        confirmLabel="Réinitialiser"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={doResetWaveform}
        onCancel={() => setConfirmResetWaveformOpen(false)}
      />
      {/* iter-M phase-4 : picker de presets de timbre + garde-fou dirty. */}
      {presetPickerOpen && (
        <PresetPicker
          onPick={handlePickPreset}
          onClose={() => setPresetPickerOpen(false)}
        />
      )}
      <ConfirmDialog
        open={pendingPresetPatch !== null}
        title={STRINGS.timbrePresets.dirtyConfirmTitle}
        message={STRINGS.timbrePresets.dirtyConfirmBody}
        confirmLabel={STRINGS.timbrePresets.dirtyConfirmLoad}
        cancelLabel={STRINGS.timbrePresets.dirtyConfirmCancel}
        variant="danger"
        onConfirm={confirmLoadPreset}
        onCancel={() => setPendingPresetPatch(null)}
      />
    </>
  )
}

export default WaveformEditor
