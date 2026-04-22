import { SOUND_COLORS } from './audio'
import {
  DEFAULT_A4,
  getTuningSystem,
  frequencyToNearestNote,
} from './lib/tuningSystems'

// === Constantes partagées ===
export const STORAGE_KEY = 'synth-app-state'
export const DEFAULT_BPM = 120
export const DEFAULT_NUM_MEASURES = 16
export const DEFAULT_TRACK_ID = 'track-default'
export const BEATS_PER_MEASURE = 4
export const MIN_ZOOM_H = 2
export const MAX_ZOOM_H = 300
export const DEFAULT_ZOOM_H = 5
export const MIN_TRACK_HEIGHT = 50
export const MAX_TRACK_HEIGHT = 200
export const DEFAULT_CLIP_DURATION = 1
export const MAX_TRACKS = 16
export const POINTS_RESOLUTION = 600
// Largeur minimale (= par défaut) des sidebars du Composer en px. Utilisée
// aussi comme taille initiale : l'utilisateur peut seulement élargir.
export const COMPOSER_SIDEBAR_MIN_WIDTH = 300
// Espace horizontal réservé au layout Composer hors colonnes (2×padding + 2×gap
// de .composer-layout). Utilisé pour calculer le max dynamique des sidebars.
export const COMPOSER_LAYOUT_CHROME = 48
// Largeur minimale laissée à la zone centrale quand on élargit une sidebar.
export const COMPOSER_MAIN_MIN_WIDTH = 200
// Largeur d'une sidebar en mode collapsed : juste assez pour le bouton
// de restauration. Utilisée comme override de la CSS var depuis App.
export const COMPOSER_SIDEBAR_COLLAPSED_WIDTH = 32

export const DEFAULT_ADSR = { attack: 10, decay: 100, sustain: 0.7, release: 200 }

export const TRACK_COLORS = [
  '#5a8a7a', '#7a6a9a', '#9a8a5a', '#5a7a9a',
  '#9a5a7a', '#6a9a5a', '#5a6a9a', '#9a7a5a',
]

// Éditeur : les champs `test*` ne servent qu'à piloter la preview dans
// Designer. Ils ne sont PAS copiés dans le patch sauvegardé. C'est le clip
// qui portera la hauteur lors du placement sur la timeline.
export const DEFAULT_EDITOR = {
  points: new Array(POINTS_RESOLUTION).fill(0),
  testTuningSystem: '12-TET', // '12-TET' | 'free'
  testNoteIndex: 9, // A
  testOctave: 4,
  testFrequency: 440,
  amplitude: 1,
  preset: null,
  ...DEFAULT_ADSR,
}

// Bornes mode libre : 2^4 à 2^15 Hz (couvre les octaves 0 à 10 complètes
// en 12-TET : C0 ≈ 16.35 Hz, B10 ≈ 31609 Hz).
export const FREE_FREQ_MIN = 16
export const FREE_FREQ_MAX = 32768

// Fréquence effective d'un clip. Délègue au registre des tempéraments
// (`src/lib/tuningSystems.js`) : un système avec `freq` non-null calcule depuis
// noteIndex/octave + a4Ref, un système `free` (freq === null) lit la fréquence
// brute du clip. Point d'extension unique pour les futurs tempéraments
// (24-TET, Pythagoricien, Just Intonation, maqâmât, etc.).
export function clipFrequency(clip, a4Ref = DEFAULT_A4) {
  const sys = getTuningSystem(clip.tuningSystem)
  if (sys.freq === null) return clip.frequency ?? DEFAULT_A4
  return sys.freq(clip.noteIndex ?? 9, clip.octave ?? 4, a4Ref)
}

export function makeDefaultTrack() {
  return {
    id: DEFAULT_TRACK_ID,
    name: 'Piste 1',
    color: TRACK_COLORS[0],
    muted: false,
    solo: false,
    volume: 1,
    height: 80,
  }
}

// === Chargement / reset du state ===

// Itération E : nouveau modèle (patches sans fréquence, clips porteurs de
// la note). Si on détecte un ancien format au chargement, on ignore
// complètement le state stocké et on repart d'un état initial vide. Pas de
// migration — l'utilisateur a accepté ce reset.
function isLegacyFormat(parsed) {
  if (!parsed || typeof parsed !== 'object') return false
  return (
    'savedSounds' in parsed ||
    'soundCounter' in parsed ||
    'noteCounter' in parsed ||
    'placementCounter' in parsed
  )
}

export function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (isLegacyFormat(parsed)) {
      console.warn('synth-app: ancien format localStorage détecté, reset du state')
      return null
    }

    const patches = Array.isArray(parsed.patches) ? parsed.patches : []
    const clips = Array.isArray(parsed.clips) ? parsed.clips : []
    const tracks = (Array.isArray(parsed.tracks) && parsed.tracks.length > 0
      ? parsed.tracks
      : [makeDefaultTrack()]
    ).map((t, i) => ({
      ...t,
      color: t.color ?? TRACK_COLORS[i % TRACK_COLORS.length],
    }))
    const soundFolders = Array.isArray(parsed.soundFolders) ? parsed.soundFolders : []

    const maxClipMeasure = clips.reduce((m, c) => Math.max(m, c.measure || 0), 0)
    const numMeasures = Math.max(
      parsed.numMeasures ?? DEFAULT_NUM_MEASURES,
      maxClipMeasure,
      1,
    )

    const a4RefRaw = parsed.a4Ref
    const a4Ref = typeof a4RefRaw === 'number' && Number.isFinite(a4RefRaw) && a4RefRaw > 0
      ? a4RefRaw
      : DEFAULT_A4

    return {
      patches,
      soundFolders,
      tracks,
      clips,
      numMeasures,
      bpm: parsed.bpm ?? DEFAULT_BPM,
      a4Ref,
      patchCounter: parsed.patchCounter ?? 0,
      clipCounter: parsed.clipCounter ?? 0,
      folderCounter: parsed.folderCounter ?? 0,
      trackCounter: parsed.trackCounter ?? Math.max(0, ...tracks.map(t => {
        const m = t.id.match(/^track-(\d+)$/)
        return m ? parseInt(m[1], 10) : 0
      })),
      spectrogramVisible:
        typeof parsed.spectrogramVisible === 'boolean' ? parsed.spectrogramVisible : true,
      activeTab: parsed.activeTab === 'composer' ? 'composer' : 'designer',
      durationMode: parsed.durationMode === 'fraction' ? 'fraction' : 'solfège',
      composerBankWidth: typeof parsed.composerBankWidth === 'number' ? parsed.composerBankWidth : null,
      composerAsideWidth: typeof parsed.composerAsideWidth === 'number' ? parsed.composerAsideWidth : null,
      composerBankCollapsed: typeof parsed.composerBankCollapsed === 'boolean' ? parsed.composerBankCollapsed : null,
      composerAsideCollapsed: typeof parsed.composerAsideCollapsed === 'boolean' ? parsed.composerAsideCollapsed : null,
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
    // Hauteur de référence pour tous les systèmes-based (iter F). Configurable
    // mais sans UI exposée en F.1 — défaut 440 Hz = comportement pré-F.1.
    a4Ref: persisted?.a4Ref ?? DEFAULT_A4,

    // Designer (champ undoable)
    patches: persisted?.patches ?? [],
    soundFolders: persisted?.soundFolders ?? [],
    editor: { ...DEFAULT_EDITOR, points: [...DEFAULT_EDITOR.points] },

    // Compteurs (state mais hors historique : on ne fait pas reculer un compteur
    // sur undo, sinon on risque de réutiliser un id supprimé puis recréé)
    patchCounter: persisted?.patchCounter ?? 0,
    clipCounter: persisted?.clipCounter ?? 0,
    folderCounter: persisted?.folderCounter ?? 0,
    trackCounter: persisted?.trackCounter ?? 0,

    clipboard: null,
    measureClipboard: null,

    zoomH: DEFAULT_ZOOM_H,
    activeTab: persisted?.activeTab ?? 'designer',
    selectedClipIds: [],
    // Anchor pour le placement contigu au clavier (E.4.2). Mis à jour à
    // chaque action utilisateur qui touche un clip spécifique (création,
    // sélection). Non undoable, non persisté. Peut pointer vers un clip
    // supprimé — le caller vérifie l'existence avant de l'utiliser.
    lastAnchorClipId: null,
    currentPatchId: null,
    spectrogramVisible: persisted?.spectrogramVisible ?? true,
    defaultClipDuration: DEFAULT_CLIP_DURATION,
    // Mode d'affichage des durées dans les boutons (E.6.1).
    // 'solfège' : ♩ ♪ 𝅘𝅥𝅯 etc. / 'fraction' : 1 1/2 1/4 etc. (réf. = noire).
    durationMode: persisted?.durationMode === 'fraction' ? 'fraction' : 'solfège',
    // Largeurs des sidebars du Composer (px). Minimum = COMPOSER_SIDEBAR_MIN_WIDTH,
    // pas de maximum imposé. Clampées à chaque assignation.
    composerBankWidth: Math.max(COMPOSER_SIDEBAR_MIN_WIDTH, persisted?.composerBankWidth ?? COMPOSER_SIDEBAR_MIN_WIDTH),
    composerAsideWidth: Math.max(COMPOSER_SIDEBAR_MIN_WIDTH, persisted?.composerAsideWidth ?? COMPOSER_SIDEBAR_MIN_WIDTH),
    composerBankCollapsed: persisted?.composerBankCollapsed ?? false,
    composerAsideCollapsed: persisted?.composerAsideCollapsed ?? false,
    composerFlash: null,

    history: {
      designer: { past: [], future: [] },
      composer: { past: [], future: [] },
    },
    notification: null,
  }
}

// === Helpers ===

// Construit les champs de note à injecter dans un nouveau clip à partir de
// l'état courant de l'éditeur (source de vérité en E.1 pour le drop par
// défaut). 12-TET → noteIndex/octave explicites, Libre → frequency explicite.
export function editorTestNoteFields(editor) {
  const tuningSystem = editor.testTuningSystem
  if (tuningSystem === 'free') {
    return { tuningSystem, noteIndex: null, octave: null, frequency: editor.testFrequency }
  }
  return {
    tuningSystem,
    noteIndex: editor.testNoteIndex,
    octave: editor.testOctave,
    frequency: null,
  }
}

// Copie les champs de note d'un clip source vers un clip cible (helpers pour
// les opérations qui recréent des clips : split, merge, paste, insert/delete
// measure, cut measure, etc.). Le modèle exige que tous les clips portent
// tuningSystem + noteIndex/octave OU tuningSystem + frequency.
export function cloneClipNote(src) {
  return {
    tuningSystem: src.tuningSystem,
    noteIndex: src.noteIndex ?? null,
    octave: src.octave ?? null,
    frequency: src.frequency ?? null,
  }
}

export function getDescendantFolderIds(folderId, folders) {
  const result = []
  const queue = [folderId]
  while (queue.length > 0) {
    const id = queue.shift()
    for (const f of folders) {
      if (f.parentId === id) {
        result.push(f.id)
        queue.push(f.id)
      }
    }
  }
  return result
}

export function countFolderContents(folderId, folders, patches) {
  const descendantIds = getDescendantFolderIds(folderId, folders)
  const allFolderIds = new Set([folderId, ...descendantIds])
  const containedPatches = patches.filter((p) => allFolderIds.has(p.folderId))
  return { patchCount: containedPatches.length, folderCount: descendantIds.length, patchIds: containedPatches.map((p) => p.id) }
}

export function canSplitClip(clip, divisor) {
  const part = clip.duration / divisor
  if (part < 0.125) return false
  return Math.abs(Math.round(part / 0.125) * 0.125 - part) < 1e-9
}

function snapBeat(v) {
  return Math.round(v / 0.125) * 0.125
}

function beatToMeasureBeat(absoluteBeat) {
  const measure = Math.floor(absoluteBeat / BEATS_PER_MEASURE) + 1
  const beat = snapBeat(absoluteBeat - (measure - 1) * BEATS_PER_MEASURE)
  return { measure, beat }
}

function clipAbsoluteStart(c) {
  return (c.measure - 1) * BEATS_PER_MEASURE + c.beat
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
      const {
        patchId, measure, beat, duration, trackId = DEFAULT_TRACK_ID,
        tuningSystem, noteIndex, octave, frequency,
        extraMeasures = 0,
      } = action.payload
      const finalDuration = duration ?? state.defaultClipDuration
      const newCounter = state.clipCounter + 1
      const newId = `clip-${newCounter}`
      return {
        ...state,
        clipCounter: newCounter,
        numMeasures: state.numMeasures + extraMeasures,
        clips: [
          ...state.clips,
          {
            id: newId,
            trackId,
            patchId,
            measure,
            beat,
            duration: finalDuration,
            tuningSystem,
            noteIndex: noteIndex ?? null,
            octave: octave ?? null,
            frequency: frequency ?? null,
          },
        ],
        // Sélection du nouveau clip : permet d'enchaîner les flèches, Ctrl+C,
        // etc. sans clic intermédiaire (cohérence avec duplicate/paste).
        selectedClipIds: [newId],
        lastAnchorClipId: newId,
      }
    }
    case 'REMOVE_CLIP': {
      const { clipId } = action.payload
      return {
        ...state,
        clips: state.clips.filter((c) => c.id !== clipId),
        selectedClipIds: state.selectedClipIds.filter((id) => id !== clipId),
        lastAnchorClipId: state.lastAnchorClipId === clipId ? null : state.lastAnchorClipId,
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
      const moves = new Map(action.payload.map((m) => [m.id, m]))
      if (moves.size === 0) return state
      return {
        ...state,
        clips: state.clips.map((c) => {
          const m = moves.get(c.id)
          if (!m) return c
          const updated = { ...c, measure: m.measure, beat: m.beat }
          if (m.trackId) updated.trackId = m.trackId
          return updated
        }),
      }
    }
    case 'RESIZE_CLIPS': {
      const updates = new Map(action.payload.map((m) => [m.id, m]))
      if (updates.size === 0) return state
      return {
        ...state,
        clips: state.clips.map((c) => {
          const u = updates.get(c.id)
          return u
            ? { ...c, measure: u.measure, beat: u.beat, duration: u.duration }
            : c
        }),
      }
    }
    case 'UPDATE_CLIPS_PATCH': {
      // payload: { clipIds, patchId } — uniformise patchId pour plusieurs clips.
      const { clipIds, patchId } = action.payload
      const ids = new Set(clipIds)
      if (ids.size === 0) return state
      return {
        ...state,
        clips: state.clips.map((c) => (ids.has(c.id) ? { ...c, patchId } : c)),
      }
    }
    case 'UPDATE_CLIPS_DURATION': {
      const updates = new Map(action.payload.map((u) => [u.id, u.duration]))
      if (updates.size === 0) return state
      return {
        ...state,
        clips: state.clips.map((c) =>
          updates.has(c.id) ? { ...c, duration: updates.get(c.id) } : c,
        ),
      }
    }
    case 'UPDATE_CLIPS_PITCH': {
      // payload: [{ id, tuningSystem?, noteIndex?, octave?, frequency? }]
      // Applique les champs explicites, puis — si le `tuningSystem` change et
      // que les champs note/fréquence cibles ne sont pas fournis — dérive les
      // valeurs cohérentes pour le nouveau système. Garantit l'invariant
      // "clip cohérent" (free → frequency non null, système-based →
      // noteIndex/octave non nuls) au niveau du modèle : tout dispatch
      // UPDATE_CLIPS_PITCH (menu contextuel futur, raccourci clavier, etc.)
      // en bénéficie sans dupliquer la logique.
      const updates = new Map(action.payload.map((u) => [u.id, u]))
      if (updates.size === 0) return state
      const a4Ref = state.a4Ref ?? DEFAULT_A4
      return {
        ...state,
        clips: state.clips.map((c) => {
          const u = updates.get(c.id)
          if (!u) return c
          const next = { ...c }
          if ('tuningSystem' in u) next.tuningSystem = u.tuningSystem
          if ('noteIndex' in u) next.noteIndex = u.noteIndex
          if ('octave' in u) next.octave = u.octave
          if ('frequency' in u) next.frequency = u.frequency

          const systemChanged = 'tuningSystem' in u && u.tuningSystem !== c.tuningSystem
          if (!systemChanged) return next

          const prevSys = getTuningSystem(c.tuningSystem)
          const nextSys = getTuningSystem(next.tuningSystem)
          if (nextSys.freq === null) {
            // Vers libre : si la fréquence n'est pas fournie explicitement,
            // on conserve la hauteur courante rendue dans l'ancien système.
            if (!('frequency' in u)) {
              next.frequency = Math.round(clipFrequency(c, a4Ref) * 10) / 10
            }
            if (!('noteIndex' in u)) next.noteIndex = null
            if (!('octave' in u)) next.octave = null
          } else if (prevSys.freq !== null && prevSys.notesPerOctave === nextSys.notesPerOctave) {
            // Entre systèmes de même grille (ex. 12-TET ↔ Pythagoricien en
            // F.2) : noteIndex/octave gardés tels quels ; seule la fréquence
            // de rendu diffère.
            if (!('frequency' in u)) next.frequency = null
          } else {
            // Depuis libre, ou entre systèmes de grilles différentes :
            // snap vers la note la plus proche (12-TET comme référence
            // d'affichage pour F.2, cf. frequencyToNearestNote).
            if (!('noteIndex' in u) || !('octave' in u)) {
              const srcFreq = c.frequency ?? a4Ref
              const nearest = frequencyToNearestNote(srcFreq, a4Ref)
              if (!('noteIndex' in u)) next.noteIndex = nearest.noteIndex
              if (!('octave' in u)) next.octave = nearest.octave
            }
            if (!('frequency' in u)) next.frequency = null
          }
          return next
        }),
      }
    }
    case 'DUPLICATE_CLIPS': {
      // payload: [{ trackId, patchId, measure, beat, duration,
      //             tuningSystem, noteIndex, octave, frequency }]
      const datas = action.payload
      if (!datas || datas.length === 0) return state
      const base = state.clipCounter
      const newClips = datas.map((d, i) => ({
        id: `clip-${base + i + 1}`,
        trackId: d.trackId,
        patchId: d.patchId,
        measure: d.measure,
        beat: d.beat,
        duration: d.duration,
        tuningSystem: d.tuningSystem,
        noteIndex: d.noteIndex ?? null,
        octave: d.octave ?? null,
        frequency: d.frequency ?? null,
      }))
      return {
        ...state,
        clipCounter: base + datas.length,
        clips: [...state.clips, ...newClips],
        selectedClipIds: newClips.map((c) => c.id),
        lastAnchorClipId: newClips[newClips.length - 1].id,
      }
    }
    case 'SPLIT_CLIPS': {
      const { clipIds, divisor } = action.payload
      const idSet = new Set(clipIds)
      const toSplit = state.clips.filter((c) => idSet.has(c.id) && canSplitClip(c, divisor))
      if (toSplit.length === 0) return state
      const splitIds = new Set(toSplit.map((c) => c.id))
      const keptSelectedIds = clipIds.filter((id) => idSet.has(id) && !splitIds.has(id))

      let counter = state.clipCounter
      const newClips = []
      const newSelectedIds = [...keptSelectedIds]
      for (const clip of toSplit) {
        const partDuration = clip.duration / divisor
        const startBeat = (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat
        for (let i = 0; i < divisor; i++) {
          counter++
          const beatPos = startBeat + i * partDuration
          const measure = Math.floor(beatPos / BEATS_PER_MEASURE) + 1
          const beat = beatPos - (measure - 1) * BEATS_PER_MEASURE
          newClips.push({
            id: `clip-${counter}`,
            patchId: clip.patchId,
            trackId: clip.trackId,
            measure,
            beat,
            duration: partDuration,
            ...cloneClipNote(clip),
          })
          newSelectedIds.push(`clip-${counter}`)
        }
      }
      return {
        ...state,
        clipCounter: counter,
        clips: [...state.clips.filter((c) => !splitIds.has(c.id)), ...newClips],
        selectedClipIds: newSelectedIds,
        lastAnchorClipId: newClips.length > 0
          ? newClips[newClips.length - 1].id
          : state.lastAnchorClipId,
      }
    }
    case 'MERGE_CLIPS': {
      const { selectedIds } = action.payload
      if (!selectedIds || selectedIds.length < 2) return state
      const idSet = new Set(selectedIds)
      const selected = state.clips
        .filter((c) => idSet.has(c.id))
        .sort((a, b) => {
          const aStart = (a.measure - 1) * BEATS_PER_MEASURE + a.beat
          const bStart = (b.measure - 1) * BEATS_PER_MEASURE + b.beat
          return aStart - bStart
        })
      if (selected.length < 2) return state
      const first = selected[0]
      const totalDuration = selected.reduce((s, c) => s + c.duration, 0)
      const newId = `clip-${state.clipCounter + 1}`
      return {
        ...state,
        clipCounter: state.clipCounter + 1,
        clips: [
          ...state.clips.filter((c) => !idSet.has(c.id)),
          {
            id: newId,
            patchId: first.patchId,
            trackId: first.trackId,
            measure: first.measure,
            beat: first.beat,
            duration: totalDuration,
            ...cloneClipNote(first),
          },
        ],
        selectedClipIds: [newId],
        lastAnchorClipId: newId,
      }
    }
    case 'PASTE_CLIPS': {
      // payload: { clipDatas: [{ trackId, patchId, measure, beat, duration,
      //            tuningSystem, noteIndex, octave, frequency }],
      //            extraMeasures: number }
      const { clipDatas, extraMeasures = 0 } = action.payload
      if (!clipDatas || clipDatas.length === 0) return state
      const base = state.clipCounter
      const newClips = clipDatas.map((d, i) => ({
        id: `clip-${base + i + 1}`,
        trackId: d.trackId,
        patchId: d.patchId,
        measure: d.measure,
        beat: d.beat,
        duration: d.duration,
        tuningSystem: d.tuningSystem,
        noteIndex: d.noteIndex ?? null,
        octave: d.octave ?? null,
        frequency: d.frequency ?? null,
      }))
      return {
        ...state,
        clipCounter: base + clipDatas.length,
        clips: [...state.clips, ...newClips],
        selectedClipIds: newClips.map((c) => c.id),
        numMeasures: state.numMeasures + extraMeasures,
        lastAnchorClipId: newClips[newClips.length - 1].id,
      }
    }
    case 'DELETE_SELECTED_CLIPS': {
      const ids = new Set(state.selectedClipIds)
      if (ids.size === 0) return state
      return {
        ...state,
        clips: state.clips.filter((c) => !ids.has(c.id)),
        selectedClipIds: [],
        lastAnchorClipId: ids.has(state.lastAnchorClipId) ? null : state.lastAnchorClipId,
      }
    }
    case 'CLEAR_TIMELINE': {
      if (state.clips.length === 0) return state
      return { ...state, clips: [], selectedClipIds: [], lastAnchorClipId: null }
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
    case 'DELETE_MEASURE': {
      const { measure, deletedIds, truncated, splitParts } = action.payload
      const mEnd = measure * BEATS_PER_MEASURE
      const shift = -BEATS_PER_MEASURE
      const deleteSet = new Set(deletedIds)
      const truncateMap = new Map(truncated.map((t) => [t.id, t.newDuration]))
      const splitSet = new Set(splitParts.filter((s) => s.originalId).map((s) => s.originalId))
      let counter = state.clipCounter
      const newClips = []
      for (const part of splitParts) {
        counter++
        newClips.push({
          id: `clip-${counter}`,
          patchId: part.patchId,
          trackId: part.trackId,
          measure: part.measure,
          beat: part.beat,
          duration: part.duration,
          tuningSystem: part.tuningSystem,
          noteIndex: part.noteIndex ?? null,
          octave: part.octave ?? null,
          frequency: part.frequency ?? null,
        })
      }
      const kept = state.clips
        .filter((c) => !deleteSet.has(c.id) && !splitSet.has(c.id))
        .map((c) => {
          const dur = truncateMap.has(c.id) ? truncateMap.get(c.id) : c.duration
          const start = clipAbsoluteStart(c)
          if (start >= mEnd) {
            const newStart = snapBeat(start + shift)
            const mb = beatToMeasureBeat(newStart)
            return { ...c, measure: mb.measure, beat: mb.beat, duration: dur }
          }
          return dur !== c.duration ? { ...c, duration: dur } : c
        })
      return {
        ...state,
        clipCounter: counter,
        numMeasures: Math.max(1, state.numMeasures - 1),
        clips: [...kept, ...newClips],
        selectedClipIds: [],
      }
    }
    case 'INSERT_MEASURES_AT': {
      const { beatPosition, count, splitParts } = action.payload
      const shiftAmount = count * BEATS_PER_MEASURE
      let counter = state.clipCounter
      const splitOriginalIds = new Set(splitParts.map((s) => s.originalId))
      const newClips = []
      for (const part of splitParts) {
        counter++
        newClips.push({
          id: `clip-${counter}`,
          patchId: part.patchId,
          trackId: part.trackId,
          measure: part.measure,
          beat: part.beat,
          duration: part.duration,
          tuningSystem: part.tuningSystem,
          noteIndex: part.noteIndex ?? null,
          octave: part.octave ?? null,
          frequency: part.frequency ?? null,
        })
      }
      const shifted = state.clips
        .filter((c) => !splitOriginalIds.has(c.id))
        .map((c) => {
          const start = clipAbsoluteStart(c)
          if (start >= beatPosition) {
            const newStart = snapBeat(start + shiftAmount)
            const mb = beatToMeasureBeat(newStart)
            return { ...c, measure: mb.measure, beat: mb.beat }
          }
          return c
        })
      return {
        ...state,
        clipCounter: counter,
        numMeasures: state.numMeasures + count,
        clips: [...shifted, ...newClips],
        selectedClipIds: [],
      }
    }
    case 'SET_MEASURE_CLIPBOARD': {
      return { ...state, measureClipboard: action.payload }
    }
    case 'CUT_MEASURE': {
      const { measure, deletedIds, truncated, splitParts, clipboardData } = action.payload
      const mEnd = measure * BEATS_PER_MEASURE
      const shift = -BEATS_PER_MEASURE
      const deleteSet = new Set(deletedIds)
      const truncateMap = new Map(truncated.map((t) => [t.id, t.newDuration]))
      const splitSet = new Set(splitParts.filter((s) => s.originalId).map((s) => s.originalId))
      let counter = state.clipCounter
      const newClips = []
      for (const part of splitParts) {
        counter++
        newClips.push({
          id: `clip-${counter}`,
          patchId: part.patchId,
          trackId: part.trackId,
          measure: part.measure,
          beat: part.beat,
          duration: part.duration,
          tuningSystem: part.tuningSystem,
          noteIndex: part.noteIndex ?? null,
          octave: part.octave ?? null,
          frequency: part.frequency ?? null,
        })
      }
      const kept = state.clips
        .filter((c) => !deleteSet.has(c.id) && !splitSet.has(c.id))
        .map((c) => {
          const dur = truncateMap.has(c.id) ? truncateMap.get(c.id) : c.duration
          const start = clipAbsoluteStart(c)
          if (start >= mEnd) {
            const newStart = snapBeat(start + shift)
            const mb = beatToMeasureBeat(newStart)
            return { ...c, measure: mb.measure, beat: mb.beat, duration: dur }
          }
          return dur !== c.duration ? { ...c, duration: dur } : c
        })
      return {
        ...state,
        clipCounter: counter,
        numMeasures: Math.max(1, state.numMeasures - 1),
        clips: [...kept, ...newClips],
        selectedClipIds: [],
        measureClipboard: clipboardData,
      }
    }
    case 'PASTE_MEASURES': {
      const { beatPosition, count, splitParts, pastedClips } = action.payload
      const shiftAmount = count * BEATS_PER_MEASURE
      let counter = state.clipCounter
      const splitOriginalIds = new Set(splitParts.map((s) => s.originalId))
      const newClips = []
      for (const part of splitParts) {
        counter++
        newClips.push({
          id: `clip-${counter}`,
          patchId: part.patchId,
          trackId: part.trackId,
          measure: part.measure,
          beat: part.beat,
          duration: part.duration,
          tuningSystem: part.tuningSystem,
          noteIndex: part.noteIndex ?? null,
          octave: part.octave ?? null,
          frequency: part.frequency ?? null,
        })
      }
      for (const pc of pastedClips) {
        counter++
        newClips.push({
          id: `clip-${counter}`,
          patchId: pc.patchId,
          trackId: pc.trackId,
          measure: pc.measure,
          beat: pc.beat,
          duration: pc.duration,
          tuningSystem: pc.tuningSystem,
          noteIndex: pc.noteIndex ?? null,
          octave: pc.octave ?? null,
          frequency: pc.frequency ?? null,
        })
      }
      const shifted = state.clips
        .filter((c) => !splitOriginalIds.has(c.id))
        .map((c) => {
          const start = clipAbsoluteStart(c)
          if (start >= beatPosition) {
            const newStart = snapBeat(start + shiftAmount)
            const mb = beatToMeasureBeat(newStart)
            return { ...c, measure: mb.measure, beat: mb.beat }
          }
          return c
        })
      return {
        ...state,
        clipCounter: counter,
        numMeasures: state.numMeasures + count,
        clips: [...shifted, ...newClips],
        selectedClipIds: [],
      }
    }
    case 'CREATE_TRACK': {
      if (state.tracks.length >= MAX_TRACKS) return state
      const newCounter = state.trackCounter + 1
      const colorIdx = state.tracks.length % TRACK_COLORS.length
      return {
        ...state,
        trackCounter: newCounter,
        tracks: [
          ...state.tracks,
          {
            id: `track-${newCounter}`,
            name: `Piste ${state.tracks.length + 1}`,
            color: TRACK_COLORS[colorIdx],
            muted: false,
            solo: false,
            volume: 1,
            height: state.tracks[0]?.height ?? 80,
          },
        ],
      }
    }
    case 'RENAME_TRACK': {
      const { trackId, name } = action.payload
      return {
        ...state,
        tracks: state.tracks.map(t => t.id === trackId ? { ...t, name } : t),
      }
    }
    case 'UPDATE_TRACK': {
      const { trackId, updates } = action.payload
      return {
        ...state,
        tracks: state.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t),
      }
    }
    case 'REORDER_TRACKS': {
      const newOrder = action.payload
      if (!Array.isArray(newOrder) || newOrder.length !== state.tracks.length) return state
      const trackMap = new Map(state.tracks.map(t => [t.id, t]))
      const reordered = newOrder.map(id => trackMap.get(id)).filter(Boolean)
      if (reordered.length !== state.tracks.length) return state
      return { ...state, tracks: reordered }
    }
    case 'DELETE_TRACK': {
      const { trackId } = action.payload
      if (state.tracks.length <= 1) return state
      const deletedClipIds = new Set(
        state.clips.filter(c => c.trackId === trackId).map(c => c.id),
      )
      return {
        ...state,
        tracks: state.tracks.filter(t => t.id !== trackId),
        clips: state.clips.filter(c => c.trackId !== trackId),
        selectedClipIds: state.selectedClipIds.filter(id => !deletedClipIds.has(id)),
      }
    }
    case 'SET_TRACK_HEIGHT': {
      const next = clampTrackHeight(action.payload)
      if (state.tracks.every(t => t.height === next)) return state
      return {
        ...state,
        tracks: state.tracks.map(t => ({ ...t, height: next })),
      }
    }

    // ----- Designer (undoable) -----
    case 'SAVE_PATCH': {
      // payload: { patchData (sans id/color) }
      const { patchData } = action.payload
      const newCounter = state.patchCounter + 1
      const id = `patch-${newCounter}`
      const colorIndex = (newCounter - 1) % SOUND_COLORS.length
      return {
        ...state,
        patchCounter: newCounter,
        patches: [
          ...state.patches,
          {
            id,
            name: patchData.name,
            color: SOUND_COLORS[colorIndex],
            points: Array.from(patchData.points),
            amplitude: patchData.amplitude,
            preset: patchData.preset,
            attack: patchData.attack ?? DEFAULT_ADSR.attack,
            decay: patchData.decay ?? DEFAULT_ADSR.decay,
            sustain: patchData.sustain ?? DEFAULT_ADSR.sustain,
            release: patchData.release ?? DEFAULT_ADSR.release,
            folderId: null,
          },
        ],
        currentPatchId: id,
      }
    }
    case 'UPDATE_PATCH': {
      const { patchId, patchData } = action.payload
      return {
        ...state,
        patches: state.patches.map((p) =>
          p.id === patchId
            ? {
                ...p,
                points: Array.from(patchData.points),
                amplitude: patchData.amplitude,
                preset: patchData.preset,
                attack: patchData.attack,
                decay: patchData.decay,
                sustain: patchData.sustain,
                release: patchData.release,
              }
            : p,
        ),
      }
    }
    case 'DELETE_PATCH': {
      const { patchId } = action.payload
      return {
        ...state,
        patches: state.patches.filter((p) => p.id !== patchId),
        currentPatchId: state.currentPatchId === patchId ? null : state.currentPatchId,
      }
    }
    case 'RENAME_PATCH': {
      const { patchId, name } = action.payload
      return {
        ...state,
        patches: state.patches.map((p) => (p.id === patchId ? { ...p, name } : p)),
      }
    }
    case 'CREATE_FOLDER': {
      const { name } = action.payload
      const newCounter = state.folderCounter + 1
      return {
        ...state,
        folderCounter: newCounter,
        soundFolders: [
          ...state.soundFolders,
          { id: `folder-${newCounter}`, name, parentId: null },
        ],
      }
    }
    case 'RENAME_FOLDER': {
      const { folderId, name } = action.payload
      return {
        ...state,
        soundFolders: state.soundFolders.map((f) =>
          f.id === folderId ? { ...f, name } : f,
        ),
      }
    }
    case 'DELETE_FOLDER': {
      const { folderId } = action.payload
      const descendantIds = getDescendantFolderIds(folderId, state.soundFolders)
      const allFolderIds = new Set([folderId, ...descendantIds])
      const deletedPatchIds = new Set(
        state.patches.filter((p) => allFolderIds.has(p.folderId)).map((p) => p.id),
      )
      return {
        ...state,
        soundFolders: state.soundFolders.filter((f) => !allFolderIds.has(f.id)),
        patches: state.patches.filter((p) => !deletedPatchIds.has(p.id)),
        currentPatchId: deletedPatchIds.has(state.currentPatchId) ? null : state.currentPatchId,
      }
    }
    case 'MOVE_PATCH_TO_FOLDER': {
      const { patchId, folderId } = action.payload
      return {
        ...state,
        patches: state.patches.map((p) =>
          p.id === patchId ? { ...p, folderId } : p,
        ),
      }
    }
    case 'MOVE_FOLDER': {
      const { folderId, parentId } = action.payload
      if (parentId !== null) {
        const descendants = getDescendantFolderIds(folderId, state.soundFolders)
        if (descendants.includes(parentId) || folderId === parentId) return state
      }
      return {
        ...state,
        soundFolders: state.soundFolders.map((f) =>
          f.id === folderId ? { ...f, parentId } : f,
        ),
      }
    }
    case 'SET_EDITOR_POINTS': {
      return { ...state, editor: { ...state.editor, points: action.payload, preset: null } }
    }
    case 'SET_EDITOR_TEST_NOTE': {
      return { ...state, editor: { ...state.editor, testNoteIndex: action.payload } }
    }
    case 'SET_EDITOR_TEST_OCTAVE': {
      return { ...state, editor: { ...state.editor, testOctave: action.payload } }
    }
    case 'SET_EDITOR_TEST_TUNING_SYSTEM': {
      const next = action.payload
      if (state.editor.testTuningSystem === next) return state
      const a4Ref = state.a4Ref ?? DEFAULT_A4
      const prevSys = getTuningSystem(state.editor.testTuningSystem)
      const nextSys = getTuningSystem(next)

      if (nextSys.freq === null) {
        // Vers libre : on conserve la fréquence courante rendue dans l'ancien
        // système. testNoteIndex/testOctave sont préservés (via ...editor)
        // pour qu'un retour au système-based restaure la note précédente.
        const curFreq = prevSys.freq
          ? prevSys.freq(state.editor.testNoteIndex, state.editor.testOctave, a4Ref)
          : state.editor.testFrequency
        return {
          ...state,
          editor: {
            ...state.editor,
            testTuningSystem: next,
            testFrequency: Math.round(curFreq * 10) / 10,
          },
        }
      }

      if (prevSys.freq !== null && prevSys.notesPerOctave === nextSys.notesPerOctave) {
        // Entre systèmes de même grille : note/octave gardés, seul le rendu
        // change (ex. 12-TET ↔ Pythagoricien).
        return {
          ...state,
          editor: { ...state.editor, testTuningSystem: next },
        }
      }

      // Depuis libre ou grille différente : snap via 12-TET. Quand d'autres
      // grilles (24-TET, 31-EDO, …) seront ajoutées, il faudra un inverse
      // par système.
      const { noteIndex, octave } = frequencyToNearestNote(state.editor.testFrequency, a4Ref)
      return {
        ...state,
        editor: { ...state.editor, testTuningSystem: next, testNoteIndex: noteIndex, testOctave: octave },
      }
    }
    case 'SET_EDITOR_TEST_FREQUENCY': {
      return { ...state, editor: { ...state.editor, testFrequency: action.payload } }
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
        currentPatchId: null,
      }
    }
    case 'HYDRATE_EDITOR_FROM_PATCH': {
      // Non-undoable : utilisé quand on charge un patch dans l'éditeur. Ne
      // touche PAS aux champs test* (contexte de test de l'utilisateur).
      const patch = action.payload
      if (!patch) {
        return {
          ...state,
          editor: { ...DEFAULT_EDITOR, points: [...DEFAULT_EDITOR.points] },
        }
      }
      return {
        ...state,
        editor: {
          ...state.editor,
          points: Array.from(patch.points),
          amplitude: patch.amplitude,
          preset: patch.preset,
          attack: patch.attack,
          decay: patch.decay,
          sustain: patch.sustain,
          release: patch.release,
        },
      }
    }

    // ----- Non-undoable -----
    case 'SET_CLIPBOARD': {
      return { ...state, clipboard: action.payload }
    }
    case 'SET_ZOOM_H': {
      const v = typeof action.payload === 'function' ? action.payload(state.zoomH) : action.payload
      return { ...state, zoomH: clampZoomH(v) }
    }
    case 'SET_ACTIVE_TAB': {
      return { ...state, activeTab: action.payload }
    }
    case 'SELECT_CLIPS': {
      // Mise à jour de l'anchor : si la sélection devient non-vide, prend le
      // dernier id (= dernier clip cliqué/ajouté à la sélection). Si vide,
      // on conserve l'anchor précédent (le placement contigu reste possible
      // même après désélection).
      const ids = action.payload
      return {
        ...state,
        selectedClipIds: ids,
        lastAnchorClipId: ids.length > 0 ? ids[ids.length - 1] : state.lastAnchorClipId,
      }
    }
    case 'SET_CURRENT_PATCH_ID': {
      return { ...state, currentPatchId: action.payload }
    }
    case 'SET_SPECTROGRAM_VISIBLE': {
      return { ...state, spectrogramVisible: !!action.payload }
    }
    case 'SET_DEFAULT_CLIP_DURATION': {
      return { ...state, defaultClipDuration: action.payload }
    }
    case 'SET_DURATION_MODE': {
      return { ...state, durationMode: action.payload === 'fraction' ? 'fraction' : 'solfège' }
    }
    case 'SET_COMPOSER_SIDEBAR_WIDTH': {
      const { side, width } = action.payload
      const clamped = Math.max(COMPOSER_SIDEBAR_MIN_WIDTH, Math.round(width))
      if (side === 'bank') {
        if (state.composerBankWidth === clamped) return state
        return { ...state, composerBankWidth: clamped }
      }
      if (side === 'aside') {
        if (state.composerAsideWidth === clamped) return state
        return { ...state, composerAsideWidth: clamped }
      }
      return state
    }
    case 'SET_COMPOSER_SIDEBAR_COLLAPSED': {
      const { side, collapsed } = action.payload
      const value = !!collapsed
      if (side === 'bank') {
        if (state.composerBankCollapsed === value) return state
        return { ...state, composerBankCollapsed: value }
      }
      if (side === 'aside') {
        if (state.composerAsideCollapsed === value) return state
        return { ...state, composerAsideCollapsed: value }
      }
      return state
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
  'ADD_CLIP', 'REMOVE_CLIP', 'UPDATE_CLIP', 'MOVE_CLIPS', 'RESIZE_CLIPS',
  'DUPLICATE_CLIPS', 'PASTE_CLIPS', 'SPLIT_CLIPS', 'MERGE_CLIPS', 'DELETE_SELECTED_CLIPS',
  'UPDATE_CLIPS_PATCH', 'UPDATE_CLIPS_DURATION', 'UPDATE_CLIPS_PITCH',
  'CLEAR_TIMELINE', 'SET_BPM', 'ADD_MEASURES', 'REMOVE_LAST_MEASURE',
  'DELETE_MEASURE', 'INSERT_MEASURES_AT', 'CUT_MEASURE', 'PASTE_MEASURES',
  'CREATE_TRACK', 'RENAME_TRACK', 'DELETE_TRACK', 'REORDER_TRACKS', 'UPDATE_TRACK',
])

const DESIGNER_UNDOABLE = new Set([
  'SAVE_PATCH', 'UPDATE_PATCH', 'DELETE_PATCH', 'RENAME_PATCH',
  'CREATE_FOLDER', 'RENAME_FOLDER', 'DELETE_FOLDER',
  'MOVE_PATCH_TO_FOLDER', 'MOVE_FOLDER',
  'SET_EDITOR_POINTS', 'SET_EDITOR_TEST_NOTE', 'SET_EDITOR_TEST_OCTAVE',
  'SET_EDITOR_TEST_TUNING_SYSTEM', 'SET_EDITOR_TEST_FREQUENCY', 'SET_EDITOR_AMPLITUDE',
  'SET_EDITOR_ADSR', 'APPLY_EDITOR_PRESET', 'RESET_EDITOR',
])

const COMPOSER_FIELDS = ['clips', 'numMeasures', 'bpm', 'selectedClipIds', 'tracks']
const DESIGNER_FIELDS = ['patches', 'soundFolders', 'editor']

function pickFields(state, fields) {
  const out = {}
  for (const k of fields) out[k] = state[k]
  return out
}

// Vérifie qu'aucun clip ne référencerait un patch disparu après restauration.
function findOrphanReferences(restoredPatches, currentClips) {
  const ids = new Set(restoredPatches.map((p) => p.id))
  const orphans = currentClips.filter((c) => !ids.has(c.patchId))
  if (orphans.length === 0) return null
  const orphanPatchIds = [...new Set(orphans.map((c) => c.patchId))]
  return { clipCount: orphans.length, patchIds: orphanPatchIds }
}

// Après un undo/redo Composer, si `lastAnchorClipId` pointe vers un clip
// qui n'existe plus dans le snapshot restauré ET que la sélection restaurée
// est vide, on cherche un fallback : le clip avec la fin la plus tardive
// sur la même piste que l'ancien anchor. Quand la sélection est non vide,
// `syncAnchorWithSelection` prend le dessus (voir plus bas).
function resolveAnchorAfterRestore(prevAnchorClip, restoredClips) {
  if (!prevAnchorClip) return null
  const sameTrack = restoredClips.filter((c) => c.trackId === prevAnchorClip.trackId)
  if (sameTrack.length === 0) return null
  let best = sameTrack[0]
  let bestEnd = (best.measure - 1) * BEATS_PER_MEASURE + best.beat + best.duration
  for (const c of sameTrack) {
    const end = (c.measure - 1) * BEATS_PER_MEASURE + c.beat + c.duration
    if (end > bestEnd) { best = c; bestEnd = end }
  }
  return best.id
}

// Invariant : quand `selectedClipIds` est non vide, `lastAnchorClipId` doit
// pointer vers le dernier clip sélectionné. Toutes les actions métier
// respectent déjà cette règle ; la sync ici rattrape les cas où elle peut
// être brisée (typiquement après un UNDO/REDO qui restaure une sélection
// distincte de l'anchor volatile). Appliquée en sortie de `withUndo` sur
// chaque action : idempotente (renvoie state tel quel si déjà aligné).
function syncAnchorWithSelection(state) {
  const sel = state.selectedClipIds
  if (!sel || sel.length === 0) return state
  const last = sel[sel.length - 1]
  if (state.lastAnchorClipId === last) return state
  return { ...state, lastAnchorClipId: last }
}

function checkClipReferences(composerSnapshot, currentPatches) {
  const currentIds = new Set(currentPatches.map((p) => p.id))
  const orphanClips = composerSnapshot.clips.filter(
    (c) => !currentIds.has(c.patchId),
  )
  if (orphanClips.length === 0) return null
  const missingPatchIds = [...new Set(orphanClips.map((c) => c.patchId))]
  return { type: 'missing-patches', patchIds: missingPatchIds, clipCount: orphanClips.length }
}

function makeOrphanNotification(orphans) {
  const n = orphans.clipCount
  const plural = n > 1 ? 's' : ''
  return {
    message: `Action impossible : ce patch est utilisé par ${n} clip${plural}. Supprimez-${n > 1 ? 'les' : 'le'} d'abord depuis l'onglet Composition.`,
    type: 'error',
    timestamp: Date.now(),
  }
}

function makeMissingPatchNotification(conflict, patches) {
  const count = conflict.patchIds.length
  if (count === 1) {
    const patch = patches.find((p) => p.id === conflict.patchIds[0])
    const name = patch ? patch.name : conflict.patchIds[0]
    return {
      message: `Impossible : le patch "${name}" a été supprimé. Restaurez-le d'abord depuis l'onglet Designer.`,
      type: 'error',
      timestamp: Date.now(),
    }
  }
  return {
    message: `Impossible : ${count} patch(es) ont été supprimés. Restaurez-les d'abord depuis l'onglet Designer.`,
    type: 'error',
    timestamp: Date.now(),
  }
}

export function withUndo(baseReducer) {
  return function wrapped(state, action) {
    return syncAnchorWithSelection(applyUndoAware(baseReducer, state, action))
  }
}

function applyUndoAware(baseReducer, state, action) {
    if (action.type === 'UNDO_COMPOSER') {
      const { past, future } = state.history.composer
      if (past.length === 0) return state
      const previous = past[past.length - 1]
      const conflict = checkClipReferences(previous, state.patches)
      if (conflict) {
        return {
          ...state,
          activeTab: 'designer',
          notification: makeMissingPatchNotification(conflict, state.patches),
        }
      }
      const current = pickFields(state, COMPOSER_FIELDS)
      // L'anchor peut pointer vers un clip qui vient de disparaître (ex :
      // le clip créé par le placement contigu qu'on undo). On essaie de
      // garder l'interaction fluide en retombant sur le clip le plus à
      // droite de la même piste.
      const prevAnchorClip = state.lastAnchorClipId
        ? state.clips.find((c) => c.id === state.lastAnchorClipId)
        : null
      const anchorStillValid = previous.clips.some((c) => c.id === state.lastAnchorClipId)
      const nextAnchor = anchorStillValid
        ? state.lastAnchorClipId
        : resolveAnchorAfterRestore(prevAnchorClip, previous.clips)
      return {
        ...state,
        ...previous,
        lastAnchorClipId: nextAnchor,
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
      const conflict = checkClipReferences(next, state.patches)
      if (conflict) {
        return {
          ...state,
          activeTab: 'designer',
          notification: makeMissingPatchNotification(conflict, state.patches),
        }
      }
      const current = pickFields(state, COMPOSER_FIELDS)
      const prevAnchorClip = state.lastAnchorClipId
        ? state.clips.find((c) => c.id === state.lastAnchorClipId)
        : null
      const anchorStillValid = next.clips.some((c) => c.id === state.lastAnchorClipId)
      const nextAnchor = anchorStillValid
        ? state.lastAnchorClipId
        : resolveAnchorAfterRestore(prevAnchorClip, next.clips)
      return {
        ...state,
        ...next,
        lastAnchorClipId: nextAnchor,
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
      const conflict = findOrphanReferences(previous.patches, state.clips)
      if (conflict) {
        const orphanClipIds = state.clips
          .filter((c) => conflict.patchIds.includes(c.patchId))
          .map((c) => c.id)
        return {
          ...state,
          selectedClipIds: orphanClipIds,
          activeTab: 'composer',
          notification: makeOrphanNotification(conflict),
        }
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
      const conflict = findOrphanReferences(next.patches, state.clips)
      if (conflict) {
        const orphanClipIds = state.clips
          .filter((c) => conflict.patchIds.includes(c.patchId))
          .map((c) => c.id)
        return {
          ...state,
          selectedClipIds: orphanClipIds,
          activeTab: 'composer',
          notification: makeOrphanNotification(conflict),
        }
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

    const newState = baseReducer(state, action)
    if (newState === state) return newState

    const isComposer = COMPOSER_UNDOABLE.has(action.type)
    const isDesigner = DESIGNER_UNDOABLE.has(action.type)
    if (isComposer || isDesigner) {
      let hist = newState.history
      if (isComposer) {
        const snap = pickFields(state, COMPOSER_FIELDS)
        hist = {
          ...hist,
          composer: {
            past: [...hist.composer.past, snap].slice(-HISTORY_DEPTH),
            future: [],
          },
        }
      }
      if (isDesigner) {
        const snap = pickFields(state, DESIGNER_FIELDS)
        hist = {
          ...hist,
          designer: {
            past: [...hist.designer.past, snap].slice(-HISTORY_DEPTH),
            future: [],
          },
        }
      }
      return { ...newState, history: hist }
    }

    return newState
}
