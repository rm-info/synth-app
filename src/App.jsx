import { useReducer, useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Library, Play, Square, X } from 'lucide-react'
import useWindowSize from './hooks/useWindowSize'
import WaveformEditor from './components/WaveformEditor'
import Timeline from './components/Timeline'
import Tabs from './components/Tabs'
import PatchBank from './components/PatchBank'
import PatchPicker from './components/PatchPicker'
import MiniPlayer from './components/MiniPlayer'
import Toolbar from './components/Toolbar'
import PropertiesPanel from './components/PropertiesPanel'
import Spectrogram from './components/Spectrogram'
import DesignerColumns from './components/DesignerColumns'
import DesignerModule from './components/DesignerModule'
import DesignerToolbar from './components/DesignerToolbar'
import SidebarResizer from './components/SidebarResizer'
import PopupResizer from './components/PopupResizer'
import RecentPatchesList from './components/RecentPatchesList'
import SavePatchDialog from './components/SavePatchDialog'
import DeleteUsageWarningDialog from './components/DeleteUsageWarningDialog'
import ConfirmDialog from './components/ConfirmDialog'
import ShortcutsOverlay from './components/ShortcutsOverlay'
import DocumentationTab from './components/DocumentationTab'
import Tour from './components/Tour'
import { DESIGNER_MOBILE_ORDER } from './lib/designerModules'
import { STRINGS } from './lib/strings'
import {
  reducer,
  withUndo,
  buildInitialState,
  STORAGE_KEY,
  DOC_SESSION_KEY,
  BEATS_PER_MEASURE,
  MIN_ZOOM_H,
  MAX_ZOOM_H,
  MIN_TRACK_HEIGHT,
  MAX_TRACK_HEIGHT,
  MAX_TRACKS,
  DEFAULT_TRACK_ID,
  COMPOSER_SIDEBAR_MIN_WIDTH,
  COMPOSER_LAYOUT_CHROME,
  COMPOSER_MAIN_MIN_WIDTH,
  COMPOSER_SIDEBAR_COLLAPSED_WIDTH,
  DESIGNER_SIDEBAR_MIN_WIDTH,
  DESIGNER_SIDEBAR_COLLAPSED_WIDTH,
  canSplitClip,
  getDescendantFolderIds,
  editorTestNoteFields,
} from './reducer'
import { canMergeClips } from './lib/timelineLayout'
import { getKeyboardMap, getNoteNames, getTuningSystem } from './lib/tuningSystems'
import { xEdoShiftedKeyboardMapForN } from './lib/xEdoLayouts'
import { NOTE_GUARD_KEYS } from './lib/keyboardCandidates'
import { matchesShortcut } from './lib/shortcuts'
import {
  DURATION_BASES, DURATION_COEFS,
  deriveBaseAndCoef, effectiveDuration, isValidCoef,
} from './lib/durations'
import Toast from './components/Toast'
import ExportModal from './components/ExportModal.jsx'
import ImportModal from './components/ImportModal.jsx'
import {
  encodeOsa, decodeOsa,
  OsaMagicError, OsaCorruptError, OsaParseError, OsaSchemaError,
} from './lib/osaFormat.js'
import { buildExportPayload, EmptyExportError, applyImport } from './lib/libraryTransfer.js'
import { usePlayback } from './hooks/usePlayback'
import { highlightElement } from './lib/highlightElement'
import './App.css'
import './styles/highlight.css'

const wrappedReducer = withUndo(reducer)

// iter-O phase-5d : sous ce seuil de largeur (desktop étroit), l'auto-réduction
// est EFFECTIVEMENT active même toggle off — sinon les modules d'une rangée se
// replient tous en bande « … » faute de place. Calibrable au test.
const AUTO_COLLAPSE_DEFAULT_WIDTH = 1100
// iter-P phase-6.1 : sous ce seuil (desktop étroit, hors accordéon), on ne garde
// ouverts que l'« essentiel » (Forme d'onde + Instrument) et on replie le reste —
// automatiquement, par franchissement de seuil ; tout rouvert au-dessus. Constante
// dédiée (= seuil d'auto-collapse forcé), réglable indépendamment.
const ESSENTIALS_WIDTH = AUTO_COLLAPSE_DEFAULT_WIDTH

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// iter-N phase-1.4.3 : réduction du payload localStorage. `canonical`(600) +
// `residual`(600) en floats pleine précision pèsent ~24 Ko JSON/patch. On les
// arrondit à 4 décimales **au seul point de sérialisation localStorage** ; le
// modèle en mémoire reste en pleine précision, et l'export `.osa`
// (buildExportPayload depuis state) n'emprunte pas ce chemin → non affecté.
// 1e-4 = notre HARMONIC_EPSILON (N.1.2) → sous le plancher audible et sous-pixel.
// Idempotent (round∘round = round) → pas de dérive au cycle reload→resave ;
// JSON.stringify sérialise alors la repr. courte (« 0.1235 »).
const round4 = (x) => Math.round(x * 1e4) / 1e4
function patchForStorage(p) {
  return {
    ...p,
    canonical: Array.isArray(p.canonical) ? p.canonical.map(round4) : p.canonical,
    residual: Array.isArray(p.residual) ? p.residual.map(round4) : p.residual,
  }
}

function App() {
  const [state, dispatch] = useReducer(wrappedReducer, undefined, buildInitialState)
  const {
    clips, patches, soundFolders, tracks, bpm, numMeasures, a4Ref, xEdoN,
    editor, activeTab, currentPatchId, zoomH, defaultClipDuration,
    spectrogramVisible, spectrogramDbScale, spectrogramPeakHold, spectrogramMode,
    durationMode, adsrView, selectedClipIds, selectedTrackId, composerFlash, lastAnchorClipId,
    composerBankWidth, composerAsideWidth, composerBankCollapsed, composerAsideCollapsed,
    designerSidebarWidth, designerSidebarCollapsed, designerColumnWidths, designerBottomRowWidths,
    designerCollapsed, maximized, autoCollapse, designerMobileModule,
    doc, docSidebarWidth, docSidebarCollapsed,
    bibHierarchyMode, bibDisplayMode, bibCurrentFolderId, bibPopupWidth,
    bibSelectedIds, bibSelectionAnchor, bibCollapsedFolders,
    recentPatchIds, theme,
    patchCounter, clipCounter, folderCounter, trackCounter,
    clipboard, measureClipboard, bibClipboard, history, notification,
    pendingDeleteWarning, shortcutsOverlayOpen, tour,
  } = state

  const editorRef = useRef(null)

  const analyserRef = useRef(null)
  const activeVoicesCountRef = useRef(0)

  const timelineMouseRef = useRef(null)

  // Raccourcis clavier E.4 (Composer) : note physique maintenue → override de
  // la hauteur au drop d'un patch. State pour le feedback visuel, ref pour la
  // lecture synchrone au drop (qui se passe hors rendu React).
  const pressedNoteKeyRef = useRef(null)
  const [pressedNoteKey, setPressedNoteKey] = useState(null)

  // ConfirmDialog : états pour remplacer window.confirm() natif.
  // Forme : null | { title, message, variant, confirmLabel, cancelLabel, onConfirm }
  // Déclaré en tête de composant car utilisé dans useCallback définis plus bas.
  const [confirmDialog, setConfirmDialog] = useState(null)
  const openConfirm = useCallback(({ title, message, variant = 'default', confirmLabel, cancelLabel, onConfirm }) => {
    setConfirmDialog({ title, message, variant, confirmLabel, cancelLabel, onConfirm })
  }, [])
  const closeConfirm = useCallback(() => setConfirmDialog(null), [])

  // Vrai pendant qu'un drag HTML5 est en cours (drag depuis la banque vers
  // la timeline). Permet au keyup d'ignorer le cas où l'utilisateur vient de
  // drop une note sous touche maintenue — le drop est déjà passé.
  const dragInProgressRef = useRef(false)

  const trackHeight = tracks[0]?.height ?? 80

  const nextPatchName = `Patch ${patchCounter + 1}`

  const totalBeats = numMeasures * BEATS_PER_MEASURE
  const totalDurationSec = (totalBeats * 60) / bpm

  const playback = usePlayback({ clips, patches, tracks, bpm, a4Ref, xEdoN, totalDurationSec })

  const currentPatch = useMemo(
    () => (currentPatchId ? patches.find((p) => p.id === currentPatchId) ?? null : null),
    [currentPatchId, patches],
  )

  const editorFrequency = (() => {
    if (editor.testTuningSystem === 'free') return editor.testFrequency
    const sys = getTuningSystem(editor.testTuningSystem)
    return sys.freq ? sys.freq(editor.testNoteIndex, editor.testOctave, a4Ref, xEdoN) : editor.testFrequency
  })()

  // Label affiché dans la toolbar Composer quand une touche de note est
  // maintenue (E.4.1). Lit les noms du système courant pour gérer les
  // tempéraments à plus de 12 notes (ex. 24-TET en F.3, X-EDO en F.8).
  const pressedNoteLabel = pressedNoteKey !== null
    ? `${getNoteNames(getTuningSystem(editor.testTuningSystem), xEdoN)?.[pressedNoteKey] ?? ''}${editor.testOctave}`
    : null

  // === Effets de bord ===

  const { isPlaying: pbIsPlaying, updateTrackGains } = playback
  useEffect(() => {
    if (pbIsPlaying) updateTrackGains(tracks)
  }, [tracks, pbIsPlaying, updateTrackGains])

  useEffect(() => {
    if (!composerFlash) return
    const t = setTimeout(() => dispatch({ type: 'SET_COMPOSER_FLASH', payload: null }), 3000)
    return () => clearTimeout(t)
  }, [composerFlash])

  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', payload: null }), 4500)
    return () => clearTimeout(t)
  }, [notification])

  // iter-L phase-1.6 : Ctrl+K toggle overlay raccourcis. preventDefault
  // impératif (Ctrl+K = focus barre d'adresse Firefox/Chrome). Skip si
  // une modale est ouverte (DOM heuristic : tout backdrop `*-backdrop`
  // visible ; l'overlay lui-même n'en a pas, sa fermeture reste pilotable).
  const setShortcutsOverlay = useCallback((open) => {
    dispatch({ type: 'SET_SHORTCUTS_OVERLAY', payload: open })
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (!matchesShortcut(e, 'global-shortcuts')) return
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return
      // Skip si modale ouverte (focus ailleurs, ne pas surcharger).
      // Pattern de detection : tout backdrop visible — couvre Modal.jsx,
      // ConfirmDialog, SavePatchDialog, DeleteUsageWarningDialog.
      if (document.querySelector('.modal-backdrop, .confirm-dialog-backdrop, .save-dialog-backdrop, .delete-warning-backdrop')) return
      e.preventDefault()
      setShortcutsOverlay(!shortcutsOverlayOpen)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcutsOverlayOpen, setShortcutsOverlay])

  // iter-L phase-4.4 : Ctrl/Cmd+J démarre la visite guidée de l'onglet actif.
  // preventDefault impératif (Ctrl+J = ouvre les téléchargements sur Firefox/
  // Chrome). Mêmes exclusions que Ctrl+K (form field, modale ouverte, overlay
  // raccourcis), plus skip si un tour tourne déjà (par sécurité — le gel
  // clavier du tour absorbe normalement la frappe en amont).
  useEffect(() => {
    const handler = (e) => {
      // Ctrl/Cmd exactement un des deux (cohérent matchModifiers), sans Shift/Alt.
      if (e.ctrlKey === e.metaKey || e.shiftKey || e.altKey) return
      if ((e.key || '').toLowerCase() !== 'j') return
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return
      if (document.querySelector('.modal-backdrop, .confirm-dialog-backdrop, .save-dialog-backdrop, .delete-warning-backdrop')) return
      if (shortcutsOverlayOpen) return
      if (tour.active) return
      e.preventDefault()
      dispatch({ type: 'START_TOUR', payload: activeTab })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, shortcutsOverlayOpen, tour.active])

  useEffect(() => {
    const handler = (e) => {
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return
      const isUndo = matchesShortcut(e, 'global-undo')
      const isRedo = matchesShortcut(e, 'global-redo')
      if (!isUndo && !isRedo) return
      e.preventDefault()
      const undoAction = {
        library: 'UNDO_LIBRARY',
        designer: 'UNDO_DESIGNER',
        composer: 'UNDO_COMPOSER',
      }[activeTab]
      const redoAction = {
        library: 'REDO_LIBRARY',
        designer: 'REDO_DESIGNER',
        composer: 'REDO_COMPOSER',
      }[activeTab]
      const action = isUndo ? undoAction : redoAction
      if (action) dispatch({ type: action })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab])

  // Raccourcis clavier Designer : Ctrl+S (save), Ctrl+Alt+S (save as), Ctrl+Alt+N (new).
  // Gating actif : ne fire que si activeTab === 'designer'.
  useEffect(() => {
    const handler = (e) => {
      if (activeTab !== 'designer') return
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return
      if (matchesShortcut(e, 'designer-save')) {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('designer:save-shortcut'))
        return
      }
      if (matchesShortcut(e, 'designer-save-as')) {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('designer:save-as-shortcut'))
        return
      }
      if (matchesShortcut(e, 'designer-new')) {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('designer:new-shortcut'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isDelete = matchesShortcut(e, 'composer-delete')
      // C2 (Escape Composer désélectionner) : ergo standard, hors SHORTCUTS.
      const isEscape = e.key === 'Escape'
      if (!isDelete && !isEscape) return
      if (selectedClipIds.length === 0) return
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return
      e.preventDefault()
      if (isDelete) {
        dispatch({ type: 'DELETE_SELECTED_CLIPS' })
      } else {
        dispatch({ type: 'SELECT_CLIPS', payload: [] })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipIds])

  // Flèches clavier : ajustement rapide note (↑↓) et position (←→).
  // ↑↓ : ±1 demi-ton (passage d'octave auto), Shift = ±1 octave. Affecte
  // uniquement les clips 12-TET de la sélection (les free sont ignorés).
  // ←→ : ±0.125 beat (triple croche, aligné sur le snap), Shift = ±1 beat.
  // Affecte tous les clips sélectionnés.
  // Groupe bloqué si le clip le plus contraint ne peut pas bouger.
  useEffect(() => {
    const handler = (e) => {
      // Quatre raccourcis Composer sur même geste : ↑↓ ±1 demi-ton, Shift+↑↓
      // ±1 octave, ←→ ±0.125 beat, Shift+←→ ±1 beat. Le matcher filtre
      // strictement les modifiers (Ctrl/Alt absents → must be off), ce qui
      // exclut les combos Ctrl+↑/↓ et autres surprises navigateur.
      const isArrow = matchesShortcut(e, 'composer-pitch-arrow')
        || matchesShortcut(e, 'composer-pitch-shift')
        || matchesShortcut(e, 'composer-pos-arrow')
        || matchesShortcut(e, 'composer-pos-shift')
      if (!isArrow) return
      if (activeTab !== 'composer') return
      if (selectedClipIds.length === 0) return

      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return

      // Skip si un menu contextuel de la timeline est ouvert (évite que
      // les flèches naviguent dans le menu pendant qu'on l'édite).
      if (document.querySelector('.timeline-context-menu')) return

      // Skip si un drag est en cours (curseur explicite posé par Timeline).
      const bodyCursor = document.body.style.cursor
      if (bodyCursor === 'grabbing' || bodyCursor === 'copy' || bodyCursor === 'ew-resize') return

      const selectedList = clips.filter((c) => selectedClipIds.includes(c.id))
      if (selectedList.length === 0) return

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Pitch : ignore les clips free (mode libre s'édite via l'input Hz).
        const twelveTet = selectedList.filter((c) => c.tuningSystem !== 'free')
        if (twelveTet.length === 0) return

        const direction = e.key === 'ArrowUp' ? 1 : -1
        const deltaReq = direction * (e.shiftKey ? 12 : 1)

        // Bornes intersectées : midi ∈ [12, 143] (C0..B10).
        let minDelta = -Infinity
        let maxDelta = Infinity
        for (const c of twelveTet) {
          const midi = (c.octave + 1) * 12 + c.noteIndex
          minDelta = Math.max(minDelta, 12 - midi)
          maxDelta = Math.min(maxDelta, 143 - midi)
        }
        if (deltaReq < minDelta || deltaReq > maxDelta) {
          e.preventDefault()
          return
        }

        e.preventDefault()
        const updates = twelveTet.map((c) => {
          const midi = (c.octave + 1) * 12 + c.noteIndex + deltaReq
          return {
            id: c.id,
            noteIndex: ((midi % 12) + 12) % 12,
            octave: Math.floor(midi / 12) - 1,
          }
        })
        dispatch({ type: 'UPDATE_CLIPS_PITCH', payload: updates })
        return
      }

      // Déplacement temporel : s'applique à tous (indépendant du tuningSystem).
      const direction = e.key === 'ArrowRight' ? 1 : -1
      const deltaReq = direction * (e.shiftKey ? 1 : 0.125)

      let minDelta = -Infinity
      let maxDelta = Infinity
      for (const c of selectedList) {
        const start = (c.measure - 1) * BEATS_PER_MEASURE + c.beat
        minDelta = Math.max(minDelta, -start)
        maxDelta = Math.min(maxDelta, totalBeats - start - c.duration)
      }
      if (deltaReq < minDelta || deltaReq > maxDelta) {
        e.preventDefault()
        return
      }

      e.preventDefault()
      const moves = selectedList.map((c) => {
        const newStart = (c.measure - 1) * BEATS_PER_MEASURE + c.beat + deltaReq
        const measure = Math.floor(newStart / BEATS_PER_MEASURE) + 1
        const beat = Math.round((newStart - (measure - 1) * BEATS_PER_MEASURE) / 0.125) * 0.125
        return { id: c.id, measure, beat }
      })
      dispatch({ type: 'MOVE_CLIPS', payload: moves })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, selectedClipIds, clips, totalBeats])

  // PageUp/PageDown décalent `editor.testOctave` (±1, bornes [0, 10]). Actif
  // en Designer ET en Composer (octave partagée via state.editor.testOctave).
  // Skip form fields et combos Ctrl/Alt/Cmd (navigation d'onglet navigateur).
  // e.repeat autorisé : maintenir la touche traverse les octaves.
  const testOctaveRef = useRef(editor.testOctave)
  useEffect(() => {
    testOctaveRef.current = editor.testOctave
  }, [editor.testOctave])

  useEffect(() => {
    const isFormField = (target) => {
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      return !!target?.isContentEditable
    }

    const onKeyDown = (e) => {
      if (isFormField(e.target)) return
      if (!matchesShortcut(e, 'editor-octave')) return
      // e.repeat autorisé : maintenir la touche traverse les octaves (pas de
      // guard ici, contrairement aux notes ou au sustain).
      e.preventDefault()
      const cur = testOctaveRef.current
      if (e.key === 'PageUp' && cur < 10) {
        dispatch({ type: 'SET_EDITOR_TEST_OCTAVE', payload: cur + 1 })
      } else if (e.key === 'PageDown' && cur > 0) {
        dispatch({ type: 'SET_EDITOR_TEST_OCTAVE', payload: cur - 1 })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Suivi de la touche de note maintenue dans le Composer (phase E.4.1) +
  // placement contigu au relâchement si aucun drag n'est en cours (E.4.2).
  //
  // Listener toujours monté mais gaté par activeTab côté keydown (on veut
  // que keyup nettoie l'état même après un changement d'onglet imprévu).
  useEffect(() => {
    const isFormField = (target) => {
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      return !!target?.isContentEditable
    }

    const onKeyDown = (e) => {
      if (activeTab !== 'composer') return
      if (isFormField(e.target)) return
      // Modificateurs OS / a11y laissés passer : Ctrl+F, Cmd+W, Alt-shortcuts
      // screen reader. Shift est traité plus bas après le guard navigateur :
      // il est réservé aux durées (F.3.4) et n'a pas de sémantique note ici,
      // mais le preventDefault doit déjà avoir bloqué un éventuel raccourci.
      if (e.ctrlKey || e.altKey || e.metaKey) return
      // Posture mode note (F.7.5) : preventDefault SYSTÉMATIQUEMENT sur les
      // touches candidates, indépendamment du système courant. Bloque
      // Firefox QuickFind sur ' (Digit4 AZERTY) en 12-TET, et autres
      // raccourcis surprise sur ponctuations. F.3.6 conditionnait ce
      // preventDefault au lookup keyboardMap — fix incomplet.
      if (NOTE_GUARD_KEYS.has(e.code)) e.preventDefault()
      // F.8.2.2 : en mode SHIFT_ANCHOR (X-EDO N≥44), Shift+touche désigne
      // le degré "shifted" pour le placement contigu ; sinon Shift est
      // réservé aux durées Composer (F.3.4). Pas de collision : les
      // layouts SHIFT_ANCHOR n'utilisent pas la rangée digit.
      const sys = getTuningSystem(editor.testTuningSystem)
      const useShiftMode = editor.testTuningSystem === 'x-edo' && xEdoN >= 44
      const keyboardMap = e.shiftKey
        ? (useShiftMode ? xEdoShiftedKeyboardMapForN(xEdoN) : null)
        : getKeyboardMap(sys, xEdoN)
      if (!keyboardMap) return
      const idx = keyboardMap[e.code]
      if (idx === undefined) return
      if (e.repeat) return
      pressedNoteKeyRef.current = idx
      setPressedNoteKey(idx)
    }

    const onKeyUp = (e) => {
      // Pas de check activeTab côté keyup : on veut que le clean s'applique
      // même si l'utilisateur a changé d'onglet entre-temps.
      if (isFormField(e.target)) return
      // F.8.2.2 : on tente le mapping base ET shifted pour rattraper les
      // cas où Shift a été relâché entre keydown et keyup.
      const sys = getTuningSystem(editor.testTuningSystem)
      const baseMap = getKeyboardMap(sys, xEdoN)
      const useShiftMode = editor.testTuningSystem === 'x-edo' && xEdoN >= 44
      const shiftedMap = useShiftMode ? xEdoShiftedKeyboardMapForN(xEdoN) : null
      const idx = baseMap?.[e.code] ?? shiftedMap?.[e.code]
      if (idx === undefined) return

      const wasActive = pressedNoteKeyRef.current === idx
      // Toujours nettoyer le ref (même pendant un drag), pour qu'un drop
      // ultérieur n'utilise pas une touche déjà relâchée.
      pressedNoteKeyRef.current = null
      setPressedNoteKey(null)

      if (!wasActive) return
      if (activeTab !== 'composer') return
      // Drag en cours (HTML5 drag depuis la banque, ou drag interne) → pas de
      // placement contigu. Le drop ultérieur a déjà eu sa chance.
      if (dragInProgressRef.current) return
      const bodyCursor = document.body.style.cursor
      if (bodyCursor === 'grabbing' || bodyCursor === 'copy' || bodyCursor === 'ew-resize') return
      if (document.querySelector('.timeline-context-menu')) return

      // Placement contigu : cherche l'anchor (dernier clip touché).
      const anchor = lastAnchorClipId
        ? clips.find((c) => c.id === lastAnchorClipId)
        : null
      if (!anchor) return // silent : pas d'ancre → rien à placer

      // iter G phase 2.4 : le placement contigu reprend le **système du
      // clip référent** (pas celui de l'éditeur). On ré-résout e.code via
      // le keyboardMap du système de l'anchor : si la touche n'y est pas
      // mappée, no-op silencieux. Cas Libre : la touche 's' déclenche
      // un test côté Designer mais ne produit pas de clip contigu (les
      // clips Libre se placent à la souris).
      if (anchor.tuningSystem === 'free') return
      const anchorSys = getTuningSystem(anchor.tuningSystem)
      const anchorMap = getKeyboardMap(anchorSys, xEdoN)
      const anchorIdx = anchorMap?.[e.code]
      if (anchorIdx === undefined) return

      const endBeat = (anchor.measure - 1) * BEATS_PER_MEASURE + anchor.beat + anchor.duration
      const snapped = Math.round(endBeat / 0.125) * 0.125
      const duration = defaultClipDuration
      const newEnd = snapped + duration
      const neededMeasures = Math.ceil(newEnd / BEATS_PER_MEASURE)
      const extraMeasures = Math.max(0, neededMeasures - numMeasures)
      const measure = Math.floor(snapped / BEATS_PER_MEASURE) + 1
      const beat = snapped - (measure - 1) * BEATS_PER_MEASURE

      dispatch({
        type: 'ADD_CLIP',
        payload: {
          patchId: anchor.patchId,
          trackId: anchor.trackId,
          measure,
          beat,
          duration,
          tuningSystem: anchor.tuningSystem,
          noteIndex: anchorIdx,
          octave: editor.testOctave,
          frequency: null,
          extraMeasures,
        },
      })
    }

    const onDragStart = () => { dragInProgressRef.current = true }
    const onDragEnd = () => { dragInProgressRef.current = false }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    // Capture phase pour dragstart/dragend : les handlers internes de
    // PatchBank appellent stopPropagation(), ce qui empêcherait un listener
    // bubble sur window d'être appelé. La phase capture fire AVANT le target,
    // donc elle voit toujours l'événement.
    window.addEventListener('dragstart', onDragStart, true)
    window.addEventListener('dragend', onDragEnd, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('dragstart', onDragStart, true)
      window.removeEventListener('dragend', onDragEnd, true)
    }
  }, [activeTab, clips, lastAnchorClipId, defaultClipDuration, numMeasures, editor.testOctave, editor.testTuningSystem, xEdoN])

  // Raccourcis durée (Composer) :
  //   NumPad1..7         → bases (Carrée .. Triple croche).
  //   NumPad8/9/0        → coefs (×1.25, Pointé, Double-pointé).
  //   Shift+Digit1..7    → bases (fallback laptop sans pavé).
  //   Shift+Digit8/9/0   → coefs (idem).
  // Les Digit sans Shift sont libérés (réservés aux notes 24-TET, F.3).
  // Skip form fields et combos Ctrl/Alt/Meta (Ctrl+9 = zoom navigateur).
  useEffect(() => {
    if (activeTab !== 'composer') return

    const isFormField = (target) => {
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      return !!target?.isContentEditable
    }

    // Décode l'event vers un rang 1..10, ou null si la touche n'est pas un
    // raccourci durée. Rangs 1..7 = bases, 8..10 = coefs (×1.25, Pointé, ××).
    // Numpad sans Shift OU Digit avec Shift uniquement.
    const decodeRank = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return null
      const numpad = e.code.match(/^Numpad([0-9])$/)
      if (numpad && !e.shiftKey) {
        const n = Number(numpad[1])
        return n === 0 ? 10 : n
      }
      const digit = e.code.match(/^Digit([0-9])$/)
      if (digit && e.shiftKey) {
        const n = Number(digit[1])
        return n === 0 ? 10 : n
      }
      return null
    }

    const onKeyDown = (e) => {
      if (isFormField(e.target)) return
      if (e.repeat) return
      // Gate via matchesShortcut : exclut Ctrl/Alt/Meta strictement. decodeRank
      // extrait ensuite le rang numérique (1..10), info dont matchesShortcut
      // ne dispose pas (le matcher rend un booléen).
      if (!matchesShortcut(e, 'composer-duration-base')
        && !matchesShortcut(e, 'composer-duration-coef')) return
      const rank = decodeRank(e)
      if (rank == null) return

      if (rank >= 1 && rank <= 7) {
        const b = DURATION_BASES.find((x) => x.rank === rank)
        if (!b) return
        e.preventDefault()
        const { coef: curCoef } = deriveBaseAndCoef(defaultClipDuration)
        const keep = curCoef != null && isValidCoef(b.value, curCoef) ? curCoef : null
        dispatch({
          type: 'SET_DEFAULT_CLIP_DURATION',
          payload: effectiveDuration(b.value, keep),
        })
        return
      }
      // Coefs (rangs 8/9/10).
      const c = DURATION_COEFS.find((x) => x.rank === rank)
      if (!c) return
      e.preventDefault()
      const { base: curBase, coef: curCoef } = deriveBaseAndCoef(defaultClipDuration)
      const base = curBase ?? 1
      if (curCoef === c.value) {
        dispatch({ type: 'SET_DEFAULT_CLIP_DURATION', payload: effectiveDuration(base, null) })
        return
      }
      if (!isValidCoef(base, c.value)) return
      dispatch({ type: 'SET_DEFAULT_CLIP_DURATION', payload: effectiveDuration(base, c.value) })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTab, defaultClipDuration])

  // Persistance localStorage.
  useEffect(() => {
    // iter-L phase-4.4 : pendant un tour, l'app est gelée — les seules
    // mutations possibles (onglet, sidebars dépliées par le tour) sont
    // volatiles et restaurées à END_TOUR. On ne les persiste pas, sinon un
    // refresh en plein tour laisserait une sidebar ouverte côté utilisateur.
    if (tour.active) return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          patches: patches.map(patchForStorage),
          soundFolders,
          tracks,
          clips,
          bpm,
          numMeasures,
          a4Ref,
          xEdoN,
          spectrogramVisible,
          spectrogramDbScale,
          spectrogramPeakHold,
          spectrogramMode,
          durationMode,
          adsrView,
          activeTab,
          patchCounter,
          clipCounter,
          folderCounter,
          trackCounter,
          composerBankWidth,
          composerAsideWidth,
          composerBankCollapsed,
          composerAsideCollapsed,
          designerSidebarWidth,
          designerSidebarCollapsed,
          // iter-M phase-2 : proportions des 3 colonnes Designer (haut).
          designerColumnWidths,
          // iter-P phase-6.2 : proportions de la rangée du bas (Instrument /
          // AHDSR / Modulation).
          designerBottomRowWidths,
          // iter-O phase-5a : modules Designer repliés (préférence UI).
          designerCollapsed,
          // iter-O phase-5b : module maximisé (préférence UI).
          maximized,
          // iter-O phase-5d : politique d'auto-réduction (préférence UI).
          autoCollapse,
          // iter-R phase-1.1 : module plein cadre en petit écran (switcher).
          designerMobileModule,
          // iter-L phase-2.1 : préférences sidebar Documentation (collapsed
          // + largeur). La position de lecture (article courant + scrolls)
          // est gérée séparément via sessionStorage.
          docSidebarWidth,
          docSidebarCollapsed,
          bibHierarchyMode,
          bibDisplayMode,
          bibCurrentFolderId,
          bibCollapsedFolders,
          bibPopupWidth,
          recentPatchIds,
          theme,
          // iter-L phase-1.4.b : piste sélectionnée Composer (persistée pour
          // que le fallback "Coller sur piste sélectionnée" survive au reload).
          selectedTrackId,
          // F.4.4.3 : état d'exploration Designer persisté de bout en bout.
          // Chaque presse-touche dispatch un SET_EDITOR_TEST_NOTE qui re-tire
          // ce useEffect → setItem(localStorage). Coût acceptable :
          // JSON.stringify d'un état moyen (~50 KB) reste sous le ms.
          editorTestTuningSystem: editor.testTuningSystem,
          editorTestNoteIndex: editor.testNoteIndex,
          editorTestOctave: editor.testOctave,
          editorTestFrequency: editor.testFrequency,
          editorVisualCuePattern: editor.visualCuePattern,
          editorVisualCueTonic: editor.visualCueTonic,
        }),
      )
    } catch {
      // storage unavailable
    }
  }, [
    patches, soundFolders, tracks, clips, bpm, numMeasures, a4Ref, xEdoN,
    spectrogramVisible, spectrogramDbScale, spectrogramPeakHold, spectrogramMode,
    durationMode, adsrView, activeTab, patchCounter, clipCounter, folderCounter, trackCounter,
    composerBankWidth, composerAsideWidth, composerBankCollapsed, composerAsideCollapsed,
    designerSidebarWidth, designerSidebarCollapsed, designerColumnWidths, designerBottomRowWidths,
    designerCollapsed, maximized, autoCollapse, designerMobileModule,
    docSidebarWidth, docSidebarCollapsed,
    bibHierarchyMode, bibDisplayMode, bibCurrentFolderId, bibCollapsedFolders, bibPopupWidth,
    recentPatchIds, theme, selectedTrackId,
    editor.testTuningSystem, editor.testNoteIndex, editor.testOctave, editor.testFrequency,
    editor.visualCuePattern, editor.visualCueTonic,
    tour.active,
  ])

  // iter-L phase-2.1 : persistance de la position de lecture Documentation
  // en sessionStorage (article courant + scroll positions par article).
  // Volontairement scopée à la session : on retombe sur l'article par
  // défaut à chaque ouverture de session navigateur.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        DOC_SESSION_KEY,
        JSON.stringify({
          currentArticleId: doc.currentArticleId,
          scrollPositions: doc.scrollPositions,
        }),
      )
    } catch {
      // sessionStorage unavailable
    }
  }, [doc.currentArticleId, doc.scrollPositions])

  // iter-K phase-3.f15 : propage `theme` à `<html data-theme=…>` pour
  // activer la palette CSS correspondante. Le CustomEvent 'themechange'
  // permet aux canvas JS (Timeline, Spectrogram, WaveformEditor) de
  // redrawer en relisant les CSS vars via lib/themeColor.js — sans cet
  // event, un draw issu d'une frame d'animation ou d'un ResizeObserver
  // continuerait de cacher les anciennes couleurs sur sa prochaine itération.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }))
  }, [theme])

  // F.8.1.3 : exposition du store sur window en dev pour permettre les tests
  // manuels via la console (ex. `window.__store.dispatch({type:'SET_X_EDO_N',
  // payload: 24})`). UI d'édition à venir en F.8.3 — d'ici là c'est le seul
  // moyen de modifier xEdoN. Pas exposé en build production.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__store = { state, dispatch }
    return () => { delete window.__store }
  }, [state])

  // Hydratation de l'éditeur quand currentPatchId change. Non-undoable.
  const hydratedFromIdRef = useRef(null)
  useEffect(() => {
    if (hydratedFromIdRef.current === currentPatchId) return
    hydratedFromIdRef.current = currentPatchId
    dispatch({ type: 'HYDRATE_EDITOR_FROM_PATCH', payload: currentPatch })
  }, [currentPatchId, currentPatch])

  // === Handlers ===

  const setBpm = useCallback((v) => dispatch({ type: 'SET_BPM', payload: v }), [])
  const setA4Ref = useCallback((v) => dispatch({ type: 'SET_A4_REF', payload: v }), [])
  // Sélecteur de tempérament exposé dans la toolbar Composer (F.3.9). Même
  // action que le dropdown du Designer — la pile undo reste DESIGNER_UNDOABLE
  // (la nature de l'action prime sur l'onglet d'origine).
  const setTestTuningSystem = useCallback((id) => dispatch({ type: 'SET_EDITOR_TEST_TUNING_SYSTEM', payload: id }), [])
  const setXEdoN = useCallback((n) => dispatch({ type: 'SET_X_EDO_N', payload: n }), [])

  const setZoomH = useCallback((next) => {
    dispatch({ type: 'SET_ZOOM_H', payload: next })
  }, [])

  const setTrackHeight = useCallback((next) => {
    const cur = (s) => Math.max(MIN_TRACK_HEIGHT, Math.min(MAX_TRACK_HEIGHT, typeof next === 'function' ? next(s) : next))
    dispatch({ type: 'SET_TRACK_HEIGHT', payload: cur(trackHeight) })
  }, [trackHeight])

  const handleCreateTrack = useCallback(() => {
    dispatch({ type: 'CREATE_TRACK' })
  }, [])

  const handleRenameTrack = useCallback((trackId, name) => {
    dispatch({ type: 'RENAME_TRACK', payload: { trackId, name } })
  }, [])

  const handleUpdateTrack = useCallback((trackId, updates) => {
    dispatch({ type: 'UPDATE_TRACK', payload: { trackId, updates } })
  }, [])

  const handleReorderTracks = useCallback((newOrder) => {
    dispatch({ type: 'REORDER_TRACKS', payload: newOrder })
  }, [])

  const handleDeleteTrack = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId)
    const trackClips = clips.filter(c => c.trackId === trackId)
    if (trackClips.length > 0) {
      const name = track?.name || trackId
      const n = trackClips.length
      openConfirm({
        title: 'Supprimer la piste ?',
        message: `Supprimer la piste "${name}" et ses ${n} clip${n > 1 ? 's' : ''} ?`,
        variant: 'danger',
        confirmLabel: 'Supprimer',
        onConfirm: () => dispatch({ type: 'DELETE_TRACK', payload: { trackId } }),
      })
      return
    }
    dispatch({ type: 'DELETE_TRACK', payload: { trackId } })
  }, [tracks, clips, openConfirm])

  const setDefaultClipDuration = useCallback((v) => {
    dispatch({ type: 'SET_DEFAULT_CLIP_DURATION', payload: v })
  }, [])

  const toggleDurationMode = useCallback(() => {
    dispatch({
      type: 'SET_DURATION_MODE',
      payload: durationMode === 'solfège' ? 'fraction' : 'solfège',
    })
  }, [durationMode])

  // iter-M phase-2.2 : `spectrogramVisible` est devenu vestigial (le spectro
  // est une colonne permanente du layout 3-vues). La clé localStorage est
  // conservée (consigne « ne pas toucher aux clés ») mais n'a plus de toggle.

  const setSpectrogramDbScale = useCallback((v) => {
    dispatch({ type: 'SET_SPECTROGRAM_DB_SCALE', payload: v })
  }, [])
  const setSpectrogramPeakHold = useCallback((v) => {
    dispatch({ type: 'SET_SPECTROGRAM_PEAK_HOLD', payload: v })
  }, [])
  const setSpectrogramMode = useCallback((mode) => {
    dispatch({ type: 'SET_SPECTROGRAM_MODE', payload: mode })
  }, [])
  // iter-M phase-2 : proportions des 3 colonnes Designer (drag des séparateurs
  // + auto-sizing). Voie « brute » : n'éteint PAS l'auto-sizing (l'effet
  // auto-resize l'appelle aussi — cf. note d'impl. N.6.2).
  const setDesignerColumnWidths = useCallback((widths) => {
    dispatch({ type: 'SET_DESIGNER_COLUMN_WIDTHS', payload: widths })
  }, [])
  // iter-P phase-6.2 : proportions de la rangée du bas (drag des séparateurs).
  const setDesignerBottomRowWidths = useCallback((widths) => {
    dispatch({ type: 'SET_DESIGNER_BOTTOM_ROW_WIDTHS', payload: widths })
  }, [])
  // iter-O phase-5a/5d : bascule l'état replié (bande) d'un module Designer. Sert
  // de Réduire (chrome) ET de réouverture (clic bande). `autoCollapse` (5d) est
  // calculé au call-site (effectiveAutoCollapse) — pas de closure sur winWidth
  // ici (déclaré plus bas, TDZ). Le reducer l'ignore en fermeture.
  const handleToggleModuleCollapsed = useCallback((id, autoCollapse = false) => {
    dispatch({ type: 'TOGGLE_DESIGNER_MODULE_COLLAPSED', payload: { id, autoCollapse } })
  }, [])
  // iter-O phase-5b : maximise un module (remplit la zone Designer) ou restaure.
  // Toggle côté handler : re-cliquer le module maximisé revient à null.
  const handleToggleModuleMaximized = useCallback((id) => {
    dispatch({ type: 'SET_DESIGNER_MAXIMIZED', payload: maximized === id ? null : id })
  }, [maximized])
  // iter-O phase-5d : bascule la politique d'auto-réduction.
  const handleToggleAutoCollapse = useCallback(() => {
    dispatch({ type: 'SET_DESIGNER_AUTO_COLLAPSE', payload: !autoCollapse })
  }, [autoCollapse])
  // iter-Q : action momentanée « Égaliser les largeurs » — remet les DEUX
  // rangées (haut + bas) à trois colonnes égales (⅓⅓⅓). Les proportions
  // custom restent accessibles via le drag des séparateurs.
  const handleEqualizeWidths = useCallback(() => {
    dispatch({ type: 'SET_DESIGNER_COLUMN_WIDTHS', payload: [1 / 3, 1 / 3, 1 / 3] })
    dispatch({ type: 'SET_DESIGNER_BOTTOM_ROW_WIDTHS', payload: [1 / 3, 1 / 3, 1 / 3] })
  }, [])

  const setBibHierarchyMode = useCallback((mode) => {
    dispatch({ type: 'SET_BIB_HIERARCHY_MODE', payload: mode })
  }, [])
  const setBibDisplayMode = useCallback((mode) => {
    dispatch({ type: 'SET_BIB_DISPLAY_MODE', payload: mode })
  }, [])
  const setBibCurrentFolder = useCallback((folderId) => {
    dispatch({ type: 'SET_BIB_CURRENT_FOLDER', payload: folderId })
  }, [])
  const onToggleBibFolderCollapsed = useCallback((folderId) => {
    dispatch({ type: 'TOGGLE_BIB_FOLDER_COLLAPSED', payload: { folderId } })
  }, [])
  const onSelectBibItems = useCallback((items, mode) => {
    dispatch({ type: 'SELECT_BIB_ITEMS', payload: { items, mode } })
  }, [])
  const onClearBibSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_BIB_SELECTION' })
  }, [])

  const onCopyBibItems = useCallback((items) => {
    dispatch({ type: 'COPY_BIB_ITEMS', payload: { items } })
  }, [])
  const onCutBibItems = useCallback((items) => {
    dispatch({ type: 'CUT_BIB_ITEMS', payload: { items } })
  }, [])
  const onClearBibClipboard = useCallback(() => {
    dispatch({ type: 'CLEAR_BIB_CLIPBOARD' })
  }, [])
  const onPasteBibClipboard = useCallback((targetFolderId) => {
    dispatch({ type: 'PASTE_BIB_CLIPBOARD', payload: { targetFolderId } })
  }, [])

  const setBibPopupWidth = useCallback((w) => {
    dispatch({ type: 'SET_BIB_POPUP_WIDTH', payload: w })
  }, [])

  // Max dynamique : chaque sidebar ne doit pas rogner la zone centrale en
  // dessous de COMPOSER_MAIN_MIN_WIDTH. Si la fenêtre est si petite que le max
  // serait en dessous du min, on garde le min (le layout débordera visuellement
  // mais on respecte la contrainte "pas plus étroit que le défaut").
  const handleResizeBank = useCallback((width) => {
    const maxBank = window.innerWidth - composerAsideWidth - COMPOSER_LAYOUT_CHROME - COMPOSER_MAIN_MIN_WIDTH
    const clamped = Math.min(width, Math.max(COMPOSER_SIDEBAR_MIN_WIDTH, maxBank))
    dispatch({ type: 'SET_COMPOSER_SIDEBAR_WIDTH', payload: { side: 'bank', width: clamped } })
  }, [composerAsideWidth])

  const handleResizeAside = useCallback((width) => {
    const maxAside = window.innerWidth - composerBankWidth - COMPOSER_LAYOUT_CHROME - COMPOSER_MAIN_MIN_WIDTH
    const clamped = Math.min(width, Math.max(COMPOSER_SIDEBAR_MIN_WIDTH, maxAside))
    dispatch({ type: 'SET_COMPOSER_SIDEBAR_WIDTH', payload: { side: 'aside', width: clamped } })
  }, [composerBankWidth])

  // Modal d'export bibliothèque (H.1) : géré en local React (UI éphémère).
  // Forme : null | { scope: { type, id? }, defaultName: string }
  const [exportModal, setExportModal] = useState(null)

  // Modal d'import bibliothèque (H.1.14) : géré en local React (UI éphémère).
  // Forme : null | { payload, fileName }
  const [importModal, setImportModal] = useState(null)

  // Ref pour l'input file caché (déclenché par le bouton Upload).
  const fileInputRef = useRef(null)

  // Popover Bibliothèque (mode réduit) : géré en local React, pas dans le
  // reducer (UI éphémère, ne survit pas au reload).
  const [libraryPopoverOpen, setLibraryPopoverOpen] = useState(false)
  const libraryPopoverRef = useRef(null)
  const libraryPopoverTriggerRef = useRef(null)
  useEffect(() => {
    if (!libraryPopoverOpen) return
    const onDocClick = (e) => {
      if (libraryPopoverRef.current?.contains(e.target)) return
      if (libraryPopoverTriggerRef.current?.contains(e.target)) return
      setLibraryPopoverOpen(false)
    }
    const onEscape = (e) => {
      if (e.key === 'Escape') setLibraryPopoverOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [libraryPopoverOpen])

  // iter-K phase-2.f11 : popover Bibliothèque pour la sidebar Composer
  // collapsed (mirror du pattern Designer). Distinct du libraryPopover
  // Designer pour éviter qu'un onglet partage l'état d'ouverture de l'autre.
  const [composerLibraryPopoverOpen, setComposerLibraryPopoverOpen] = useState(false)
  const composerLibraryPopoverRef = useRef(null)
  const composerLibraryPopoverTriggerRef = useRef(null)
  useEffect(() => {
    if (!composerLibraryPopoverOpen) return
    const onDocClick = (e) => {
      if (composerLibraryPopoverRef.current?.contains(e.target)) return
      if (composerLibraryPopoverTriggerRef.current?.contains(e.target)) return
      setComposerLibraryPopoverOpen(false)
    }
    const onEscape = (e) => {
      if (e.key === 'Escape') setComposerLibraryPopoverOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [composerLibraryPopoverOpen])

  const handleToggleBankCollapsed = useCallback(() => {
    // iter-K phase-2.f11 : ferme le popover Bibliothèque éventuellement
    // ouvert au moment du toggle (cohérence avec le pattern Designer).
    setComposerLibraryPopoverOpen(false)
    dispatch({
      type: 'SET_COMPOSER_SIDEBAR_COLLAPSED',
      payload: { side: 'bank', collapsed: !composerBankCollapsed },
    })
  }, [composerBankCollapsed])

  const handleToggleAsideCollapsed = useCallback(() => {
    dispatch({
      type: 'SET_COMPOSER_SIDEBAR_COLLAPSED',
      payload: { side: 'aside', collapsed: !composerAsideCollapsed },
    })
  }, [composerAsideCollapsed])

  // iter G phase 1.2 : sidebar gauche du Designer. Pas de contrainte de
  // max comme dans Composer (la zone main est en flex), donc handleResize
  // est trivial — un clamp min suffit, le reducer ré-applique.
  const handleResizeDesignerSidebar = useCallback((width) => {
    dispatch({ type: 'SET_DESIGNER_SIDEBAR_WIDTH', payload: width })
  }, [])

  const handleToggleDesignerCollapsed = useCallback(() => {
    // Fermer le popover Bibliothèque lors d'un toggle : l'état React résiduel
    // reste sinon true entre deux collapsed.
    setLibraryPopoverOpen(false)
    dispatch({ type: 'SET_DESIGNER_SIDEBAR_COLLAPSED', payload: !designerSidebarCollapsed })
  }, [designerSidebarCollapsed])

  // v1.2.0 : détection mobile (≤ 924 × 668). En mobile :
  // - le panneau latéral gauche du Designer est forcé en mode réduit
  //   (la préférence utilisateur designerSidebarCollapsed reste en
  //   state pour quand on revient à une grande résolution)
  // - le main du Designer (4 zones canvas/spectro/params/adsr) passe
  //   d'une grille 2×2 à un accordéon vertical 1 colonne, une seule
  //   zone dépliée à la fois.
  // Le toggle manuel de la sidebar reste désactivé en mobile (la
  // sidebar est gérée automatiquement).
  const { w: winWidth, h: winHeight } = useWindowSize()
  const isMobile = winWidth < 924 || winHeight < 668
  // iter-O phase-5d : flag effectif passé aux réouvertures de module — actif si
  // le toggle est ON, ou forcé sous le seuil de largeur (desktop étroit).
  const effectiveAutoCollapse = autoCollapse || winWidth < AUTO_COLLAPSE_DEFAULT_WIDTH
  // iter-P phase-6.3 : panneau gauche forcé fermé (rail + popover Bibliothèque,
  // chemin mobile) dès le seuil de l'« essentiel » — entre 924 et 1100 il était
  // « ouvrable mais non redimensionnable » (état bâtard). `winWidth < ESSENTIALS_WIDTH`
  // subsume la largeur mobile ; on garde `isMobile` pour couvrir aussi h < 668.
  const designerSidebarCollapsedEffective = isMobile || winWidth < ESSENTIALS_WIDTH || designerSidebarCollapsed
  // iter-R phase-1.1 : petit écran = switcher (un module plein cadre), plus
  // d'accordéon. Le module actif est persisté (`designerMobileModule`, défaut
  // 'canvas'). Clic sur l'actif = no-op (géré par le reducer).
  const handleSelectMobileModule = useCallback((id) => {
    dispatch({ type: 'SET_DESIGNER_MOBILE_MODULE', payload: id })
  }, [])
  // itération P : le module Modulation est-il réellement VISIBLE ? Gate de la
  // boucle rAF de la mini-courbe LFO (audit perf N.1 : aucune rAF perpétuelle
  // quand le module est caché). Couvre tous les chemins de masquage : onglet
  // non-Designer, module replié en bande, masqué par un autre module maximisé
  // (desktop), accordéon non-déplié (mobile).
  const modulationVisible = activeTab === 'designer'
    && !designerCollapsed.modulation
    && (isMobile
      ? designerMobileModule === 'modulation'
      : (maximized === null || maximized === 'modulation'))

  // iter-P phase-6.1 : auto-collapse « essentiel » edge-triggered. On mémorise la
  // bande précédente (winWidth < ESSENTIALS_WIDTH) dans un ref et on n'agit qu'au
  // FRANCHISSEMENT — jamais à chaque render, sinon on combattrait les toggles
  // manuels de l'utilisateur en petit écran. Entrée (grand→petit ou montage
  // déjà-petit, hors accordéon, aucun module maximisé) : replie tout sauf Forme
  // d'onde + Instrument. Sortie (petit→grand réelle, pas le montage en grand) :
  // tout rouvrir. maximized != null à l'entrée → on respecte le choix manuel.
  const prevEssentialsSmallRef = useRef(null)
  useEffect(() => {
    const small = winWidth < ESSENTIALS_WIDTH
    const prev = prevEssentialsSmallRef.current
    prevEssentialsSmallRef.current = small
    if (small === prev) return // pas de franchissement (1er run : null ≠ bool → agit)
    if (small) {
      if (!isMobile && maximized === null) {
        dispatch({
          type: 'SET_DESIGNER_COLLAPSED_BULK',
          payload: { canvas: false, params: false, harmonics: true, spectrogram: true, adsr: true, modulation: true },
        })
      }
    } else if (prev === true) {
      // Transition réelle petit→grand uniquement (au montage en grand, prev=null →
      // on ne touche pas à l'état replié persisté de l'utilisateur).
      dispatch({
        type: 'SET_DESIGNER_COLLAPSED_BULK',
        payload: { canvas: false, harmonics: false, spectrogram: false, params: false, adsr: false, modulation: false },
      })
    }
  }, [winWidth, isMobile, maximized])

  // Reclampe les largeurs quand la fenêtre rétrécit : on préserve l'invariant
  // "main ≥ COMPOSER_MAIN_MIN_WIDTH" sans perdre les préférences de l'utilisateur
  // dans le cas inverse (élargissement).
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      const maxBank = w - composerAsideWidth - COMPOSER_LAYOUT_CHROME - COMPOSER_MAIN_MIN_WIDTH
      const maxAside = w - composerBankWidth - COMPOSER_LAYOUT_CHROME - COMPOSER_MAIN_MIN_WIDTH
      if (composerBankWidth > maxBank && maxBank > COMPOSER_SIDEBAR_MIN_WIDTH) {
        dispatch({ type: 'SET_COMPOSER_SIDEBAR_WIDTH', payload: { side: 'bank', width: maxBank } })
      }
      if (composerAsideWidth > maxAside && maxAside > COMPOSER_SIDEBAR_MIN_WIDTH) {
        dispatch({ type: 'SET_COMPOSER_SIDEBAR_WIDTH', payload: { side: 'aside', width: maxAside } })
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [composerBankWidth, composerAsideWidth])

  const setActiveTab = useCallback((tab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })
  }, [])

  // DocLink (iter-L phase-3.2) : "onglet:ancre" → bascule sur l'onglet +
  // halo sur l'élément d'UI ciblé. Split sur le PREMIER `:` (l'ancre peut
  // théoriquement en contenir). Le retry interne de highlightElement gère
  // le montage différé de l'onglet cible — pas de nouveau state à ajouter.
  const handleDocLink = useCallback((target) => {
    const sep = target.indexOf(':')
    if (sep === -1) {
      if (import.meta.env.DEV) console.warn('[DocLink] target malformé:', target)
      return
    }
    const tab = target.slice(0, sep)
    const anchor = target.slice(sep + 1)
    if (!['library', 'designer', 'composer', 'documentation'].includes(tab)) {
      if (import.meta.env.DEV) console.warn('[DocLink] onglet inconnu:', tab)
      return
    }
    setActiveTab(tab)
    highlightElement(anchor)
  }, [setActiveTab])

  const handleSavePatch = useCallback(
    (patchData) => {
      const newId = `patch-${patchCounter + 1}`
      dispatch({ type: 'SAVE_PATCH', payload: { patchData } })
      return { id: newId }
    },
    [patchCounter],
  )

  const handleUpdatePatch = useCallback((patchId, patchData) => {
    dispatch({ type: 'UPDATE_PATCH', payload: { patchId, patchData } })
  }, [])

  // Drop d'un patch sur la timeline. Priorité des hauteurs :
  //   1. Touche de note physique maintenue (E.4.1) → système courant de
  //      l'éditeur à cette note + octave courante. La touche surpasse le
  //      système par défaut du patch (explicite user intent).
  //   2. Sinon (drop simple depuis la bibliothèque) :
  //      - si le patch a un \`defaultTuningSystem\` (iter G phase 2.4),
  //        on l'utilise. Pour la note : si même système que l'éditeur,
  //        on prend la note de test (continuité de geste designer→drag) ;
  //        sinon on prend la note de test par défaut (degré 0, octave 4)
  //        ou la fréquence par défaut si Libre.
  //      - rétro-compat patches < G.2.4 sans defaultTuningSystem :
  //        fallback ancien comportement (editor's test fields).
  const handleAddClip = useCallback(
    (patchId, measure, beat, duration, trackId = DEFAULT_TRACK_ID) => {
      const keyHeld = pressedNoteKeyRef.current !== null
      let note
      if (keyHeld) {
        note = {
          tuningSystem: editor.testTuningSystem,
          noteIndex: pressedNoteKeyRef.current,
          octave: editor.testOctave,
          frequency: null,
        }
      } else {
        const patch = patches.find((p) => p.id === patchId)
        const patchSys = patch?.defaultTuningSystem
        if (patchSys && patchSys !== editor.testTuningSystem) {
          // Patch dans un système différent de l'éditeur : on respecte
          // le système du patch. Note par défaut : degré 0 octave 4
          // (cohérent avec DEFAULT_EDITOR.testNoteIndex / testOctave),
          // ou freq de référence si Libre (testFrequency par défaut).
          if (patchSys === 'free') {
            note = { tuningSystem: 'free', noteIndex: null, octave: null, frequency: editor.testFrequency }
          } else {
            note = { tuningSystem: patchSys, noteIndex: 0, octave: 4, frequency: null }
          }
        } else {
          // Patch sans defaultTuningSystem (rétro-compat) OU patch dans
          // le même système que l'éditeur : on prend la note de test
          // courante (continuité Designer → Composer).
          note = editorTestNoteFields(editor)
        }
      }
      dispatch({
        type: 'ADD_CLIP',
        payload: { patchId, measure, beat, duration, trackId, ...note },
      })
      // Une touche maintenue "consommée" par le drop : on vide le flag pour
      // que le keyup suivant ne déclenche pas de placement contigu en plus.
      if (keyHeld) {
        pressedNoteKeyRef.current = null
        setPressedNoteKey(null)
      }
    },
    [editor, patches],
  )

  const handleRemoveClip = useCallback((clipId) => {
    dispatch({ type: 'REMOVE_CLIP', payload: { clipId } })
  }, [])

  const handleSetSelection = useCallback((ids) => {
    dispatch({ type: 'SELECT_CLIPS', payload: ids })
  }, [])

  const handleUpdateClip = useCallback((clipId, updates) => {
    dispatch({ type: 'UPDATE_CLIP', payload: { clipId, updates } })
  }, [])

  const handleMoveClips = useCallback((moves) => {
    dispatch({ type: 'MOVE_CLIPS', payload: moves })
  }, [])

  const handleResizeClips = useCallback((updates) => {
    dispatch({ type: 'RESIZE_CLIPS', payload: updates })
  }, [])

  const handleDuplicateClips = useCallback((datas) => {
    dispatch({ type: 'DUPLICATE_CLIPS', payload: datas })
  }, [])

  const handleUpdateClipsPatch = useCallback((clipIds, patchId) => {
    dispatch({ type: 'UPDATE_CLIPS_PATCH', payload: { clipIds, patchId } })
  }, [])

  const handleUpdateClipsDuration = useCallback((updates) => {
    dispatch({ type: 'UPDATE_CLIPS_DURATION', payload: updates })
  }, [])

  const handleUpdateClipsPitch = useCallback((updates) => {
    dispatch({ type: 'UPDATE_CLIPS_PITCH', payload: updates })
  }, [])

  // F.8.3.3 : bascule X-EDO N=12/N=24 → 12-TET / 24-tet-equal. Convertit
  // tous les clips actuellement en 'x-edo' vers le système cible (le reducer
  // UPDATE_CLIPS_PITCH dérive frequency/noteIndex/octave cohérents) ET
  // change l'éditeur. Deux entrées undo séparées (clips + éditeur) — undo
  // doit être fait deux fois pour annuler complètement, ce qui reflète bien
  // la double nature de la bascule.
  const handleConvertXEdoTo = useCallback((targetSystemId) => {
    const xEdoClips = clips.filter((c) => c.tuningSystem === 'x-edo')
    if (xEdoClips.length > 0) {
      dispatch({
        type: 'UPDATE_CLIPS_PITCH',
        payload: xEdoClips.map((c) => ({ id: c.id, tuningSystem: targetSystemId })),
      })
    }
    dispatch({ type: 'SET_EDITOR_TEST_TUNING_SYSTEM', payload: targetSystemId })
  }, [clips])

  const handleDeleteSelected = useCallback(() => {
    dispatch({ type: 'DELETE_SELECTED_CLIPS' })
  }, [])

  const mergeStatus = useMemo(
    () => canMergeClips(clips, selectedClipIds),
    [clips, selectedClipIds],
  )

  const handleMergeClips = useCallback(() => {
    if (!mergeStatus.canMerge) return
    dispatch({ type: 'MERGE_CLIPS', payload: { selectedIds: selectedClipIds } })
  }, [mergeStatus.canMerge, selectedClipIds])

  const canSplit2 = useMemo(
    () => selectedClipIds.length > 0 &&
      clips.some((c) => selectedClipIds.includes(c.id) && canSplitClip(c, 2)),
    [clips, selectedClipIds],
  )
  const canSplit3 = useMemo(
    () => selectedClipIds.length > 0 &&
      clips.some((c) => selectedClipIds.includes(c.id) && canSplitClip(c, 3)),
    [clips, selectedClipIds],
  )

  const handleSplitClips = useCallback(
    (divisor) => {
      dispatch({ type: 'SPLIT_CLIPS', payload: { clipIds: selectedClipIds, divisor } })
    },
    [selectedClipIds],
  )

  // --- Clipboard ---

  const handleCopy = useCallback(() => {
    if (selectedClipIds.length === 0) return
    const selected = clips.filter((c) => selectedClipIds.includes(c.id))
    const minBeat = Math.min(
      ...selected.map((c) => (c.measure - 1) * BEATS_PER_MEASURE + c.beat),
    )
    const templates = selected.map((c) => ({
      patchId: c.patchId,
      trackId: c.trackId,
      beatOffset: (c.measure - 1) * BEATS_PER_MEASURE + c.beat - minBeat,
      duration: c.duration,
      tuningSystem: c.tuningSystem,
      noteIndex: c.noteIndex ?? null,
      octave: c.octave ?? null,
      frequency: c.frequency ?? null,
    }))
    dispatch({ type: 'SET_CLIPBOARD', payload: { clips: templates } })
    const n = templates.length
    dispatch({
      type: 'SET_COMPOSER_FLASH',
      payload: `${n} clip${n > 1 ? 's' : ''} copié${n > 1 ? 's' : ''}`,
    })
  }, [selectedClipIds, clips])

  const handleCut = useCallback(() => {
    if (selectedClipIds.length === 0) return
    const selected = clips.filter((c) => selectedClipIds.includes(c.id))
    const minBeat = Math.min(
      ...selected.map((c) => (c.measure - 1) * BEATS_PER_MEASURE + c.beat),
    )
    const templates = selected.map((c) => ({
      patchId: c.patchId,
      trackId: c.trackId,
      beatOffset: (c.measure - 1) * BEATS_PER_MEASURE + c.beat - minBeat,
      duration: c.duration,
      tuningSystem: c.tuningSystem,
      noteIndex: c.noteIndex ?? null,
      octave: c.octave ?? null,
      frequency: c.frequency ?? null,
    }))
    dispatch({ type: 'SET_CLIPBOARD', payload: { clips: templates } })
    dispatch({ type: 'DELETE_SELECTED_CLIPS' })
    const n = templates.length
    dispatch({
      type: 'SET_COMPOSER_FLASH',
      payload: `${n} clip${n > 1 ? 's' : ''} coupé${n > 1 ? 's' : ''}`,
    })
  }, [selectedClipIds, clips])

  // iter-L phase-1.4.b : sélection de piste. Mise à jour au dernier clic
  // utilisateur dans le Composer (clip / header / zone vide d'une piste).
  // Non-undoable, persisté en localStorage.
  const handleSelectTrack = useCallback((trackId) => {
    dispatch({ type: 'SET_SELECTED_TRACK_ID', payload: trackId })
  }, [])

  const handlePaste = useCallback(
    (absoluteBeat, targetTrackId) => {
      if (!clipboard || clipboard.clips.length === 0) return
      const snapped = Math.round(absoluteBeat / 0.125) * 0.125

      const trackOrder = tracks.map(t => t.id)
      let trackDelta = 0
      if (targetTrackId) {
        const refTrackId = clipboard.clips[0]?.trackId || DEFAULT_TRACK_ID
        const refIdx = trackOrder.indexOf(refTrackId)
        const targetIdx = trackOrder.indexOf(targetTrackId)
        if (refIdx >= 0 && targetIdx >= 0) trackDelta = targetIdx - refIdx
      }

      const clipDatas = clipboard.clips.map((t) => {
        const beatPos = snapped + t.beatOffset
        const measure = Math.floor(beatPos / BEATS_PER_MEASURE) + 1
        const beat = beatPos - (measure - 1) * BEATS_PER_MEASURE
        let trackId = t.trackId || DEFAULT_TRACK_ID
        if (trackDelta !== 0) {
          const origIdx = trackOrder.indexOf(trackId)
          const newIdx = Math.max(0, Math.min(trackOrder.length - 1, origIdx + trackDelta))
          trackId = trackOrder[newIdx]
        }
        return {
          trackId, patchId: t.patchId, measure, beat, duration: t.duration,
          tuningSystem: t.tuningSystem,
          noteIndex: t.noteIndex,
          octave: t.octave,
          frequency: t.frequency,
        }
      })
      const maxEnd = Math.max(
        ...clipDatas.map((d) => (d.measure - 1) * BEATS_PER_MEASURE + d.beat + d.duration),
      )
      const neededMeasures = Math.ceil(maxEnd / BEATS_PER_MEASURE)
      const extraMeasures = Math.max(0, neededMeasures - numMeasures)
      dispatch({ type: 'PASTE_CLIPS', payload: { clipDatas, extraMeasures } })
    },
    [clipboard, numMeasures, tracks],
  )

  // iter-L phase-1.4.b : variante du Coller utilisée par le bouton Toolbar.
  // Sémantique différente du Ctrl+V "coller à la souris" :
  //   1. lastAnchorClipId (halo anchor) → après le clip ancre, sur sa piste
  //   2. selectedTrackId → début de la piste sélectionnée
  //   3. fallback → début de la première piste (tracks[0])
  const handlePasteFromButton = useCallback(() => {
    if (!clipboard || clipboard.clips.length === 0) return
    const anchor = lastAnchorClipId ? clips.find((c) => c.id === lastAnchorClipId) : null
    if (anchor) {
      const anchorEnd = (anchor.measure - 1) * BEATS_PER_MEASURE + anchor.beat + anchor.duration
      handlePaste(anchorEnd, anchor.trackId)
      return
    }
    if (selectedTrackId && tracks.some((t) => t.id === selectedTrackId)) {
      handlePaste(0, selectedTrackId)
      return
    }
    const firstTrack = tracks[0]?.id
    if (firstTrack) handlePaste(0, firstTrack)
  }, [clipboard, lastAnchorClipId, clips, selectedTrackId, tracks, handlePaste])

  useEffect(() => {
    const handler = (e) => {
      if (activeTab !== 'composer') return
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return
      if (matchesShortcut(e, 'composer-copy') && selectedClipIds.length > 0) {
        e.preventDefault()
        handleCopy()
      } else if (matchesShortcut(e, 'composer-cut') && selectedClipIds.length > 0) {
        e.preventDefault()
        handleCut()
      } else if (matchesShortcut(e, 'composer-paste') && clipboard) {
        e.preventDefault()
        // iter-L follow-up : Ctrl+V unifié sur la sémantique du bouton
        // (ancre halo → piste sélectionnée → fallback piste 0). Le clic
        // droit menu "Coller ici" reste pour le coller-à-la-souris.
        handlePasteFromButton()
      } else if (matchesShortcut(e, 'composer-merge') && selectedClipIds.length >= 2) {
        e.preventDefault()
        if (mergeStatus.canMerge) handleMergeClips()
      } else if (matchesShortcut(e, 'composer-split2') && selectedClipIds.length > 0) {
        e.preventDefault()
        if (canSplit2) handleSplitClips(2)
      } else if (matchesShortcut(e, 'composer-split3') && selectedClipIds.length > 0) {
        e.preventDefault()
        if (canSplit3) handleSplitClips(3)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, selectedClipIds, clipboard, mergeStatus, canSplit2, canSplit3, handleCopy, handleCut, handlePasteFromButton, handleMergeClips, handleSplitClips])

  const handleClearTimeline = useCallback(() => {
    dispatch({ type: 'CLEAR_TIMELINE' })
  }, [])

  const handleAddMeasures = useCallback((count = 1) => {
    dispatch({ type: 'ADD_MEASURES', payload: count })
  }, [])

  const handleRemoveLastMeasure = useCallback(() => {
    if (numMeasures <= 1) return
    const lastMeasureStart = (numMeasures - 1) * BEATS_PER_MEASURE

    const toDelete = []
    const toTruncate = []
    for (const c of clips) {
      const start = (c.measure - 1) * BEATS_PER_MEASURE + c.beat
      const end = start + c.duration
      if (end <= lastMeasureStart) continue
      if (start >= lastMeasureStart) {
        toDelete.push(c.id)
      } else {
        toTruncate.push({ id: c.id, newDuration: lastMeasureStart - start })
      }
    }

    const doRemove = () => {
      dispatch({
        type: 'REMOVE_LAST_MEASURE',
        payload: { toDeleteIds: toDelete, toTruncate },
      })
      if (toTruncate.length > 0 && toDelete.length === 0) {
        dispatch({
          type: 'SET_COMPOSER_FLASH',
          payload: `${toTruncate.length} clip${toTruncate.length > 1 ? 's tronqués' : ' tronqué'}`,
        })
      }
    }

    if (toDelete.length > 0) {
      const dN = toDelete.length
      const tN = toTruncate.length
      const dS = dN > 1 ? 's' : ''
      const verb = dN > 1 ? 'seront supprimés' : 'sera supprimé'
      const msg = tN > 0
        ? `${dN} clip${dS} ${verb} et ${tN} tronqué${tN > 1 ? 's' : ''}. Continuer ?`
        : `${dN} clip${dS} ${verb}. Continuer ?`
      openConfirm({
        title: 'Supprimer des clips ?',
        message: msg,
        variant: 'danger',
        confirmLabel: 'Continuer',
        onConfirm: doRemove,
      })
      return
    }

    doRemove()
  }, [numMeasures, clips, openConfirm])

  // Helper : construit un splitPart en récupérant les champs de note depuis
  // le clip source (le clip qu'on split conserve sa hauteur).
  const buildSplitPart = (clip, extra) => ({
    originalId: extra.originalId ?? clip.id,
    patchId: clip.patchId,
    trackId: clip.trackId,
    tuningSystem: clip.tuningSystem,
    noteIndex: clip.noteIndex ?? null,
    octave: clip.octave ?? null,
    frequency: clip.frequency ?? null,
    measure: extra.measure,
    beat: extra.beat,
    duration: extra.duration,
  })

  const handleDeleteMeasure = useCallback((measureNum) => {
    if (numMeasures <= 1) return
    const mStart = (measureNum - 1) * BEATS_PER_MEASURE
    const mEnd = measureNum * BEATS_PER_MEASURE

    const deletedIds = []
    const truncated = []
    const splitParts = []
    const snap = (v) => Math.round(v / 0.125) * 0.125
    const toMB = (abs) => {
      const m = Math.floor(abs / BEATS_PER_MEASURE) + 1
      return { measure: m, beat: snap(abs - (m - 1) * BEATS_PER_MEASURE) }
    }

    for (const c of clips) {
      const start = (c.measure - 1) * BEATS_PER_MEASURE + c.beat
      const end = start + c.duration
      if (end <= mStart || start >= mEnd) continue

      if (start >= mStart && end <= mEnd) {
        deletedIds.push(c.id)
      } else if (start < mStart && end <= mEnd) {
        const leftDur = snap(mStart - start)
        if (leftDur >= 0.125) truncated.push({ id: c.id, newDuration: leftDur })
        else deletedIds.push(c.id)
      } else if (start >= mStart && end > mEnd) {
        const rightDur = snap(end - mEnd)
        deletedIds.push(c.id)
        if (rightDur >= 0.125) {
          const newAbs = snap(mEnd - BEATS_PER_MEASURE)
          const mb = toMB(newAbs)
          splitParts.push(buildSplitPart(c, { originalId: c.id, ...mb, duration: rightDur }))
        }
      } else {
        const leftDur = snap(mStart - start)
        const rightDur = snap(end - mEnd)
        if (leftDur >= 0.125) {
          truncated.push({ id: c.id, newDuration: leftDur })
        } else {
          deletedIds.push(c.id)
        }
        if (rightDur >= 0.125) {
          const newAbs = snap(mStart)
          const mb = toMB(newAbs)
          splitParts.push(buildSplitPart(c, { originalId: leftDur >= 0.125 ? null : c.id, ...mb, duration: rightDur }))
        }
      }
    }

    const doDelete = () => {
      dispatch({
        type: 'DELETE_MEASURE',
        payload: { measure: measureNum, deletedIds, truncated, splitParts },
      })
    }

    if (deletedIds.length > 0 || truncated.length > 0) {
      const dN = deletedIds.length
      const tN = truncated.length
      const parts = []
      if (dN > 0) parts.push(`${dN} clip${dN > 1 ? 's supprimés' : ' supprimé'}`)
      if (tN > 0) parts.push(`${tN} tronqué${tN > 1 ? 's' : ''}`)
      if (dN > 0) {
        openConfirm({
          title: `Supprimer la mesure ${measureNum} ?`,
          message: `${parts.join(', ')}.`,
          variant: 'danger',
          confirmLabel: 'Supprimer',
          onConfirm: doDelete,
        })
        return
      }
    }

    doDelete()
  }, [numMeasures, clips, openConfirm])

  const handleInsertMeasures = useCallback((measureNum, position, count) => {
    const beatPosition = position === 'before'
      ? (measureNum - 1) * BEATS_PER_MEASURE
      : measureNum * BEATS_PER_MEASURE

    const splitParts = []
    for (const c of clips) {
      const start = (c.measure - 1) * BEATS_PER_MEASURE + c.beat
      const end = start + c.duration
      if (start < beatPosition && end > beatPosition) {
        const leftDur = Math.round((beatPosition - start) / 0.125) * 0.125
        const rightDur = Math.round((end - beatPosition) / 0.125) * 0.125
        const shiftAmount = count * BEATS_PER_MEASURE
        if (leftDur >= 0.125 && rightDur >= 0.125) {
          const rightStart = Math.round((beatPosition + shiftAmount) / 0.125) * 0.125
          const mR = Math.floor(rightStart / BEATS_PER_MEASURE) + 1
          const bR = Math.round((rightStart - (mR - 1) * BEATS_PER_MEASURE) / 0.125) * 0.125
          splitParts.push(
            buildSplitPart(c, { originalId: c.id, measure: c.measure, beat: c.beat, duration: leftDur }),
            buildSplitPart(c, { originalId: c.id, measure: mR, beat: bR, duration: rightDur }),
          )
        }
      }
    }

    dispatch({
      type: 'INSERT_MEASURES_AT',
      payload: { beatPosition, count, splitParts },
    })
  }, [clips])

  const buildMeasureClipboardData = useCallback((measureNum) => {
    const mStart = (measureNum - 1) * BEATS_PER_MEASURE
    const mEnd = measureNum * BEATS_PER_MEASURE
    const snap = (v) => Math.round(v / 0.125) * 0.125
    const templates = []
    for (const c of clips) {
      const start = (c.measure - 1) * BEATS_PER_MEASURE + c.beat
      const end = start + c.duration
      if (end <= mStart || start >= mEnd) continue
      const clampedStart = Math.max(start, mStart)
      const clampedEnd = Math.min(end, mEnd)
      const dur = snap(clampedEnd - clampedStart)
      if (dur < 0.125) continue
      templates.push({
        patchId: c.patchId,
        trackId: c.trackId,
        beatOffset: snap(clampedStart - mStart),
        duration: dur,
        tuningSystem: c.tuningSystem,
        noteIndex: c.noteIndex ?? null,
        octave: c.octave ?? null,
        frequency: c.frequency ?? null,
      })
    }
    return { measures: 1, clips: templates }
  }, [clips])

  const handleCopyMeasure = useCallback((measureNum) => {
    const data = buildMeasureClipboardData(measureNum)
    dispatch({ type: 'SET_MEASURE_CLIPBOARD', payload: data })
    dispatch({
      type: 'SET_COMPOSER_FLASH',
      payload: `Mesure ${measureNum} copiée (${data.clips.length} clip${data.clips.length > 1 ? 's' : ''})`,
    })
  }, [buildMeasureClipboardData])

  const handleCutMeasure = useCallback((measureNum) => {
    if (numMeasures <= 1) return
    const clipboardData = buildMeasureClipboardData(measureNum)
    const mStart = (measureNum - 1) * BEATS_PER_MEASURE
    const mEnd = measureNum * BEATS_PER_MEASURE

    const deletedIds = []
    const truncated = []
    const splitParts = []
    const snap = (v) => Math.round(v / 0.125) * 0.125
    const toMB = (abs) => {
      const m = Math.floor(abs / BEATS_PER_MEASURE) + 1
      return { measure: m, beat: snap(abs - (m - 1) * BEATS_PER_MEASURE) }
    }

    for (const c of clips) {
      const start = (c.measure - 1) * BEATS_PER_MEASURE + c.beat
      const end = start + c.duration
      if (end <= mStart || start >= mEnd) continue
      if (start >= mStart && end <= mEnd) {
        deletedIds.push(c.id)
      } else if (start < mStart && end <= mEnd) {
        const leftDur = snap(mStart - start)
        if (leftDur >= 0.125) truncated.push({ id: c.id, newDuration: leftDur })
        else deletedIds.push(c.id)
      } else if (start >= mStart && end > mEnd) {
        const rightDur = snap(end - mEnd)
        deletedIds.push(c.id)
        if (rightDur >= 0.125) {
          const mb = toMB(snap(mEnd - BEATS_PER_MEASURE))
          splitParts.push(buildSplitPart(c, { originalId: c.id, ...mb, duration: rightDur }))
        }
      } else {
        const leftDur = snap(mStart - start)
        const rightDur = snap(end - mEnd)
        if (leftDur >= 0.125) truncated.push({ id: c.id, newDuration: leftDur })
        else deletedIds.push(c.id)
        if (rightDur >= 0.125) {
          const mb = toMB(snap(mStart))
          splitParts.push(buildSplitPart(c, { originalId: leftDur >= 0.125 ? null : c.id, ...mb, duration: rightDur }))
        }
      }
    }

    dispatch({
      type: 'CUT_MEASURE',
      payload: { measure: measureNum, deletedIds, truncated, splitParts, clipboardData },
    })
  }, [numMeasures, clips, buildMeasureClipboardData])

  const handlePasteMeasures = useCallback((measureNum, position) => {
    if (!measureClipboard) return
    const { measures: count, clips: templates } = measureClipboard
    const beatPosition = position === 'before'
      ? (measureNum - 1) * BEATS_PER_MEASURE
      : measureNum * BEATS_PER_MEASURE

    const splitParts = []
    const snap = (v) => Math.round(v / 0.125) * 0.125
    for (const c of clips) {
      const start = (c.measure - 1) * BEATS_PER_MEASURE + c.beat
      const end = start + c.duration
      if (start < beatPosition && end > beatPosition) {
        const leftDur = snap(beatPosition - start)
        const rightDur = snap(end - beatPosition)
        const shiftAmount = count * BEATS_PER_MEASURE
        if (leftDur >= 0.125 && rightDur >= 0.125) {
          const rightStart = snap(beatPosition + shiftAmount)
          const mR = Math.floor(rightStart / BEATS_PER_MEASURE) + 1
          const bR = snap(rightStart - (mR - 1) * BEATS_PER_MEASURE)
          splitParts.push(
            buildSplitPart(c, { originalId: c.id, measure: c.measure, beat: c.beat, duration: leftDur }),
            buildSplitPart(c, { originalId: c.id, measure: mR, beat: bR, duration: rightDur }),
          )
        }
      }
    }

    const pastedClips = templates.map((t) => {
      const absStart = snap(beatPosition + t.beatOffset)
      const m = Math.floor(absStart / BEATS_PER_MEASURE) + 1
      const b = snap(absStart - (m - 1) * BEATS_PER_MEASURE)
      return {
        patchId: t.patchId, trackId: t.trackId, measure: m, beat: b, duration: t.duration,
        tuningSystem: t.tuningSystem,
        noteIndex: t.noteIndex,
        octave: t.octave,
        frequency: t.frequency,
      }
    })

    dispatch({
      type: 'PASTE_MEASURES',
      payload: { beatPosition, count, splitParts, pastedClips },
    })
  }, [clips, measureClipboard])

  const handleDeletePatch = useCallback((patchId) => {
    const referencingClips = clips.filter((c) => c.patchId === patchId)
    if (referencingClips.length > 0) {
      const n = referencingClips.length
      dispatch({
        type: 'SET_NOTIFICATION',
        payload: {
          message: `Ce patch est utilisé par ${n} clip(s). Supprimez-les d'abord.`,
          type: 'error',
          timestamp: Date.now(),
        },
      })
      dispatch({ type: 'SELECT_CLIPS', payload: referencingClips.map((c) => c.id) })
      if (activeTab === 'designer') {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: 'composer' })
      }
      return
    }
    dispatch({ type: 'DELETE_PATCH', payload: { patchId } })
  }, [clips, activeTab])

  const handleRenamePatch = useCallback((patchId, newName) => {
    dispatch({ type: 'RENAME_PATCH', payload: { patchId, name: newName } })
  }, [])

  const handleCreateFolder = useCallback((name, parentId = null) => {
    dispatch({ type: 'CREATE_FOLDER', payload: { name, parentId } })
  }, [])

  const handleRenameFolder = useCallback((folderId, name) => {
    dispatch({ type: 'RENAME_FOLDER', payload: { folderId, name } })
  }, [])

  const handleDeleteFolder = useCallback((folderId) => {
    const descendantIds = getDescendantFolderIds(folderId, soundFolders)
    const allFolderIds = new Set([folderId, ...descendantIds])
    const folderPatchIds = new Set(
      patches.filter((p) => allFolderIds.has(p.folderId)).map((p) => p.id),
    )
    const referencingClips = clips.filter((c) => folderPatchIds.has(c.patchId))
    if (referencingClips.length > 0) {
      const usedPatchCount = new Set(referencingClips.map((c) => c.patchId)).size
      const n = referencingClips.length
      dispatch({
        type: 'SET_NOTIFICATION',
        payload: {
          message: `${usedPatchCount} patch(es) de ce dossier sont utilisés par ${n} clip(s). Supprimez les clips d'abord.`,
          type: 'error',
          timestamp: Date.now(),
        },
      })
      dispatch({ type: 'SELECT_CLIPS', payload: referencingClips.map((c) => c.id) })
      if (activeTab === 'designer') {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: 'composer' })
      }
      return
    }
    if (folderPatchIds.size > 0) {
      const folder = soundFolders.find((f) => f.id === folderId)
      const name = folder ? folder.name : folderId
      openConfirm({
        title: 'Supprimer le dossier ?',
        message: `Supprimer le dossier "${name}" et ses ${folderPatchIds.size} patch(es) ?`,
        variant: 'danger',
        confirmLabel: 'Supprimer',
        onConfirm: () => dispatch({ type: 'DELETE_FOLDER', payload: { folderId } }),
      })
      return
    }
    dispatch({ type: 'DELETE_FOLDER', payload: { folderId } })
  }, [clips, patches, soundFolders, activeTab, openConfirm])

  const onMoveBibItems = useCallback((items, targetFolderId) => {
    dispatch({ type: 'MOVE_BIB_ITEMS', payload: { items, targetFolderId } })
  }, [])

  // Popup "Sauvegarder le patch" (iter K phase 2) : ouvert depuis le
  // WaveformEditor via onRequestSavePopup, monté en overlay au niveau App.
  // savePopup: null | { patchData, sourcePatch }
  const [savePopup, setSavePopup] = useState(null)

  const openSavePopup = useCallback(({ patchData, sourcePatch }) => {
    setSavePopup({ patchData, sourcePatch })
  }, [])

  const closeSavePopup = useCallback(() => {
    setSavePopup(null)
  }, [])

  const handleSavePopupConfirm = useCallback(({ name, folderId, patchData }) => {
    dispatch({
      type: 'SAVE_PATCH',
      payload: { patchData: { ...patchData, name }, folderId },
    })
    setSavePopup(null)
  }, [])

  const handleCreateFolderFromSavePopup = useCallback((name, parentId) => {
    const newId = `folder-${folderCounter + 1}`
    dispatch({
      type: 'CREATE_FOLDER',
      payload: { name, parentId },
      meta: { skipUndo: true },
    })
    return newId
  }, [folderCounter])

  // Warning suppression d'items bibliothèque utilisés dans la timeline :
  // popup monté en overlay, déclenché via state.pendingDeleteWarning.
  const handleGoToComposerWithClips = useCallback(({ patchIds }) => {
    dispatch({ type: 'GO_TO_COMPOSER_WITH_CLIPS', payload: { patchIds } })
  }, [])

  const handleCloseDeleteWarning = useCallback(() => {
    dispatch({ type: 'CLEAR_PENDING_DELETE_WARNING' })
  }, [])

  const onDeleteBibItems = useCallback((items) => {
    dispatch({ type: 'DELETE_BIB_ITEMS', payload: { items } })
  }, [])

  const notify = (message, type = 'info') => {
    dispatch({ type: 'SET_NOTIFICATION', payload: { message, type, timestamp: Date.now() } })
  }

  const handleExportAll = () => {
    if (patches.length === 0) {
      notify('Rien à exporter', 'error')
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    setExportModal({
      scope: { type: 'all' },
      defaultName: `synth-app-bibliotheque-${today}`,
    })
  }

  const handleExportFolder = (folderId) => {
    const folder = soundFolders.find((f) => f.id === folderId)
    if (!folder) return
    setExportModal({
      scope: { type: 'folder', id: folderId },
      defaultName: folder.name,
    })
  }

  const handleExportPatch = (patchId) => {
    const patch = patches.find((p) => p.id === patchId)
    if (!patch) return
    setExportModal({
      scope: { type: 'patch', id: patchId },
      defaultName: patch.name,
    })
  }

  const handleConfirmExport = async (filename) => {
    const { scope } = exportModal
    try {
      const payload = buildExportPayload({ patches, soundFolders, scope })
      const blob = await encodeOsa(payload)
      triggerDownload(blob, filename)
      setExportModal(null)
      const np = payload.patches.length
      const nf = payload.soundFolders.length
      notify(`Exporté : ${np} patch${np > 1 ? 'es' : ''}, ${nf} dossier${nf > 1 ? 's' : ''}`, 'success')
    } catch (e) {
      setExportModal(null)
      if (e instanceof EmptyExportError) notify('Rien à exporter', 'error')
      else notify(`Erreur d'export : ${e.message}`, 'error')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const buffer = await file.arrayBuffer()
      const payload = await decodeOsa(buffer)
      setImportModal({ payload, fileName: file.name })
    } catch (err) {
      if (err instanceof OsaMagicError) notify('Fichier non reconnu (format .osa attendu)', 'error')
      else if (err instanceof OsaCorruptError) notify('Fichier corrompu', 'error')
      else if (err instanceof OsaParseError) notify('Contenu malformé', 'error')
      else if (err instanceof OsaSchemaError) notify(`Fichier invalide : ${err.field}`, 'error')
      else notify('Lecture du fichier impossible', 'error')
    }
  }

  const handleConfirmImport = (mode, wrapperName) => {
    const { payload } = importModal
    const result = applyImport(payload, mode, wrapperName, {
      soundFolders, folderCounter, patchCounter,
    })
    dispatch({ type: 'IMPORT_LIBRARY', ...result })
    setImportModal(null)
    const np = result.newPatches.length
    const nf = result.newFolders.length
    notify(`Importé : ${np} patch${np > 1 ? 'es' : ''}, ${nf} dossier${nf > 1 ? 's' : ''}`, 'success')
  }

  const handleLoadPatch = useCallback(
    (patchId) => {
      if (currentPatchId === patchId && activeTab === 'designer') return
      const dirty = editorRef.current?.isDirty?.() ?? false
      if (dirty && currentPatchId !== patchId) {
        openConfirm({
          title: 'Abandonner les modifications ?',
          message: "Le patch courant a des modifications non sauvegardées. Charger ce patch et perdre vos modifs ?",
          variant: 'danger',
          confirmLabel: 'Abandonner et ouvrir',
          cancelLabel: "Annuler",
          onConfirm: () => {
            dispatch({ type: 'SET_CURRENT_PATCH_ID', payload: patchId })
            dispatch({ type: 'SET_ACTIVE_TAB', payload: 'designer' })
          },
        })
        return
      }
      dispatch({ type: 'SET_CURRENT_PATCH_ID', payload: patchId })
      dispatch({ type: 'SET_ACTIVE_TAB', payload: 'designer' })
    },
    [currentPatchId, activeTab, openConfirm],
  )

  const handleDragStartFromPicker = useCallback((e, type, id) => {
    e.stopPropagation()
    // Patches : copyMove pour matcher dropEffect='copy' du Timeline (Composer).
    // Folders : move (pas de drop target externe).
    e.dataTransfer.effectAllowed = type === 'patch' ? 'copyMove' : 'move'
    e.dataTransfer.setData('application/x-patchbank-drag', JSON.stringify({ type, id }))
    if (type === 'patch') {
      e.dataTransfer.setData('text/plain', id)
    }
  }, [])

  // iter-K phase-2.f11 : ajoute manuellement un patch au LRU recents
  // (drop depuis le picker vers la liste recents en sidebar Composer collapsed).
  const onAddPatchToRecents = useCallback((patchId) => {
    dispatch({ type: 'ADD_PATCH_TO_RECENTS', payload: { patchId } })
  }, [])

  const handleOpenInLibrary = useCallback(({ type, id }) => {
    dispatch({ type: 'OPEN_IN_LIBRARY', payload: { type, id } })
  }, [])

  const handlePatchCreated = useCallback((newPatchId) => {
    dispatch({ type: 'SET_CURRENT_PATCH_ID', payload: newPatchId })
  }, [])

  const handleRequestNew = useCallback(() => {
    dispatch({ type: 'RESET_EDITOR' })
  }, [])

  const handleZoomHIn = () => dispatch({ type: 'SET_ZOOM_H', payload: (z) => z + 2 })
  const handleZoomHOut = () => dispatch({ type: 'SET_ZOOM_H', payload: (z) => z - 2 })

  const handleUndoComposer = useCallback(() => dispatch({ type: 'UNDO_COMPOSER' }), [])
  const handleRedoComposer = useCallback(() => dispatch({ type: 'REDO_COMPOSER' }), [])
  const handleUndoDesigner = useCallback(() => dispatch({ type: 'UNDO_DESIGNER' }), [])
  const handleRedoDesigner = useCallback(() => dispatch({ type: 'REDO_DESIGNER' }), [])
  const handleUndoLibrary = useCallback(() => dispatch({ type: 'UNDO_LIBRARY' }), [])
  const handleRedoLibrary = useCallback(() => dispatch({ type: 'REDO_LIBRARY' }), [])
  const dismissNotification = useCallback(() => dispatch({ type: 'SET_NOTIFICATION', payload: null }), [])

  const composerCanUndo = history.composer.past.length > 0
  const composerCanRedo = history.composer.future.length > 0
  const designerCanUndo = history.designer.past.length > 0
  const designerCanRedo = history.designer.future.length > 0
  const libraryCanUndo = history.library.past.length > 0
  const libraryCanRedo = history.library.future.length > 0

  const editorActions = useMemo(() => ({
    setPoints: (pts) => dispatch({ type: 'SET_EDITOR_CANONICAL', payload: pts }),
    setTestNoteIndex: (n) => dispatch({ type: 'SET_EDITOR_TEST_NOTE', payload: n }),
    setTestOctave: (o) => dispatch({ type: 'SET_EDITOR_TEST_OCTAVE', payload: o }),
    setTestTuningSystem: (ts) => dispatch({ type: 'SET_EDITOR_TEST_TUNING_SYSTEM', payload: ts }),
    setTestFrequency: (hz) => dispatch({ type: 'SET_EDITOR_TEST_FREQUENCY', payload: hz }),
    setAmplitude: (a) => dispatch({ type: 'SET_EDITOR_AMPLITUDE', payload: a }),
    // Modèle unifié (M rattrapage) : cap unique (remplace definition + N).
    // iter-M phase-r.2.4 : alias setDefinition/setN supprimés — un seul setCap.
    setCap: (c) => dispatch({ type: 'SET_EDITOR_CAP', payload: c }),
    setCurrentLens: (l) => dispatch({ type: 'SET_EDITOR_CURRENT_LENS', payload: l }),
    // iter-M phase-r.2.4 : nombre d'ancres de la spline (re-fit à la canonical).
    setAnchorCount: (count) => dispatch({ type: 'SET_EDITOR_ANCHOR_COUNT', payload: { count } }),
    setHarmonicAmplitude: (index, value) =>
      dispatch({ type: 'SET_EDITOR_HARMONIC_AMPLITUDE', payload: { index, value } }),
    // iter-N phase-5c : la modale résout la canonical (elle a le moteur) et
    // passe un payload prêt : { canonical, cap, anchorCount, canonicalNormalized,
    // preset }. Le reducer l'applique tel quel (cf. LOAD_PRESET).
    loadPreset: (payload) => dispatch({ type: 'LOAD_PRESET', payload }),
    // iter-M phase-3 : édition spline. moveSplineAnchor est appelée au commit
    // du drag (draft local côté SplineEditor) → un seul cran undo par geste.
    moveSplineAnchor: (index, x, y) =>
      dispatch({ type: 'MOVE_SPLINE_ANCHOR', payload: { index, x, y } }),
    addSplineAnchor: (x, y) => dispatch({ type: 'ADD_SPLINE_ANCHOR', payload: { x, y } }),
    removeSplineAnchor: (index) => dispatch({ type: 'REMOVE_SPLINE_ANCHOR', payload: { index } }),
    setSplineInterpolation: (v) => dispatch({ type: 'SET_SPLINE_INTERPOLATION', payload: v }),
    setAdsr: (patch) => dispatch({ type: 'SET_EDITOR_ADSR', payload: patch }),
    setAdsrAndAmp: (payload) => dispatch({ type: 'SET_EDITOR_ADSR_AND_AMP', payload }),
    // itération P : édition d'un paramètre de modulation (vibrato/trémolo).
    setModulation: (effect, key, value) =>
      dispatch({ type: 'SET_EDITOR_MODULATION', payload: { effect, key, value } }),
    // iter-M phase-r.2.2 : reset du timbre seul (≠ RESET_EDITOR « Nouveau patch »).
    resetWaveform: () => dispatch({ type: 'RESET_EDITOR_WAVEFORM' }),
    // iter-M phase-r.2.3 : normalisation (iDFT phase canonique).
    normalize: () => dispatch({ type: 'NORMALIZE_EDITOR_CANONICAL' }),
    // iter-N phase-4 : lissages du tracé (expérimentaux, répétables).
    smoothCanonical: () => dispatch({ type: 'SMOOTH_EDITOR_CANONICAL' }),
    tendTowardSpline: () => dispatch({ type: 'TEND_TOWARD_SPLINE' }),
    setVisualCuePattern: (id) => dispatch({ type: 'SET_EDITOR_VISUAL_CUE_PATTERN', payload: id }),
    setVisualCueTonic: (deg) => dispatch({ type: 'SET_EDITOR_VISUAL_CUE_TONIC', payload: deg }),
    setXEdoN: (n) => dispatch({ type: 'SET_X_EDO_N', payload: n }),
  }), [])

  // Computed once per render — used dans les deux variantes responsive (mobile accordion + desktop grid)
  const spectrogramNode = (
    <Spectrogram
      points={editor.canonical}
      definition={editor.cap}
      frequency={editorFrequency}
      analyserRef={analyserRef}
      activeVoicesCountRef={activeVoicesCountRef}
      dbScale={spectrogramDbScale}
      peakHold={spectrogramPeakHold}
      mode={spectrogramMode}
      onToggleDbScale={() => setSpectrogramDbScale(!spectrogramDbScale)}
      onTogglePeakHold={() => setSpectrogramPeakHold(!spectrogramPeakHold)}
      onToggleMode={() =>
        setSpectrogramMode(spectrogramMode === 'live' ? 'static' : 'live')
      }
    />
  )

  return (
    <div className="app">
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        theme={theme}
        onToggleTheme={() => dispatch({ type: 'SET_THEME', payload: theme === 'light' ? 'dark' : 'light' })}
        shortcutsOverlayOpen={shortcutsOverlayOpen}
        onToggleShortcuts={() => setShortcutsOverlay(!shortcutsOverlayOpen)}
        tourActive={tour.active}
        onToggleTour={() => dispatch(tour.active ? { type: 'END_TOUR' } : { type: 'START_TOUR', payload: activeTab })}
      />
      <ShortcutsOverlay
        isOpen={shortcutsOverlayOpen}
        onClose={() => setShortcutsOverlay(false)}
        state={state}
      />

      {activeTab === 'library' && (
        <main className="library-tab-content">
          <PatchBank
            patches={patches}
            soundFolders={soundFolders}
            currentPatchId={currentPatchId}
            activeTab={activeTab}
            onLoadPatch={handleLoadPatch}
            onRenamePatch={handleRenamePatch}
            onDeletePatch={handleDeletePatch}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveItems={onMoveBibItems}
            onExportFolder={handleExportFolder}
            onExportPatch={handleExportPatch}
            onExportAll={handleExportAll}
            bibHierarchyMode={bibHierarchyMode}
            bibDisplayMode={bibDisplayMode}
            bibCurrentFolderId={bibCurrentFolderId}
            bibCollapsedFolders={bibCollapsedFolders}
            onSetHierarchyMode={setBibHierarchyMode}
            onSetDisplayMode={setBibDisplayMode}
            onSetCurrentFolder={setBibCurrentFolder}
            onToggleBibFolderCollapsed={onToggleBibFolderCollapsed}
            onNotify={notify}
            bibSelectedIds={bibSelectedIds}
            bibSelectionAnchor={bibSelectionAnchor}
            onSelectItems={onSelectBibItems}
            onClearSelection={onClearBibSelection}
            bibClipboard={bibClipboard}
            onCopy={onCopyBibItems}
            onCut={onCutBibItems}
            onClearClipboard={onClearBibClipboard}
            onPaste={onPasteBibClipboard}
            onDeleteItems={onDeleteBibItems}
            isFullTab={true}
            clips={clips}
            onImportLibrary={handleImportClick}
            onUndoLibrary={handleUndoLibrary}
            onRedoLibrary={handleRedoLibrary}
            canUndoLibrary={libraryCanUndo}
            canRedoLibrary={libraryCanRedo}
          />
        </main>
      )}

      {/* iter-L phase-2.3 : onglet Documentation. Mount conditionnel —
          aucun état audio/éditeur à préserver, la position de lecture
          vit en sessionStorage (cf. doc.{currentArticleId,
          scrollPositions}). */}
      {activeTab === 'documentation' && (
        <DocumentationTab
          doc={doc}
          sidebarCollapsed={docSidebarCollapsed}
          sidebarWidth={docSidebarWidth}
          onDocLink={handleDocLink}
          onSetCurrentArticle={(id) => dispatch({ type: 'SET_CURRENT_ARTICLE', payload: id })}
          onSetArticleScroll={(articleId, scrollTop) => dispatch({ type: 'SET_ARTICLE_SCROLL', payload: { articleId, scrollTop } })}
          onToggleSidebar={() => dispatch({ type: 'TOGGLE_DOC_SIDEBAR' })}
          onSetSidebarWidth={(w) => dispatch({ type: 'SET_DOC_SIDEBAR_WIDTH', payload: w })}
        />
      )}

      <WaveformEditor
        ref={editorRef}
        editor={editor}
        editorActions={editorActions}
        a4Ref={a4Ref}
        xEdoN={xEdoN}
        onConvertXEdoTo={handleConvertXEdoTo}
        activeTab={activeTab}
        onSavePatch={handleSavePatch}
        onUpdatePatch={handleUpdatePatch}
        onRequestNew={handleRequestNew}
        onRequestSavePopup={openSavePopup}
        nextPatchName={nextPatchName}
        currentPatch={currentPatch}
        patches={patches}
        onPatchCreated={handlePatchCreated}
        canUndo={designerCanUndo}
        canRedo={designerCanRedo}
        onUndo={handleUndoDesigner}
        onRedo={handleRedoDesigner}
        analyserRef={analyserRef}
        activeVoicesCountRef={activeVoicesCountRef}
        isMobile={isMobile}
        adsrView={adsrView}
        onSetAdsrView={(v) => dispatch({ type: 'SET_ADSR_VIEW', payload: v })}
        modulationVisible={modulationVisible}
      >
        {({ renderCanvasArea, renderHarmonicsArea, renderParamsArea, renderAdsrArea, renderModulationArea, renderActions, patchLabel, openPresetPicker, requestResetWaveform }) => (
          <>
            <main
              className={`designer-layout${isMobile ? ' designer-layout-mobile' : ''}`}
              hidden={activeTab !== 'designer'}
              aria-hidden={activeTab !== 'designer'}
              style={{
                '--designer-sidebar-width': designerSidebarCollapsedEffective
                  ? `${DESIGNER_SIDEBAR_COLLAPSED_WIDTH}px`
                  : `${designerSidebarWidth}px`,
              }}
            >
              <aside className={`designer-sidebar${designerSidebarCollapsedEffective ? ' is-collapsed' : ''}`}>
                {designerSidebarCollapsedEffective ? (
                  <>
                    {/* Groupe haut : expand + Bibliothèque popover */}
                    <button
                      type="button"
                      className="sidebar-toggle sidebar-toggle-standalone"
                      onClick={handleToggleDesignerCollapsed}
                      title="Ouvrir le panneau latéral"
                      aria-label="Ouvrir le panneau latéral"
                      aria-expanded={false}
                    >
                      <ChevronRight size={14} strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      ref={libraryPopoverTriggerRef}
                      className={`designer-collapsed-section-btn${libraryPopoverOpen ? ' is-active' : ''}`}
                      onClick={() => setLibraryPopoverOpen((v) => !v)}
                      title="Ouvrir la Bibliothèque (flottant)"
                      aria-label="Ouvrir la Bibliothèque"
                      aria-expanded={libraryPopoverOpen}
                    ><Library size={16} strokeWidth={1.9} /></button>
                    {/* Spacer flex:1 pour pousser Actions + Play vers le bas */}
                    <div className="designer-collapsed-spacer" aria-hidden="true" />
                    {/* Groupe Actions juste au-dessus du Play, séparé visuellement */}
                    {renderActions({ collapsed: true })}
                    <hr className="designer-collapsed-divider" aria-hidden="true" />
                    {/* Groupe bas : Play/Stop tout en bas */}
                    <button
                      type="button"
                      className={`designer-collapsed-section-btn mini-play-btn-collapsed${playback.isPlaying ? ' playing' : ''}`}
                      onClick={playback.isPlaying ? playback.stop : playback.play}
                      disabled={clips.length === 0}
                      title={playback.isPlaying ? 'Arrêter la lecture' : 'Lire la composition'}
                      aria-label={playback.isPlaying ? STRINGS.transport.stopAria : STRINGS.transport.playAria}
                    >
                      {playback.isPlaying
                        ? <Square size={14} strokeWidth={2.2} fill="currentColor" />
                        : <Play size={14} strokeWidth={2.2} fill="currentColor" />}
                    </button>
                    {libraryPopoverOpen && (
                      <div className="designer-library-popover" ref={libraryPopoverRef} role="dialog" aria-label="Bibliothèque" style={{ width: `${bibPopupWidth}px` }}>
                        {/* G.2.7 : le titre "Bibliothèque" est porté par
                            PatchBank lui-même (h3 du sound-bank-header).
                            Le bouton close est passé via headerExtra pour
                            apparaître à côté de "+ Dossier" — un seul
                            header, alignement cohérent. */}
                        <PatchPicker
                          patches={patches}
                          soundFolders={soundFolders}
                          currentPatchId={currentPatchId}
                          bibClipboard={bibClipboard}
                          bibSelectedIds={bibSelectedIds}
                          bibCollapsedFolders={bibCollapsedFolders}
                          activeTab="designer"
                          onLoadPatch={(id) => { handleLoadPatch(id); setLibraryPopoverOpen(false) }}
                          onOpenInLibrary={handleOpenInLibrary}
                          onDragStart={handleDragStartFromPicker}
                          onToggleBibFolderCollapsed={onToggleBibFolderCollapsed}
                          headerExtra={
                            <button
                              type="button"
                              className="popover-close-btn"
                              onClick={() => setLibraryPopoverOpen(false)}
                              title="Fermer la bibliothèque"
                              aria-label="Fermer"
                            ><X size={14} strokeWidth={2.2} /></button>
                          }
                        />
                        <PopupResizer currentWidth={bibPopupWidth} onResize={setBibPopupWidth} />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <header className="designer-sidebar-header">
                      <h3>Outils</h3>
                      <button
                        type="button"
                        className="sidebar-toggle sidebar-toggle-inline"
                        onClick={handleToggleDesignerCollapsed}
                        title="Réduire le panneau latéral"
                        aria-label="Réduire le panneau latéral"
                        aria-expanded={true}
                      >
                        <ChevronLeft size={14} strokeWidth={2.2} />
                      </button>
                    </header>
                    <section className="sidebar-section sidebar-library">
                      <PatchPicker
                        patches={patches}
                        soundFolders={soundFolders}
                        currentPatchId={currentPatchId}
                        bibClipboard={bibClipboard}
                        bibSelectedIds={bibSelectedIds}
                        bibCollapsedFolders={bibCollapsedFolders}
                        activeTab="designer"
                        onLoadPatch={handleLoadPatch}
                        onOpenInLibrary={handleOpenInLibrary}
                        onDragStart={handleDragStartFromPicker}
                        onToggleBibFolderCollapsed={onToggleBibFolderCollapsed}
                      />
                    </section>
                    <section className="sidebar-section sidebar-actions">
                      {renderActions()}
                      <MiniPlayer
                        isPlaying={playback.isPlaying}
                        cursorPos={playback.cursorPos}
                        currentTime={playback.currentTime}
                        totalDurationSec={totalDurationSec}
                        hasClips={clips.length > 0}
                        onPlay={playback.play}
                        onStop={playback.stop}
                      />
                    </section>
                    <SidebarResizer
                      side="right"
                      width={designerSidebarWidth}
                      minWidth={DESIGNER_SIDEBAR_MIN_WIDTH}
                      onChange={handleResizeDesignerSidebar}
                      ariaLabel={`Redimensionner le panneau latéral de la ${STRINGS.tabs.designer}`}
                    />
                  </>
                )}
              </aside>
              {isMobile ? (
                /* iter-R phase-1 : petit écran (< 924×668) = switcher de modules.
                   Une rangée d'icônes vit dans la DesignerToolbar ; un seul corps
                   est affiché plein cadre dans la zone centrale, les autres masqués
                   en CSS (display:none). Les 6 corps restent MONTÉS en permanence —
                   sinon les canvas (Forme d'onde / Harmoniques / Spectro + mini-courbe
                   Modulation) perdraient leur état et laisseraient des ResizeObserver
                   orphelins (même contrainte que DesignerModule desktop). Le passage
                   display:none → display:flex au changement de module fait détecter
                   aux RO le retour à des dimensions non-nulles → redraw automatique. */
                <div className="designer-main designer-main-mobile">
                  {/* iter-M phase-r.2.1 / iter-R phase-1.2 : barre du haut (identité
                      du patch) + switcher de modules (mobile only). Les contrôles de
                      proportions restent desktop-only — non passés ici. */}
                  <DesignerToolbar
                    patchLabel={patchLabel}
                    onPresets={openPresetPicker}
                    onReset={requestResetWaveform}
                    mobileModuleIds={DESIGNER_MOBILE_ORDER}
                    activeMobileModule={designerMobileModule}
                    onSelectMobileModule={handleSelectMobileModule}
                  />
                  <div className="designer-mobile-stack">
                    {[
                      { id: 'canvas', body: renderCanvasArea() },
                      { id: 'harmonics', body: renderHarmonicsArea() },
                      { id: 'spectrogram', body: spectrogramNode },
                      { id: 'adsr', body: renderAdsrArea() },
                      { id: 'modulation', body: renderModulationArea() },
                      { id: 'params', body: renderParamsArea() },
                    ].map((mod) => (
                      <div
                        key={mod.id}
                        className={`designer-mobile-panel${designerMobileModule === mod.id ? ' is-active' : ''}`}
                      >
                        {mod.body}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`designer-main${maximized ? ' is-maximized' : ''}`}>
                  {/* iter-M phase-r.2.1 : barre du haut homogène (identité du
                      patch + proportions des colonnes), au-dessus des 3 colonnes. */}
                  <DesignerToolbar
                    patchLabel={patchLabel}
                    onPresets={openPresetPicker}
                    onReset={requestResetWaveform}
                    onEqualizeWidths={handleEqualizeWidths}
                    columnWidths={designerColumnWidths}
                    bottomRowWidths={designerBottomRowWidths}
                    autoCollapse={autoCollapse}
                    onToggleAutoCollapse={handleToggleAutoCollapse}
                    autoCollapseForced={winWidth < AUTO_COLLAPSE_DEFAULT_WIDTH}
                  />
                  {/* iter-M phase-2.2 : moitié haute = 3 colonnes ajustables
                      Forme d'onde / Harmoniques / Spectrogramme (le spectro,
                      read-only, est désormais une colonne permanente). */}
                  <DesignerColumns
                    widths={designerColumnWidths}
                    onWidths={setDesignerColumnWidths}
                    collapsed={[designerCollapsed.canvas, designerCollapsed.harmonics, designerCollapsed.spectrogram]}
                    columns={[
                      <DesignerModule
                        key="canvas"
                        id="canvas"
                        collapsed={designerCollapsed.canvas}
                        maximized={maximized === 'canvas'}
                        onToggleCollapse={() => handleToggleModuleCollapsed('canvas', effectiveAutoCollapse)}
                        onToggleMaximize={() => handleToggleModuleMaximized('canvas')}
                      >{renderCanvasArea()}</DesignerModule>,
                      <DesignerModule
                        key="harmonics"
                        id="harmonics"
                        collapsed={designerCollapsed.harmonics}
                        maximized={maximized === 'harmonics'}
                        onToggleCollapse={() => handleToggleModuleCollapsed('harmonics', effectiveAutoCollapse)}
                        onToggleMaximize={() => handleToggleModuleMaximized('harmonics')}
                      >{renderHarmonicsArea()}</DesignerModule>,
                      <DesignerModule
                        key="spectrogram"
                        id="spectrogram"
                        collapsed={designerCollapsed.spectrogram}
                        maximized={maximized === 'spectrogram'}
                        onToggleCollapse={() => handleToggleModuleCollapsed('spectrogram', effectiveAutoCollapse)}
                        onToggleMaximize={() => handleToggleModuleMaximized('spectrogram')}
                      >{spectrogramNode}</DesignerModule>,
                    ]}
                  />
                  {/* iter-P phase-6.2 : rangée du bas via le MÊME DesignerColumns
                      que le haut (DRY → 2 séparateurs draggables identiques).
                      Largeurs persistées, drag manuel. */}
                  <DesignerColumns
                    widths={designerBottomRowWidths}
                    onWidths={setDesignerBottomRowWidths}
                    collapsed={[designerCollapsed.params, designerCollapsed.adsr, designerCollapsed.modulation]}
                    sepLabels={['Redimensionner Instrument / Enveloppe', 'Redimensionner Enveloppe / Modulation']}
                    columns={[
                      <DesignerModule
                        key="params"
                        id="params"
                        collapsed={designerCollapsed.params}
                        maximized={maximized === 'params'}
                        onToggleCollapse={() => handleToggleModuleCollapsed('params', effectiveAutoCollapse)}
                        onToggleMaximize={() => handleToggleModuleMaximized('params')}
                      >{renderParamsArea()}</DesignerModule>,
                      <DesignerModule
                        key="adsr"
                        id="adsr"
                        collapsed={designerCollapsed.adsr}
                        maximized={maximized === 'adsr'}
                        onToggleCollapse={() => handleToggleModuleCollapsed('adsr', effectiveAutoCollapse)}
                        onToggleMaximize={() => handleToggleModuleMaximized('adsr')}
                      >{renderAdsrArea()}</DesignerModule>,
                      <DesignerModule
                        key="modulation"
                        id="modulation"
                        collapsed={designerCollapsed.modulation}
                        maximized={maximized === 'modulation'}
                        onToggleCollapse={() => handleToggleModuleCollapsed('modulation', effectiveAutoCollapse)}
                        onToggleMaximize={() => handleToggleModuleMaximized('modulation')}
                      >{renderModulationArea()}</DesignerModule>,
                    ]}
                  />
                </div>
              )}
            </main>

            <main
              className="composer-layout"
              hidden={activeTab !== 'composer'}
              aria-hidden={activeTab !== 'composer'}
              style={{
                '--composer-bank-width': composerBankCollapsed
                  ? `${COMPOSER_SIDEBAR_COLLAPSED_WIDTH}px`
                  : `${composerBankWidth}px`,
                '--composer-aside-width': composerAsideCollapsed
                  ? `${COMPOSER_SIDEBAR_COLLAPSED_WIDTH}px`
                  : `${composerAsideWidth}px`,
              }}
            >
              <div className="composer-toolbar">
                <Toolbar
                  bpm={bpm}
                  onSetBpm={setBpm}
                  a4Ref={a4Ref}
                  onSetA4Ref={setA4Ref}
                  testTuningSystem={editor.testTuningSystem}
                  onSetTestTuningSystem={setTestTuningSystem}
                  xEdoN={xEdoN}
                  onSetXEdoN={setXEdoN}
                  hasSelection={selectedClipIds.length > 0}
                  hasClipboard={!!clipboard && clipboard.clips.length > 0}
                  onCopy={handleCopy}
                  onCut={handleCut}
                  onPasteFromButton={handlePasteFromButton}
                  isPlaying={playback.isPlaying}
                  hasClips={clips.length > 0}
                  isExporting={playback.isExporting}
                  onPlay={playback.play}
                  onStop={playback.stop}
                  onClearTimeline={handleClearTimeline}
                  onExportWav={playback.exportWav}
                  zoomH={zoomH}
                  onSetZoomH={setZoomH}
                  onZoomHIn={handleZoomHIn}
                  onZoomHOut={handleZoomHOut}
                  zoomHMin={MIN_ZOOM_H}
                  zoomHMax={MAX_ZOOM_H}
                  trackHeight={trackHeight}
                  onSetTrackHeight={setTrackHeight}
                  trackHeightMin={MIN_TRACK_HEIGHT}
                  trackHeightMax={MAX_TRACK_HEIGHT}
                  defaultClipDuration={defaultClipDuration}
                  onSetDefaultClipDuration={setDefaultClipDuration}
                  durationMode={durationMode}
                  onToggleDurationMode={toggleDurationMode}
                  currentTime={playback.currentTime}
                  totalDurationSec={totalDurationSec}
                  composerFlash={composerFlash}
                  pressedNoteLabel={pressedNoteLabel}
                  testOctave={editor.testOctave}
                  canUndo={composerCanUndo}
                  canRedo={composerCanRedo}
                  onUndo={handleUndoComposer}
                  onRedo={handleRedoComposer}
                />
              </div>
              <div className={`composer-sidebar${composerBankCollapsed ? ' is-collapsed' : ''}`}>
                {composerBankCollapsed ? (
                  <>
                    <button
                      type="button"
                      className="sidebar-toggle sidebar-toggle-standalone"
                      onClick={handleToggleBankCollapsed}
                      title="Ouvrir la bibliothèque"
                      aria-label="Ouvrir la bibliothèque"
                      aria-expanded={false}
                    >
                      <ChevronRight size={14} strokeWidth={2.2} />
                    </button>
                    {/* iter-K phase-2.f11 : bouton Library qui ouvre le
                        picker en popover (remplace l'ancien label vertical
                        "Bibliothèque" — mirror du pattern Designer). */}
                    <button
                      type="button"
                      ref={composerLibraryPopoverTriggerRef}
                      className={`designer-collapsed-section-btn${composerLibraryPopoverOpen ? ' is-active' : ''}`}
                      onClick={() => setComposerLibraryPopoverOpen((v) => !v)}
                      title="Ouvrir la Bibliothèque (flottant)"
                      aria-label="Ouvrir la Bibliothèque"
                      aria-expanded={composerLibraryPopoverOpen}
                    ><Library size={16} strokeWidth={1.9} /></button>
                    <RecentPatchesList
                      recentPatchIds={recentPatchIds}
                      patches={patches}
                      onDragStart={handleDragStartFromPicker}
                      onAddToRecents={onAddPatchToRecents}
                    />
                    {composerLibraryPopoverOpen && (
                      <div className="designer-library-popover" ref={composerLibraryPopoverRef} role="dialog" aria-label="Bibliothèque" style={{ width: `${bibPopupWidth}px` }}>
                        <PatchPicker
                          patches={patches}
                          soundFolders={soundFolders}
                          currentPatchId={currentPatchId}
                          bibClipboard={bibClipboard}
                          bibSelectedIds={bibSelectedIds}
                          bibCollapsedFolders={bibCollapsedFolders}
                          activeTab="composer"
                          onLoadPatch={handleLoadPatch}
                          onOpenInLibrary={handleOpenInLibrary}
                          onDragStart={handleDragStartFromPicker}
                          onToggleBibFolderCollapsed={onToggleBibFolderCollapsed}
                          headerExtra={
                            <button
                              type="button"
                              className="popover-close-btn"
                              onClick={() => setComposerLibraryPopoverOpen(false)}
                              title="Fermer la bibliothèque"
                              aria-label="Fermer"
                            ><X size={14} strokeWidth={2.2} /></button>
                          }
                        />
                        <PopupResizer currentWidth={bibPopupWidth} onResize={setBibPopupWidth} />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <PatchPicker
                      patches={patches}
                      soundFolders={soundFolders}
                      currentPatchId={currentPatchId}
                      bibClipboard={bibClipboard}
                      bibSelectedIds={bibSelectedIds}
                      bibCollapsedFolders={bibCollapsedFolders}
                      activeTab="composer"
                      onLoadPatch={handleLoadPatch}
                      onOpenInLibrary={handleOpenInLibrary}
                      onDragStart={handleDragStartFromPicker}
                      onToggleBibFolderCollapsed={onToggleBibFolderCollapsed}
                      headerExtra={
                        <button
                          type="button"
                          className="sidebar-toggle sidebar-toggle-inline"
                          onClick={handleToggleBankCollapsed}
                          title="Réduire la bibliothèque"
                          aria-label="Réduire la bibliothèque"
                          aria-expanded={true}
                        >
                          <ChevronLeft size={14} strokeWidth={2.2} />
                        </button>
                      }
                    />
                    <SidebarResizer
                      side="right"
                      width={composerBankWidth}
                      minWidth={COMPOSER_SIDEBAR_MIN_WIDTH}
                      onChange={handleResizeBank}
                      ariaLabel="Redimensionner la bibliothèque"
                    />
                  </>
                )}
              </div>
              <div className="composer-main" data-anchor="composer-timeline">
                <Timeline
                  patches={patches}
                  clips={clips}
                  tracks={tracks}
                  xEdoN={xEdoN}
                  maxTracks={MAX_TRACKS}
                  onCreateTrack={handleCreateTrack}
                  onRenameTrack={handleRenameTrack}
                  onDeleteTrack={handleDeleteTrack}
                  onReorderTracks={handleReorderTracks}
                  onUpdateTrack={handleUpdateTrack}
                  numMeasures={numMeasures}
                  zoomH={zoomH}
                  onSetZoomH={setZoomH}
                  zoomHMin={MIN_ZOOM_H}
                  zoomHMax={MAX_ZOOM_H}
                  trackHeight={trackHeight}
                  cursorPos={playback.cursorPos}
                  isPlaying={playback.isPlaying}
                  analyserRef={playback.analyserRef}
                  onAddClip={handleAddClip}
                  onRemoveClip={handleRemoveClip}
                  onUpdateClip={handleUpdateClip}
                  onMoveClips={handleMoveClips}
                  onResizeClips={handleResizeClips}
                  onDuplicateClips={handleDuplicateClips}
                  selectedClipIds={selectedClipIds}
                  onSetSelection={handleSetSelection}
                  selectedTrackId={selectedTrackId}
                  onSelectTrack={handleSelectTrack}
                  lastAnchorClipId={lastAnchorClipId}
                  defaultClipDuration={defaultClipDuration}
                  onAddMeasures={handleAddMeasures}
                  onRemoveLastMeasure={handleRemoveLastMeasure}
                  mousePositionRef={timelineMouseRef}
                  hasClipboard={!!clipboard && clipboard.clips.length > 0}
                  clipboard={clipboard}
                  onPaste={handlePaste}
                  onDeleteMeasure={handleDeleteMeasure}
                  onInsertMeasures={handleInsertMeasures}
                  onCopyMeasure={handleCopyMeasure}
                  onCutMeasure={handleCutMeasure}
                  onPasteMeasures={handlePasteMeasures}
                  hasMeasureClipboard={!!measureClipboard}
                />
              </div>
              <div className={`composer-aside${composerAsideCollapsed ? ' is-collapsed' : ''}`}>
                {composerAsideCollapsed ? (
                  <>
                    <button
                      type="button"
                      className="sidebar-toggle sidebar-toggle-standalone"
                      onClick={handleToggleAsideCollapsed}
                      title="Ouvrir les propriétés"
                      aria-label="Ouvrir les propriétés"
                      aria-expanded={false}
                    >
                      <ChevronLeft size={14} strokeWidth={2.2} />
                    </button>
                    <span className="sidebar-collapsed-label">Propriétés</span>
                  </>
                ) : (
                  <>
                    <SidebarResizer
                      side="left"
                      width={composerAsideWidth}
                      minWidth={COMPOSER_SIDEBAR_MIN_WIDTH}
                      onChange={handleResizeAside}
                      ariaLabel="Redimensionner le panneau Propriétés"
                    />
                    <PropertiesPanel
                      selectedClipIds={selectedClipIds}
                      clips={clips}
                      tracks={tracks}
                      patches={patches}
                      numMeasures={numMeasures}
                      durationMode={durationMode}
                      a4Ref={a4Ref}
                      xEdoN={xEdoN}
                      onSetXEdoN={setXEdoN}
                      onUpdateClip={handleUpdateClip}
                      onRemoveClip={handleRemoveClip}
                      onUpdateClipsPatch={handleUpdateClipsPatch}
                      onUpdateClipsDuration={handleUpdateClipsDuration}
                      onUpdateClipsPitch={handleUpdateClipsPitch}
                      onDeleteSelected={handleDeleteSelected}
                      mergeStatus={mergeStatus}
                      onMergeClips={handleMergeClips}
                      canSplit2={canSplit2}
                      canSplit3={canSplit3}
                      onSplitClips={handleSplitClips}
                      headerExtra={
                        <button
                          type="button"
                          className="sidebar-toggle sidebar-toggle-inline"
                          onClick={handleToggleAsideCollapsed}
                          title="Réduire les propriétés"
                          aria-label="Réduire les propriétés"
                          aria-expanded={true}
                        >
                          <ChevronRight size={14} strokeWidth={2.2} />
                        </button>
                      }
                    />
                  </>
                )}
              </div>
            </main>
          </>
        )}
      </WaveformEditor>

      {notification && (
        <Toast
          message={notification.message}
          type={notification.type}
          onDismiss={dismissNotification}
        />
      )}

      {exportModal && (
        <ExportModal
          isOpen={true}
          defaultName={exportModal.defaultName}
          onConfirm={handleConfirmExport}
          onCancel={() => setExportModal(null)}
        />
      )}

      <input
        type="file"
        accept=".osa"
        ref={fileInputRef}
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />
      {importModal && (
        <ImportModal
          isOpen={true}
          payload={importModal.payload}
          fileName={importModal.fileName}
          onConfirm={handleConfirmImport}
          onCancel={() => setImportModal(null)}
        />
      )}

      <SavePatchDialog
        open={savePopup !== null}
        currentPatch={savePopup?.sourcePatch ?? null}
        patches={patches}
        soundFolders={soundFolders}
        bibCurrentFolderId={bibCurrentFolderId}
        patchData={savePopup?.patchData ?? null}
        onConfirm={handleSavePopupConfirm}
        onCancel={closeSavePopup}
        onCreateFolder={handleCreateFolderFromSavePopup}
      />
      <DeleteUsageWarningDialog
        warning={pendingDeleteWarning}
        onGoToComposer={handleGoToComposerWithClips}
        onClose={handleCloseDeleteWarning}
      />

      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        variant={confirmDialog?.variant}
        onConfirm={() => {
          confirmDialog?.onConfirm?.()
          closeConfirm()
        }}
        onCancel={closeConfirm}
      />

      {tour.active && (
        <Tour
          tour={tour}
          dispatch={dispatch}
          designerSidebarCollapsed={designerSidebarCollapsed}
          docSidebarCollapsed={docSidebarCollapsed}
          composerBankCollapsed={composerBankCollapsed}
          composerAsideCollapsed={composerAsideCollapsed}
        />
      )}
    </div>
  )
}

export default App
