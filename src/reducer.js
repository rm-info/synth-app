import { SOUND_COLORS } from './audio'

// === Constantes partagées ===
export const STORAGE_KEY = 'synth-app-state'
export const POINTS_SIMILARITY_THRESHOLD = 0.01
export const DEFAULT_BPM = 120
export const DEFAULT_NUM_MEASURES = 16
export const DEFAULT_TRACK_ID = 'track-default'
export const BEATS_PER_MEASURE = 4
export const MIN_ZOOM_H = 2
export const MAX_ZOOM_H = 1000
export const DEFAULT_ZOOM_H = 5
export const MIN_TRACK_HEIGHT = 30
export const MAX_TRACK_HEIGHT = 200
export const DEFAULT_CLIP_DURATION = 1
export const POINTS_RESOLUTION = 600

export const DEFAULT_ADSR = { attack: 10, decay: 100, sustain: 0.7, release: 200 }
export const DEFAULT_EDITOR = {
  points: new Array(POINTS_RESOLUTION).fill(0),
  freeMode: false,
  noteIndex: 9, // A
  octave: 4,
  freeFrequency: 440,
  amplitude: 1,
  preset: null,
  ...DEFAULT_ADSR,
}

export function makeDefaultTrack() {
  return {
    id: DEFAULT_TRACK_ID,
    name: 'Piste 1',
    color: null,
    muted: false,
    solo: false,
    volume: 1,
    height: 80,
  }
}

// === Migrations / normalisation localStorage ===

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

export function loadPersistedState() {
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

export function buildInitialState() {
  const persisted = loadPersistedState()
  return {
    // Composer (champ undoable)
    clips: persisted?.clips ?? [],
    numMeasures: persisted?.numMeasures ?? DEFAULT_NUM_MEASURES,
    bpm: persisted?.bpm ?? DEFAULT_BPM,
    tracks: persisted?.tracks ?? [makeDefaultTrack()],

    // Designer (champ undoable)
    savedSounds: persisted?.savedSounds ?? [],
    soundFolders: persisted?.soundFolders ?? [],
    editor: { ...DEFAULT_EDITOR, points: [...DEFAULT_EDITOR.points] },

    // Compteurs (state mais hors historique : on ne fait pas reculer un compteur
    // sur undo, sinon on risque de réutiliser un id supprimé puis recréé)
    soundCounter: persisted?.soundCounter ?? 0,
    clipCounter: persisted?.clipCounter ?? 0,

    // UI (jamais undoable)
    zoomH: DEFAULT_ZOOM_H,
    activeTab: persisted?.activeTab ?? 'designer',
    selectedClipIds: [],
    currentSoundId: null,
    spectrogramVisible: persisted?.spectrogramVisible ?? true,
    defaultClipDuration: DEFAULT_CLIP_DURATION,
    composerFlash: null,

    // Historique undo/redo (RAM uniquement, jamais persisté)
    history: {
      designer: { past: [], future: [] },
      composer: { past: [], future: [] },
    },
    notification: null,
  }
}

// === Helpers ===

function pointsSimilar(a, b) {
  if (!a || !b || a.length !== b.length) return false
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return sum / a.length < POINTS_SIMILARITY_THRESHOLD
}

export function sameWaveform(existing, incoming) {
  if (existing.preset && incoming.preset) return existing.preset === incoming.preset
  if (!existing.preset && !incoming.preset) return pointsSimilar(existing.points, incoming.points)
  return false
}

export function soundFromEditor(editor, baseName) {
  return {
    name: baseName,
    mode: editor.freeMode ? 'free' : 'note',
    noteIndex: editor.freeMode ? null : editor.noteIndex,
    octave: editor.freeMode ? null : editor.octave,
    preset: editor.preset,
    points: Array.from(editor.points),
    frequency: editor.freeMode
      ? editor.freeFrequency
      : 440 * Math.pow(2, ((editor.octave + 1) * 12 + editor.noteIndex - 69) / 12),
    amplitude: editor.amplitude,
    attack: editor.attack,
    decay: editor.decay,
    sustain: editor.sustain,
    release: editor.release,
  }
}

function clampZoomH(v) {
  return Math.max(MIN_ZOOM_H, Math.min(MAX_ZOOM_H, v))
}
function clampTrackHeight(v) {
  return Math.max(MIN_TRACK_HEIGHT, Math.min(MAX_TRACK_HEIGHT, v))
}

// === Reducer ===

export function reducer(state, action) {
  switch (action.type) {
    // ----- Composer (undoable) -----
    case 'ADD_CLIP': {
      const { soundId, measure, beat, duration, trackId = DEFAULT_TRACK_ID } = action.payload
      const finalDuration = duration ?? state.defaultClipDuration
      const newCounter = state.clipCounter + 1
      return {
        ...state,
        clipCounter: newCounter,
        clips: [
          ...state.clips,
          { id: `clip-${newCounter}`, trackId, soundId, measure, beat, duration: finalDuration },
        ],
      }
    }
    case 'REMOVE_CLIP': {
      const { clipId } = action.payload
      return {
        ...state,
        clips: state.clips.filter((c) => c.id !== clipId),
        selectedClipIds: state.selectedClipIds.filter((id) => id !== clipId),
      }
    }
    case 'UPDATE_CLIP': {
      const { clipId, updates } = action.payload
      return {
        ...state,
        clips: state.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
      }
    }
    case 'MOVE_CLIPS': {
      // payload: [{ id, measure, beat }] — déplacement groupé, un snapshot unique.
      const moves = new Map(action.payload.map((m) => [m.id, m]))
      if (moves.size === 0) return state
      return {
        ...state,
        clips: state.clips.map((c) => {
          const m = moves.get(c.id)
          return m ? { ...c, measure: m.measure, beat: m.beat } : c
        }),
      }
    }
    case 'DELETE_SELECTED_CLIPS': {
      const ids = new Set(state.selectedClipIds)
      if (ids.size === 0) return state
      return {
        ...state,
        clips: state.clips.filter((c) => !ids.has(c.id)),
        selectedClipIds: [],
      }
    }
    case 'CLEAR_TIMELINE': {
      if (state.clips.length === 0) return state
      return { ...state, clips: [], selectedClipIds: [] }
    }
    case 'SET_BPM': {
      return { ...state, bpm: action.payload }
    }
    case 'ADD_MEASURES': {
      const count = action.payload
      if (count <= 0) return state
      return { ...state, numMeasures: state.numMeasures + count }
    }
    case 'REMOVE_LAST_MEASURE': {
      // payload: { toDeleteIds: string[], toTruncate: [{id, newDuration}] }
      const { toDeleteIds = [], toTruncate = [] } = action.payload ?? {}
      const deleteSet = new Set(toDeleteIds)
      const truncateMap = new Map(toTruncate.map((t) => [t.id, t.newDuration]))
      return {
        ...state,
        numMeasures: Math.max(1, state.numMeasures - 1),
        clips: state.clips
          .filter((c) => !deleteSet.has(c.id))
          .map((c) => (truncateMap.has(c.id) ? { ...c, duration: truncateMap.get(c.id) } : c)),
        selectedClipIds: state.selectedClipIds.filter((id) => !deleteSet.has(id)),
      }
    }
    case 'SET_TRACK_HEIGHT': {
      const next = clampTrackHeight(action.payload)
      const t0 = state.tracks[0]
      if (!t0 || t0.height === next) return state
      return {
        ...state,
        tracks: state.tracks.map((t, i) => (i === 0 ? { ...t, height: next } : t)),
      }
    }

    // ----- Designer (undoable) -----
    case 'SAVE_SOUND': {
      // payload: { soundData (sans id/color), allowDuplicate }
      const { soundData, allowDuplicate } = action.payload
      if (!allowDuplicate && soundData.mode === 'note') {
        const dup = state.savedSounds.some(
          (s) =>
            s.mode === 'note' &&
            s.noteIndex === soundData.noteIndex &&
            s.octave === soundData.octave &&
            sameWaveform(s, soundData),
        )
        if (dup) return state // pas de modif, le caller gère le flash via la fonction wrapper
      }
      const newCounter = state.soundCounter + 1
      const id = `sound-${newCounter}`
      const colorIndex = (newCounter - 1) % SOUND_COLORS.length
      return {
        ...state,
        soundCounter: newCounter,
        savedSounds: [
          ...state.savedSounds,
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
        ],
        currentSoundId: id,
      }
    }
    case 'UPDATE_SOUND': {
      const { soundId, soundData } = action.payload
      return {
        ...state,
        savedSounds: state.savedSounds.map((s) =>
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
      }
    }
    case 'DELETE_SOUND': {
      const { soundId } = action.payload
      return {
        ...state,
        savedSounds: state.savedSounds.filter((s) => s.id !== soundId),
        clips: state.clips.filter((c) => c.soundId !== soundId),
        currentSoundId: state.currentSoundId === soundId ? null : state.currentSoundId,
      }
    }
    case 'RENAME_SOUND': {
      const { soundId, name } = action.payload
      return {
        ...state,
        savedSounds: state.savedSounds.map((s) => (s.id === soundId ? { ...s, name } : s)),
      }
    }
    case 'SET_EDITOR_POINTS': {
      // Le dessin/clear casse le mapping vers un preset.
      return { ...state, editor: { ...state.editor, points: action.payload, preset: null } }
    }
    case 'SET_EDITOR_NOTE': {
      return { ...state, editor: { ...state.editor, noteIndex: action.payload } }
    }
    case 'SET_EDITOR_OCTAVE': {
      return { ...state, editor: { ...state.editor, octave: action.payload } }
    }
    case 'TOGGLE_EDITOR_FREE_MODE': {
      return { ...state, editor: { ...state.editor, freeMode: !state.editor.freeMode } }
    }
    case 'SET_EDITOR_FREQUENCY': {
      return { ...state, editor: { ...state.editor, freeFrequency: action.payload } }
    }
    case 'SET_EDITOR_AMPLITUDE': {
      return { ...state, editor: { ...state.editor, amplitude: action.payload } }
    }
    case 'SET_EDITOR_ADSR': {
      return { ...state, editor: { ...state.editor, ...action.payload } }
    }
    case 'APPLY_EDITOR_PRESET': {
      const { preset, points } = action.payload
      return { ...state, editor: { ...state.editor, points, preset } }
    }
    case 'RESET_EDITOR': {
      return {
        ...state,
        editor: { ...DEFAULT_EDITOR, points: [...DEFAULT_EDITOR.points] },
        currentSoundId: null,
      }
    }
    case 'HYDRATE_EDITOR_FROM_SOUND': {
      // Non-undoable : utilisé quand on charge un son dans l'éditeur.
      const sound = action.payload
      if (!sound) {
        return {
          ...state,
          editor: { ...DEFAULT_EDITOR, points: [...DEFAULT_EDITOR.points] },
        }
      }
      return {
        ...state,
        editor: {
          points: Array.from(sound.points),
          freeMode: sound.mode === 'free',
          noteIndex: sound.noteIndex ?? DEFAULT_EDITOR.noteIndex,
          octave: sound.octave ?? DEFAULT_EDITOR.octave,
          freeFrequency: sound.mode === 'free' ? sound.frequency : DEFAULT_EDITOR.freeFrequency,
          amplitude: sound.amplitude,
          preset: sound.preset,
          attack: sound.attack,
          decay: sound.decay,
          sustain: sound.sustain,
          release: sound.release,
        },
      }
    }

    // ----- Non-undoable -----
    case 'SET_ZOOM_H': {
      const v = typeof action.payload === 'function' ? action.payload(state.zoomH) : action.payload
      return { ...state, zoomH: clampZoomH(v) }
    }
    case 'SET_ACTIVE_TAB': {
      return { ...state, activeTab: action.payload }
    }
    case 'SELECT_CLIPS': {
      return { ...state, selectedClipIds: action.payload }
    }
    case 'SET_CURRENT_SOUND_ID': {
      return { ...state, currentSoundId: action.payload }
    }
    case 'SET_SPECTROGRAM_VISIBLE': {
      return { ...state, spectrogramVisible: !!action.payload }
    }
    case 'SET_DEFAULT_CLIP_DURATION': {
      return { ...state, defaultClipDuration: action.payload }
    }
    case 'SET_COMPOSER_FLASH': {
      return { ...state, composerFlash: action.payload }
    }
    case 'SET_NOTIFICATION': {
      return { ...state, notification: action.payload }
    }

    default:
      return state
  }
}

// === Undo / redo wrapper ===

const HISTORY_DEPTH = 50

const COMPOSER_UNDOABLE = new Set([
  'ADD_CLIP', 'REMOVE_CLIP', 'UPDATE_CLIP', 'MOVE_CLIPS', 'DELETE_SELECTED_CLIPS',
  'CLEAR_TIMELINE', 'SET_BPM', 'ADD_MEASURES', 'REMOVE_LAST_MEASURE',
])

const DESIGNER_UNDOABLE = new Set([
  'SAVE_SOUND', 'UPDATE_SOUND', 'DELETE_SOUND', 'RENAME_SOUND',
  'SET_EDITOR_POINTS', 'SET_EDITOR_NOTE', 'SET_EDITOR_OCTAVE',
  'TOGGLE_EDITOR_FREE_MODE', 'SET_EDITOR_FREQUENCY', 'SET_EDITOR_AMPLITUDE',
  'SET_EDITOR_ADSR', 'APPLY_EDITOR_PRESET', 'RESET_EDITOR',
])

// Champs snapshot par pile. Note : `tracks` exclu de COMPOSER pour que la
// hauteur de piste (zoom V) ne soit pas affectée par un undo (elle vit dans
// tracks[0].height pour des raisons de modèle, mais zoomV est non-undoable
// par spec). Ré-inclure quand des opérations de track viendront en phase B.
const COMPOSER_FIELDS = ['clips', 'numMeasures', 'bpm']
const DESIGNER_FIELDS = ['savedSounds', 'soundFolders', 'editor']

function pickFields(state, fields) {
  const out = {}
  for (const k of fields) out[k] = state[k]
  return out
}

// Vérifie qu'aucun clip ne référencerait un son disparu après restauration.
// Retourne null si OK, ou { clipCount, soundIds } si conflit.
function findOrphanReferences(restoredSavedSounds, currentClips) {
  const ids = new Set(restoredSavedSounds.map((s) => s.id))
  const orphans = currentClips.filter((c) => !ids.has(c.soundId))
  if (orphans.length === 0) return null
  const orphanSoundIds = [...new Set(orphans.map((c) => c.soundId))]
  return { clipCount: orphans.length, soundIds: orphanSoundIds }
}

function makeOrphanNotification(orphans) {
  const n = orphans.clipCount
  const plural = n > 1 ? 's' : ''
  return {
    message: `Action impossible : ce son est utilisé par ${n} clip${plural}. Supprimez-${n > 1 ? 'les' : 'le'} d'abord depuis l'onglet Composition.`,
    type: 'error',
    timestamp: Date.now(),
  }
}

export function withUndo(baseReducer) {
  return function wrapped(state, action) {
    // --- Méta ----
    if (action.type === 'UNDO_COMPOSER') {
      const { past, future } = state.history.composer
      if (past.length === 0) return state
      const previous = past[past.length - 1]
      const current = pickFields(state, COMPOSER_FIELDS)
      return {
        ...state,
        ...previous,
        history: {
          ...state.history,
          composer: { past: past.slice(0, -1), future: [current, ...future] },
        },
      }
    }
    if (action.type === 'REDO_COMPOSER') {
      const { past, future } = state.history.composer
      if (future.length === 0) return state
      const next = future[0]
      const current = pickFields(state, COMPOSER_FIELDS)
      return {
        ...state,
        ...next,
        history: {
          ...state.history,
          composer: { past: [...past, current], future: future.slice(1) },
        },
      }
    }
    if (action.type === 'UNDO_DESIGNER') {
      const { past, future } = state.history.designer
      if (past.length === 0) return state
      const previous = past[past.length - 1]
      // Bloque si la restauration créerait des clips orphelins
      const conflict = findOrphanReferences(previous.savedSounds, state.clips)
      if (conflict) {
        return { ...state, notification: makeOrphanNotification(conflict) }
      }
      const current = pickFields(state, DESIGNER_FIELDS)
      return {
        ...state,
        ...previous,
        history: {
          ...state.history,
          designer: { past: past.slice(0, -1), future: [current, ...future] },
        },
      }
    }
    if (action.type === 'REDO_DESIGNER') {
      const { past, future } = state.history.designer
      if (future.length === 0) return state
      const next = future[0]
      const conflict = findOrphanReferences(next.savedSounds, state.clips)
      if (conflict) {
        return { ...state, notification: makeOrphanNotification(conflict) }
      }
      const current = pickFields(state, DESIGNER_FIELDS)
      return {
        ...state,
        ...next,
        history: {
          ...state.history,
          designer: { past: [...past, current], future: future.slice(1) },
        },
      }
    }

    // --- Action normale : on délègue, puis on snapshote si undoable ---
    const newState = baseReducer(state, action)
    if (newState === state) return newState // pas de changement → pas de snapshot

    if (COMPOSER_UNDOABLE.has(action.type)) {
      const snap = pickFields(state, COMPOSER_FIELDS)
      return {
        ...newState,
        history: {
          ...newState.history,
          composer: {
            past: [...newState.history.composer.past, snap].slice(-HISTORY_DEPTH),
            future: [],
          },
        },
      }
    }
    if (DESIGNER_UNDOABLE.has(action.type)) {
      const snap = pickFields(state, DESIGNER_FIELDS)
      return {
        ...newState,
        history: {
          ...newState.history,
          designer: {
            past: [...newState.history.designer.past, snap].slice(-HISTORY_DEPTH),
            future: [],
          },
        },
      }
    }

    return newState
  }
}
