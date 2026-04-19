import { useReducer, useCallback, useRef, useEffect, useMemo } from 'react'
import WaveformEditor from './components/WaveformEditor'
import Timeline from './components/Timeline'
import Tabs from './components/Tabs'
import PatchBank from './components/PatchBank'
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
  MAX_TRACKS,
  DEFAULT_TRACK_ID,
  canSplitClip,
  getDescendantFolderIds,
  editorTestNoteFields,
} from './reducer'
import { canMergeClips } from './lib/timelineLayout'
import Toast from './components/Toast'
import { usePlayback } from './hooks/usePlayback'
import './App.css'

const wrappedReducer = withUndo(reducer)

function App() {
  const [state, dispatch] = useReducer(wrappedReducer, undefined, buildInitialState)
  const {
    clips, patches, soundFolders, tracks, bpm, numMeasures,
    editor, activeTab, currentPatchId, zoomH, defaultClipDuration,
    spectrogramVisible, selectedClipIds, composerFlash,
    patchCounter, clipCounter, folderCounter, trackCounter,
    clipboard, measureClipboard, history, notification,
  } = state

  const editorRef = useRef(null)

  const timelineMouseRef = useRef(null)

  const trackHeight = tracks[0]?.height ?? 80

  const nextPatchName = `Patch ${patchCounter + 1}`

  const totalBeats = numMeasures * BEATS_PER_MEASURE
  const totalDurationSec = (totalBeats * 60) / bpm

  const playback = usePlayback({ clips, patches, tracks, bpm, totalDurationSec })

  const currentPatch = useMemo(
    () => (currentPatchId ? patches.find((p) => p.id === currentPatchId) ?? null : null),
    [currentPatchId, patches],
  )

  const editorFrequency = editor.testTuningSystem === 'free'
    ? editor.testFrequency
    : 440 * Math.pow(2, ((editor.testOctave + 1) * 12 + editor.testNoteIndex - 69) / 12)

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
          spectrogramVisible,
          activeTab,
          patchCounter,
          clipCounter,
          folderCounter,
          trackCounter,
        }),
      )
    } catch {
      // storage unavailable
    }
  }, [
    patches, soundFolders, tracks, clips, bpm, numMeasures,
    spectrogramVisible, activeTab, patchCounter, clipCounter, folderCounter, trackCounter,
  ])

  // Hydratation de l'éditeur quand currentPatchId change. Non-undoable.
  const hydratedFromIdRef = useRef(null)
  useEffect(() => {
    if (hydratedFromIdRef.current === currentPatchId) return
    hydratedFromIdRef.current = currentPatchId
    dispatch({ type: 'HYDRATE_EDITOR_FROM_PATCH', payload: currentPatch })
  }, [currentPatchId, currentPatch])

  // === Handlers ===

  const setBpm = useCallback((v) => dispatch({ type: 'SET_BPM', payload: v }), [])

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

  const setSpectrogramVisible = useCallback((v) => {
    dispatch({ type: 'SET_SPECTROGRAM_VISIBLE', payload: v })
  }, [])

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

  // Drop d'un patch sur la timeline. La hauteur est celle du clavier de test
  // courant dans l'éditeur (règle par défaut E.1).
  const handleAddClip = useCallback(
    (patchId, measure, beat, duration, trackId = DEFAULT_TRACK_ID) => {
      const note = editorTestNoteFields(editor)
      dispatch({
        type: 'ADD_CLIP',
        payload: { patchId, measure, beat, duration, trackId, ...note },
      })
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
      const snapped = Math.round(absoluteBeat / 0.25) * 0.25

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
    const snap = (v) => Math.round(v / 0.25) * 0.25
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
        if (leftDur >= 0.25) truncated.push({ id: c.id, newDuration: leftDur })
        else deletedIds.push(c.id)
      } else if (start >= mStart && end > mEnd) {
        const rightDur = snap(end - mEnd)
        deletedIds.push(c.id)
        if (rightDur >= 0.25) {
          const newAbs = snap(mEnd - BEATS_PER_MEASURE)
          const mb = toMB(newAbs)
          splitParts.push(buildSplitPart(c, { originalId: c.id, ...mb, duration: rightDur }))
        }
      } else {
        const leftDur = snap(mStart - start)
        const rightDur = snap(end - mEnd)
        if (leftDur >= 0.25) {
          truncated.push({ id: c.id, newDuration: leftDur })
        } else {
          deletedIds.push(c.id)
        }
        if (rightDur >= 0.25) {
          const newAbs = snap(mStart)
          const mb = toMB(newAbs)
          splitParts.push(buildSplitPart(c, { originalId: leftDur >= 0.25 ? null : c.id, ...mb, duration: rightDur }))
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
        const leftDur = Math.round((beatPosition - start) / 0.25) * 0.25
        const rightDur = Math.round((end - beatPosition) / 0.25) * 0.25
        const shiftAmount = count * BEATS_PER_MEASURE
        if (leftDur >= 0.25 && rightDur >= 0.25) {
          const rightStart = Math.round((beatPosition + shiftAmount) / 0.25) * 0.25
          const mR = Math.floor(rightStart / BEATS_PER_MEASURE) + 1
          const bR = Math.round((rightStart - (mR - 1) * BEATS_PER_MEASURE) / 0.25) * 0.25
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
    const snap = (v) => Math.round(v / 0.25) * 0.25
    const templates = []
    for (const c of clips) {
      const start = (c.measure - 1) * BEATS_PER_MEASURE + c.beat
      const end = start + c.duration
      if (end <= mStart || start >= mEnd) continue
      const clampedStart = Math.max(start, mStart)
      const clampedEnd = Math.min(end, mEnd)
      const dur = snap(clampedEnd - clampedStart)
      if (dur < 0.25) continue
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
    const snap = (v) => Math.round(v / 0.25) * 0.25
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
        if (leftDur >= 0.25) truncated.push({ id: c.id, newDuration: leftDur })
        else deletedIds.push(c.id)
      } else if (start >= mStart && end > mEnd) {
        const rightDur = snap(end - mEnd)
        deletedIds.push(c.id)
        if (rightDur >= 0.25) {
          const mb = toMB(snap(mEnd - BEATS_PER_MEASURE))
          splitParts.push(buildSplitPart(c, { originalId: c.id, ...mb, duration: rightDur }))
        }
      } else {
        const leftDur = snap(mStart - start)
        const rightDur = snap(end - mEnd)
        if (leftDur >= 0.25) truncated.push({ id: c.id, newDuration: leftDur })
        else deletedIds.push(c.id)
        if (rightDur >= 0.25) {
          const mb = toMB(snap(mStart))
          splitParts.push(buildSplitPart(c, { originalId: leftDur >= 0.25 ? null : c.id, ...mb, duration: rightDur }))
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
    const snap = (v) => Math.round(v / 0.25) * 0.25
    for (const c of clips) {
      const start = (c.measure - 1) * BEATS_PER_MEASURE + c.beat
      const end = start + c.duration
      if (start < beatPosition && end > beatPosition) {
        const leftDur = snap(beatPosition - start)
        const rightDur = snap(end - beatPosition)
        const shiftAmount = count * BEATS_PER_MEASURE
        if (leftDur >= 0.25 && rightDur >= 0.25) {
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
                />
              </div>
              <div className="composer-main">
                <Timeline
                  patches={patches}
                  clips={clips}
                  tracks={tracks}
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
              <div className="composer-aside">
                <PropertiesPanel
                  selectedClipIds={selectedClipIds}
                  clips={clips}
                  tracks={tracks}
                  patches={patches}
                  numMeasures={numMeasures}
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
