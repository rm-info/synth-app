import { useState, useCallback, useRef, useEffect } from 'react'
import WaveformEditor from './components/WaveformEditor'
import Timeline from './components/Timeline'
import { SOUND_COLORS } from './audio'
import './App.css'

/**
 * @typedef {Object} SoundFolder
 * @property {string} id            - "folder-N"
 * @property {string} name
 * @property {string|null} parentId - null = racine
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
 * @property {string|null} folderId - null = racine
 *
 * @typedef {Object} Track
 * @property {string} id          - "track-N"
 * @property {string} name        - "Piste 1" par défaut
 * @property {string|null} color
 * @property {boolean} muted
 * @property {boolean} solo
 * @property {number} volume      - 0..1
 * @property {number} height      - px
 *
 * @typedef {Object} Clip
 * @property {string} id          - "clip-N"
 * @property {string} trackId
 * @property {string} soundId
 * @property {number} measure     - 1-indexée
 * @property {number} beat        - 0..3.75 (snap 0.25)
 * @property {number} duration    - en noires
 */

const STORAGE_KEY = 'synth-app-state'
const POINTS_SIMILARITY_THRESHOLD = 0.01

const DEFAULT_ADSR = { attack: 10, decay: 100, sustain: 0.7, release: 100 }
const DEFAULT_BPM = 120
const DEFAULT_NUM_MEASURES = 16
const DEFAULT_TRACK_ID = 'track-default'

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
  // Legacy placements had 0-indexed measure and no beat/duration fields.
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

    const savedSounds = (parsed.savedSounds || []).map(normalizeSound)
    const rawClips = parsed.clips ?? parsed.notes ?? parsed.placements ?? []
    const clips = rawClips.map(normalizeClip)
    const tracks = Array.isArray(parsed.tracks) && parsed.tracks.length > 0
      ? parsed.tracks
      : [makeDefaultTrack()]
    const soundFolders = Array.isArray(parsed.soundFolders) ? parsed.soundFolders : []

    const maxClipMeasure = clips.reduce((m, c) => Math.max(m, c.measure || 0), 0)
    const numMeasures = Math.max(
      parsed.numMeasures ?? DEFAULT_NUM_MEASURES,
      maxClipMeasure,
      DEFAULT_NUM_MEASURES,
    )

    return {
      savedSounds,
      soundFolders,
      tracks,
      clips,
      numMeasures,
      bpm: parsed.bpm ?? DEFAULT_BPM,
      soundCounter: parsed.soundCounter || 0,
      clipCounter:
        parsed.clipCounter ?? parsed.noteCounter ?? parsed.placementCounter ?? 0,
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
  const soundCounterRef = useRef(initial?.soundCounter ?? 0)
  const clipCounterRef = useRef(initial?.clipCounter ?? 0)

  // Setters réservés pour les phases ultérieures (folders / tracks / measures dynamiques).
  void setSoundFolders
  void setTracks
  void setNumMeasures

  const nextSoundName = `Son ${soundCounterRef.current + 1}`

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
          soundCounter: soundCounterRef.current,
          clipCounter: clipCounterRef.current,
        }),
      )
    } catch {
      // storage unavailable — silently ignore
    }
  }, [savedSounds, soundFolders, tracks, clips, bpm, numMeasures])

  const handleSaveSound = useCallback(
    (soundData) => {
      if (soundData.mode === 'note') {
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
      return { duplicate: false }
    },
    [savedSounds],
  )

  const handleAddClip = useCallback(
    (soundId, measure, beat, duration = 1, trackId = DEFAULT_TRACK_ID) => {
      clipCounterRef.current += 1
      setClips((prev) => [
        ...prev,
        {
          id: `clip-${clipCounterRef.current}`,
          trackId,
          soundId,
          measure,
          beat,
          duration,
        },
      ])
    },
    [],
  )

  const handleRemoveClip = useCallback((clipId) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId))
  }, [])

  const handleUpdateClip = useCallback((clipId, updates) => {
    setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c)))
  }, [])

  const handleClearTimeline = useCallback(() => {
    setClips([])
  }, [])

  const handleDeleteSound = useCallback((soundId) => {
    setSavedSounds((prev) => prev.filter((s) => s.id !== soundId))
    setClips((prev) => prev.filter((c) => c.soundId !== soundId))
  }, [])

  const handleRenameSound = useCallback((soundId, newName) => {
    setSavedSounds((prev) =>
      prev.map((s) => (s.id === soundId ? { ...s, name: newName } : s)),
    )
  }, [])

  return (
    <div className="app">
      <WaveformEditor onSaveSound={handleSaveSound} nextSoundName={nextSoundName} />
      <Timeline
        savedSounds={savedSounds}
        clips={clips}
        bpm={bpm}
        numMeasures={numMeasures}
        onSetBpm={setBpm}
        onAddClip={handleAddClip}
        onRemoveClip={handleRemoveClip}
        onUpdateClip={handleUpdateClip}
        onClearTimeline={handleClearTimeline}
        onDeleteSound={handleDeleteSound}
        onRenameSound={handleRenameSound}
      />
    </div>
  )
}

export default App
