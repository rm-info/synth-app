import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import WaveformEditor from './components/WaveformEditor'
import Timeline from './components/Timeline'
import Tabs from './components/Tabs'
import SoundBank from './components/SoundBank'
import MiniPlayer from './components/MiniPlayer'
import Toolbar from './components/Toolbar'
import PropertiesPanel from './components/PropertiesPanel'
import SpectrogramPlaceholder from './components/SpectrogramPlaceholder'
import { SOUND_COLORS } from './audio'
import { usePlayback } from './hooks/usePlayback'
import './App.css'

/**
 * @typedef {Object} SoundFolder
 * @property {string} id
 * @property {string} name
 * @property {string|null} parentId
 *
 * @typedef {Object} SavedSound
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {number[]} points
 * @property {number} frequency
 * @property {number} amplitude
 * @property {'note'|'free'} mode
 * @property {number|null} noteIndex
 * @property {number|null} octave
 * @property {'sine'|'square'|'sawtooth'|'triangle'|null} preset
 * @property {number} attack
 * @property {number} decay
 * @property {number} sustain
 * @property {number} release
 * @property {string|null} folderId
 *
 * @typedef {Object} Track
 * @property {string} id
 * @property {string} name
 * @property {string|null} color
 * @property {boolean} muted
 * @property {boolean} solo
 * @property {number} volume
 * @property {number} height
 *
 * @typedef {Object} Clip
 * @property {string} id
 * @property {string} trackId
 * @property {string} soundId
 * @property {number} measure
 * @property {number} beat
 * @property {number} duration
 */

const STORAGE_KEY = 'synth-app-state'
const POINTS_SIMILARITY_THRESHOLD = 0.01

const DEFAULT_ADSR = { attack: 10, decay: 100, sustain: 0.7, release: 100 }
const DEFAULT_BPM = 120
const DEFAULT_NUM_MEASURES = 16
const DEFAULT_TRACK_ID = 'track-default'
const BEATS_PER_MEASURE = 4

// Zoom horizontal en % : 100% = 50px par triple croche.
//   pxPerBeat = (zoomH / 100) * 50 * 8
// Plage 2% (1px/triple) → 1000% (500px/triple). Défaut 5% ≈ 80px/mesure
// (équivalent à l'ancien défaut pré-phase-3).
const MIN_ZOOM_H = 2
const MAX_ZOOM_H = 1000
const DEFAULT_ZOOM_H = 5

const MIN_TRACK_HEIGHT = 30
const MAX_TRACK_HEIGHT = 200

const DEFAULT_CLIP_DURATION = 1

const makeDefaultTrack = () => ({
  id: DEFAULT_TRACK_ID,
  name: 'Piste 1',
  color: null,
  muted: false,
  solo: false,
  volume: 1,
  height: 80,
})

function normalizeSound(s) {
  const { duration: _legacyDuration, ...rest } = s
  void _legacyDuration
  return {
    ...rest,
    folderId: s.folderId ?? null,
    attack: s.attack ?? DEFAULT_ADSR.attack,
    decay: s.decay ?? DEFAULT_ADSR.decay,
    sustain: s.sustain ?? DEFAULT_ADSR.sustain,
    release: s.release ?? DEFAULT_ADSR.release,
  }
}

function migrateClipId(id) {
  if (typeof id !== 'string') return id
  if (id.startsWith('clip-')) return id
  if (id.startsWith('note-')) return `clip-${id.slice(5)}`
  if (id.startsWith('placement-')) return `clip-${id.slice(10)}`
  return id
}

function normalizeClip(raw) {
  const isLegacy = raw.beat === undefined && raw.duration === undefined
  const id = migrateClipId(raw.id)
  if (isLegacy) {
    return {
      id,
      trackId: raw.trackId ?? DEFAULT_TRACK_ID,
      soundId: raw.soundId,
      measure: (raw.measure ?? 0) + 1,
      beat: 0,
      duration: 1,
    }
  }
  return {
    id,
    trackId: raw.trackId ?? DEFAULT_TRACK_ID,
    soundId: raw.soundId,
    measure: raw.measure,
    beat: raw.beat ?? 0,
    duration: raw.duration ?? 1,
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)

    const savedSounds = (parsed.savedSounds ?? []).map(normalizeSound)
    const rawClips = parsed.clips ?? parsed.notes ?? parsed.placements ?? []
    const clips = rawClips.map(normalizeClip)
    const tracks = Array.isArray(parsed.tracks) && parsed.tracks.length > 0
      ? parsed.tracks
      : [makeDefaultTrack()]
    const soundFolders = Array.isArray(parsed.soundFolders) ? parsed.soundFolders : []

    // Plancher à `maxClipMeasure` pour éviter qu'un clip orphelin se retrouve
    // hors-grille après reload. Si le champ est absent (ancien state), on
    // applique le défaut. Pas de plancher sur DEFAULT_NUM_MEASURES : si l'user
    // a réduit à 8, on doit respecter 8.
    const maxClipMeasure = clips.reduce((m, c) => Math.max(m, c.measure || 0), 0)
    const numMeasures = Math.max(
      parsed.numMeasures ?? DEFAULT_NUM_MEASURES,
      maxClipMeasure,
      1,
    )

    return {
      savedSounds,
      soundFolders,
      tracks,
      clips,
      numMeasures,
      bpm: parsed.bpm ?? DEFAULT_BPM,
      soundCounter: parsed.soundCounter ?? 0,
      clipCounter:
        parsed.clipCounter ?? parsed.noteCounter ?? parsed.placementCounter ?? 0,
      spectrogramVisible:
        typeof parsed.spectrogramVisible === 'boolean' ? parsed.spectrogramVisible : true,
      activeTab: parsed.activeTab === 'composer' ? 'composer' : 'designer',
    }
  } catch {
    return null
  }
}

function pointsSimilar(a, b) {
  if (!a || !b || a.length !== b.length) return false
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return sum / a.length < POINTS_SIMILARITY_THRESHOLD
}

function sameWaveform(existing, incoming) {
  if (existing.preset && incoming.preset) return existing.preset === incoming.preset
  if (!existing.preset && !incoming.preset) return pointsSimilar(existing.points, incoming.points)
  return false
}

function App() {
  const initial = loadState()
  const [savedSounds, setSavedSounds] = useState(initial?.savedSounds ?? [])
  const [soundFolders, setSoundFolders] = useState(initial?.soundFolders ?? [])
  const [tracks, setTracks] = useState(initial?.tracks ?? [makeDefaultTrack()])
  const [clips, setClips] = useState(initial?.clips ?? [])
  const [bpm, setBpm] = useState(initial?.bpm ?? DEFAULT_BPM)
  const [numMeasures, setNumMeasures] = useState(initial?.numMeasures ?? DEFAULT_NUM_MEASURES)
  const [activeTab, setActiveTab] = useState(initial?.activeTab ?? 'designer')
  const [currentSoundId, setCurrentSoundId] = useState(null)
  const [zoomH, setZoomHState] = useState(DEFAULT_ZOOM_H)
  const [defaultClipDuration, setDefaultClipDuration] = useState(DEFAULT_CLIP_DURATION)
  const [spectrogramVisible, setSpectrogramVisible] = useState(
    initial?.spectrogramVisible ?? true,
  )
  const [selectedClipIds, setSelectedClipIds] = useState([])
  const [composerFlash, setComposerFlash] = useState(null)

  const soundCounterRef = useRef(initial?.soundCounter ?? 0)
  const clipCounterRef = useRef(initial?.clipCounter ?? 0)
  const editorRef = useRef(null)

  // Setters réservés aux phases ultérieures
  void setSoundFolders

  const setZoomH = useCallback((next) => {
    setZoomHState((prev) => {
      const v = typeof next === 'function' ? next(prev) : next
      return Math.max(MIN_ZOOM_H, Math.min(MAX_ZOOM_H, v))
    })
  }, [])

  // La hauteur "verticale" est stockée par track. Pour itération A on n'a qu'une
  // piste : on expose track[0].height comme zoom V global.
  const trackHeight = tracks[0]?.height ?? 80
  const setTrackHeight = useCallback((next) => {
    setTracks((prev) => {
      if (!prev[0]) return prev
      const v = typeof next === 'function' ? next(prev[0].height) : next
      const clamped = Math.max(MIN_TRACK_HEIGHT, Math.min(MAX_TRACK_HEIGHT, v))
      if (prev[0].height === clamped) return prev
      return prev.map((t, i) => (i === 0 ? { ...t, height: clamped } : t))
    })
  }, [])

  const nextSoundName = `Son ${soundCounterRef.current + 1}`

  const totalBeats = numMeasures * BEATS_PER_MEASURE
  const totalDurationSec = (totalBeats * 60) / bpm

  const playback = usePlayback({ clips, savedSounds, bpm, totalDurationSec })

  const currentSound = useMemo(
    () => (currentSoundId ? savedSounds.find((s) => s.id === currentSoundId) ?? null : null),
    [currentSoundId, savedSounds],
  )

  // Auto-clear du flash composer après 3s
  useEffect(() => {
    if (!composerFlash) return
    const t = setTimeout(() => setComposerFlash(null), 3000)
    return () => clearTimeout(t)
  }, [composerFlash])

  // Global Delete/Backspace — supprime les clips sélectionnés, sauf si focus
  // dans un input/textarea/contenteditable.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (selectedClipIds.length === 0) return
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return
      e.preventDefault()
      setClips((prev) => prev.filter((c) => !selectedClipIds.includes(c.id)))
      setSelectedClipIds([])
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipIds])

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
          soundCounter: soundCounterRef.current,
          clipCounter: clipCounterRef.current,
        }),
      )
    } catch {
      // storage unavailable
    }
  }, [savedSounds, soundFolders, tracks, clips, bpm, numMeasures, spectrogramVisible, activeTab])

  const handleSaveSound = useCallback(
    (soundData, options = {}) => {
      // `allowDuplicate` court-circuite la détection : utilisé pour la
      // duplication explicite ("Enregistrer comme nouveau" depuis un son
      // chargé), où le user demande sciemment une copie.
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

      soundCounterRef.current += 1
      const id = `sound-${soundCounterRef.current}`
      const colorIndex = (soundCounterRef.current - 1) % SOUND_COLORS.length

      setSavedSounds((prev) => [
        ...prev,
        {
          id,
          name: soundData.name,
          color: SOUND_COLORS[colorIndex],
          points: Array.from(soundData.points),
          frequency: soundData.frequency,
          amplitude: soundData.amplitude,
          mode: soundData.mode,
          noteIndex: soundData.noteIndex,
          octave: soundData.octave,
          preset: soundData.preset,
          attack: soundData.attack ?? DEFAULT_ADSR.attack,
          decay: soundData.decay ?? DEFAULT_ADSR.decay,
          sustain: soundData.sustain ?? DEFAULT_ADSR.sustain,
          release: soundData.release ?? DEFAULT_ADSR.release,
          folderId: null,
        },
      ])
      return { duplicate: false, id }
    },
    [savedSounds],
  )

  const handleUpdateSound = useCallback((soundId, soundData) => {
    setSavedSounds((prev) =>
      prev.map((s) =>
        s.id === soundId
          ? {
              ...s,
              points: Array.from(soundData.points),
              frequency: soundData.frequency,
              amplitude: soundData.amplitude,
              mode: soundData.mode,
              noteIndex: soundData.noteIndex,
              octave: soundData.octave,
              preset: soundData.preset,
              attack: soundData.attack,
              decay: soundData.decay,
              sustain: soundData.sustain,
              release: soundData.release,
            }
          : s,
      ),
    )
  }, [])

  const handleAddClip = useCallback(
    (soundId, measure, beat, duration, trackId = DEFAULT_TRACK_ID) => {
      const finalDuration = duration ?? defaultClipDuration
      clipCounterRef.current += 1
      setClips((prev) => [
        ...prev,
        {
          id: `clip-${clipCounterRef.current}`,
          trackId,
          soundId,
          measure,
          beat,
          duration: finalDuration,
        },
      ])
    },
    [defaultClipDuration],
  )

  const handleRemoveClip = useCallback((clipId) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId))
    setSelectedClipIds((prev) => (prev.includes(clipId) ? prev.filter((id) => id !== clipId) : prev))
  }, [])

  const handleSelectClip = useCallback((clipId) => {
    setSelectedClipIds([clipId])
  }, [])

  const handleDeselectAll = useCallback(() => {
    setSelectedClipIds([])
  }, [])

  const handleUpdateClip = useCallback((clipId, updates) => {
    setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c)))
  }, [])

  const handleClearTimeline = useCallback(() => {
    setClips([])
  }, [])

  const handleAddMeasures = useCallback((count = 1) => {
    if (count <= 0) return
    setNumMeasures((n) => n + count)
  }, [])

  // Suppression de la dernière mesure : un clip entièrement dans cette mesure
  // est supprimé ; un clip qui commence avant mais déborde est tronqué juste
  // avant la limite. Confirm seulement si ≥1 suppression. Si seules des
  // troncatures, flash de transparence.
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

    if (toDelete.length > 0 || toTruncate.length > 0) {
      const deleteSet = new Set(toDelete)
      const truncateMap = new Map(toTruncate.map((t) => [t.id, t.newDuration]))
      setClips((prev) =>
        prev
          .filter((c) => !deleteSet.has(c.id))
          .map((c) => (truncateMap.has(c.id) ? { ...c, duration: truncateMap.get(c.id) } : c)),
      )
      setSelectedClipIds((prev) => prev.filter((id) => !deleteSet.has(id)))
    }

    if (toTruncate.length > 0 && toDelete.length === 0) {
      setComposerFlash(
        `${toTruncate.length} clip${toTruncate.length > 1 ? 's tronqués' : ' tronqué'}`,
      )
    }

    setNumMeasures((n) => n - 1)
  }, [numMeasures, clips])

  const handleDeleteSound = useCallback(
    (soundId) => {
      setSavedSounds((prev) => prev.filter((s) => s.id !== soundId))
      setClips((prev) => prev.filter((c) => c.soundId !== soundId))
      if (currentSoundId === soundId) setCurrentSoundId(null)
    },
    [currentSoundId],
  )

  const handleRenameSound = useCallback((soundId, newName) => {
    setSavedSounds((prev) =>
      prev.map((s) => (s.id === soundId ? { ...s, name: newName } : s)),
    )
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
      setCurrentSoundId(soundId)
      setActiveTab('designer')
    },
    [currentSoundId, activeTab],
  )

  const handleSoundCreated = useCallback((newSoundId) => {
    setCurrentSoundId(newSoundId)
  }, [])

  const handleRequestNew = useCallback(() => {
    setCurrentSoundId(null)
  }, [])

  const handleZoomHIn = () => setZoomH((z) => z + 2)
  const handleZoomHOut = () => setZoomH((z) => z - 2)

  // Les deux layouts restent montés en permanence (toggle CSS via aria-hidden).
  // Sinon : démontage du WaveformEditor → perte du dirty check + de l'état local
  // d'édition au moindre changement d'onglet.
  // WaveformEditor enveloppe les 2 layouts (Designer + Composer) : son state
  // persiste donc sur les changements d'onglet, et il expose 3 zones de rendu
  // que le layout Designer place dans le grid 2×2 (canvas + spectrogramme, params
  // + ADSR). Cf. phase 3.5.
  return (
    <div className="app">
      <Tabs activeTab={activeTab} onChange={setActiveTab} />

      <WaveformEditor
        ref={editorRef}
        onSaveSound={handleSaveSound}
        onUpdateSound={handleUpdateSound}
        onRequestNew={handleRequestNew}
        nextSoundName={nextSoundName}
        currentSound={currentSound}
        savedSounds={savedSounds}
        onSoundCreated={handleSoundCreated}
        spectrogramVisible={spectrogramVisible}
        onToggleSpectrogram={setSpectrogramVisible}
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
                      <SpectrogramPlaceholder />
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
                  selectedClipIds={selectedClipIds}
                  onSelectClip={handleSelectClip}
                  onDeselectAll={handleDeselectAll}
                  onAddMeasures={handleAddMeasures}
                  onRemoveLastMeasure={handleRemoveLastMeasure}
                />
              </div>
              <div className="composer-aside">
                <PropertiesPanel
                  selectedClipIds={selectedClipIds}
                  clips={clips}
                  savedSounds={savedSounds}
                  onUpdateClip={handleUpdateClip}
                  onRemoveClip={handleRemoveClip}
                />
              </div>
            </main>
          </>
        )}
      </WaveformEditor>
    </div>
  )
}

export default App
