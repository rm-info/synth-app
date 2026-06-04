import { SOUND_COLORS, HARMONIC_COUNT, harmonicsToPoints, canonicalToBars } from './audio'
import { splineToPoints, fitAnchorsToCurve, warpResidualForAnchorMove } from './lib/spline'
import { wouldCreateCycle, duplicateItemsToFolder } from './lib/bibTransfer.js'
import {
  DEFAULT_A4,
  DEFAULT_X_EDO_N,
  X_EDO_MIN,
  X_EDO_MAX,
  getTuningSystem,
  getNotesPerOctave,
  frequencyToNearestIn,
  TUNING_SYSTEMS,
} from './lib/tuningSystems'
import { VISUAL_CUE_PATTERNS } from './lib/visualCues'

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
// iter-K phase-2.f11 : aligné sur DESIGNER_SIDEBAR_MIN_WIDTH (200) pour
// cohérence visuelle entre les deux onglets.
export const COMPOSER_SIDEBAR_MIN_WIDTH = 200
// Espace horizontal réservé au layout Composer hors colonnes (2×padding + 2×gap
// de .composer-layout). Utilisé pour calculer le max dynamique des sidebars.
export const COMPOSER_LAYOUT_CHROME = 48
// Largeur minimale laissée à la zone centrale quand on élargit une sidebar.
export const COMPOSER_MAIN_MIN_WIDTH = 200
// Largeur d'une sidebar en mode collapsed : juste assez pour le bouton
// de restauration. Utilisée comme override de la CSS var depuis App.
// iter-K phase-2.f11 : passe de 32 → 36 pour loger des icônes 30×30
// (cohérent avec DESIGNER_SIDEBAR_COLLAPSED_WIDTH).
export const COMPOSER_SIDEBAR_COLLAPSED_WIDTH = 36

// Sidebar gauche du Designer (iter G phase 1.2). Min calibré sur le
// minimum lisible de la Bibliothèque + boutons Actions empilés ; défaut
// 220 px = valeur historique. Collapsed = 36 px pour loger des icônes
// 28 px + padding.
export const DESIGNER_SIDEBAR_MIN_WIDTH = 200
export const DESIGNER_SIDEBAR_DEFAULT_WIDTH = 220
export const DESIGNER_SIDEBAR_COLLAPSED_WIDTH = 36

// iter-L phase-2.1 : sidebar TOC de l'onglet Documentation. Défaut plus
// large que les autres sidebars (240) pour loger des titres d'articles
// confortablement. Min/collapsed alignés sur le pattern Designer.
export const DOC_SIDEBAR_MIN_WIDTH = 180
export const DOC_SIDEBAR_DEFAULT_WIDTH = 240
export const DOC_SIDEBAR_COLLAPSED_WIDTH = 36
// Clé sessionStorage pour la position de lecture (article courant + scroll
// par article). Volontairement scopée à la session navigateur : on retombe
// sur l'article par défaut à chaque ouverture.
export const DOC_SESSION_KEY = 'synth-app-doc-session'
// Article ouvert au boot quand aucune session sauvegardée. 'about' = "À
// propos" — point d'entrée naturel.
export const DEFAULT_DOC_ARTICLE_ID = 'about'

// Enveloppe AHDSR (F.3.12) : `hold` est un plateau au peak inséré entre
// l'attack et le decay (utile pour percussifs avec punch). Défaut 0 ms = pas
// de plateau, comportement strictement identique à un ADSR classique.
export const DEFAULT_ADSR = { attack: 10, hold: 0, decay: 100, sustain: 0.7, release: 200 }

// Modèle unifié (M rattrapage) : `cap` ∈ [1, 256] est le plafond
// d'harmoniques unique (remplace `definition` du tracé ET `N` des barres).
// `cap = 256` : pleine bande. `cap = 1` : fondamentale seule (cas dégénéré
// valide). HARMONIC_COUNT (= 256) vient d'audio.js.
export const CAP_MIN = 1
export const CAP_MAX = HARMONIC_COUNT
export const DEFAULT_CAP = HARMONIC_COUNT

// BRIDGE_DEFAULT_N : défaut du dialog de conversion draw→harmonic (dialog
// supprimé en M.r.1.4 ; constante conservée jusque-là).
export const BRIDGE_DEFAULT_N = 24

// Clamp entier de `cap` sur [CAP_MIN, CAP_MAX]. Intègre les anciens
// clampDefinition + clampHarmonicN (une seule borne désormais).
function clampCap(raw) {
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n)) return DEFAULT_CAP
  return Math.max(CAP_MIN, Math.min(CAP_MAX, n))
}

// iter-M phase-3 : bornes du nombre d'ancres du mode spline.
export const SPLINE_ANCHOR_MIN = 4
export const SPLINE_ANCHOR_MAX = 32
// Défaut suggéré dans le dialog de conversion vers spline.
export const DEFAULT_SPLINE_ANCHOR_COUNT = 8
export const DEFAULT_SPLINE_INTERPOLATION = 'soft'
// Écart minimal (en x) entre deux ancres consécutives. Empêche les segments de
// largeur nulle (division par zéro côté Catmull-Rom) et garantit que l'ordre
// cyclique reste re-saisissable. 1 px : négligeable face à l'espacement min
// (600/32 ≈ 18.75) mais suffisant.
const SPLINE_MIN_GAP = 1

// Recalcule la courbe dérivée (`points`) depuis les ancres. Plain array (pas
// Float32Array) : cohérent avec harmonicsToPoints et requis par Array.isArray
// (validation .osa) + buildPayload.
function splinePoints(anchors, interpolation) {
  return Array.from(splineToPoints(anchors, interpolation))
}

// Modèle unifié (M rattrapage) — résidu = canonical − spline(anchors), élément
// par élément (longueur 600). Pas de clamp : le résidu peut sortir de [-1, 1],
// c'est attendu (il porte les détails fins du tracé qui survivent au drag).
function computeResidual(canonical, splineCurve) {
  const out = new Array(POINTS_RESOLUTION)
  for (let i = 0; i < POINTS_RESOLUTION; i++) out[i] = canonical[i] - splineCurve[i]
  return out
}

// Canonical = spline(anchors) + résidu. Utilisé au drag d'ancre : la spline
// bouge, le résidu survit. M.r.5.bis (passe d'usage) — PLUS de clamp à [-1, 1] :
// aligné sur le tracé libre (`SET_EDITOR_CANONICAL` ne clampe pas non plus). La
// canonical peut dépasser ±1 (édition ET persistance, borne défensive [-10, 10] à
// l'hydratation / la validation .osa) ; le navigateur normalise la PeriodicWave à
// la lecture (disableNormalization: false), le marqueur ±1 visuel sert de repère.
function splinePlusResidual(splineCurve, residual) {
  const out = new Array(POINTS_RESOLUTION)
  for (let i = 0; i < POINTS_RESOLUTION; i++) out[i] = splineCurve[i] + (residual[i] ?? 0)
  return out
}

// iter-N phase-4.1 — passe-bas périodique (Gaussien) sur la canonical : gomme les
// tremblements de souris d'un tracé libre. σ ≈ 3 points, rayon 3σ, wrap (la
// canonical boucle). Modéré → répétable (un clic ≠ tout aplatir). Pur.
function gaussianSmoothWrapped(values, sigma) {
  const n = values.length
  const radius = Math.max(1, Math.ceil(sigma * 3))
  const kernel = new Array(2 * radius + 1)
  let norm = 0
  for (let k = -radius; k <= radius; k++) {
    const w = Math.exp(-(k * k) / (2 * sigma * sigma))
    kernel[k + radius] = w
    norm += w
  }
  const out = new Array(n)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let k = -radius; k <= radius; k++) {
      const idx = (((i + k) % n) + n) % n
      sum += values[idx] * kernel[k + radius]
    }
    out[i] = sum / norm
  }
  return out
}

// M.r.3 — primitive « lentilles vivantes » : après chaque modification de
// canonical par une voie autre que le drag d'ancre (tracé libre, drag de barre,
// Normaliser, preset picker, presets rapides), on re-fitte les ancres sur la
// nouvelle canonical (en préservant leur nombre) puis on recalcule le résidu.
// Conséquence (spec §4.1) : la lentille Ancres reste toujours synchronisée avec
// le tracé courant, et un drag d'ancre subséquent produit une déformation
// cohérente (amplitude du delta proportionnelle à la finesse de la spline,
// modulée par le résidu). Trois call-sites (SET_EDITOR_CANONICAL,
// SET_EDITOR_HARMONIC_AMPLITUDE, NORMALIZE_EDITOR_CANONICAL) — voir leur
// commentaire pour la raison du re-fit. (LOAD_PRESET fitte les ancres à un
// `anchorCount` explicite, pas via ce helper qui préserve le compte courant ;
// iter-N N.5c.)
function refitAnchorsAndResidual(canonical, currentAnchors, interpolation) {
  const count = currentAnchors?.length || DEFAULT_SPLINE_ANCHOR_COUNT
  const anchors = fitAnchorsToCurve(canonical, count)
  const residual = computeResidual(canonical, splineToPoints(anchors, interpolation))
  return { anchors, residual }
}

// Normalise/valide un tableau d'ancres : filtre les entrées non-finies, clampe
// x ∈ [0, 600) et y ∈ [-10, 10] (M.r.5.bis — borne défensive cohérente avec la
// validation .osa, plus le clamp ±1 d'avant), trie par x et écarte les doublons
// trop proches. Renvoie null si on ne peut pas garantir au moins
// SPLINE_ANCHOR_MIN ancres exploitables (le caller retombe alors sur un défaut).
function sanitizeAnchors(raw) {
  if (!Array.isArray(raw)) return null
  const cleaned = raw
    .filter((a) => a && Number.isFinite(a.x) && Number.isFinite(a.y))
    .map((a) => ({
      x: Math.max(0, Math.min(POINTS_RESOLUTION - 1, a.x)),
      y: Math.max(-10, Math.min(10, a.y)),
    }))
    .sort((a, b) => a.x - b.x)
  if (cleaned.length < SPLINE_ANCHOR_MIN) return null
  const out = [cleaned[0]]
  for (let i = 1; i < cleaned.length && out.length < SPLINE_ANCHOR_MAX; i++) {
    if (cleaned[i].x - out[out.length - 1].x >= SPLINE_MIN_GAP) out.push(cleaned[i])
  }
  return out.length >= SPLINE_ANCHOR_MIN ? out : null
}

// Normalise un vecteur d'amplitudes à la longueur N : tronque ou complète par
// des zéros, clampe chaque valeur dans [0, 1]. Tout élément non-fini → 0.
function sanitizeAmplitudes(raw, N) {
  const out = new Array(N).fill(0)
  if (Array.isArray(raw)) {
    for (let i = 0; i < N; i++) {
      const v = raw[i]
      out[i] = typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0
    }
  }
  return out
}

// Jeu d'ancres plates équiréparties, `count` ancres (défaut
// DEFAULT_SPLINE_ANCHOR_COUNT). Filet de sécurité quand un patch spline arrive
// sans ancres exploitables (rétro-compat / .osa corrompu) ; sert aussi au Reset
// du timbre, qui préserve le NOMBRE d'ancres courant (cf. RESET_EDITOR_WAVEFORM).
// Une courbe plate est inoffensive. `count` est clampé aux bornes spline.
function defaultSplineAnchors(count = DEFAULT_SPLINE_ANCHOR_COUNT) {
  const n = Math.max(SPLINE_ANCHOR_MIN, Math.min(SPLINE_ANCHOR_MAX, Math.round(count)))
  const out = []
  for (let i = 0; i < n; i++) {
    out.push({ x: (i * POINTS_RESOLUTION) / n, y: 0 })
  }
  return out
}

// Proportions par défaut des 3 colonnes du Designer. M.r.3.2 : `'bars'` retiré
// du type WaveformLens (vestigial) — il n'existe plus de défaut « Harmoniques
// large » ; toutes les lentilles ('free' | 'spline') donnent Forme d'onde large
// [0.5, 0.25, 0.25]. Signature conservée (le caller passe encore une lentille)
// pour absorber un futur défaut-par-lentille sans re-câbler les call-sites.
export function defaultColumnWidthsForLens() {
  return [0.5, 0.25, 0.25]
}

// Valide un tableau de 3 largeurs (fractions finies > 0) et le renormalise à
// somme 1. Toute entrée invalide → null (le caller retombe sur le défaut).
function sanitizeColumnWidths(raw) {
  if (!Array.isArray(raw) || raw.length !== 3) return null
  if (!raw.every((w) => typeof w === 'number' && Number.isFinite(w) && w > 0)) return null
  const sum = raw[0] + raw[1] + raw[2]
  return [raw[0] / sum, raw[1] / sum, raw[2] / sum]
}

export const TRACK_COLORS = [
  '#5a8a7a', '#7a6a9a', '#9a8a5a', '#5a7a9a',
  '#9a5a7a', '#6a9a5a', '#5a6a9a', '#9a7a5a',
]

// Éditeur : les champs `test*` ne servent qu'à piloter la preview dans
// Designer. Ils ne sont PAS copiés dans le patch sauvegardé. C'est le clip
// qui portera la hauteur lors du placement sur la timeline.
//
// `visualCue*` (F.4.4) : préférences d'affichage du clavier (repères
// pédagogiques). État éditeur, persisté en localStorage à plat
// (editorVisualCuePattern / editorVisualCueTonic), pas porté par les
// patches. Pattern 'none' = aucun repère affiché (état neutre).
/** @type {import('./types').Editor} */
export const DEFAULT_EDITOR = {
  // Modèle unifié (M rattrapage) : `canonical` est la vérité audio éditée,
  // `cap` borne les harmoniques, la lentille spline porte ancres + résidu.
  // `currentLens` est volatile (non persisté). Les ancres sont toujours
  // peuplées (8 plates) : la lentille spline est disponible d'emblée.
  // iter-M phase-r.2.5 : état neutre = silence (canonical à zéro). Vrai neutre
  // — Reset efface, point ; charger un preset « Sinus » donne une fondamentale
  // si on la veut. Cohérent avec « Nouveau patch » (RESET_EDITOR) qui hérite
  // de cette valeur : pas de timbre arbitraire imposé au démarrage.
  canonical: new Array(POINTS_RESOLUTION).fill(0),
  cap: DEFAULT_CAP,
  anchors: defaultSplineAnchors(),
  interpolation: DEFAULT_SPLINE_INTERPOLATION,
  residual: new Array(POINTS_RESOLUTION).fill(0),
  currentLens: 'free',
  // M.r.4 — « la canonical est-elle à phase canonique sinus pur ? » Propriété de
  // l'histoire de l'éditeur (pas du tableau canonical : le round-trip FFT n'est
  // pas idempotent, cf. audio.js harmonicsToPoints). true par défaut : canonical
  // = zéros = iDFT(magnitudes nulles), trivialement normalisée. Volatile (non
  // persisté dans le patch ni le .osa). Pilote : bouton Normaliser (désactivé si
  // true), courbe grise background (masquée si true), dialog edit-bars (intercepte
  // si false). Chaque action qui écrit canonical le repositionne explicitement.
  canonicalNormalized: true,
  testTuningSystem: '12-TET', // '12-TET' | 'free'
  testNoteIndex: 9, // A
  testOctave: 4,
  testFrequency: 440,
  amplitude: 1,
  preset: null,
  visualCuePattern: 'none',
  visualCueTonic: 0,
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
//
// `xEdoN` est utilisé uniquement quand `clip.tuningSystem === 'x-edo'` ;
// les autres systèmes l'ignorent. Défaut DEFAULT_X_EDO_N pour rester
// déterministe quand le call-site ne l'a pas encore propagé.
export function clipFrequency(clip, a4Ref = DEFAULT_A4, xEdoN = DEFAULT_X_EDO_N) {
  const sys = getTuningSystem(clip.tuningSystem)
  if (sys.freq === null) return clip.frequency ?? DEFAULT_A4
  return sys.freq(clip.noteIndex ?? 9, clip.octave ?? 4, a4Ref, xEdoN)
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

// F.8.1.3 : formules inline pour les anciens systèmes équipartiques '5-tet'
// et '31-edo' supprimés en F.8.1.4. Inlining volontaire : la migration des
// clips à l'hydratation doit fonctionner même quand le registre n'expose
// plus ces entrées. Tonique (deg 0) ancrée à `a4Ref` à oct 4, cohérent
// avec les anciennes implémentations.
function legacyEqualFreq(noteIndex, octave, a4Ref, npo) {
  return a4Ref * Math.pow(2, noteIndex / npo + (octave - 4))
}

// F.8.1.3 : valide & clamp xEdoN à [X_EDO_MIN, X_EDO_MAX]. Tout entrée
// invalide ou hors borne retombe sur DEFAULT_X_EDO_N.
function sanitizeXEdoN(raw) {
  if (!Number.isInteger(raw)) return DEFAULT_X_EDO_N
  if (raw < X_EDO_MIN || raw > X_EDO_MAX) return DEFAULT_X_EDO_N
  return raw
}

// F.8.1.3 : migration des clips '5-tet' / '31-edo' vers 'x-edo'. Pour chaque
// clip concerné, on calcule la fréquence selon l'ancien système (formule
// inline), puis on snap à la grille `xEdoN` cible. tuningSystem devient
// 'x-edo' ; noteIndex/octave sont remplacés par le snap. Si plusieurs clips
// étaient dans des systèmes différents, ils convergent tous vers le même
// xEdoN (la valeur hydratée du state global) — pas d'inférence par clip,
// volonté de simplicité.
function migrateLegacyClips(clips, a4Ref, xEdoN) {
  return clips.map((c) => {
    const npo = c.tuningSystem === '5-tet' ? 5
              : c.tuningSystem === '31-edo' ? 31
              : null
    if (npo === null) return c
    const oldFreq = legacyEqualFreq(c.noteIndex ?? 0, c.octave ?? 4, a4Ref, npo)
    const snapped = frequencyToNearestIn(oldFreq, 'x-edo', a4Ref, xEdoN)
    return {
      ...c,
      tuningSystem: 'x-edo',
      noteIndex: snapped.noteIndex,
      octave: snapped.octave,
      frequency: null,
    }
  })
}

// M rattrapage — méta d'un patch (tout sauf la forme d'onde). Listée
// explicitement pour DROPPER au passage les champs v1 obsolètes
// (mode / definition / N / amplitudes / points).
function patchMeta(p) {
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    preset: p.preset ?? null,
    defaultTuningSystem: p.defaultTuningSystem ?? '12-TET',
    folderId: p.folderId ?? null,
    updatedAt: p.updatedAt ?? 0,
    amplitude: typeof p.amplitude === 'number' ? p.amplitude : 1,
    attack: p.attack,
    hold: p.hold ?? DEFAULT_ADSR.hold,
    decay: p.decay,
    sustain: p.sustain,
    release: p.release,
  }
}

// M.r.5.bis — borne défensive [-10, 10] (et non ±1) à l'hydratation : la canonical
// brute n'est volontairement pas clampée à ±1 (alignée sur le tracé libre ; l'audio
// est normalisé à la lecture par le navigateur, disableNormalization: false, et le
// marqueur ±1 visuel sert de repère). Le pic théorique est Σ amplitudes_k (4-5 pour
// des patches normaux) ; 10 absorbe les cas extrêmes (résidu accumulé, harmoniques
// saturées) sans laisser un fichier corrompu charger n'importe quoi.
const clampToCanonicalRange = (v) => (Number.isFinite(v) ? Math.max(-10, Math.min(10, v)) : 0)

// M rattrapage — migration patch v1 (mode discriminé draw/harmonic/spline) →
// v2 (canonical unifié). Idempotent : un patch déjà v2 (canonical présent) est
// re-sanitizé sans reconversion. Deux call-sites : hydratation localStorage
// (loadPersistedState) et import .osa v1 (applyImport). Ne perd jamais un
// patch (cf. spec §3.3, §12) : un patch illisible retombe sur une courbe plate.
export function migrateLegacyPatch(p) {
  if (!p || typeof p !== 'object') return p
  // Déjà v2 : re-sanitize cap/anchors/residual sans reconvertir.
  if (Array.isArray(p.canonical)) {
    const canonical = p.canonical.length === POINTS_RESOLUTION
      ? p.canonical.map(clampToCanonicalRange)
      : new Array(POINTS_RESOLUTION).fill(0)
    const anchors = sanitizeAnchors(p.anchors) ?? fitAnchorsToCurve(canonical, DEFAULT_SPLINE_ANCHOR_COUNT)
    const interpolation = p.interpolation === 'hard' ? 'hard' : 'soft'
    const residual = Array.isArray(p.residual) && p.residual.length === POINTS_RESOLUTION
      ? p.residual.slice()
      : computeResidual(canonical, splineToPoints(anchors, interpolation))
    return { ...patchMeta(p), canonical, cap: clampCap(p.cap ?? DEFAULT_CAP), anchors, interpolation, residual }
  }
  // Legacy harmonique : iDFT des amplitudes à phase canonique, résidu nul.
  if (p.mode === 'harmonic') {
    const cap = clampCap(p.N ?? DEFAULT_CAP)
    const amplitudes = sanitizeAmplitudes(p.amplitudes, cap)
    const canonical = harmonicsToPoints(amplitudes, cap)
    return {
      ...patchMeta(p),
      canonical,
      cap,
      anchors: fitAnchorsToCurve(canonical, DEFAULT_SPLINE_ANCHOR_COUNT),
      interpolation: 'soft',
      residual: new Array(POINTS_RESOLUTION).fill(0),
    }
  }
  // Legacy spline : courbe régénérée depuis les ancres, résidu nul.
  if (p.mode === 'spline') {
    const anchors = sanitizeAnchors(p.anchors) ?? defaultSplineAnchors()
    const interpolation = p.interpolation === 'hard' ? 'hard' : 'soft'
    const canonical = splinePoints(anchors, interpolation)
    return {
      ...patchMeta(p),
      canonical,
      cap: DEFAULT_CAP,
      anchors,
      interpolation,
      residual: new Array(POINTS_RESOLUTION).fill(0),
    }
  }
  // Legacy dessin (ou mode absent) : points → canonical ; ancres ajustées au
  // tracé ; résidu = canonical − spline(ancres) (peut sortir de [-1, 1] :
  // c'est attendu, il porte les détails fins qui survivront au drag d'ancre).
  const canonical = Array.isArray(p.points) && p.points.length === POINTS_RESOLUTION
    ? p.points.map(clampToCanonicalRange)
    : new Array(POINTS_RESOLUTION).fill(0)
  const cap = clampCap(p.definition ?? DEFAULT_CAP)
  const anchors = fitAnchorsToCurve(canonical, DEFAULT_SPLINE_ANCHOR_COUNT)
  const residual = computeResidual(canonical, splineToPoints(anchors, 'soft'))
  return { ...patchMeta(p), canonical, cap, anchors, interpolation: 'soft', residual }
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

    // iter-M phase-1 : patches antérieurs sans champ `definition` → 256
    // injecté (préserve leur son : aucune troncature). Idempotent pour les
    // patches déjà porteurs du champ.
    // iter-M phase-2 : patches antérieurs sans `mode` → 'draw' (pas de
    // migration destructive). Patch 'harmonic' : on sanitize N + amplitudes
    // (clamp défensif des longueurs/bornes, cohérent avec l'invariant F.4.4.3).
    const patches = (Array.isArray(parsed.patches) ? parsed.patches : []).map(migrateLegacyPatch)
    const rawClips = Array.isArray(parsed.clips) ? parsed.clips : []
    const tracks = (Array.isArray(parsed.tracks) && parsed.tracks.length > 0
      ? parsed.tracks
      : [makeDefaultTrack()]
    ).map((t, i) => ({
      ...t,
      color: t.color ?? TRACK_COLORS[i % TRACK_COLORS.length],
    }))
    const soundFolders = Array.isArray(parsed.soundFolders) ? parsed.soundFolders : []

    const a4RefRaw = parsed.a4Ref
    const a4Ref = typeof a4RefRaw === 'number' && Number.isFinite(a4RefRaw) && a4RefRaw > 0
      ? a4RefRaw
      : DEFAULT_A4

    // F.8.1.3 : xEdoN est lu (ou défaut), puis utilisé pour migrer les
    // clips '5-tet' / '31-edo' du localStorage vers 'x-edo' avec snap.
    // Les clips déjà en 'x-edo' (futur) sont préservés tels quels.
    const xEdoN = sanitizeXEdoN(parsed.xEdoN)
    const clips = migrateLegacyClips(rawClips, a4Ref, xEdoN)

    const maxClipMeasure = clips.reduce((m, c) => Math.max(m, c.measure || 0), 0)
    const numMeasures = Math.max(
      parsed.numMeasures ?? DEFAULT_NUM_MEASURES,
      maxClipMeasure,
      1,
    )

    return {
      patches,
      soundFolders,
      tracks,
      clips,
      numMeasures,
      bpm: parsed.bpm ?? DEFAULT_BPM,
      a4Ref,
      xEdoN,
      patchCounter: parsed.patchCounter ?? 0,
      clipCounter: parsed.clipCounter ?? 0,
      folderCounter: parsed.folderCounter ?? 0,
      trackCounter: parsed.trackCounter ?? Math.max(0, ...tracks.map(t => {
        const m = t.id.match(/^track-(\d+)$/)
        return m ? parseInt(m[1], 10) : 0
      })),
      spectrogramVisible:
        typeof parsed.spectrogramVisible === 'boolean' ? parsed.spectrogramVisible : true,
      spectrogramDbScale:
        typeof parsed.spectrogramDbScale === 'boolean' ? parsed.spectrogramDbScale : false,
      spectrogramPeakHold:
        typeof parsed.spectrogramPeakHold === 'boolean' ? parsed.spectrogramPeakHold : false,
      spectrogramMode: parsed.spectrogramMode === 'live' ? 'live' : 'static',
      bibHierarchyMode: parsed.bibHierarchyMode === 'tree' ? 'tree' : 'nav',
      bibDisplayMode: ['list', 'details', 'tiles'].includes(parsed.bibDisplayMode) ? parsed.bibDisplayMode : 'list',
      bibCurrentFolderId: typeof parsed.bibCurrentFolderId === 'string' ? parsed.bibCurrentFolderId : null,
      bibCollapsedFolders: Array.isArray(parsed.bibCollapsedFolders) ? parsed.bibCollapsedFolders : [],
      bibPopupWidth: typeof parsed.bibPopupWidth === 'number'
        ? Math.max(320, Math.min(parsed.bibPopupWidth, 1200))
        : 480,
      // iter-L phase-1.4.b : piste sélectionnée Composer. Validation contre
      // tracks faite plus bas après assemblage.
      selectedTrackId: typeof parsed.selectedTrackId === 'string' ? parsed.selectedTrackId : null,
      // iter-K phase-2.f11 : liste LRU des derniers patches utilisés
      // (max 10). Filtrée aux strings ; les IDs orphelins sont nettoyés
      // au prochain ADD_PATCH_TO_RECENTS / DELETE_PATCH / DELETE_BIB_ITEMS.
      recentPatchIds: Array.isArray(parsed.recentPatchIds)
        ? parsed.recentPatchIds.filter(id => typeof id === 'string').slice(0, 10)
        : [],
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      activeTab: ['library', 'composer', 'designer', 'documentation'].includes(parsed.activeTab)
        ? parsed.activeTab
        : 'designer',
      durationMode: parsed.durationMode === 'fraction' ? 'fraction' : 'solfège',
      composerBankWidth: typeof parsed.composerBankWidth === 'number' ? parsed.composerBankWidth : null,
      composerAsideWidth: typeof parsed.composerAsideWidth === 'number' ? parsed.composerAsideWidth : null,
      composerBankCollapsed: typeof parsed.composerBankCollapsed === 'boolean' ? parsed.composerBankCollapsed : false,
      composerAsideCollapsed: typeof parsed.composerAsideCollapsed === 'boolean' ? parsed.composerAsideCollapsed : false,
      designerSidebarWidth: typeof parsed.designerSidebarWidth === 'number' ? parsed.designerSidebarWidth : null,
      designerSidebarCollapsed: typeof parsed.designerSidebarCollapsed === 'boolean' ? parsed.designerSidebarCollapsed : false,
      // iter-M phase-2 : proportions des 3 colonnes Designer (null si absent /
      // invalide → défaut-par-mode appliqué dans buildInitialState).
      designerColumnWidths: sanitizeColumnWidths(parsed.designerColumnWidths),
      // iter-M phase-2-as : toggle auto-sizing (essai). OFF par défaut.
      autoSizing: typeof parsed.autoSizing === 'boolean' ? parsed.autoSizing : false,
      // iter-L phase-2.1 : préférences sidebar Documentation. Persistées en
      // localStorage (cohérent avec les autres sidebars). La position de
      // lecture vit en sessionStorage (cf. loadDocSession).
      docSidebarWidth: typeof parsed.docSidebarWidth === 'number' ? parsed.docSidebarWidth : null,
      docSidebarCollapsed: typeof parsed.docSidebarCollapsed === 'boolean' ? parsed.docSidebarCollapsed : false,
      // F.4.4.3 : état d'exploration Designer persisté de bout en bout.
      // Tous les champs `editor.test*` + `editor.visualCue*` survivent au
      // reload. Validation/clamp défensifs ici (point d'entrée unique) :
      //  - testTuningSystem inconnu du registre → fallback '12-TET'.
      //  - testNoteIndex clampé à [0, notesPerOctave - 1] du système
      //    résolu (sauf Libre où l'index est inactif → conservé tel quel).
      //  - testOctave clampé à [0, 10] (cohérence OctaveSelector).
      //  - testFrequency : nombre fini > 0, sinon 440.
      //  - visualCuePattern validé contre VISUAL_CUE_PATTERNS, fallback
      //    'none' (résiste au retrait futur d'un pattern du catalogue).
      //  - visualCueTonic clampé comme testNoteIndex.
      // Cas test : localStorage manipulé manuellement à testNoteIndex=999
      // → clamp à notesPerOctave-1 ; '31-edo' retiré du registre →
      // fallback 12-TET + clamp testNoteIndex à 11.
      ...(() => {
        // Différencie "absent" (undefined → propagé tel quel pour qu'un
        // ?? plus loin retombe sur DEFAULT_EDITOR) de "présent mais
        // invalide" (clamp/sanitize). Garantit qu'un upgrade depuis
        // F.4.4.2 (sans ces champs en localStorage) restaure les valeurs
        // par défaut, sans écrire 0 partout.
        const tsRaw = parsed.editorTestTuningSystem
        const editorTestTuningSystem =
          tsRaw === undefined ? undefined
          : (typeof tsRaw === 'string' && tsRaw in TUNING_SYSTEMS) ? tsRaw
          : '12-TET'
        // Pour résoudre `npo`, on doit avoir un système. Si testTuningSystem
        // est absent du storage, on prend le défaut '12-TET' uniquement pour
        // décider du clamp, sans pour autant fixer `editorTestTuningSystem`.
        // F.8.1.3 : pour 'x-edo', `notesPerOctave` est une factory(xEdoN) ;
        // `getNotesPerOctave` cache ce polymorphisme.
        const sys = getTuningSystem(editorTestTuningSystem ?? '12-TET')
        const npo = getNotesPerOctave(sys, xEdoN)

        const clampInt = (v, max) => Math.max(0, Math.min(max, v))
        const validateClampedInt = (v, max) =>
          v === undefined ? undefined
          : Number.isInteger(v) ? clampInt(v, max)
          : 0

        const editorTestNoteIndex = npo !== null
          ? validateClampedInt(parsed.editorTestNoteIndex, npo - 1)
          : (parsed.editorTestNoteIndex === undefined ? undefined
             : Number.isInteger(parsed.editorTestNoteIndex) ? parsed.editorTestNoteIndex
             : 9)

        const editorTestOctave = validateClampedInt(parsed.editorTestOctave, 10)

        const tfRaw = parsed.editorTestFrequency
        const editorTestFrequency =
          tfRaw === undefined ? undefined
          : (typeof tfRaw === 'number' && Number.isFinite(tfRaw) && tfRaw > 0) ? tfRaw
          : 440

        const vcpRaw = parsed.editorVisualCuePattern
        const editorVisualCuePattern =
          vcpRaw === undefined ? undefined
          : (typeof vcpRaw === 'string' && vcpRaw in VISUAL_CUE_PATTERNS) ? vcpRaw
          : 'none'

        const editorVisualCueTonic = npo !== null
          ? validateClampedInt(parsed.editorVisualCueTonic, npo - 1)
          : (parsed.editorVisualCueTonic === undefined ? undefined
             : Number.isInteger(parsed.editorVisualCueTonic) ? parsed.editorVisualCueTonic
             : 0)

        return {
          editorTestTuningSystem,
          editorTestNoteIndex,
          editorTestOctave,
          editorTestFrequency,
          editorVisualCuePattern,
          editorVisualCueTonic,
        }
      })(),
    }
  } catch {
    return null
  }
}

// iter-L phase-2.1 : lecture de la session de documentation (article
// courant + positions de scroll par article). Volontairement en
// sessionStorage : on retombe sur l'article par défaut à chaque
// ouverture de session navigateur. Filtrage défensif sur les types
// (un article courant vide / des positions non-numériques sont
// silencieusement ignorés — pas de migration, pas de bug bloquant).
export function loadDocSession() {
  try {
    const raw = sessionStorage.getItem(DOC_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const currentArticleId = typeof parsed.currentArticleId === 'string'
      ? parsed.currentArticleId
      : null
    const scrollPositions = (parsed.scrollPositions && typeof parsed.scrollPositions === 'object')
      ? Object.fromEntries(
          Object.entries(parsed.scrollPositions)
            .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
        )
      : {}
    return { currentArticleId, scrollPositions }
  } catch {
    return null
  }
}

export function buildInitialState() {
  const persisted = loadPersistedState()
  const docSession = loadDocSession()
  const initialState = {
    // Composer (champ undoable)
    clips: persisted?.clips ?? [],
    numMeasures: persisted?.numMeasures ?? DEFAULT_NUM_MEASURES,
    bpm: persisted?.bpm ?? DEFAULT_BPM,
    tracks: persisted?.tracks ?? [makeDefaultTrack()],
    // Hauteur de référence pour tous les systèmes-based (iter F). Configurable
    // mais sans UI exposée en F.1 — défaut 440 Hz = comportement pré-F.1.
    a4Ref: persisted?.a4Ref ?? DEFAULT_A4,
    // F.8.1.3 : nombre de degrés du système X-EDO courant. Utilisé seulement
    // quand un clip ou l'éditeur est en `tuningSystem === 'x-edo'`. UI
    // d'édition à venir en F.8.3 ; en F.8.1 la valeur se modifie via
    // `dispatch({ type: 'SET_X_EDO_N', payload: N })` (exposé sur
    // `window.__store` en mode dev).
    xEdoN: persisted?.xEdoN ?? DEFAULT_X_EDO_N,

    // Designer (champ undoable)
    patches: persisted?.patches ?? [],
    soundFolders: persisted?.soundFolders ?? [],
    // F.4.4.3 : tous les champs `test*` et `visualCue*` sont restaurés
    // depuis localStorage (validés et clampés dans loadPersistedState).
    // Les autres champs (canonical, residual, ADSR, amplitude…) restent
    // vides à l'init — l'éditeur de patch, lui, n'est pas persisté. Les
    // tableaux sont clonés pour éviter le partage avec DEFAULT_EDITOR.
    editor: {
      ...DEFAULT_EDITOR,
      canonical: [...DEFAULT_EDITOR.canonical],
      residual: [...DEFAULT_EDITOR.residual],
      anchors: DEFAULT_EDITOR.anchors.map((a) => ({ ...a })),
      testTuningSystem: persisted?.editorTestTuningSystem ?? DEFAULT_EDITOR.testTuningSystem,
      testNoteIndex: persisted?.editorTestNoteIndex ?? DEFAULT_EDITOR.testNoteIndex,
      testOctave: persisted?.editorTestOctave ?? DEFAULT_EDITOR.testOctave,
      testFrequency: persisted?.editorTestFrequency ?? DEFAULT_EDITOR.testFrequency,
      visualCuePattern: persisted?.editorVisualCuePattern ?? 'none',
      visualCueTonic: persisted?.editorVisualCueTonic ?? 0,
    },

    // Compteurs (state mais hors historique : on ne fait pas reculer un compteur
    // sur undo, sinon on risque de réutiliser un id supprimé puis recréé)
    patchCounter: persisted?.patchCounter ?? 0,
    clipCounter: persisted?.clipCounter ?? 0,
    folderCounter: persisted?.folderCounter ?? 0,
    trackCounter: persisted?.trackCounter ?? 0,

    clipboard: null,
    measureClipboard: null,
    bibClipboard: null,
    // iter-L phase-1.4.b : piste sélectionnée (Composer). Mise à jour au
    // dernier clic utilisateur (clip / header / zone vide d'une piste).
    // Sert au fallback du bouton Coller et au signifiant visuel sur le
    // header. Persisté en localStorage. Validation contre tracks à
    // l'hydratation (cf. plus bas).
    selectedTrackId: persisted?.selectedTrackId ?? null,
    // iter-L phase-1.6 : overlay raccourcis (Ctrl+K). State runtime, non
    // persisté (toujours fermé au boot). Toggle via SET_SHORTCUTS_OVERLAY.
    shortcutsOverlayOpen: false,

    // iter-L phase-4 : Tour guidé. State volatile — jamais persisté (absent
    // du JSON.stringify localStorage) et hors historique undo (les actions
    // TOUR_* ne sont dans aucun *_UNDOABLE). `snapshot` capture les prefs UI
    // mutées par le tour (onglet + sidebars repliables), restaurées à END_TOUR
    // pour que le tour soit « stateless du point de vue utilisateur ».
    tour: { active: false, tabId: null, stepIndex: 0, snapshot: null },

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
    spectrogramDbScale: persisted?.spectrogramDbScale ?? false,
    spectrogramPeakHold: persisted?.spectrogramPeakHold ?? false,
    spectrogramMode: persisted?.spectrogramMode ?? 'static',
    bibHierarchyMode: persisted?.bibHierarchyMode ?? 'nav',
    bibDisplayMode: persisted?.bibDisplayMode ?? 'list',
    bibCurrentFolderId: persisted?.bibCurrentFolderId ?? null,
    bibCollapsedFolders: persisted?.bibCollapsedFolders ?? [],
    bibPopupWidth: persisted?.bibPopupWidth ?? 480,
    // iter-K phase-2.f11 : LRU des patches récemment utilisés en timeline.
    // Mis à jour à chaque ADD_CLIP avec patchId, ainsi qu'à un drop manuel
    // sur la liste (ADD_PATCH_TO_RECENTS). Cleané sur suppression de patch.
    recentPatchIds: persisted?.recentPatchIds ?? [],
    // iter-K phase-3.f15 : thème ('dark' | 'light'). Défaut 'dark' pour
    // ne pas surprendre les utilisateurs existants.
    theme: persisted?.theme ?? 'dark',
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
    // iter G phase 1.2 : sidebar Designer redimensionnable + réductible.
    // Width clampée à [DESIGNER_SIDEBAR_MIN_WIDTH, ∞), persistée.
    designerSidebarWidth: Math.max(DESIGNER_SIDEBAR_MIN_WIDTH, persisted?.designerSidebarWidth ?? DESIGNER_SIDEBAR_DEFAULT_WIDTH),
    designerSidebarCollapsed: persisted?.designerSidebarCollapsed ?? false,
    // iter-M phase-2 : proportions des 3 colonnes Designer. Défaut piloté par
    // le mode d'édition courant (Forme d'onde large en 'draw', cf. spec §7.1)
    // tant qu'aucune valeur n'a été persistée.
    designerColumnWidths: persisted?.designerColumnWidths ?? defaultColumnWidthsForLens('free'),
    // iter-M phase-2-as : toggle auto-sizing (essai). OFF par défaut.
    autoSizing: persisted?.autoSizing ?? false,
    // iter-L phase-2.1 : sidebar TOC Documentation + position de lecture.
    // - docSidebarWidth / docSidebarCollapsed : localStorage (préférences).
    // - doc.currentArticleId / doc.scrollPositions : sessionStorage (lecture).
    docSidebarWidth: Math.max(DOC_SIDEBAR_MIN_WIDTH, persisted?.docSidebarWidth ?? DOC_SIDEBAR_DEFAULT_WIDTH),
    docSidebarCollapsed: persisted?.docSidebarCollapsed ?? false,
    doc: {
      currentArticleId: docSession?.currentArticleId ?? DEFAULT_DOC_ARTICLE_ID,
      scrollPositions: docSession?.scrollPositions ?? {},
    },
    composerFlash: null,

    // Sélection bibliothèque (transient runtime state, non persisté).
    bibSelectedIds: [],
    bibSelectionAnchor: null,

    // Avertissement suppression partielle (transient, non persisté).
    // Porté jusqu'à ce que le modal DeleteUsageWarningDialog le consomme.
    pendingDeleteWarning: null,

    history: {
      designer: { past: [], future: [] },
      composer: { past: [], future: [] },
      library: { past: [], future: [] },
    },
    notification: null,
  }

  // Valide que bibCurrentFolderId pointe sur un folder existant ; sinon null.
  const validFolderIds = new Set(initialState.soundFolders.map(f => f.id))
  if (initialState.bibCurrentFolderId !== null && !validFolderIds.has(initialState.bibCurrentFolderId)) {
    initialState.bibCurrentFolderId = null
  }

  // iter-L phase-1.4.b : valide selectedTrackId contre les tracks chargées.
  const validTrackIds = new Set(initialState.tracks.map(t => t.id))
  if (initialState.selectedTrackId !== null && !validTrackIds.has(initialState.selectedTrackId)) {
    initialState.selectedTrackId = null
  }

  // iter-K phase-2.f11 : nettoie les IDs orphelins du LRU (patches supprimés
  // hors de l'app, ou format localStorage corrompu).
  const validPatchIds = new Set(initialState.patches.map(p => p.id))
  initialState.recentPatchIds = (initialState.recentPatchIds || [])
    .filter(id => validPatchIds.has(id))
    .slice(0, 10)

  return initialState
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

/**
 * Reducer métier (état undoable + transient). L'historisation undo/redo est
 * gérée par le wrapper `withUndo` plus bas.
 *
 * @param {import('./types').AppState} state
 * @param {import('./types').Action} action
 * @returns {import('./types').AppState}
 */
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
      // iter-K phase-2.f11 : update LRU recents. Le patch doit exister (sinon
      // c'est un ADD_CLIP avec patchId invalide — laisse la liste intacte).
      const existingRecents = state.recentPatchIds || []
      const patchExists = patchId && state.patches.some(p => p.id === patchId)
      const nextRecents = patchExists
        ? [patchId, ...existingRecents.filter(id => id !== patchId)].slice(0, 10)
        : existingRecents
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
        recentPatchIds: nextRecents,
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
      const xEdoN = state.xEdoN ?? DEFAULT_X_EDO_N
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
          const prevNpo = getNotesPerOctave(prevSys, xEdoN)
          const nextNpo = getNotesPerOctave(nextSys, xEdoN)
          if (nextSys.freq === null) {
            // Vers libre : si la fréquence n'est pas fournie explicitement,
            // on conserve la hauteur courante rendue dans l'ancien système.
            if (!('frequency' in u)) {
              next.frequency = Math.round(clipFrequency(c, a4Ref, xEdoN) * 10) / 10
            }
            if (!('noteIndex' in u)) next.noteIndex = null
            if (!('octave' in u)) next.octave = null
          } else if (prevSys.freq !== null && prevNpo === nextNpo) {
            // Entre systèmes de même grille (ex. 12-TET ↔ Pythagoricien en
            // F.2) : noteIndex/octave gardés tels quels ; seule la fréquence
            // de rendu diffère.
            if (!('frequency' in u)) next.frequency = null
          } else {
            // Depuis libre, ou entre systèmes de grilles différentes :
            // snap vers la note la plus proche du système cible. La
            // fréquence source vient soit du clip libre, soit du rendu
            // dans l'ancien système.
            if (!('noteIndex' in u) || !('octave' in u)) {
              const srcFreq = prevSys.freq
                ? prevSys.freq(c.noteIndex ?? 9, c.octave ?? 4, a4Ref, xEdoN)
                : (c.frequency ?? a4Ref)
              const nearest = frequencyToNearestIn(srcFreq, next.tuningSystem, a4Ref, xEdoN)
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
    case 'SET_A4_REF': {
      // Pas de clamp côté reducer : c'est l'input qui valide la fourchette.
      // Ignorer les valeurs non-finies pour éviter de casser l'état si un
      // call-site bugue (NaN depuis parseInt d'une chaîne vide, etc.).
      const v = action.payload
      if (!Number.isFinite(v) || v <= 0) return state
      if (state.a4Ref === v) return state
      return { ...state, a4Ref: v }
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
        // iter-L phase-1.4.b : si la piste active est supprimée, on retombe
        // sur null (le bouton Coller utilisera le fallback piste 0).
        selectedTrackId: state.selectedTrackId === trackId ? null : state.selectedTrackId,
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
      // payload: { patchData (sans id/color), folderId? }
      // iter G phase 2.4 : patchData porte aussi defaultTuningSystem
      // (système musical actif au moment de l'enregistrement).
      const { patchData, folderId = null } = action.payload
      const newCounter = state.patchCounter + 1
      const id = `patch-${newCounter}`
      const colorIndex = (newCounter - 1) % SOUND_COLORS.length
      const newPatch = {
        id,
        name: patchData.name,
        color: SOUND_COLORS[colorIndex],
        amplitude: patchData.amplitude,
        preset: patchData.preset,
        attack: patchData.attack ?? DEFAULT_ADSR.attack,
        hold: patchData.hold ?? DEFAULT_ADSR.hold,
        decay: patchData.decay ?? DEFAULT_ADSR.decay,
        sustain: patchData.sustain ?? DEFAULT_ADSR.sustain,
        release: patchData.release ?? DEFAULT_ADSR.release,
        defaultTuningSystem: patchData.defaultTuningSystem ?? '12-TET',
        folderId,
        updatedAt: Date.now(),
        // Modèle unifié : canonical + cap + lentille spline (résidu inclus).
        canonical: Array.from(patchData.canonical),
        cap: clampCap(patchData.cap),
        anchors: sanitizeAnchors(patchData.anchors) ?? defaultSplineAnchors(),
        interpolation: patchData.interpolation === 'hard' ? 'hard' : 'soft',
        residual: Array.from(patchData.residual),
      }

      // SAVE_PATCH non-undoable, mais on rewrite les snapshots LIBRARY
      // pour préserver ce patch à travers les undos.
      const patchedLibHist = patchLibrarySnapshotsAdditive(state.history.library, {
        newPatches: [newPatch],
        patchCounter: newCounter,
      })

      return {
        ...state,
        patchCounter: newCounter,
        patches: [...state.patches, newPatch],
        currentPatchId: id,
        history: { ...state.history, library: patchedLibHist },
      }
    }
    case 'UPDATE_PATCH': {
      const { patchId, patchData } = action.payload
      return {
        ...state,
        patches: state.patches.map((p) => {
          if (p.id !== patchId) return p
          // iter-M phase-2/3 : on retire les champs spécifiques au mode
          // (definition / N / amplitudes / anchors / interpolation) du patch
          // existant avant de réinjecter ceux du mode courant, sinon un patch
          // converti garderait un champ orphelin.
          return {
            ...p,
            amplitude: patchData.amplitude,
            preset: patchData.preset,
            attack: patchData.attack,
            hold: patchData.hold ?? DEFAULT_ADSR.hold,
            decay: patchData.decay,
            sustain: patchData.sustain,
            release: patchData.release,
            // iter G phase 2.4 : on capture aussi le système courant.
            // Si patchData.defaultTuningSystem absent (rétro-compat
            // call site oublié), on préserve la valeur existante.
            defaultTuningSystem: patchData.defaultTuningSystem ?? p.defaultTuningSystem ?? '12-TET',
            updatedAt: Date.now(),
            // Modèle unifié : canonical + cap + lentille spline (résidu inclus).
            canonical: Array.from(patchData.canonical),
            cap: clampCap(patchData.cap),
            anchors: sanitizeAnchors(patchData.anchors) ?? defaultSplineAnchors(),
            interpolation: patchData.interpolation === 'hard' ? 'hard' : 'soft',
            residual: Array.from(patchData.residual),
          }
        }),
      }
    }
    case 'DELETE_PATCH': {
      const { patchId } = action.payload
      return {
        ...state,
        patches: state.patches.filter((p) => p.id !== patchId),
        currentPatchId: state.currentPatchId === patchId ? null : state.currentPatchId,
        // iter-K phase-2.f11 : retire le patch supprimé du LRU recents.
        recentPatchIds: (state.recentPatchIds || []).filter(id => id !== patchId),
      }
    }
    case 'IMPORT_LIBRARY': {
      return {
        ...state,
        patches: [...state.patches, ...action.newPatches],
        soundFolders: [...state.soundFolders, ...action.newFolders],
        patchCounter: action.patchCounterAfter,
        folderCounter: action.folderCounterAfter,
      }
    }
    case 'RENAME_PATCH': {
      const { patchId, name } = action.payload
      return {
        ...state,
        patches: state.patches.map((p) => (p.id === patchId ? { ...p, name, updatedAt: Date.now() } : p)),
      }
    }
    case 'CREATE_FOLDER': {
      const { name, parentId = null } = action.payload
      const newCounter = state.folderCounter + 1
      const newFolder = { id: `folder-${newCounter}`, name, parentId }

      const baseReturn = {
        ...state,
        folderCounter: newCounter,
        soundFolders: [...state.soundFolders, newFolder],
      }

      if (action.meta?.skipUndo === true) {
        // skipUndo additive : patche tous les snapshots LIBRARY pour préserver
        // ce folder à travers les undos.
        const patchedLibHist = patchLibrarySnapshotsAdditive(state.history.library, {
          newFolders: [newFolder],
          folderCounter: newCounter,
        })
        return {
          ...baseReturn,
          history: { ...state.history, library: patchedLibHist },
        }
      }

      return baseReturn
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
    case 'SET_EDITOR_CANONICAL': {
      // Tracé libre : la canonical devient le payload. M.r.3 — re-fit des ancres
      // sur le nouveau tracé (en préservant leur nombre) puis résidu : la
      // lentille Spline reflète le tracé courant au lieu d'ancres figées à y=0.
      // preset remis à null.
      const canonical = action.payload
      const { anchors, residual } = refitAnchorsAndResidual(
        canonical, state.editor.anchors, state.editor.interpolation,
      )
      // M.r.4 — tracé libre = phase arbitraire ≠ canonique sinus.
      return { ...state, editor: { ...state.editor, canonical, anchors, residual, preset: null, canonicalNormalized: false } }
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
      const xEdoN = state.xEdoN ?? DEFAULT_X_EDO_N
      const prevSys = getTuningSystem(state.editor.testTuningSystem)
      const nextSys = getTuningSystem(next)
      const prevNpo = getNotesPerOctave(prevSys, xEdoN)
      const nextNpo = getNotesPerOctave(nextSys, xEdoN)

      // F.4.4 : si le tonique des visual cues dépasse la grille du nouveau
      // système (ex. 31-EDO tonic 25 → 12-TET dont la grille s'arrête à
      // 11), snap à 0. Le pattern lui-même est préservé pour qu'un retour
      // dans un système qui supporte les cues le retrouve.
      const tonicMax = nextNpo ?? null
      const cueTonic = (tonicMax !== null && state.editor.visualCueTonic >= tonicMax)
        ? 0
        : state.editor.visualCueTonic

      if (nextSys.freq === null) {
        // Vers libre : on conserve la fréquence courante rendue dans l'ancien
        // système. testNoteIndex/testOctave sont préservés (via ...editor)
        // pour qu'un retour au système-based restaure la note précédente.
        const curFreq = prevSys.freq
          ? prevSys.freq(state.editor.testNoteIndex, state.editor.testOctave, a4Ref, xEdoN)
          : state.editor.testFrequency
        return {
          ...state,
          editor: {
            ...state.editor,
            testTuningSystem: next,
            testFrequency: Math.round(curFreq * 10) / 10,
            visualCueTonic: cueTonic,
          },
        }
      }

      if (prevSys.freq !== null && prevNpo === nextNpo) {
        // Entre systèmes de même grille : note/octave gardés, seul le rendu
        // change (ex. 12-TET ↔ Pythagoricien).
        return {
          ...state,
          editor: { ...state.editor, testTuningSystem: next, visualCueTonic: cueTonic },
        }
      }

      // Depuis libre ou grille différente : snap vers le système cible.
      // Source = fréquence courante rendue dans l'ancien système (ou
      // testFrequency si l'ancien était free).
      const srcFreq = prevSys.freq
        ? prevSys.freq(state.editor.testNoteIndex, state.editor.testOctave, a4Ref, xEdoN)
        : state.editor.testFrequency
      const { noteIndex, octave } = frequencyToNearestIn(srcFreq, next, a4Ref, xEdoN)
      return {
        ...state,
        editor: {
          ...state.editor,
          testTuningSystem: next,
          testNoteIndex: noteIndex,
          testOctave: octave,
          visualCueTonic: cueTonic,
        },
      }
    }
    case 'SET_X_EDO_N': {
      // F.8.1.3 : changement du nombre de degrés du système X-EDO. On clamp
      // à [X_EDO_MIN, X_EDO_MAX], puis pour chaque clip 'x-edo' on snap sa
      // fréquence vers la nouvelle grille (la cohérence acoustique l'emporte
      // sur la conservation de noteIndex). Les autres clips et l'éditeur ne
      // sont pas affectés. Composer-undoable.
      const nextN = sanitizeXEdoN(action.payload)
      if (nextN === state.xEdoN) return state
      const a4Ref = state.a4Ref ?? DEFAULT_A4
      const prevN = state.xEdoN ?? DEFAULT_X_EDO_N
      const clips = state.clips.map((c) => {
        if (c.tuningSystem !== 'x-edo') return c
        const oldFreq = clipFrequency(c, a4Ref, prevN)
        const snapped = frequencyToNearestIn(oldFreq, 'x-edo', a4Ref, nextN)
        return { ...c, noteIndex: snapped.noteIndex, octave: snapped.octave }
      })
      // Rééchantillonne aussi l'éditeur si testTuningSystem === 'x-edo' :
      // sinon le test resterait sur un noteIndex potentiellement hors grille.
      let editor = state.editor
      if (editor.testTuningSystem === 'x-edo') {
        const oldEditorFreq = getTuningSystem('x-edo').freq(
          editor.testNoteIndex, editor.testOctave, a4Ref, prevN,
        )
        const snap = frequencyToNearestIn(oldEditorFreq, 'x-edo', a4Ref, nextN)
        editor = { ...editor, testNoteIndex: snap.noteIndex, testOctave: snap.octave }
      }
      // visualCueTonic borné à la nouvelle grille (équivalent du traitement
      // dans SET_EDITOR_TEST_TUNING_SYSTEM).
      if (editor.visualCueTonic >= nextN) {
        editor = { ...editor, visualCueTonic: 0 }
      }
      return { ...state, xEdoN: nextN, clips, editor }
    }
    case 'SET_EDITOR_VISUAL_CUE_PATTERN': {
      return { ...state, editor: { ...state.editor, visualCuePattern: action.payload } }
    }
    case 'SET_EDITOR_VISUAL_CUE_TONIC': {
      return { ...state, editor: { ...state.editor, visualCueTonic: action.payload } }
    }
    case 'SET_EDITOR_TEST_FREQUENCY': {
      return { ...state, editor: { ...state.editor, testFrequency: action.payload } }
    }
    case 'SET_EDITOR_AMPLITUDE': {
      return { ...state, editor: { ...state.editor, amplitude: action.payload } }
    }
    case 'SET_EDITOR_CAP': {
      // `cap` borne les harmoniques. Ne touche pas canonical (la troncature
      // vit dans la chaîne audio, pointsToPeriodicWave). M.r.4 — mais changer
      // cap change l'interprétation des barres (combien d'harmoniques lues),
      // donc on repasse à false par prudence : « normalisé à cap=N » ne garantit
      // pas « normalisé à cap=M ».
      return { ...state, editor: { ...state.editor, cap: clampCap(action.payload), canonicalNormalized: false } }
    }
    // Lentille active (volatile, non undoable). En M.r.1, le switch ne touche
    // pas canonical/anchors/residual (coexistence vivante câblée en M.r.3).
    case 'SET_EDITOR_CURRENT_LENS': {
      if (state.editor.currentLens === action.payload) return state
      return { ...state, editor: { ...state.editor, currentLens: action.payload } }
    }
    // Mise à jour d'une barre (index 0-based = harmonique index+1).
    // M.r.1 : pas de dialog « normalise avant d'éditer » (M.r.4). On lit les
    // magnitudes courantes des `cap` premières harmoniques sur la canonical,
    // on remplace celle à `index`, et on régénère la canonical par iDFT à
    // phase canonique → la phase est écrasée silencieusement (assumé jusqu'à
    // M.r.4). Le résidu est recalculé sur les ancres courantes.
    case 'SET_EDITOR_HARMONIC_AMPLITUDE': {
      const { index, value } = action.payload
      const cap = state.editor.cap
      if (index < 0 || index >= cap) return state
      // canonicalToBars renvoie des amplitudes véritables (× 2 sur les
      // magnitudes FFT bilatérales) — c'est ce qu'attend harmonicsToPoints.
      const amplitudes = canonicalToBars(state.editor.canonical, cap)
      amplitudes[index] = Math.max(0, Math.min(1, value))
      const canonical = harmonicsToPoints(amplitudes, cap)
      // M.r.3 — re-fit des ancres sur la canonical reconstruite par iDFT.
      const { anchors, residual } = refitAnchorsAndResidual(
        canonical, state.editor.anchors, state.editor.interpolation,
      )
      // M.r.4 — iDFT à phase canonique = canonical normalisée par construction.
      return { ...state, editor: { ...state.editor, canonical, anchors, residual, canonicalNormalized: true } }
    }
    // iter-N phase-5c : chargement unifié d'un preset (modale = point d'entrée
    // unique). Le payload est déjà résolu par la modale (qui a le moteur
    // src/lib/waveforms.js + harmonicsToPoints) : canonical générée + cap +
    // anchorCount idéal + flag canonicalNormalized + identité preset.
    //   - base idéale   : idealWaveform(type), cap 256, normalized=(type==='sine')
    //   - base band-lim. : bandlimitedWaveform(type, N), cap N, normalized=false
    //   - timbre conçu  : harmonicsToPoints(amplitudes, N), cap N, normalized=true
    // Le reducer pose la canonical telle quelle et fitte les ancres par DP au
    // `anchorCount` du preset (≠ refitAnchorsAndResidual qui préserve le compte
    // courant) → la lentille Ancres est exploitable d'emblée. Une seule action
    // undoable. ADSR / amplitude inchangés (un preset porte un timbre).
    case 'LOAD_PRESET': {
      const { canonical, cap, anchorCount, canonicalNormalized, preset } = action.payload
      const clampedCap = clampCap(cap)
      const count = Math.max(
        SPLINE_ANCHOR_MIN,
        Math.min(SPLINE_ANCHOR_MAX, Math.round(anchorCount || DEFAULT_SPLINE_ANCHOR_COUNT)),
      )
      const anchors = fitAnchorsToCurve(canonical, count)
      const residual = computeResidual(canonical, splineToPoints(anchors, state.editor.interpolation))
      return {
        ...state,
        editor: {
          ...state.editor,
          cap: clampedCap,
          canonical,
          anchors,
          residual,
          canonicalNormalized: !!canonicalNormalized,
          preset: preset ?? null,
        },
        // iter-N phase-5e.1 : chargement en place comme RESET_EDITOR_WAVEFORM —
        // on conserve currentPatchId (remplace le timbre du patch courant, marque
        // dirty) au lieu de détacher (ex-`currentPatchId: null` = effet Ctrl+Alt+N).
      }
    }
    // Modele unifie (M rattrapage) : plus de conversions destructives. Les
    // trois lentilles regardent toutes la meme canonical. Les anciens
    // CONVERT_EDITOR_TO_HARMONIC / _TO_DRAW / _TO_SPLINE sont supprimes.

    // iter-M phase-3 : déplacement d'une ancre spline. X clampé pour ne pas
    // dépasser les voisins (préserve l'ordre des x) ; Y libre (non borné à ±1
    // depuis M.r.5.bis, cf. cy).
    // Dispatchée une seule fois au commit du drag (draft local côté éditeur),
    // donc un seul cran undo par geste. Recalcule `points`.
    case 'MOVE_SPLINE_ANCHOR': {
      const { index, x, y } = action.payload
      const anchors = state.editor.anchors
      if (index < 0 || index >= anchors.length) return state
      const lower = index > 0 ? anchors[index - 1].x + SPLINE_MIN_GAP : 0
      const upper = index < anchors.length - 1
        ? anchors[index + 1].x - SPLINE_MIN_GAP
        : POINTS_RESOLUTION - SPLINE_MIN_GAP
      const cx = Math.max(lower, Math.min(upper, x))
      // M.r.5.bis — y non clampé à ±1 (aligné sur le tracé libre) ; l'éditeur le
      // borne à l'amplitude affichée ±peak. Garde anti-NaN seulement.
      const cy = Number.isFinite(y) ? y : 0
      const next = anchors.slice()
      next[index] = { x: cx, y: cy }
      // N.3 — déformation 2D à support local : le détail (résidu) suit l'ancre au
      // lieu de rester planté (plus de double pointe). `state.editor.{anchors,
      // residual}` SONT la réf figée du début de drag (le drag est un draft local
      // dans SplineEditor, aucun dispatch n'a eu lieu entre-temps → un seul commit
      // ici = un seul warp par le déplacement total x0→xN). On ne re-fit PAS les
      // ancres (positions voulues conservées). M.r.4 — phase non-canonique.
      const residual = warpResidualForAnchorMove(state.editor.residual, anchors, index, cx, state.editor.interpolation)
      const canonical = splinePlusResidual(splineToPoints(next, state.editor.interpolation), residual)
      return {
        ...state,
        editor: { ...state.editor, anchors: next, residual, canonical, canonicalNormalized: false },
      }
    }
    // Ajout d'une ancre (clic sur la courbe). Insérée en maintenant l'ordre
    // cyclique des x. Refusé si N == SPLINE_ANCHOR_MAX, ou si l'x est confondu
    // avec un voisin (segment de largeur nulle).
    case 'ADD_SPLINE_ANCHOR': {
      const anchors = state.editor.anchors
      if (anchors.length >= SPLINE_ANCHOR_MAX) return state
      // N.3.2 — x snappé à un entier : `y = canonical[x]` est alors exact et le
      // résidu vaut 0 pile au point d'ajout (l'ancre se pose sur le tracé).
      const x = Math.max(0, Math.min(POINTS_RESOLUTION - 1, Math.round(action.payload.x)))
      let ins = anchors.findIndex((a) => a.x > x)
      if (ins === -1) ins = anchors.length
      const leftOk = ins === 0 || x - anchors[ins - 1].x >= SPLINE_MIN_GAP
      const rightOk = ins === anchors.length || anchors[ins].x - x >= SPLINE_MIN_GAP
      if (!leftOk || !rightOk) return state
      // N.3.2 — ajouter une ancre CHANGE la représentation, pas la forme (modèle
      // N.2.1). Snap sur le tracé : y = canonical[x] (la hauteur du clic
      // `action.payload.y` est ignorée). canonical INCHANGÉE → zéro déformation ;
      // on recalcule juste le résidu. canonicalNormalized préservé (canonical immobile).
      const canonical = state.editor.canonical
      const y = Number.isFinite(canonical[x]) ? canonical[x] : 0
      const next = anchors.slice()
      next.splice(ins, 0, { x, y })
      const residual = computeResidual(canonical, splineToPoints(next, state.editor.interpolation))
      return {
        ...state,
        editor: { ...state.editor, anchors: next, residual },
      }
    }
    // Suppression d'une ancre. Refusé si N == SPLINE_ANCHOR_MIN (minimum).
    case 'REMOVE_SPLINE_ANCHOR': {
      const { index } = action.payload
      const anchors = state.editor.anchors
      if (anchors.length <= SPLINE_ANCHOR_MIN) return state
      if (index < 0 || index >= anchors.length) return state
      const next = anchors.filter((_, i) => i !== index)
      // N.3.2 — retirer une ancre CHANGE la représentation, pas la forme (modèle
      // N.2.1). canonical INCHANGÉE → tracé inchangé, juste moins de points de
      // contrôle ; on recalcule le résidu. canonicalNormalized préservé.
      const residual = computeResidual(state.editor.canonical, splineToPoints(next, state.editor.interpolation))
      return {
        ...state,
        editor: { ...state.editor, anchors: next, residual },
      }
    }
    // Bascule Doux (Catmull-Rom) / Anguleux (polyligne). Mêmes ancres, courbe
    // recalculée.
    case 'SET_SPLINE_INTERPOLATION': {
      const interpolation = action.payload === 'hard' ? 'hard' : 'soft'
      if (state.editor.interpolation === interpolation) return state
      // N.2.1 — la bascule est un no-op sur la canonical : on garde le tracé
      // strictement identique et on recalcule le résidu contre le nouveau mode.
      // (Avant : recompose via splinePlusResidual contre le résidu gelé →
      // déformait la canonical alors qu'aucune ancre n'a bougé.) `canonical`
      // inchangée ⇒ son inchangé ET statut de normalisation préservé.
      const residual = computeResidual(
        state.editor.canonical,
        splineToPoints(state.editor.anchors, interpolation),
      )
      return {
        ...state,
        editor: { ...state.editor, interpolation, residual },
      }
    }
    case 'SET_EDITOR_ADSR': {
      return { ...state, editor: { ...state.editor, ...action.payload } }
    }
    // F.3.11.3 : applique un patch ADSR ET une nouvelle amplitude en une
    // seule action pour que le drag P1 diagonal (X=attack, Y=amp) produise
    // un seul snapshot undo. payload : { adsr: {...}, amplitude: number }
    // (les deux optionnels). Sans ça, deux dispatch successifs créaient
    // deux entrées dans l'historique → 2 Ctrl+Z pour annuler un geste.
    case 'SET_EDITOR_ADSR_AND_AMP': {
      const { adsr, amplitude } = action.payload
      const next = { ...state.editor, ...(adsr ?? {}) }
      if (amplitude !== undefined) next.amplitude = amplitude
      return { ...state, editor: next }
    }
    // iter-N phase-5c.3 : APPLY_EDITOR_PRESET supprimé — la barre des presets
    // géométriques (mode Libre) qui le déclenchait a été retirée au profit de la
    // modale (chemin LOAD_PRESET unifié).
    case 'RESET_EDITOR': {
      // iter-L follow-up : préserve l'état d'exploration Designer (test* +
      // visualCue*) — c'est lié à l'utilisateur (système musical choisi,
      // octave, etc.), pas au patch en cours. Symétrique avec
      // HYDRATE_EDITOR_FROM_PATCH qui ne touche jamais ces champs. Sans
      // cette préservation, "Nouveau patch" (Ctrl+Alt+N) ramenait le
      // système à 12-TET, l'octave à 4, etc., même si l'utilisateur
      // explorait un autre tempérament — comportement non attendu.
      const { testTuningSystem, testNoteIndex, testOctave, testFrequency,
        visualCuePattern, visualCueTonic } = state.editor
      return {
        ...state,
        editor: {
          ...DEFAULT_EDITOR,
          // Modèle unifié : canonical/residual neufs, ancres plates clonées.
          canonical: [...DEFAULT_EDITOR.canonical],
          residual: [...DEFAULT_EDITOR.residual],
          anchors: DEFAULT_EDITOR.anchors.map((a) => ({ ...a })),
          testTuningSystem,
          testNoteIndex,
          testOctave,
          testFrequency,
          visualCuePattern,
          visualCueTonic,
        },
        currentPatchId: null,
      }
    }
    case 'SET_EDITOR_ANCHOR_COUNT': {
      // iter-M phase-r.2.4 : ré-équirépartit `count` ancres sur la canonical
      // courante (fitAnchorsToCurve), puis recompute le résidu = canonical −
      // spline(nouvelles ancres). Ne touche PAS à la canonical (≠ Reset) :
      // c'est un re-fit de la lentille spline. Le résidu absorbe la différence,
      // donc le tracé survit au changement d'ancres.
      const count = Math.max(
        SPLINE_ANCHOR_MIN,
        Math.min(SPLINE_ANCHOR_MAX, Math.round(action.payload.count)),
      )
      const anchors = fitAnchorsToCurve(state.editor.canonical, count)
      const residual = computeResidual(
        state.editor.canonical,
        splineToPoints(anchors, state.editor.interpolation),
      )
      return { ...state, editor: { ...state.editor, anchors, residual } }
    }
    case 'NORMALIZE_EDITOR_CANONICAL': {
      // iter-M phase-r.2.3 : iDFT à phase canonique sur les `cap` premières
      // amplitudes véritables. Même opération sous-jacente que l'édition d'une
      // barre (SET_EDITOR_HARMONIC_AMPLITUDE) mais sans modifier d'amplitude :
      // on relit les barres et on les réécrit, ce qui régularise la phase.
      // Résidu recalculé sur les ancres courantes (cohérent avec les autres
      // actions canonical). Pas de dialog (undoable). Aucune détection d'état
      // normalisé en M.r.2 — si déjà à phase canonique, quasi no-op + 1 cran
      // d'undo (documenté, amélioré en M.r.4).
      const cap = state.editor.cap
      const amplitudes = canonicalToBars(state.editor.canonical, cap)
      const canonical = harmonicsToPoints(amplitudes, cap)
      // M.r.3 — re-fit des ancres sur la canonical normalisée.
      const { anchors, residual } = refitAnchorsAndResidual(
        canonical, state.editor.anchors, state.editor.interpolation,
      )
      // M.r.4 — c'est l'opération de normalisation elle-même.
      return { ...state, editor: { ...state.editor, canonical, anchors, residual, canonicalNormalized: true } }
    }
    case 'SMOOTH_EDITOR_CANONICAL': {
      // iter-N phase-4.1 : lissage passe-bas (Gaussien wrap) du tracé. Voie
      // non-spline → re-fit des ancres (comme SET_EDITOR_CANONICAL) + résidu +
      // canonicalNormalized false (le lissage ne produit pas une phase canonique
      // iDFT). preset null (le tracé n'est plus la forme nommée). Répétable.
      const canonical = gaussianSmoothWrapped(state.editor.canonical, 3)
      const { anchors, residual } = refitAnchorsAndResidual(
        canonical, state.editor.anchors, state.editor.interpolation,
      )
      return { ...state, editor: { ...state.editor, canonical, anchors, residual, preset: null, canonicalNormalized: false } }
    }
    case 'TEND_TOWARD_SPLINE': {
      // iter-N phase-4.2 : rapproche le tracé de son squelette d'ancres —
      // canonical_new = lerp(canonical, spline(anchors), α=0.5). On GARDE les
      // ancres telles quelles (on tend vers elles, pas de re-fit) et on recalcule
      // SEULEMENT le résidu = canonical_new − spline(anchors). Répétable : à α
      // cumulé → 1, la canonical EST la spline (le résidu décroît en (1−α)^n → 0).
      // Dépend du nombre d'ancres (peu d'ancres = lisse fort, 32 = effet faible).
      const alpha = 0.5
      const spline = splineToPoints(state.editor.anchors, state.editor.interpolation)
      const prev = state.editor.canonical
      const canonical = new Array(POINTS_RESOLUTION)
      for (let i = 0; i < POINTS_RESOLUTION; i++) {
        canonical[i] = prev[i] + (spline[i] - prev[i]) * alpha
      }
      const residual = computeResidual(canonical, spline)
      return { ...state, editor: { ...state.editor, canonical, residual, preset: null, canonicalNormalized: false } }
    }
    case 'RESET_EDITOR_WAVEFORM': {
      // iter-M phase-r.2.6.1/.3 : réinitialise canonical, interpolation et
      // résidu, et aplatit les ancres. `cap` (plafond d'harmoniques) ET le
      // NOMBRE d'ancres sont PRÉSERVÉS — deux réglages que l'utilisateur a posés
      // et qu'un simple effacement de timbre ne doit pas perdre (r.2.6.3).
      // Ne touche PAS au reste de l'éditeur (ADSR, amplitude, test*, visualCue*,
      // currentLens) ni à currentPatchId. preset → null : le timbre vient d'être
      // effacé, plus de filiation à un preset. Ctrl+Alt+N (RESET_EDITOR) reste
      // l'outil de remise à zéro complète. ConfirmDialog systématique côté UI.
      return {
        ...state,
        editor: {
          ...state.editor,
          canonical: new Array(POINTS_RESOLUTION).fill(0),
          anchors: defaultSplineAnchors(state.editor.anchors?.length),
          interpolation: DEFAULT_SPLINE_INTERPOLATION,
          residual: new Array(POINTS_RESOLUTION).fill(0),
          preset: null,
          // M.r.4 — canonical = silence = trivialement normalisée.
          canonicalNormalized: true,
          // cap & nombre d'ancres : PRÉSERVÉS (≠ Ctrl+Alt+N qui réinitialise tout).
        },
      }
    }
    case 'HYDRATE_EDITOR_FROM_PATCH': {
      // Non-undoable : utilisé quand on charge un patch dans l'éditeur. Ne
      // touche PAS aux champs test* (contexte de test de l'utilisateur).
      const patch = action.payload
      if (!patch) {
        return {
          ...state,
          editor: {
            ...DEFAULT_EDITOR,
            canonical: [...DEFAULT_EDITOR.canonical],
            residual: [...DEFAULT_EDITOR.residual],
            anchors: DEFAULT_EDITOR.anchors.map((a) => ({ ...a })),
          },
        }
      }
      // Modèle unifié : on recopie canonical + cap + lentille spline du patch.
      // currentLens repart à 'free'. test* / visualCue* préservés (non portés
      // par le patch).
      return {
        ...state,
        editor: {
          ...state.editor,
          canonical: Array.from(patch.canonical),
          cap: clampCap(patch.cap),
          anchors: (sanitizeAnchors(patch.anchors) ?? defaultSplineAnchors()).map((a) => ({ ...a })),
          interpolation: patch.interpolation === 'hard' ? 'hard' : 'soft',
          residual: Array.from(patch.residual),
          currentLens: 'free',
          // M.r.4 — le flag n'est pas persisté dans le patch : phase inconnue au
          // rechargement → false (l'utilisateur normalisera explicitement avant
          // d'éditer une barre si besoin). La branche patch null ci-dessus repart
          // de DEFAULT_EDITOR (silence = true).
          canonicalNormalized: false,
          amplitude: patch.amplitude,
          preset: patch.preset,
          attack: patch.attack,
          hold: patch.hold ?? DEFAULT_ADSR.hold,
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
      return {
        ...state,
        activeTab: action.payload,
        pendingDeleteWarning: null,
      }
    }
    case 'SET_THEME': {
      const next = action.payload === 'light' ? 'light' : 'dark'
      if (state.theme === next) return state
      return { ...state, theme: next }
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
    case 'SET_SHORTCUTS_OVERLAY': {
      const next = !!action.payload
      if (state.shortcutsOverlayOpen === next) return state
      return { ...state, shortcutsOverlayOpen: next }
    }

    // iter-L phase-4 : actions du Tour guidé. Le snapshot est capturé une
    // seule fois au premier START_TOUR (quand !active) et survit au chaînage
    // entre onglets (TOUR_CHAIN ne re-snapshot pas). END_TOUR le restaure ;
    // END_TOUR_NO_RESTORE l'abandonne (« En savoir plus » part volontairement
    // vers la doc). stepIndex indexe les étapes brutes du tour ; le moteur
    // (Tour.jsx) gère le skip des ancres absentes au niveau de la séquence
    // effective et pilote la navigation via TOUR_GOTO.
    case 'START_TOUR': {
      const tabId = action.payload
      const snapshot = state.tour.active ? state.tour.snapshot : {
        activeTab: state.activeTab,
        designerSidebarCollapsed: state.designerSidebarCollapsed,
        docSidebarCollapsed: state.docSidebarCollapsed,
        composerBankCollapsed: state.composerBankCollapsed,
        composerAsideCollapsed: state.composerAsideCollapsed,
      }
      return {
        ...state,
        activeTab: tabId,
        pendingDeleteWarning: null,
        tour: { active: true, tabId, stepIndex: 0, snapshot },
      }
    }
    case 'TOUR_GOTO': {
      if (!state.tour.active) return state
      const idx = Math.max(0, action.payload | 0)
      if (state.tour.stepIndex === idx) return state
      return { ...state, tour: { ...state.tour, stepIndex: idx } }
    }
    case 'TOUR_NEXT': {
      if (!state.tour.active) return state
      return { ...state, tour: { ...state.tour, stepIndex: state.tour.stepIndex + 1 } }
    }
    case 'TOUR_PREV': {
      if (!state.tour.active) return state
      return { ...state, tour: { ...state.tour, stepIndex: Math.max(0, state.tour.stepIndex - 1) } }
    }
    case 'TOUR_CHAIN': {
      if (!state.tour.active) return state
      const tabId = action.payload
      return {
        ...state,
        activeTab: tabId,
        pendingDeleteWarning: null,
        tour: { ...state.tour, tabId, stepIndex: 0 },
      }
    }
    case 'END_TOUR': {
      if (!state.tour.active) return state
      const snap = state.tour.snapshot
      const restored = snap ? {
        activeTab: snap.activeTab,
        designerSidebarCollapsed: snap.designerSidebarCollapsed,
        docSidebarCollapsed: snap.docSidebarCollapsed,
        composerBankCollapsed: snap.composerBankCollapsed,
        composerAsideCollapsed: snap.composerAsideCollapsed,
      } : {}
      return {
        ...state,
        ...restored,
        tour: { active: false, tabId: null, stepIndex: 0, snapshot: null },
      }
    }
    case 'END_TOUR_NO_RESTORE': {
      if (!state.tour.active) return state
      return {
        ...state,
        tour: { active: false, tabId: null, stepIndex: 0, snapshot: null },
      }
    }
    case 'SET_SELECTED_TRACK_ID': {
      // iter-L phase-1.4.b : track active du Composer. Non-undoable, persisté
      // en localStorage. Sert au fallback du bouton Coller et de signifiant
      // visuel sur le header. Cf. archi/BACKLOG.md "Spécifications L.1".
      const trackId = action.payload
      if (trackId !== null && !state.tracks.some((t) => t.id === trackId)) return state
      if (state.selectedTrackId === trackId) return state
      return { ...state, selectedTrackId: trackId }
    }
    case 'SET_CURRENT_PATCH_ID': {
      return { ...state, currentPatchId: action.payload }
    }
    case 'SET_SPECTROGRAM_VISIBLE': {
      return { ...state, spectrogramVisible: !!action.payload }
    }
    case 'SET_SPECTROGRAM_DB_SCALE': {
      return { ...state, spectrogramDbScale: !!action.payload }
    }
    case 'SET_SPECTROGRAM_PEAK_HOLD': {
      return { ...state, spectrogramPeakHold: !!action.payload }
    }
    case 'SET_SPECTROGRAM_MODE': {
      return { ...state, spectrogramMode: action.payload === 'live' ? 'live' : 'static' }
    }
    case 'SET_BIB_HIERARCHY_MODE': {
      const mode = action.payload === 'tree' ? 'tree' : 'nav'
      if (mode === 'tree' && state.bibCurrentFolderId) {
        // Auto-expand path du dossier courant pour qu'il soit visible en tree mode.
        const ancestorIds = []
        let cur = state.bibCurrentFolderId
        while (cur) {
          ancestorIds.push(cur)
          const folder = state.soundFolders.find(f => f.id === cur)
          cur = folder?.parentId
        }
        const newCollapsed = (state.bibCollapsedFolders || []).filter(id => !ancestorIds.includes(id))
        return { ...state, bibHierarchyMode: mode, bibCollapsedFolders: newCollapsed }
      }
      return { ...state, bibHierarchyMode: mode }
    }
    case 'TOGGLE_BIB_FOLDER_COLLAPSED': {
      const { folderId } = action.payload
      const list = state.bibCollapsedFolders || []
      const idx = list.indexOf(folderId)
      const newList = idx >= 0 ? list.filter(id => id !== folderId) : [...list, folderId]
      return { ...state, bibCollapsedFolders: newList }
    }
    case 'SET_BIB_COLLAPSED_FOLDERS': {
      const list = Array.isArray(action.payload) ? action.payload : []
      return { ...state, bibCollapsedFolders: list }
    }
    case 'SET_BIB_DISPLAY_MODE': {
      const mode = ['list', 'details', 'tiles'].includes(action.payload) ? action.payload : 'list'
      return { ...state, bibDisplayMode: mode }
    }
    case 'SET_BIB_CURRENT_FOLDER': {
      // Vide aussi la sélection (per spec : cleared sur change de folder)
      return { ...state, bibCurrentFolderId: action.payload, bibSelectedIds: [], bibSelectionAnchor: null }
    }
    case 'SELECT_BIB_ITEMS': {
      const { items, mode } = action.payload
      const existing = state.bibSelectedIds
      const keyOf = (i) => `${i.type}:${i.id}`
      const existingKeys = new Set(existing.map(keyOf))
      const newItemKeys = items.map(keyOf)
      let result
      if (mode === 'set') {
        result = items
      } else if (mode === 'add') {
        const dedup = new Set(existingKeys)
        const merged = [...existing]
        for (const item of items) {
          if (!dedup.has(keyOf(item))) { merged.push(item); dedup.add(keyOf(item)) }
        }
        result = merged
      } else if (mode === 'toggle') {
        const toRemove = new Set(newItemKeys)
        result = existing.filter(i => !toRemove.has(keyOf(i)))
      } else if (mode === 'range') {
        result = items
      } else {
        result = existing
      }
      // Anchor : mis à jour sauf en mode 'range' (qui le conserve)
      const newAnchor = mode === 'range' ? state.bibSelectionAnchor :
                        items.length > 0 ? items[items.length - 1] : null
      return { ...state, bibSelectedIds: result, bibSelectionAnchor: newAnchor }
    }
    case 'CLEAR_BIB_SELECTION': {
      return { ...state, bibSelectedIds: [], bibSelectionAnchor: null }
    }
    case 'OPEN_IN_LIBRARY': {
      const { type, id } = action.payload
      let parentFolderId = null
      if (type === 'patch') {
        const patch = state.patches.find(p => p.id === id)
        if (patch) parentFolderId = patch.folderId ?? null
      } else if (type === 'folder') {
        const folder = state.soundFolders.find(f => f.id === id)
        if (folder) parentFolderId = folder.parentId ?? null
      }
      return {
        ...state,
        activeTab: 'library',
        bibCurrentFolderId: parentFolderId,
        bibHierarchyMode: 'nav',
        bibSelectedIds: [{ type, id }],
        bibSelectionAnchor: { type, id },
        pendingDeleteWarning: null,
      }
    }
    case 'GO_TO_COMPOSER_WITH_CLIPS': {
      const { patchIds } = action.payload
      const clipIds = (state.clips || [])
        .filter(c => patchIds.includes(c.patchId))
        .map(c => c.id)
      return {
        ...state,
        activeTab: 'composer',
        selectedClipIds: clipIds,
        pendingDeleteWarning: null,
      }
    }
    case 'SET_BIB_POPUP_WIDTH': {
      const w = Math.max(320, Math.min(action.payload, 1200))
      return { ...state, bibPopupWidth: w }
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
    case 'SET_DESIGNER_SIDEBAR_WIDTH': {
      const clamped = Math.max(DESIGNER_SIDEBAR_MIN_WIDTH, Math.round(action.payload))
      if (state.designerSidebarWidth === clamped) return state
      return { ...state, designerSidebarWidth: clamped }
    }
    case 'SET_DESIGNER_SIDEBAR_COLLAPSED': {
      const value = !!action.payload
      if (state.designerSidebarCollapsed === value) return state
      return { ...state, designerSidebarCollapsed: value }
    }
    // iter-M phase-2 : proportions des 3 colonnes Designer (presets + drag des
    // séparateurs). Renormalise à somme 1 ; entrée invalide ignorée.
    case 'SET_DESIGNER_COLUMN_WIDTHS': {
      const widths = sanitizeColumnWidths(action.payload)
      if (!widths) return state
      return { ...state, designerColumnWidths: widths }
    }
    // iter-M phase-2-as : toggle auto-sizing (essai). Écrit dans le même état
    // de proportions au gré du focus (cf. DesignerColumns). Retrait éventuel
    // (« jeter ») = supprimer ce case + le champ persisté + le listener.
    case 'SET_AUTO_SIZING': {
      const value = !!action.payload
      if (state.autoSizing === value) return state
      return { ...state, autoSizing: value }
    }
    // iter-L phase-2.1 : actions de l'onglet Documentation.
    case 'SET_CURRENT_ARTICLE': {
      const id = typeof action.payload === 'string' || action.payload === null
        ? action.payload
        : state.doc.currentArticleId
      if (state.doc.currentArticleId === id) return state
      return { ...state, doc: { ...state.doc, currentArticleId: id } }
    }
    case 'SET_ARTICLE_SCROLL': {
      const { articleId, scrollTop } = action.payload
      if (typeof articleId !== 'string') return state
      if (!Number.isFinite(scrollTop)) return state
      const current = state.doc.scrollPositions[articleId]
      if (current === scrollTop) return state
      return {
        ...state,
        doc: {
          ...state.doc,
          scrollPositions: { ...state.doc.scrollPositions, [articleId]: scrollTop },
        },
      }
    }
    case 'TOGGLE_DOC_SIDEBAR': {
      return { ...state, docSidebarCollapsed: !state.docSidebarCollapsed }
    }
    case 'SET_DOC_SIDEBAR_WIDTH': {
      const clamped = Math.max(DOC_SIDEBAR_MIN_WIDTH, Math.round(action.payload))
      if (state.docSidebarWidth === clamped) return state
      return { ...state, docSidebarWidth: clamped }
    }
    case 'SET_COMPOSER_FLASH': {
      return { ...state, composerFlash: action.payload }
    }
    case 'SET_NOTIFICATION': {
      return { ...state, notification: action.payload }
    }

    // ----- Bibliothèque clipboard (iter K) -----
    case 'COPY_BIB_ITEMS': {
      const { items } = action.payload
      if (items.length === 0) return state
      return { ...state, bibClipboard: { mode: 'copy', items: [...items] } }
    }
    case 'CUT_BIB_ITEMS': {
      const { items } = action.payload
      if (items.length === 0) return state
      return { ...state, bibClipboard: { mode: 'cut', items: [...items] } }
    }
    case 'CLEAR_BIB_CLIPBOARD': {
      return { ...state, bibClipboard: null }
    }
    case 'PASTE_BIB_CLIPBOARD': {
      if (!state.bibClipboard) return state
      const { targetFolderId = null } = action.payload
      const { mode, items } = state.bibClipboard

      if (wouldCreateCycle(items, targetFolderId, state.soundFolders)) {
        return {
          ...state,
          notification: {
            message: 'Impossible : un dossier ne peut pas être collé dans lui-même ou un de ses sous-dossiers.',
            type: 'error',
            timestamp: Date.now(),
          },
        }
      }

      if (mode === 'cut') {
        const patchIds = new Set(items.filter(i => i.type === 'patch').map(i => i.id))
        const folderIds = new Set(items.filter(i => i.type === 'folder').map(i => i.id))
        return {
          ...state,
          patches: state.patches.map(p =>
            patchIds.has(p.id) ? { ...p, folderId: targetFolderId } : p
          ),
          soundFolders: state.soundFolders.map(f =>
            folderIds.has(f.id) ? { ...f, parentId: targetFolderId } : f
          ),
          // Bascule en copy : préserve le clipboard pour multi-paste
          bibClipboard: { mode: 'copy', items: [...items] },
        }
      }
      // mode === 'copy' : duplique, clipboard reste actif
      const result = duplicateItemsToFolder(items, targetFolderId, state)
      return {
        ...state,
        patches: [...state.patches, ...result.newPatches],
        soundFolders: [...state.soundFolders, ...result.newFolders],
        patchCounter: result.patchCounterAfter,
        folderCounter: result.folderCounterAfter,
      }
    }
    case 'MOVE_BIB_ITEMS': {
      const { items, targetFolderId = null } = action.payload
      if (items.length === 0) return state
      if (wouldCreateCycle(items, targetFolderId, state.soundFolders)) {
        return {
          ...state,
          notification: {
            message: 'Impossible : un dossier ne peut pas être déplacé dans lui-même ou un de ses sous-dossiers.',
            type: 'error',
            timestamp: Date.now(),
          },
        }
      }
      const patchIds = new Set(items.filter(i => i.type === 'patch').map(i => i.id))
      const folderIds = new Set(items.filter(i => i.type === 'folder').map(i => i.id))
      return {
        ...state,
        patches: state.patches.map(p =>
          patchIds.has(p.id) ? { ...p, folderId: targetFolderId } : p
        ),
        soundFolders: state.soundFolders.map(f =>
          folderIds.has(f.id) ? { ...f, parentId: targetFolderId } : f
        ),
      }
    }
    case 'DELETE_BIB_ITEMS': {
      const { items } = action.payload
      if (!items || items.length === 0) return state

      // Précalcul : patchId → nombre de clips référençant ce patch.
      const usageByPatchId = new Map()
      for (const c of (state.clips || [])) {
        usageByPatchId.set(c.patchId, (usageByPatchId.get(c.patchId) ?? 0) + 1)
      }
      const usageOf = (patchId) => usageByPatchId.get(patchId) ?? 0

      const blockedPatches = []
      const allowedPatchIds = new Set()
      const allowedFolderIds = new Set()

      for (const item of items) {
        if (item.type === 'patch') {
          const usage = usageOf(item.id)
          if (usage > 0) {
            const patch = state.patches.find(p => p.id === item.id)
            if (patch) blockedPatches.push({ id: item.id, name: patch.name, usageCount: usage })
          } else if (state.patches.find(p => p.id === item.id)) {
            allowedPatchIds.add(item.id)
          }
        } else if (item.type === 'folder') {
          const folder = state.soundFolders.find(f => f.id === item.id)
          if (!folder) continue
          const result = countFolderContents(item.id, state.soundFolders, state.patches)
          const blockedDescendants = result.patchIds.filter(pid => usageOf(pid) > 0)
          if (blockedDescendants.length > 0) {
            // Folder entier bloqué (atomicity) : tous les patches bloqués remontent
            for (const pid of blockedDescendants) {
              const p = state.patches.find(pp => pp.id === pid)
              if (p) blockedPatches.push({ id: pid, name: p.name, usageCount: usageOf(pid) })
            }
          } else {
            // Folder libre : marque tout son sous-arbre comme supprimable.
            allowedFolderIds.add(item.id)
            const descendantFolderIds = getDescendantFolderIds(item.id, state.soundFolders)
            for (const fid of descendantFolderIds) allowedFolderIds.add(fid)
            for (const pid of result.patchIds) allowedPatchIds.add(pid)
          }
        }
      }

      // freedCount = items directement demandés qui ont été effectivement supprimés
      const freedCount = items.filter(item => {
        if (item.type === 'patch') return allowedPatchIds.has(item.id)
        if (item.type === 'folder') return allowedFolderIds.has(item.id)
        return false
      }).length

      // currentPatchId : si supprimé, set à null
      const newCurrentPatchId = allowedPatchIds.has(state.currentPatchId)
        ? null
        : state.currentPatchId

      return {
        ...state,
        patches: state.patches.filter(p => !allowedPatchIds.has(p.id)),
        soundFolders: state.soundFolders.filter(f => !allowedFolderIds.has(f.id)),
        currentPatchId: newCurrentPatchId,
        bibSelectedIds: [],
        bibSelectionAnchor: null,
        // iter-K phase-2.f11 : nettoie le LRU des patches supprimés.
        recentPatchIds: (state.recentPatchIds || []).filter(id => !allowedPatchIds.has(id)),
        pendingDeleteWarning: blockedPatches.length > 0
          ? { blockedPatches, freedCount }
          : null,
      }
    }
    case 'ADD_PATCH_TO_RECENTS': {
      // iter-K phase-2.f11 : ajoute manuellement un patchId au LRU recents
      // (drag-drop depuis le picker vers la liste recents en mode collapsed).
      // Non undoable.
      const { patchId } = action.payload
      if (!patchId || typeof patchId !== 'string') return state
      if (!state.patches.find(p => p.id === patchId)) return state
      const existing = state.recentPatchIds || []
      const filtered = existing.filter(id => id !== patchId)
      const next = [patchId, ...filtered].slice(0, 10)
      // Évite un re-render inutile si le patchId est déjà en tête.
      if (existing.length > 0 && existing[0] === patchId && existing.length === next.length) {
        return state
      }
      return { ...state, recentPatchIds: next }
    }
    case 'CLEAR_PENDING_DELETE_WARNING': {
      return { ...state, pendingDeleteWarning: null }
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
  'CLEAR_TIMELINE', 'SET_BPM', 'SET_A4_REF', 'SET_X_EDO_N',
  'ADD_MEASURES', 'REMOVE_LAST_MEASURE',
  'DELETE_MEASURE', 'INSERT_MEASURES_AT', 'CUT_MEASURE', 'PASTE_MEASURES',
  'CREATE_TRACK', 'RENAME_TRACK', 'DELETE_TRACK', 'REORDER_TRACKS', 'UPDATE_TRACK',
])

const DESIGNER_UNDOABLE = new Set([
  'UPDATE_PATCH',
  'SET_EDITOR_CANONICAL', 'SET_EDITOR_AMPLITUDE', 'SET_EDITOR_CAP',
  'SET_EDITOR_ADSR', 'SET_EDITOR_ADSR_AND_AMP', 'RESET_EDITOR',
  // iter-M phase-r.2 : reset du timbre seul + normalisation (iDFT phase
  // canonique) + re-fit du nombre d'ancres.
  'RESET_EDITOR_WAVEFORM', 'NORMALIZE_EDITOR_CANONICAL', 'SET_EDITOR_ANCHOR_COUNT',
  // iter-N phase-4 : lissages du tracé (passe-bas + tendre vers la spline).
  'SMOOTH_EDITOR_CANONICAL', 'TEND_TOWARD_SPLINE',
  'SET_EDITOR_VISUAL_CUE_PATTERN', 'SET_EDITOR_VISUAL_CUE_TONIC',
  // Modèle unifié (M rattrapage) : édition d'une barre + chargement de preset.
  'SET_EDITOR_HARMONIC_AMPLITUDE', 'LOAD_PRESET',
  // iter-M phase-3 : édition spline (drag/ajout/retrait d'ancre + interpolation).
  'MOVE_SPLINE_ANCHOR', 'ADD_SPLINE_ANCHOR', 'REMOVE_SPLINE_ANCHOR',
  'SET_SPLINE_INTERPOLATION',
])

const LIBRARY_FIELDS = ['patches', 'soundFolders', 'patchCounter', 'folderCounter']

// SAVE_PATCH n'est dans aucune pile undo : la création d'un patch via le
// popup SavePatchDialog est une action explicite et délibérée
// (location + nom validés par l'utilisateur). Suppression manuelle assumée
// si le patch créé est indésirable (cf phase 2 décision archi).
const LIBRARY_UNDOABLE = new Set([
  'CREATE_FOLDER',
  'RENAME_FOLDER',
  'DELETE_FOLDER',
  'RENAME_PATCH',
  'DELETE_PATCH',
  'DELETE_BIB_ITEMS',
  'MOVE_BIB_ITEMS',
  'PASTE_BIB_CLIPBOARD',
  'IMPORT_LIBRARY',
])

const COMPOSER_FIELDS = ['clips', 'numMeasures', 'bpm', 'a4Ref', 'xEdoN', 'selectedClipIds', 'tracks']
const DESIGNER_FIELDS = ['patches', 'editor']

// Champs de preview test du Designer — exclus des snapshots undo.
// Le clavier piano ne sert qu'à tester les sons : aucune raison
// d'historiser quelle touche est sélectionnée. À la restauration
// undo, on garde leurs valeurs courantes (pas d'overwrite).
const EDITOR_TEST_FIELDS = ['testNoteIndex', 'testOctave', 'testTuningSystem', 'testFrequency']

function pickFields(state, fields) {
  const out = {}
  for (const k of fields) {
    if (k === 'editor') {
      // Snapshot editor sans les champs test* (preview-only, non-undoable).
      const filtered = {}
      for (const ek in state.editor) {
        if (!EDITOR_TEST_FIELDS.includes(ek)) filtered[ek] = state.editor[ek]
      }
      out[k] = filtered
    } else {
      out[k] = state[k]
    }
  }
  return out
}

// Restauration : merge editor pour préserver les test* fields
// courants (jamais snapshottés, jamais restaurés).
function restoreSnapshot(state, snapshot) {
  if (!snapshot.editor) return { ...state, ...snapshot }
  return {
    ...state,
    ...snapshot,
    editor: { ...state.editor, ...snapshot.editor },
  }
}

// Patche tous les snapshots de la pile LIBRARY pour qu'ils incluent
// les ajouts (nouveaux patches et/ou folders) d'une action additive non-undoable.
// Garantit que les ajouts persistent à travers les undos (skipUndo "rewrite past").
function patchLibrarySnapshotsAdditive(libHist, { newPatches = [], newFolders = [], patchCounter = null, folderCounter = null }) {
  const patchSnap = (snap) => {
    const patched = { ...snap }
    if (newPatches.length > 0) patched.patches = [...(snap.patches || []), ...newPatches]
    if (newFolders.length > 0) patched.soundFolders = [...(snap.soundFolders || []), ...newFolders]
    if (patchCounter !== null) patched.patchCounter = Math.max(snap.patchCounter ?? 0, patchCounter)
    if (folderCounter !== null) patched.folderCounter = Math.max(snap.folderCounter ?? 0, folderCounter)
    return patched
  }
  return {
    past: libHist.past.map(patchSnap),
    future: libHist.future.map(patchSnap),
  }
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

// iter-L phase-1.4.d : si `lastAnchorClipId` pointe vers un clip qui
// n'existe plus dans state.clips (typiquement après DELETE_MEASURE /
// CUT_MEASURE / DELETE_TRACK / split de mesure qui rotate l'id), on
// reset à null. Appliqué avant syncAnchorWithSelection — quand une
// sélection non-vide subsiste, sync rétablira l'ancre depuis la
// sélection (cf. invariant). Idempotent.
function clampAnchorToExistingClip(state) {
  if (state.lastAnchorClipId == null) return state
  if (state.clips.some((c) => c.id === state.lastAnchorClipId)) return state
  return { ...state, lastAnchorClipId: null }
}

export function withUndo(baseReducer) {
  return function wrapped(state, action) {
    return syncAnchorWithSelection(
      clampAnchorToExistingClip(applyUndoAware(baseReducer, state, action)),
    )
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
        ...restoreSnapshot(state, previous),
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
        ...restoreSnapshot(state, next),
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
        ...restoreSnapshot(state, previous),
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
        ...restoreSnapshot(state, next),
        history: {
          ...state.history,
          designer: { past: [...past, current], future: future.slice(1) },
        },
      }
    }
    if (action.type === 'UNDO_LIBRARY') {
      const { past, future } = state.history.library
      if (past.length === 0) return state
      const previous = past[past.length - 1]
      const current = pickFields(state, LIBRARY_FIELDS)
      return {
        ...state,
        ...previous,
        history: {
          ...state.history,
          library: { past: past.slice(0, -1), future: [current, ...future] },
        },
      }
    }
    if (action.type === 'REDO_LIBRARY') {
      const { past, future } = state.history.library
      if (future.length === 0) return state
      const next = future[0]
      const current = pickFields(state, LIBRARY_FIELDS)
      return {
        ...state,
        ...next,
        history: {
          ...state.history,
          library: { past: [...past, current], future: future.slice(1) },
        },
      }
    }

    const newState = baseReducer(state, action)
    if (newState === state) return newState

    // Retourne true si au moins un field a changé entre oldState et newState.
    // Comparaison par référence — suffisant grâce au pattern d'immutabilité.
    const fieldsChanged = (oldS, newS, fields) => fields.some(f => oldS[f] !== newS[f])

    const skipUndo = action.meta?.skipUndo === true
    const isComposer = !skipUndo && COMPOSER_UNDOABLE.has(action.type) && fieldsChanged(state, newState, COMPOSER_FIELDS)
    const isDesigner = !skipUndo && DESIGNER_UNDOABLE.has(action.type) && fieldsChanged(state, newState, DESIGNER_FIELDS)
    const isLibrary = !skipUndo && LIBRARY_UNDOABLE.has(action.type) && fieldsChanged(state, newState, LIBRARY_FIELDS)
    if (isComposer || isDesigner || isLibrary) {
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
      if (isLibrary) {
        const snap = pickFields(state, LIBRARY_FIELDS)
        hist = {
          ...hist,
          library: {
            past: [...hist.library.past, snap].slice(-HISTORY_DEPTH),
            future: [],
          },
        }
      }
      return { ...newState, history: hist }
    }

    return newState
}
