import { useReducer, useCallback, useRef, useEffect, useMemo } from 'react'
import WaveformEditor from './components/WaveformEditor'
import Timeline from './components/Timeline'
import Tabs from './components/Tabs'
import SoundBank from './components/SoundBank'
import MiniPlayer from './components/MiniPlayer'
import Toolbar from './components/Toolbar'
import PropertiesPanel from './components/PropertiesPanel'
import Spectrogram from './components/Spectrogram'
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
  DEFAULT_TRACK_ID,
  sameWaveform,
  canSplitClip,
} from './reducer'
import { canMergeClips } from './lib/timelineLayout'
import Toast from './components/Toast'
import { usePlayback } from './hooks/usePlayback'
import './App.css'

const wrappedReducer = withUndo(reducer)

function App() {
  const [state, dispatch] = useReducer(wrappedReducer, undefined, buildInitialState)
  const {
    clips, savedSounds, soundFolders, tracks, bpm, numMeasures,
    editor, activeTab, currentSoundId, zoomH, defaultClipDuration,
    spectrogramVisible, selectedClipIds, composerFlash,
    soundCounter, clipCounter, clipboard, history, notification,
  } = state

  const editorRef = useRef(null)

  // Position courante de la souris dans la timeline (espace scrollable en
  // beats). Mis à jour en continu par Timeline via onMouseMove. Null si la
  // souris est hors de la zone timeline. Utilisé pour le collage au clavier.
  const timelineMouseRef = useRef(null)

  const trackHeight = tracks[0]?.height ?? 80

  const nextSoundName = `Son ${soundCounter + 1}`

  const totalBeats = numMeasures * BEATS_PER_MEASURE
  const totalDurationSec = (totalBeats * 60) / bpm

  const playback = usePlayback({ clips, savedSounds, bpm, totalDurationSec })

  const currentSound = useMemo(
    () => (currentSoundId ? savedSounds.find((s) => s.id === currentSoundId) ?? null : null),
    [currentSoundId, savedSounds],
  )

  const editorFrequency = editor.freeMode
    ? editor.freeFrequency
    : 440 * Math.pow(2, ((editor.octave + 1) * 12 + editor.noteIndex - 69) / 12)

  // === Effets de bord ===

  // Auto-clear du flash composer après 3s
  useEffect(() => {
    if (!composerFlash) return
    const t = setTimeout(() => dispatch({ type: 'SET_COMPOSER_FLASH', payload: null }), 3000)
    return () => clearTimeout(t)
  }, [composerFlash])

  // Auto-clear du toast notification après 4.5s. Le timestamp force le reset
  // du timer si une nouvelle notification arrive (même message).
  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', payload: null }), 4500)
    return () => clearTimeout(t)
  }, [notification])

  // Raccourcis globaux Ctrl/Cmd+Z (undo) et Ctrl/Cmd+Shift+Z / Ctrl+Y (redo).
  // Ne se déclenchent pas si focus dans un input/textarea/select/contenteditable
  // (préserve l'undo natif des champs de saisie).
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

  // Global Delete/Backspace/Escape (les raccourcis Ctrl+C/X/V sont
  // dans un effet séparé plus bas, après la déclaration des handlers).
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

  // Persistance localStorage : ne PAS persister UI (selectedClipIds,
  // currentSoundId, zoomH, defaultClipDuration, composerFlash, editor).
  // L'éditeur est volatil ; au reload on retombe sur l'éditeur vide.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          savedSounds,
          soundFolders,
          tracks,
          clips,
          bpm,
          numMeasures,
          spectrogramVisible,
          activeTab,
          soundCounter,
          clipCounter,
        }),
      )
    } catch {
      // storage unavailable
    }
  }, [
    savedSounds, soundFolders, tracks, clips, bpm, numMeasures,
    spectrogramVisible, activeTab, soundCounter, clipCounter,
  ])

  // Hydratation de l'éditeur quand currentSoundId change. Non-undoable.
  // On charge le son associé dans l'éditeur ; si null, on reset.
  // L'effet se déclenche aussi si le savedSound modifié (update inline) change
  // d'identité ; on synchronise alors les paramètres édités sur la nouvelle
  // version sauvée. Pour éviter d'écraser un travail en cours sur le son
  // chargé, on ne re-hydrate que si l'identité change vraiment (ref).
  const hydratedFromIdRef = useRef(null)
  useEffect(() => {
    if (hydratedFromIdRef.current === currentSoundId) return
    hydratedFromIdRef.current = currentSoundId
    dispatch({ type: 'HYDRATE_EDITOR_FROM_SOUND', payload: currentSound })
  }, [currentSoundId, currentSound])

  // === Handlers — wrappers thin autour de dispatch (préservent l'API enfant) ===

  const setBpm = useCallback((v) => dispatch({ type: 'SET_BPM', payload: v }), [])

  const setZoomH = useCallback((next) => {
    dispatch({ type: 'SET_ZOOM_H', payload: next })
  }, [])

  const setTrackHeight = useCallback((next) => {
    const cur = (s) => Math.max(MIN_TRACK_HEIGHT, Math.min(MAX_TRACK_HEIGHT, typeof next === 'function' ? next(s) : next))
    dispatch({ type: 'SET_TRACK_HEIGHT', payload: cur(trackHeight) })
  }, [trackHeight])

  const setDefaultClipDuration = useCallback((v) => {
    dispatch({ type: 'SET_DEFAULT_CLIP_DURATION', payload: v })
  }, [])

  const setSpectrogramVisible = useCallback((v) => {
    dispatch({ type: 'SET_SPECTROGRAM_VISIBLE', payload: v })
  }, [])

  const setActiveTab = useCallback((tab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })
  }, [])

  const handleSaveSound = useCallback(
    (soundData, options = {}) => {
      // Détection de doublon faite avant dispatch pour pouvoir retourner le statut.
      if (!options.allowDuplicate && soundData.mode === 'note') {
        const dup = savedSounds.some(
          (s) =>
            s.mode === 'note' &&
            s.noteIndex === soundData.noteIndex &&
            s.octave === soundData.octave &&
            sameWaveform(s, soundData),
        )
        if (dup) return { duplicate: true }
      }
      // Le reducer attribue le nouvel id à partir de soundCounter+1.
      const newId = `sound-${soundCounter + 1}`
      dispatch({
        type: 'SAVE_SOUND',
        payload: { soundData, allowDuplicate: !!options.allowDuplicate },
      })
      return { duplicate: false, id: newId }
    },
    [savedSounds, soundCounter],
  )

  const handleUpdateSound = useCallback((soundId, soundData) => {
    dispatch({ type: 'UPDATE_SOUND', payload: { soundId, soundData } })
  }, [])

  const handleAddClip = useCallback(
    (soundId, measure, beat, duration, trackId = DEFAULT_TRACK_ID) => {
      dispatch({ type: 'ADD_CLIP', payload: { soundId, measure, beat, duration, trackId } })
    },
    [],
  )

  const handleRemoveClip = useCallback((clipId) => {
    dispatch({ type: 'REMOVE_CLIP', payload: { clipId } })
  }, [])

  // Unique point d'entrée pour mettre à jour la sélection : le caller
  // (Timeline) calcule la nouvelle liste finale (toggle, additif, etc.).
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

  const handleUpdateClipsSound = useCallback((clipIds, soundId) => {
    dispatch({ type: 'UPDATE_CLIPS_SOUND', payload: { clipIds, soundId } })
  }, [])

  const handleUpdateClipsDuration = useCallback((updates) => {
    dispatch({ type: 'UPDATE_CLIPS_DURATION', payload: updates })
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
      soundId: c.soundId,
      trackId: c.trackId,
      beatOffset: (c.measure - 1) * BEATS_PER_MEASURE + c.beat - minBeat,
      duration: c.duration,
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
      soundId: c.soundId,
      trackId: c.trackId,
      beatOffset: (c.measure - 1) * BEATS_PER_MEASURE + c.beat - minBeat,
      duration: c.duration,
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
    (absoluteBeat) => {
      if (!clipboard || clipboard.clips.length === 0) return
      const snapped = Math.round(absoluteBeat / 0.25) * 0.25
      const clipDatas = clipboard.clips.map((t) => {
        const beatPos = snapped + t.beatOffset
        const measure = Math.floor(beatPos / BEATS_PER_MEASURE) + 1
        const beat = beatPos - (measure - 1) * BEATS_PER_MEASURE
        return {
          trackId: t.trackId || DEFAULT_TRACK_ID,
          soundId: t.soundId,
          measure,
          beat,
          duration: t.duration,
        }
      })
      const maxEnd = Math.max(
        ...clipDatas.map((d) => (d.measure - 1) * BEATS_PER_MEASURE + d.beat + d.duration),
      )
      const neededMeasures = Math.ceil(maxEnd / BEATS_PER_MEASURE)
      const extraMeasures = Math.max(0, neededMeasures - numMeasures)
      dispatch({ type: 'PASTE_CLIPS', payload: { clipDatas, extraMeasures } })
    },
    [clipboard, numMeasures],
  )

  // Raccourcis Ctrl+C/X/V — après la déclaration des handlers clipboard.
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
        if (pos) handlePaste(pos.absoluteBeat)
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

  // Compute affected clips + confirm + dispatch atomique
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

  const handleDeleteSound = useCallback((soundId) => {
    dispatch({ type: 'DELETE_SOUND', payload: { soundId } })
  }, [])

  const handleRenameSound = useCallback((soundId, newName) => {
    dispatch({ type: 'RENAME_SOUND', payload: { soundId, name: newName } })
  }, [])

  const handleLoadSound = useCallback(
    (soundId) => {
      // Idempotent if déjà chargé sur Designer
      if (currentSoundId === soundId && activeTab === 'designer') return
      const dirty = editorRef.current?.isDirty?.() ?? false
      if (dirty && currentSoundId !== soundId) {
        const ok = window.confirm(
          "Modifications non sauvegardées dans l'éditeur. Charger ce son et perdre vos modifs ?",
        )
        if (!ok) return
      }
      dispatch({ type: 'SET_CURRENT_SOUND_ID', payload: soundId })
      dispatch({ type: 'SET_ACTIVE_TAB', payload: 'designer' })
    },
    [currentSoundId, activeTab],
  )

  const handleSoundCreated = useCallback((newSoundId) => {
    dispatch({ type: 'SET_CURRENT_SOUND_ID', payload: newSoundId })
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

  // === Editor actions (passées à WaveformEditor) ===
  const editorActions = useMemo(() => ({
    setPoints: (pts) => dispatch({ type: 'SET_EDITOR_POINTS', payload: pts }),
    setNoteIndex: (n) => dispatch({ type: 'SET_EDITOR_NOTE', payload: n }),
    setOctave: (o) => dispatch({ type: 'SET_EDITOR_OCTAVE', payload: o }),
    toggleFreeMode: () => dispatch({ type: 'TOGGLE_EDITOR_FREE_MODE' }),
    setFrequency: (hz) => dispatch({ type: 'SET_EDITOR_FREQUENCY', payload: hz }),
    setAmplitude: (a) => dispatch({ type: 'SET_EDITOR_AMPLITUDE', payload: a }),
    setAdsr: (patch) => dispatch({ type: 'SET_EDITOR_ADSR', payload: patch }),
    applyPreset: (preset, points) =>
      dispatch({ type: 'APPLY_EDITOR_PRESET', payload: { preset, points } }),
  }), [])

  return (
    <div className="app">
      <Tabs activeTab={activeTab} onChange={setActiveTab} />

      <WaveformEditor
        ref={editorRef}
        editor={editor}
        editorActions={editorActions}
        onSaveSound={handleSaveSound}
        onUpdateSound={handleUpdateSound}
        onRequestNew={handleRequestNew}
        nextSoundName={nextSoundName}
        currentSound={currentSound}
        savedSounds={savedSounds}
        onSoundCreated={handleSoundCreated}
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
                <SoundBank
                  savedSounds={savedSounds}
                  clips={clips}
                  currentSoundId={currentSoundId}
                  activeTab="designer"
                  onLoadSound={handleLoadSound}
                  onRenameSound={handleRenameSound}
                  onDeleteSound={handleDeleteSound}
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
            >
              <div className="composer-toolbar">
                <Toolbar
                  bpm={bpm}
                  onSetBpm={setBpm}
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
                  currentTime={playback.currentTime}
                  totalDurationSec={totalDurationSec}
                  composerFlash={composerFlash}
                  canUndo={composerCanUndo}
                  canRedo={composerCanRedo}
                  onUndo={handleUndoComposer}
                  onRedo={handleRedoComposer}
                />
              </div>
              <div className="composer-sidebar">
                <SoundBank
                  savedSounds={savedSounds}
                  clips={clips}
                  currentSoundId={currentSoundId}
                  activeTab="composer"
                  onLoadSound={handleLoadSound}
                  onRenameSound={handleRenameSound}
                  onDeleteSound={handleDeleteSound}
                />
              </div>
              <div className="composer-main">
                <Timeline
                  savedSounds={savedSounds}
                  clips={clips}
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
                  onPaste={handlePaste}
                />
              </div>
              <div className="composer-aside">
                <PropertiesPanel
                  selectedClipIds={selectedClipIds}
                  clips={clips}
                  savedSounds={savedSounds}
                  numMeasures={numMeasures}
                  onUpdateClip={handleUpdateClip}
                  onRemoveClip={handleRemoveClip}
                  onUpdateClipsSound={handleUpdateClipsSound}
                  onUpdateClipsDuration={handleUpdateClipsDuration}
                  onDeleteSelected={handleDeleteSelected}
                  mergeStatus={mergeStatus}
                  onMergeClips={handleMergeClips}
                  canSplit2={canSplit2}
                  canSplit3={canSplit3}
                  onSplitClips={handleSplitClips}
                />
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
