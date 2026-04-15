import { useState, useCallback, useRef, useEffect } from 'react'
import WaveformEditor from './components/WaveformEditor'
import Timeline from './components/Timeline'
import { SOUND_COLORS } from './audio'
import './App.css'

const STORAGE_KEY = 'synth-app-state'
const POINTS_SIMILARITY_THRESHOLD = 0.01

const DEFAULT_ADSR = { attack: 10, decay: 100, sustain: 0.7, release: 100 }
const DEFAULT_BPM = 120

function normalizeSound(s) {
  const { duration: _legacyDuration, ...rest } = s
  void _legacyDuration
  return {
    ...rest,
    attack: s.attack ?? DEFAULT_ADSR.attack,
    decay: s.decay ?? DEFAULT_ADSR.decay,
    sustain: s.sustain ?? DEFAULT_ADSR.sustain,
    release: s.release ?? DEFAULT_ADSR.release,
  }
}

function normalizeNote(n) {
  // Legacy placements had 0-indexed measure and no beat/duration fields.
  const isLegacy = n.beat === undefined && n.duration === undefined
  if (isLegacy) {
    return {
      id: n.id,
      soundId: n.soundId,
      measure: (n.measure ?? 0) + 1, // shift 0-indexed -> 1-indexed
      beat: 0,
      duration: 1,
    }
  }
  return {
    id: n.id,
    soundId: n.soundId,
    measure: n.measure,
    beat: n.beat ?? 0,
    duration: n.duration ?? 1,
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const rawNotes = parsed.notes ?? parsed.placements ?? []
    return {
      savedSounds: (parsed.savedSounds || []).map(normalizeSound),
      notes: rawNotes.map(normalizeNote),
      soundCounter: parsed.soundCounter || 0,
      noteCounter: parsed.noteCounter ?? parsed.placementCounter ?? 0,
      bpm: parsed.bpm ?? DEFAULT_BPM,
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
  const [notes, setNotes] = useState(initial?.notes ?? [])
  const [bpm, setBpm] = useState(initial?.bpm ?? DEFAULT_BPM)
  const soundCounterRef = useRef(initial?.soundCounter ?? 0)
  const noteCounterRef = useRef(initial?.noteCounter ?? 0)

  const nextSoundName = `Son ${soundCounterRef.current + 1}`

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          savedSounds,
          notes,
          bpm,
          soundCounter: soundCounterRef.current,
          noteCounter: noteCounterRef.current,
        }),
      )
    } catch {
      // storage unavailable — silently ignore
    }
  }, [savedSounds, notes, bpm])

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
        },
      ])
      return { duplicate: false }
    },
    [savedSounds],
  )

  const handleAddNote = useCallback((soundId, measure, beat, duration = 1) => {
    noteCounterRef.current += 1
    setNotes((prev) => [
      ...prev,
      {
        id: `note-${noteCounterRef.current}`,
        soundId,
        measure,
        beat,
        duration,
      },
    ])
  }, [])

  const handleRemoveNote = useCallback((noteId) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }, [])

  const handleUpdateNote = useCallback((noteId, updates) => {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n)))
  }, [])

  const handleClearTimeline = useCallback(() => {
    setNotes([])
  }, [])

  const handleDeleteSound = useCallback((soundId) => {
    setSavedSounds((prev) => prev.filter((s) => s.id !== soundId))
    setNotes((prev) => prev.filter((n) => n.soundId !== soundId))
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
        notes={notes}
        bpm={bpm}
        onSetBpm={setBpm}
        onAddNote={handleAddNote}
        onRemoveNote={handleRemoveNote}
        onUpdateNote={handleUpdateNote}
        onClearTimeline={handleClearTimeline}
        onDeleteSound={handleDeleteSound}
        onRenameSound={handleRenameSound}
      />
    </div>
  )
}

export default App
