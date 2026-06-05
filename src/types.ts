// Types du modèle Synth App — état ACTUEL, tel quel (iter-M phase-r.1).
//
// Point d'entrée unique du typage métier : `Patch`, `Clip`, `Track`,
// `TuningSystem`, `AppState` et l'union discriminée `Action` du reducer.
// Modèle de timbre unifié (M rattrapage) : une seule courbe `canonical`
// (600 points, LA vérité audio), trois lentilles qui la regardent/éditent
// (Forme d'onde / Harmoniques / Spectro). Plus de `mode` discriminé, plus
// de conversion destructive.
//
// Discipline : `unknown` plutôt que `any` pour les porteurs opaques
// (clipboards de mesure, flash), `strict: false` global conservé.

// === Systèmes de tempérament ===

// Identifiants stables des entrées du registre `TUNING_SYSTEMS`
// (src/lib/tuningSystems.ts). Sert de type pour `clip.tuningSystem`,
// `editor.testTuningSystem`, `patch.defaultTuningSystem`.
export type TuningSystemId =
  | '12-TET'
  | 'pythagorean-12'
  | 'just-major-c'
  | 'meantone-quarter-comma'
  | 'werckmeister-iii'
  | '24-tet-equal'
  | '24-tet-cairo-1932'
  | 'slendro'
  | 'pelog'
  | 'shrutis-bhatkhande'
  | 'shrutis-sarngadeva'
  | 'x-edo'
  | 'free'

// Type de rendu visuel du clavier (dispatch dans PianoKeyboard).
export type TuningLayout =
  | 'piano-12'
  | 'grid-24'
  | 'grid-x-edo'
  | 'grid-22-bhatkhande'
  | 'grid-22-sarngadeva'
  | 'free'

// Champs polymorphes statique-vs-factory(xEdoN) du registre. Les helpers
// getNotesPerOctave / getNoteNames / getKeyboardMap résolvent ce
// polymorphisme.
export type NotesPerOctave = number | null | ((xEdoN: number) => number)
export type NoteNames = readonly string[] | null | ((xEdoN: number) => string[])
export type FreqFn =
  | ((noteIndex: number, octave: number, a4Ref: number, xEdoN?: number) => number)
  | null
export type KeyboardMap =
  | Record<string, number>
  | null
  | ((xEdoN: number) => Record<string, number>)

// Une entrée du registre des tempéraments.
export interface TuningSystem {
  id: TuningSystemId
  label: string
  shortLabel: string
  notesPerOctave: NotesPerOctave
  noteNames: NoteNames
  // null = système « libre » qui lit `clip.frequency` directement.
  freq: FreqFn
  layout: TuningLayout
  keyboardMap: KeyboardMap
}

export interface TuningCategory {
  id: string
  label: string
  shortLabel: string
  systems: TuningSystemId[]
}

// === Enveloppe ADSR (AHDSR) ===

export interface AdsrEnvelope {
  attack: number
  hold: number
  decay: number
  sustain: number
  release: number
}

// === Modèle métier ===

// Hauteur portée par un clip : système-based (noteIndex/octave non nuls) OU
// libre (frequency non null). L'invariant de cohérence est garanti par le
// reducer (UPDATE_CLIPS_PITCH, etc.), pas par le type.
export interface ClipNote {
  tuningSystem: TuningSystemId
  noteIndex: number | null
  octave: number | null
  frequency: number | null
}

// Données d'un clip hors identité (payloads de duplicate/paste/split/…).
export interface ClipData extends ClipNote {
  trackId: string
  patchId: string
  measure: number
  beat: number
  duration: number
}

export interface Clip extends ClipData {
  id: string
}

export interface Track {
  id: string
  name: string
  color: string
  muted: boolean
  solo: boolean
  volume: number
  height: number
}

// Lentille active de l'éditeur (M rattrapage). Remplace l'ancien `mode`
// discriminant : ce n'est plus une propriété du timbre mais un état d'UI
// volatile (quelle vue regarde l'utilisateur). Voir `Editor.currentLens`.
export type WaveformLens = 'free' | 'spline'

// iter-M phase-3 : variante d'interpolation de la courbe spline.
export type SplineInterpolation = 'soft' | 'hard'

// Ancre du mode spline. x ∈ [0..600) (convention canvas `points`), y ∈ [-1..1].
// L'ordre cyclique des x est maintenu par le reducer (MOVE/ADD_SPLINE_ANCHOR).
export interface SplineAnchor {
  x: number
  y: number
}

// Un patch = un timbre (forme d'onde + enveloppe + amplitude), sans hauteur :
// la hauteur est portée par chaque clip (refonte iter-E). Modèle unifié
// (M rattrapage) : une seule courbe `canonical` est la vérité audio ; `cap`
// borne les harmoniques reconstruites ; `anchors`/`interpolation`/`residual`
// portent la lentille spline (le résidu préserve les détails fins du tracé
// libre entre deux éditions d'ancres). Plus de `mode` discriminé.
export interface Patch extends AdsrEnvelope {
  id: string
  name: string
  color: string
  preset: string | null
  defaultTuningSystem: TuningSystemId
  folderId: string | null
  updatedAt: number
  amplitude: number
  // 600 points dans [-1, 1] — LA vérité audio (remplace `points`).
  canonical: number[]
  // Plafond d'harmoniques [1, 256] (remplace `definition` ET `N`).
  cap: number
  // Lentille spline : ancres (4..32) + interpolation + résidu (600 points :
  // canonical − spline(anchors), peut sortir de [-1, 1]).
  anchors: SplineAnchor[]
  interpolation: SplineInterpolation
  residual: number[]
}

// Données d'un patch transmises à SAVE_PATCH / UPDATE_PATCH (sans id/color).
// Aligné sur le shape unifié : plus de `mode`/`definition`/`N`/`amplitudes`/
// `points`.
export interface PatchData {
  name?: string
  canonical: number[]
  cap: number
  anchors: SplineAnchor[]
  interpolation: SplineInterpolation
  residual: number[]
  amplitude: number
  preset: string | null
  attack?: number
  hold?: number
  decay?: number
  sustain?: number
  release?: number
  defaultTuningSystem?: TuningSystemId
}

export interface SoundFolder {
  id: string
  name: string
  parentId: string | null
}

// État de l'éditeur de patch (Designer). Les champs `test*` / `visualCue*`
// pilotent la preview clavier et ne sont PAS copiés dans le patch sauvegardé.
export interface Editor extends AdsrEnvelope {
  // Modèle unifié (M rattrapage) : `canonical` est la vérité audio éditée,
  // `cap` borne les harmoniques, `anchors`/`interpolation`/`residual` portent
  // la lentille spline. `currentLens` est la lentille active (état d'UI
  // volatile : non persisté en localStorage, non écrit dans `.osa`).
  canonical: number[]
  cap: number
  anchors: SplineAnchor[]
  interpolation: SplineInterpolation
  residual: number[]
  currentLens: WaveformLens
  // M.r.4 — « la canonical est-elle à phase canonique sinus pur ? » Propriété de
  // l'histoire de l'éditeur (le round-trip FFT n'étant pas idempotent, cf.
  // audio.js), positionnée par chaque action qui écrit canonical. Volatile :
  // non persisté dans Patch/PatchData. Pilote bouton Normaliser, courbe grise,
  // dialog edit-bars.
  canonicalNormalized: boolean
  testTuningSystem: TuningSystemId
  testNoteIndex: number
  testOctave: number
  testFrequency: number
  amplitude: number
  preset: string | null
  visualCuePattern: string
  visualCueTonic: number
}

// === Sous-états transients / UI ===

export type BibItemType = 'patch' | 'folder'
export interface BibItem {
  type: BibItemType
  id: string
}

export interface BibClipboard {
  mode: 'copy' | 'cut'
  items: BibItem[]
}

export interface AppNotification {
  message: string
  type: string
  timestamp: number
}

export interface TourSnapshot {
  activeTab: TabId
  designerSidebarCollapsed: boolean
  docSidebarCollapsed: boolean
  composerBankCollapsed: boolean
  composerAsideCollapsed: boolean
}

export interface TourState {
  active: boolean
  tabId: TabId | null
  stepIndex: number
  snapshot: TourSnapshot | null
}

export interface DocState {
  currentArticleId: string | null
  scrollPositions: Record<string, number>
}

export interface BlockedPatch {
  id: string
  name: string
  usageCount: number
}
export interface PendingDeleteWarning {
  blockedPatches: BlockedPatch[]
  freedCount: number
}

// Snapshots undo : sous-ensembles de l'AppState (cf. pickFields). Typés
// comme Partial<AppState> — la sélection des champs vit dans le reducer.
export type Snapshot = Partial<AppState>
export interface HistoryStack {
  past: Snapshot[]
  future: Snapshot[]
}
export interface History {
  designer: HistoryStack
  composer: HistoryStack
  library: HistoryStack
}

export type TabId = 'library' | 'composer' | 'designer' | 'documentation'
// iter-O phase-5a : identifiants des 5 modules réductibles du Designer.
export type DesignerModuleId = 'canvas' | 'harmonics' | 'spectrogram' | 'params' | 'adsr'
// iter-O phase-5a : état replié (bande) de chacun des 5 modules. Préférence UI
// persistée (localStorage), non-undoable — comme designerColumnWidths.
export interface DesignerCollapsed {
  canvas: boolean
  harmonics: boolean
  spectrogram: boolean
  params: boolean
  adsr: boolean
}
export type Theme = 'dark' | 'light'
export type DurationMode = 'solfège' | 'fraction'
export type AdsrView = 'graph' | 'sliders'
export type SpectrogramMode = 'static' | 'live'
export type BibHierarchyMode = 'nav' | 'tree'
export type BibDisplayMode = 'list' | 'details' | 'tiles'

// === État global (useReducer dans App.jsx) ===

export interface AppState {
  // Composer (undoable)
  clips: Clip[]
  numMeasures: number
  bpm: number
  tracks: Track[]
  a4Ref: number
  xEdoN: number

  // Designer (undoable)
  patches: Patch[]
  soundFolders: SoundFolder[]
  editor: Editor

  // Compteurs d'ID (hors historique undo)
  patchCounter: number
  clipCounter: number
  folderCounter: number
  trackCounter: number

  // Presse-papiers (transients)
  clipboard: ClipData[] | null
  measureClipboard: unknown
  bibClipboard: BibClipboard | null

  selectedTrackId: string | null
  shortcutsOverlayOpen: boolean
  tour: TourState

  zoomH: number
  activeTab: TabId
  selectedClipIds: string[]
  lastAnchorClipId: string | null
  currentPatchId: string | null

  spectrogramVisible: boolean
  spectrogramDbScale: boolean
  spectrogramPeakHold: boolean
  spectrogramMode: SpectrogramMode

  bibHierarchyMode: BibHierarchyMode
  bibDisplayMode: BibDisplayMode
  bibCurrentFolderId: string | null
  bibCollapsedFolders: string[]
  bibPopupWidth: number
  recentPatchIds: string[]

  theme: Theme
  defaultClipDuration: number
  durationMode: DurationMode
  adsrView: AdsrView

  composerBankWidth: number
  composerAsideWidth: number
  composerBankCollapsed: boolean
  composerAsideCollapsed: boolean
  designerSidebarWidth: number
  designerSidebarCollapsed: boolean
  // iter-M phase-2 : proportions persistées des 3 colonnes du Designer.
  designerColumnWidths: number[]
  // iter-M phase-2-as : toggle auto-sizing (essai). OFF par défaut. Quand ON,
  // les proportions deviennent contextuelles au focus — écrites dans
  // designerColumnWidths (pas de nouvel état canonique).
  autoSizing: boolean
  // iter-O phase-5a : état replié (bande verticale fine) de chacun des 5
  // modules du Designer. Préférence UI persistée, non-undoable.
  designerCollapsed: DesignerCollapsed
  // iter-O phase-5b : module maximisé (remplit la zone Designer, les autres
  // cachés en CSS), ou null. Un seul à la fois. Persisté, non-undoable.
  maximized: DesignerModuleId | null
  docSidebarWidth: number
  docSidebarCollapsed: boolean
  doc: DocState

  composerFlash: unknown
  bibSelectedIds: BibItem[]
  bibSelectionAnchor: BibItem | null
  pendingDeleteWarning: PendingDeleteWarning | null

  history: History
  notification: AppNotification | null
}

// === Actions du reducer (union discriminée) ===

// Métadonnées optionnelles portées par n'importe quelle action. `skipUndo`
// neutralise l'historisation (et déclenche le « rewrite past » additif pour
// SAVE_PATCH / CREATE_FOLDER).
export interface ActionMeta {
  skipUndo?: boolean
}

// Mouvement d'un clip (MOVE_CLIPS).
export interface ClipMove {
  id: string
  measure: number
  beat: number
  trackId?: string
}
// Redimensionnement d'un clip (RESIZE_CLIPS).
export interface ClipResize {
  id: string
  measure: number
  beat: number
  duration: number
}
// Changement de hauteur ciblé (UPDATE_CLIPS_PITCH) : champs partiels.
export interface ClipPitchUpdate {
  id: string
  tuningSystem?: TuningSystemId
  noteIndex?: number | null
  octave?: number | null
  frequency?: number | null
}
// Part de clip recréée lors d'une opération sur mesure (split/insert/cut).
export interface ClipPart extends ClipData {
  originalId?: string
}

// Corps des actions (sans le `meta`, ajouté par intersection plus bas).
export type ActionBody =
  // ----- Composer (undoable) -----
  | { type: 'ADD_CLIP'; payload: {
      patchId: string
      measure: number
      beat: number
      duration?: number
      trackId?: string
      tuningSystem: TuningSystemId
      noteIndex?: number | null
      octave?: number | null
      frequency?: number | null
      extraMeasures?: number
    } }
  | { type: 'REMOVE_CLIP'; payload: { clipId: string } }
  | { type: 'UPDATE_CLIP'; payload: { clipId: string; updates: Partial<Clip> } }
  | { type: 'MOVE_CLIPS'; payload: ClipMove[] }
  | { type: 'RESIZE_CLIPS'; payload: ClipResize[] }
  | { type: 'UPDATE_CLIPS_PATCH'; payload: { clipIds: string[]; patchId: string } }
  | { type: 'UPDATE_CLIPS_DURATION'; payload: Array<{ id: string; duration: number }> }
  | { type: 'UPDATE_CLIPS_PITCH'; payload: ClipPitchUpdate[] }
  | { type: 'DUPLICATE_CLIPS'; payload: ClipData[] }
  | { type: 'SPLIT_CLIPS'; payload: { clipIds: string[]; divisor: number } }
  | { type: 'MERGE_CLIPS'; payload: { selectedIds: string[] } }
  | { type: 'PASTE_CLIPS'; payload: { clipDatas: ClipData[]; extraMeasures?: number } }
  | { type: 'DELETE_SELECTED_CLIPS' }
  | { type: 'CLEAR_TIMELINE' }
  | { type: 'SET_BPM'; payload: number }
  | { type: 'SET_A4_REF'; payload: number }
  | { type: 'ADD_MEASURES'; payload: number }
  | { type: 'REMOVE_LAST_MEASURE'; payload?: {
      toDeleteIds?: string[]
      toTruncate?: Array<{ id: string; newDuration: number }>
    } }
  | { type: 'DELETE_MEASURE'; payload: {
      measure: number
      deletedIds: string[]
      truncated: Array<{ id: string; newDuration: number }>
      splitParts: ClipPart[]
    } }
  | { type: 'INSERT_MEASURES_AT'; payload: {
      beatPosition: number
      count: number
      splitParts: ClipPart[]
    } }
  | { type: 'SET_MEASURE_CLIPBOARD'; payload: unknown }
  | { type: 'CUT_MEASURE'; payload: {
      measure: number
      deletedIds: string[]
      truncated: Array<{ id: string; newDuration: number }>
      splitParts: ClipPart[]
      clipboardData: unknown
    } }
  | { type: 'PASTE_MEASURES'; payload: {
      beatPosition: number
      count: number
      splitParts: ClipPart[]
      pastedClips: ClipData[]
    } }
  | { type: 'CREATE_TRACK' }
  | { type: 'RENAME_TRACK'; payload: { trackId: string; name: string } }
  | { type: 'UPDATE_TRACK'; payload: { trackId: string; updates: Partial<Track> } }
  | { type: 'REORDER_TRACKS'; payload: string[] }
  | { type: 'DELETE_TRACK'; payload: { trackId: string } }
  | { type: 'SET_TRACK_HEIGHT'; payload: number }

  // ----- Designer (undoable) -----
  | { type: 'SAVE_PATCH'; payload: { patchData: PatchData; folderId?: string | null } }
  | { type: 'UPDATE_PATCH'; payload: { patchId: string; patchData: PatchData } }
  | { type: 'DELETE_PATCH'; payload: { patchId: string } }
  | { type: 'IMPORT_LIBRARY'
      newPatches: Patch[]
      newFolders: SoundFolder[]
      patchCounterAfter: number
      folderCounterAfter: number }
  | { type: 'RENAME_PATCH'; payload: { patchId: string; name: string } }
  | { type: 'CREATE_FOLDER'; payload: { name: string; parentId?: string | null } }
  | { type: 'RENAME_FOLDER'; payload: { folderId: string; name: string } }
  | { type: 'DELETE_FOLDER'; payload: { folderId: string } }
  | { type: 'MOVE_PATCH_TO_FOLDER'; payload: { patchId: string; folderId: string | null } }
  | { type: 'MOVE_FOLDER'; payload: { folderId: string; parentId: string | null } }
  | { type: 'SET_EDITOR_CANONICAL'; payload: number[] }
  | { type: 'SET_EDITOR_TEST_NOTE'; payload: number }
  | { type: 'SET_EDITOR_TEST_OCTAVE'; payload: number }
  | { type: 'SET_EDITOR_TEST_TUNING_SYSTEM'; payload: TuningSystemId }
  | { type: 'SET_X_EDO_N'; payload: number }
  | { type: 'SET_EDITOR_VISUAL_CUE_PATTERN'; payload: string }
  | { type: 'SET_EDITOR_VISUAL_CUE_TONIC'; payload: number }
  | { type: 'SET_EDITOR_TEST_FREQUENCY'; payload: number }
  | { type: 'SET_EDITOR_AMPLITUDE'; payload: number }
  // Modèle unifié (M rattrapage) : `cap` borne les harmoniques (remplace
  // SET_EDITOR_DEFINITION + SET_EDITOR_N). `currentLens` est la lentille
  // active (volatile, non undoable).
  | { type: 'SET_EDITOR_CAP'; payload: number }
  | { type: 'SET_EDITOR_CURRENT_LENS'; payload: WaveformLens }
  // Édition d'une barre (lentille Harmoniques) : met à jour la magnitude
  // `index` parmi les `cap` premières, puis régénère `canonical` par iDFT à
  // phase canonique (M.r.1 : écrase la phase, normalisation en M.r.4).
  | { type: 'SET_EDITOR_HARMONIC_AMPLITUDE'; payload: { index: number; value: number } }
  // iter-M phase-4 : charge un preset de timbre (domaine harmonique).
  // amplitude/ADSR repartent aux défauts.
  | { type: 'LOAD_PRESET'; payload: { canonical: number[]; cap: number; anchorCount: number; canonicalNormalized: boolean; preset: string | null } }
  // iter-M phase-3 : édition de la lentille spline (toutes undoable). MOVE est
  // dispatchée une fois au commit du drag (draft local côté éditeur). La
  // nouvelle canonical = spline(anchors) + residual, clampée [-1, 1].
  | { type: 'MOVE_SPLINE_ANCHOR'; payload: { index: number; x: number; y: number } }
  | { type: 'ADD_SPLINE_ANCHOR'; payload: { x: number; y: number } }
  | { type: 'REMOVE_SPLINE_ANCHOR'; payload: { index: number } }
  | { type: 'SET_SPLINE_INTERPOLATION'; payload: SplineInterpolation }
  | { type: 'SET_EDITOR_ADSR'; payload: Partial<AdsrEnvelope> }
  | { type: 'SET_EDITOR_ADSR_AND_AMP'; payload: { adsr?: Partial<AdsrEnvelope>; amplitude?: number } }
  | { type: 'RESET_EDITOR' }
  // iter-M phase-r.2.2 : reset du timbre seul (canonical + cap + lentille
  // spline). Préserve ADSR / amplitude / test* / currentLens / currentPatchId.
  | { type: 'RESET_EDITOR_WAVEFORM' }
  // iter-M phase-r.2.3 : iDFT à phase canonique sur les `cap` premières
  // amplitudes — régularise la phase. Sans détection d'état (M.r.4).
  | { type: 'NORMALIZE_EDITOR_CANONICAL' }
  // iter-N phase-4.1 : lissage passe-bas Gaussien du tracé (indépendant des ancres).
  | { type: 'SMOOTH_EDITOR_CANONICAL' }
  // iter-N phase-4.2 : tend vers la spline des ancres (lerp α≈0.5, dépend des ancres).
  | { type: 'TEND_TOWARD_SPLINE' }
  // iter-M phase-r.2.4 : ré-équirépartit `count` ancres sur la canonical
  // courante (re-fit de la lentille spline ; canonical inchangée).
  | { type: 'SET_EDITOR_ANCHOR_COUNT'; payload: { count: number } }
  | { type: 'HYDRATE_EDITOR_FROM_PATCH'; payload: Patch | null }

  // ----- Non-undoable -----
  | { type: 'SET_CLIPBOARD'; payload: ClipData[] | null }
  | { type: 'SET_ZOOM_H'; payload: number | ((zoomH: number) => number) }
  | { type: 'SET_ACTIVE_TAB'; payload: TabId }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SELECT_CLIPS'; payload: string[] }
  | { type: 'SET_SHORTCUTS_OVERLAY'; payload: boolean }
  | { type: 'START_TOUR'; payload: TabId }
  | { type: 'TOUR_GOTO'; payload: number }
  | { type: 'TOUR_NEXT' }
  | { type: 'TOUR_PREV' }
  | { type: 'TOUR_CHAIN'; payload: TabId }
  | { type: 'END_TOUR' }
  | { type: 'END_TOUR_NO_RESTORE' }
  | { type: 'SET_SELECTED_TRACK_ID'; payload: string | null }
  | { type: 'SET_CURRENT_PATCH_ID'; payload: string | null }
  | { type: 'SET_SPECTROGRAM_VISIBLE'; payload: boolean }
  | { type: 'SET_SPECTROGRAM_DB_SCALE'; payload: boolean }
  | { type: 'SET_SPECTROGRAM_PEAK_HOLD'; payload: boolean }
  | { type: 'SET_SPECTROGRAM_MODE'; payload: SpectrogramMode }
  | { type: 'SET_BIB_HIERARCHY_MODE'; payload: BibHierarchyMode }
  | { type: 'TOGGLE_BIB_FOLDER_COLLAPSED'; payload: { folderId: string } }
  | { type: 'SET_BIB_COLLAPSED_FOLDERS'; payload: string[] }
  | { type: 'SET_BIB_DISPLAY_MODE'; payload: BibDisplayMode }
  | { type: 'SET_BIB_CURRENT_FOLDER'; payload: string | null }
  | { type: 'SELECT_BIB_ITEMS'; payload: { items: BibItem[]; mode: 'set' | 'add' | 'toggle' | 'range' } }
  | { type: 'CLEAR_BIB_SELECTION' }
  | { type: 'OPEN_IN_LIBRARY'; payload: { type: BibItemType; id: string } }
  | { type: 'GO_TO_COMPOSER_WITH_CLIPS'; payload: { patchIds: string[] } }
  | { type: 'SET_BIB_POPUP_WIDTH'; payload: number }
  | { type: 'SET_DEFAULT_CLIP_DURATION'; payload: number }
  | { type: 'SET_DURATION_MODE'; payload: DurationMode }
  | { type: 'SET_ADSR_VIEW'; payload: AdsrView }
  | { type: 'SET_COMPOSER_SIDEBAR_WIDTH'; payload: { side: 'bank' | 'aside'; width: number } }
  | { type: 'SET_COMPOSER_SIDEBAR_COLLAPSED'; payload: { side: 'bank' | 'aside'; collapsed: boolean } }
  | { type: 'SET_DESIGNER_SIDEBAR_WIDTH'; payload: number }
  | { type: 'SET_DESIGNER_SIDEBAR_COLLAPSED'; payload: boolean }
  // iter-M phase-2 : proportions des 3 colonnes du Designer (Forme d'onde /
  // Harmoniques / Spectro). Tableau de 3 fractions sommant à 1.
  | { type: 'SET_DESIGNER_COLUMN_WIDTHS'; payload: number[] }
  // iter-M phase-2-as : toggle auto-sizing.
  | { type: 'SET_AUTO_SIZING'; payload: boolean }
  // iter-O phase-5a : bascule l'état replié d'un module du Designer (bande).
  | { type: 'TOGGLE_DESIGNER_MODULE_COLLAPSED'; payload: DesignerModuleId }
  // iter-O phase-5b : module maximisé (id) ou null (restauré).
  | { type: 'SET_DESIGNER_MAXIMIZED'; payload: DesignerModuleId | null }
  | { type: 'SET_CURRENT_ARTICLE'; payload: string | null }
  | { type: 'SET_ARTICLE_SCROLL'; payload: { articleId: string; scrollTop: number } }
  | { type: 'TOGGLE_DOC_SIDEBAR' }
  | { type: 'SET_DOC_SIDEBAR_WIDTH'; payload: number }
  | { type: 'SET_COMPOSER_FLASH'; payload: unknown }
  | { type: 'SET_NOTIFICATION'; payload: AppNotification | null }

  // ----- Bibliothèque clipboard -----
  | { type: 'COPY_BIB_ITEMS'; payload: { items: BibItem[] } }
  | { type: 'CUT_BIB_ITEMS'; payload: { items: BibItem[] } }
  | { type: 'CLEAR_BIB_CLIPBOARD' }
  | { type: 'PASTE_BIB_CLIPBOARD'; payload: { targetFolderId?: string | null } }
  | { type: 'MOVE_BIB_ITEMS'; payload: { items: BibItem[]; targetFolderId?: string | null } }
  | { type: 'DELETE_BIB_ITEMS'; payload: { items: BibItem[] } }
  | { type: 'ADD_PATCH_TO_RECENTS'; payload: { patchId: string } }
  | { type: 'CLEAR_PENDING_DELETE_WARNING' }

  // ----- Undo / redo (gérés hors switch, dans applyUndoAware) -----
  | { type: 'UNDO_COMPOSER' }
  | { type: 'REDO_COMPOSER' }
  | { type: 'UNDO_DESIGNER' }
  | { type: 'REDO_DESIGNER' }
  | { type: 'UNDO_LIBRARY' }
  | { type: 'REDO_LIBRARY' }

// Une action = un corps discriminé + un `meta` optionnel. On distribue
// l'ajout de `meta` sur CHAQUE membre de l'union (conditionnel distributif)
// plutôt qu'une intersection globale `ActionBody & { meta }` : sinon le
// narrowing par `switch (action.type)` peut retomber sur `never`.
type WithMeta<T> = T extends unknown ? T & { meta?: ActionMeta } : never
export type Action = WithMeta<ActionBody>
