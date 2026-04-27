import { useReducer, useCallback, useRef, useState, useEffect, useMemo } from 'react'
import WaveformEditor from './components/WaveformEditor'
import Timeline from './components/Timeline'
import Tabs from './components/Tabs'
import PatchBank from './components/PatchBank'
import MiniPlayer from './components/MiniPlayer'
import Toolbar from './components/Toolbar'
import PropertiesPanel from './components/PropertiesPanel'
import Spectrogram from './components/Spectrogram'
import SidebarResizer from './components/SidebarResizer'
import {
  reducer,
  withUndo,
  buildInitialState,
  STORAGE_KEY,
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
  canSplitClip,
  getDescendantFolderIds,
  editorTestNoteFields,
} from './reducer'
import { canMergeClips } from './lib/timelineLayout'
import { getKeyboardMap, getNoteNames, getTuningSystem } from './lib/tuningSystems'
import { xEdoShiftedKeyboardMapForN } from './lib/xEdoLayouts'
import { NOTE_GUARD_KEYS } from './lib/keyboardCandidates'
import {
  DURATION_BASES, DURATION_COEFS,
  deriveBaseAndCoef, effectiveDuration, isValidCoef,
} from './lib/durations'
import Toast from './components/Toast'
import { usePlayback } from './hooks/usePlayback'
import './App.css'

const wrappedReducer = withUndo(reducer)

function App() {
  const [state, dispatch] = useReducer(wrappedReducer, undefined, buildInitialState)
  const {
    clips, patches, soundFolders, tracks, bpm, numMeasures, a4Ref, xEdoN,
    editor, activeTab, currentPatchId, zoomH, defaultClipDuration,
    spectrogramVisible, durationMode, selectedClipIds, composerFlash, lastAnchorClipId,
    composerBankWidth, composerAsideWidth, composerBankCollapsed, composerAsideCollapsed,
    patchCounter, clipCounter, folderCounter, trackCounter,
    clipboard, measureClipboard, history, notification,
  } = state

  const editorRef = useRef(null)

  const timelineMouseRef = useRef(null)

  // Raccourcis clavier E.4 (Composer) : note physique maintenue → override de
  // la hauteur au drop d'un patch. State pour le feedback visuel, ref pour la
  // lecture synchrone au drop (qui se passe hors rendu React).
  const pressedNoteKeyRef = useRef(null)
  const [pressedNoteKey, setPressedNoteKey] = useState(null)
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

  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return
      const isUndo = e.key.toLowerCase() === 'z' && !e.shiftKey
      const isRedo = (e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y'
      if (!isUndo && !isRedo) return
      e.preventDefault()
      const tab = activeTab === 'composer' ? 'COMPOSER' : 'DESIGNER'
      dispatch({ type: `${isUndo ? 'UNDO' : 'REDO'}_${tab}` })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isDelete = e.key === 'Delete' || e.key === 'Backspace'
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
      const isArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown'
        || e.key === 'ArrowLeft' || e.key === 'ArrowRight'
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
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key !== 'PageUp' && e.key !== 'PageDown') return
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
          tuningSystem: editor.testTuningSystem,
          noteIndex: idx,
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
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          patches,
          soundFolders,
          tracks,
          clips,
          bpm,
          numMeasures,
          a4Ref,
          xEdoN,
          spectrogramVisible,
          durationMode,
          activeTab,
          patchCounter,
          clipCounter,
          folderCounter,
          trackCounter,
          composerBankWidth,
          composerAsideWidth,
          composerBankCollapsed,
          composerAsideCollapsed,
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
    spectrogramVisible, durationMode, activeTab, patchCounter, clipCounter, folderCounter, trackCounter,
    composerBankWidth, composerAsideWidth, composerBankCollapsed, composerAsideCollapsed,
    editor.testTuningSystem, editor.testNoteIndex, editor.testOctave, editor.testFrequency,
    editor.visualCuePattern, editor.visualCueTonic,
  ])

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
      if (!window.confirm(`Supprimer la piste "${name}" et ses ${n} clip${n > 1 ? 's' : ''} ?`)) return
    }
    dispatch({ type: 'DELETE_TRACK', payload: { trackId } })
  }, [tracks, clips])

  const setDefaultClipDuration = useCallback((v) => {
    dispatch({ type: 'SET_DEFAULT_CLIP_DURATION', payload: v })
  }, [])

  const toggleDurationMode = useCallback(() => {
    dispatch({
      type: 'SET_DURATION_MODE',
      payload: durationMode === 'solfège' ? 'fraction' : 'solfège',
    })
  }, [durationMode])

  const setSpectrogramVisible = useCallback((v) => {
    dispatch({ type: 'SET_SPECTROGRAM_VISIBLE', payload: v })
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

  const handleToggleBankCollapsed = useCallback(() => {
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
  //   1. Touche de note physique maintenue (E.4.1) → 12-TET à cette note +
  //      octave courante. La touche surpasse le système courant de l'éditeur
  //      (explicite user intent).
  //   2. Sinon, fallback sur la note du clavier de test de l'éditeur (E.1).
  const handleAddClip = useCallback(
    (patchId, measure, beat, duration, trackId = DEFAULT_TRACK_ID) => {
      const keyHeld = pressedNoteKeyRef.current !== null
      const note = keyHeld
        ? {
            tuningSystem: editor.testTuningSystem,
            noteIndex: pressedNoteKeyRef.current,
            octave: editor.testOctave,
            frequency: null,
          }
        : editorTestNoteFields(editor)
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
    [editor],
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

  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (activeTab !== 'composer') return
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return
      const key = e.key.toLowerCase()
      if (key === 'c' && selectedClipIds.length > 0) {
        e.preventDefault()
        handleCopy()
      } else if (key === 'x' && selectedClipIds.length > 0) {
        e.preventDefault()
        handleCut()
      } else if (key === 'v' && clipboard) {
        e.preventDefault()
        const pos = timelineMouseRef.current
        if (pos) handlePaste(pos.absoluteBeat, pos.trackId)
      } else if (key === 'm' && selectedClipIds.length >= 2) {
        e.preventDefault()
        if (mergeStatus.canMerge) handleMergeClips()
      } else if (key === 'd' && selectedClipIds.length > 0) {
        e.preventDefault()
        const divisor = e.shiftKey ? 3 : 2
        const can = divisor === 2 ? canSplit2 : canSplit3
        if (can) handleSplitClips(divisor)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, selectedClipIds, clipboard, mergeStatus, canSplit2, canSplit3, handleCopy, handleCut, handlePaste, handleMergeClips, handleSplitClips])

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

    if (toDelete.length > 0) {
      const dN = toDelete.length
      const tN = toTruncate.length
      const dS = dN > 1 ? 's' : ''
      const verb = dN > 1 ? 'seront supprimés' : 'sera supprimé'
      const msg = tN > 0
        ? `${dN} clip${dS} ${verb} et ${tN} tronqué${tN > 1 ? 's' : ''}. Continuer ?`
        : `${dN} clip${dS} ${verb}. Continuer ?`
      if (!window.confirm(msg)) return
    }

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
  }, [numMeasures, clips])

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

    if (deletedIds.length > 0 || truncated.length > 0) {
      const dN = deletedIds.length
      const tN = truncated.length
      const parts = []
      if (dN > 0) parts.push(`${dN} clip${dN > 1 ? 's supprimés' : ' supprimé'}`)
      if (tN > 0) parts.push(`${tN} tronqué${tN > 1 ? 's' : ''}`)
      if (dN > 0 && !window.confirm(`Supprimer la mesure ${measureNum} ? ${parts.join(', ')}.`)) return
    }

    dispatch({
      type: 'DELETE_MEASURE',
      payload: { measure: measureNum, deletedIds, truncated, splitParts },
    })
  }, [numMeasures, clips])

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

  const handleCreateFolder = useCallback((name) => {
    dispatch({ type: 'CREATE_FOLDER', payload: { name } })
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
      if (!window.confirm(`Supprimer le dossier "${name}" et ses ${folderPatchIds.size} patch(es) ?`)) return
    }
    dispatch({ type: 'DELETE_FOLDER', payload: { folderId } })
  }, [clips, patches, soundFolders, activeTab])

  const handleMovePatchToFolder = useCallback((patchId, folderId) => {
    dispatch({ type: 'MOVE_PATCH_TO_FOLDER', payload: { patchId, folderId } })
  }, [])

  const handleMoveFolder = useCallback((folderId, parentId) => {
    dispatch({ type: 'MOVE_FOLDER', payload: { folderId, parentId } })
  }, [])

  const handleLoadPatch = useCallback(
    (patchId) => {
      if (currentPatchId === patchId && activeTab === 'designer') return
      const dirty = editorRef.current?.isDirty?.() ?? false
      if (dirty && currentPatchId !== patchId) {
        const ok = window.confirm(
          "Modifications non sauvegardées dans l'éditeur. Charger ce patch et perdre vos modifs ?",
        )
        if (!ok) return
      }
      dispatch({ type: 'SET_CURRENT_PATCH_ID', payload: patchId })
      dispatch({ type: 'SET_ACTIVE_TAB', payload: 'designer' })
    },
    [currentPatchId, activeTab],
  )

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
  const dismissNotification = useCallback(() => dispatch({ type: 'SET_NOTIFICATION', payload: null }), [])

  const composerCanUndo = history.composer.past.length > 0
  const composerCanRedo = history.composer.future.length > 0
  const designerCanUndo = history.designer.past.length > 0
  const designerCanRedo = history.designer.future.length > 0

  const editorActions = useMemo(() => ({
    setPoints: (pts) => dispatch({ type: 'SET_EDITOR_POINTS', payload: pts }),
    setTestNoteIndex: (n) => dispatch({ type: 'SET_EDITOR_TEST_NOTE', payload: n }),
    setTestOctave: (o) => dispatch({ type: 'SET_EDITOR_TEST_OCTAVE', payload: o }),
    setTestTuningSystem: (ts) => dispatch({ type: 'SET_EDITOR_TEST_TUNING_SYSTEM', payload: ts }),
    setTestFrequency: (hz) => dispatch({ type: 'SET_EDITOR_TEST_FREQUENCY', payload: hz }),
    setAmplitude: (a) => dispatch({ type: 'SET_EDITOR_AMPLITUDE', payload: a }),
    setAdsr: (patch) => dispatch({ type: 'SET_EDITOR_ADSR', payload: patch }),
    setAdsrAndAmp: (payload) => dispatch({ type: 'SET_EDITOR_ADSR_AND_AMP', payload }),
    applyPreset: (preset, points) =>
      dispatch({ type: 'APPLY_EDITOR_PRESET', payload: { preset, points } }),
    setVisualCuePattern: (id) => dispatch({ type: 'SET_EDITOR_VISUAL_CUE_PATTERN', payload: id }),
    setVisualCueTonic: (deg) => dispatch({ type: 'SET_EDITOR_VISUAL_CUE_TONIC', payload: deg }),
    setXEdoN: (n) => dispatch({ type: 'SET_X_EDO_N', payload: n }),
  }), [])

  return (
    <div className="app">
      <Tabs activeTab={activeTab} onChange={setActiveTab} />

      <WaveformEditor
        ref={editorRef}
        editor={editor}
        editorActions={editorActions}
        a4Ref={a4Ref}
        xEdoN={xEdoN}
        activeTab={activeTab}
        onSavePatch={handleSavePatch}
        onUpdatePatch={handleUpdatePatch}
        onRequestNew={handleRequestNew}
        nextPatchName={nextPatchName}
        currentPatch={currentPatch}
        patches={patches}
        onPatchCreated={handlePatchCreated}
        spectrogramVisible={spectrogramVisible}
        onToggleSpectrogram={setSpectrogramVisible}
        canUndo={designerCanUndo}
        canRedo={designerCanRedo}
        onUndo={handleUndoDesigner}
        onRedo={handleRedoDesigner}
      >
        {({ renderCanvasArea, renderParamsArea, renderAdsrArea }) => (
          <>
            <main
              className="designer-layout"
              hidden={activeTab !== 'designer'}
              aria-hidden={activeTab !== 'designer'}
            >
              <aside className="designer-sidebar">
                <PatchBank
                  patches={patches}
                  soundFolders={soundFolders}
                  currentPatchId={currentPatchId}
                  activeTab="designer"
                  onLoadPatch={handleLoadPatch}
                  onRenamePatch={handleRenamePatch}
                  onDeletePatch={handleDeletePatch}
                  onCreateFolder={handleCreateFolder}
                  onRenameFolder={handleRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onMovePatchToFolder={handleMovePatchToFolder}
                  onMoveFolder={handleMoveFolder}
                />
                <MiniPlayer
                  isPlaying={playback.isPlaying}
                  cursorPos={playback.cursorPos}
                  currentTime={playback.currentTime}
                  totalDurationSec={totalDurationSec}
                  hasClips={clips.length > 0}
                  onPlay={playback.play}
                  onStop={playback.stop}
                />
              </aside>
              <div className="designer-main">
                <div className="designer-row">
                  <div className="designer-cell">{renderCanvasArea()}</div>
                  {spectrogramVisible && (
                    <div className="designer-cell">
                      <Spectrogram points={editor.points} frequency={editorFrequency} />
                    </div>
                  )}
                </div>
                <div className="designer-row">
                  <div className="designer-cell">{renderParamsArea()}</div>
                  <div className="designer-cell">{renderAdsrArea()}</div>
                </div>
              </div>
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
                      title="Ouvrir la banque"
                      aria-label="Ouvrir la banque"
                      aria-expanded={false}
                    >
                      <span className="sidebar-toggle-icon">▶</span>
                    </button>
                    <span className="sidebar-collapsed-label">Banque</span>
                  </>
                ) : (
                  <>
                    <PatchBank
                      patches={patches}
                      soundFolders={soundFolders}
                      currentPatchId={currentPatchId}
                      activeTab="composer"
                      onLoadPatch={handleLoadPatch}
                      onRenamePatch={handleRenamePatch}
                      onDeletePatch={handleDeletePatch}
                      onCreateFolder={handleCreateFolder}
                      onRenameFolder={handleRenameFolder}
                      onDeleteFolder={handleDeleteFolder}
                      onMovePatchToFolder={handleMovePatchToFolder}
                      onMoveFolder={handleMoveFolder}
                      headerExtra={
                        <button
                          type="button"
                          className="sidebar-toggle sidebar-toggle-inline"
                          onClick={handleToggleBankCollapsed}
                          title="Réduire la banque"
                          aria-label="Réduire la banque"
                          aria-expanded={true}
                        >
                          <span className="sidebar-toggle-icon">◀</span>
                        </button>
                      }
                    />
                    <SidebarResizer
                      side="right"
                      width={composerBankWidth}
                      minWidth={COMPOSER_SIDEBAR_MIN_WIDTH}
                      onChange={handleResizeBank}
                      ariaLabel="Redimensionner la banque"
                    />
                  </>
                )}
              </div>
              <div className="composer-main">
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
                      <span className="sidebar-toggle-icon">◀</span>
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
                          <span className="sidebar-toggle-icon">▶</span>
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
    </div>
  )
}

export default App
