// Registre des systèmes de tempérament. Point d'extension unique pour ajouter
// de nouveaux systèmes (24-TET, Pythagoricien, Just Intonation, maqâmât,
// shrutis, etc.) : on déclare une entrée ici et le reste de l'app s'adapte
// sans toucher aux sites de calcul de fréquence ni aux composants d'affichage.
//
// Chaque entrée expose :
//  - id : identifiant stable, utilisé dans `clip.tuningSystem` et
//    `editor.testTuningSystem`. Doit matcher la clé du registre.
//  - label : libellé long affiché dans les UI (dropdowns).
//  - notesPerOctave : nombre de degrés par octave, ou null pour les systèmes
//    sans notion de degré (libre en Hz).
//  - noteNames : tableau des noms de degré (longueur = notesPerOctave), ou
//    null si inapplicable.
//  - freq : (noteIndex, octave, a4Ref) → Hz pour les systèmes basés sur
//    degré/octave, ou null pour ceux qui lisent `clip.frequency` directement.
//  - layout : type de rendu visuel du clavier ('piano-12', 'grid-24',
//    'free' = pas de clavier). PianoKeyboard dispatch sur cette valeur.
//  - keyboardMap : { [event.code]: noteIndex } pour les raccourcis QWERTY,
//    ou null pour les systèmes sans clavier (free). Les consommateurs lisent
//    ce mapping dynamiquement, jamais via une constante globale.

export const DEFAULT_A4 = 440

const TWELVE_TET_NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

function twelveTetFreq(noteIndex, octave, a4Ref) {
  const midi = (octave + 1) * 12 + noteIndex
  return a4Ref * Math.pow(2, (midi - 69) / 12)
}

// Chaîne de quintes pythagoricienne centrée sur C : 6 montantes (G D A E B
// F#) et 5 descendantes (F Bb Eb Ab Db), avec C au centre. Valeur = nombre
// de quintes pures 3/2 depuis C (négatif = descendantes). Ordre d'indexation
// = noteIndex 0..11 (C C# D D# E F F# G G# A A# B). La quinte du loup tombe
// entre F# (+6) et Db=C# (-5) et vaut ~678 cents au lieu de 702 — c'est
// audible et attendu : c'est la signature d'un tempérament pythagoricien.
const PYTH_FIFTHS_FROM_C = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5]

// Ratios pythagoriciens relatifs à C, dérivés à l'init par parcours de la
// chaîne. Chaque ratio est (3/2)^k puis replié dans [1, 2) par puissances de
// 2 (octave-fold). Table constante mais construction visible dans le code.
const PYTH_RATIOS_FROM_C = (() => {
  const out = new Array(12)
  for (let i = 0; i < 12; i++) {
    let r = Math.pow(3 / 2, PYTH_FIFTHS_FROM_C[i])
    while (r >= 2) r /= 2
    while (r < 1) r *= 2
    out[i] = r
  }
  return out
})()

// A étant 3 quintes au-dessus de C dans la chaîne pythagoricienne, C4 ancré
// sur A4 = a4Ref vaut a4Ref * (2/3)^3 * 2 = a4Ref * 16/27. Les autres notes
// sont obtenues par multiplication avec les ratios pré-calculés ; l'octave
// cible s'obtient par un facteur 2^(octave-4).
function pythagoreanFreq(noteIndex, octave, a4Ref) {
  const c4 = (a4Ref * 16) / 27
  return c4 * PYTH_RATIOS_FROM_C[noteIndex] * Math.pow(2, octave - 4)
}

// Mapping QWERTY → noteIndex pour les tempéraments à 12 notes.
// Rangée du milieu (blanches, façon clavier diatonique) :
//   S  D  F  G  H  J  K
//   C  D  E  F  G  A  B
// Rangée du haut (noires) :
//   E  R   ·  Y  U  I   ·
//   C♯ D♯  ·  F♯ G♯ A♯  ·
// (positions T et O sans correspondance — demi-tons E-F et B-C sans noire).
// Utilise event.code plutôt que event.key pour fonctionner identiquement sur
// QWERTY / AZERTY / DVORAK (mapping par position physique).
const TWELVE_KEY_MAP = {
  KeyS: 0,  // C
  KeyD: 2,  // D
  KeyF: 4,  // E
  KeyG: 5,  // F
  KeyH: 7,  // G
  KeyJ: 9,  // A
  KeyK: 11, // B
  KeyE: 1,  // C♯
  KeyR: 3,  // D♯
  KeyY: 6,  // F♯
  KeyU: 8,  // G♯
  KeyI: 10, // A♯
}

// Noms 24-TET : ↑ = demi-dièse (quart de ton au-dessus de la naturelle),
// ↓ = demi-bémol (quart de ton au-dessus d'un ♯ plein ou sous la naturelle
// suivante). On n'utilise PAS ♭ plein : D♭ plein = C♯ plein par enharmonie
// dans une grille 24-TET, donc écrire D♭ ici impliquerait deux noms pour la
// même position. Les cases "absentes" (Mi♯, Si♯, Fa↓, Do↓ — autrement dit
// E♯, B♯, F♭, C♭) ne correspondent à aucune position car F et E d'une part,
// C et B d'autre part, ne sont séparés que d'un demi-ton.
const TWENTYFOUR_NOTE_NAMES = [
  'C',  'C↑', 'C♯', 'D↓',
  'D',  'D↑', 'D♯', 'E↓',
  'E',  'E↑', 'F',  'F↑',
  'F♯', 'G↓', 'G',  'G↑',
  'G♯', 'A↓', 'A',  'A↑',
  'A♯', 'B↓', 'B',  'B↑',
]

// Mapping QWERTY → noteIndex pour les tempéraments à 24 notes. Le mapping
// suit la géométrie physique du clavier (event.code est position-based) :
//
//   rangée 1 (chiffres) : ─ ─ ─ 4 5 ─ 7 8 9 ─    ← dièses pleins
//   rangée 2 (Q-O)      : ─ E R T Y U I O ─       ← demi-dièses (↑)
//   rangée 3 (A-L)      : S D F G H J K            ← naturelles
//   rangée 4 (Z-,)      : X C ─ B N M ─            ← demi-bémols (↓)
//
// Chaque chiffre/lettre est CENTRÉ entre les deux notes de la rangée du
// dessous : Digit4 est physiquement entre KeyE et KeyR → C♯ (entre C↑ et D↑).
// KeyX entre KeyS et KeyD → D↓ (entre C et D). Etc. Les positions Mi/Si
// sont vides en rangées 1 et 4 (enharmonie : pas de E♯, B♯, F↓, C↓).
//
// La refonte F.3.4 a libéré les DigitX (sans Shift) — désormais utilisables
// comme touches-position pour les dièses pleins. Shift+Digit reste réservé
// aux durées (toutes les touches DigitX, mappées ou pas).
const TWENTYFOUR_KEY_MAP = {
  // Rangée 3 (naturelles, lettres rangée du milieu)
  KeyS: 0,  // C
  KeyD: 4,  // D
  KeyF: 8,  // E
  KeyG: 10, // F
  KeyH: 14, // G
  KeyJ: 18, // A
  KeyK: 22, // B
  // Rangée 2 (demi-dièses, lettres rangée du haut)
  KeyE: 1,  // C↑
  KeyR: 5,  // D↑
  KeyT: 9,  // E↑
  KeyY: 11, // F↑
  KeyU: 15, // G↑
  KeyI: 19, // A↑
  KeyO: 23, // B↑
  // Rangée 1 (dièses pleins, chiffres entre les lettres E-R, R-T, …)
  Digit4: 2,  // C♯ (entre KeyE et KeyR)
  Digit5: 6,  // D♯ (entre KeyR et KeyT)
  Digit7: 12, // F♯ (entre KeyY et KeyU)
  Digit8: 16, // G♯ (entre KeyU et KeyI)
  Digit9: 20, // A♯ (entre KeyI et KeyO)
  // Rangée 4 (demi-bémols, lettres rangée du bas)
  KeyX: 3,  // D↓ (entre KeyS et KeyD)
  KeyC: 7,  // E↓ (entre KeyD et KeyF)
  KeyB: 13, // G↓ (entre KeyG et KeyH)
  KeyN: 17, // A↓ (entre KeyH et KeyJ)
  KeyM: 21, // B↓ (entre KeyJ et KeyK)
}

function twentyFourTetEqualFreq(noteIndex, octave, a4Ref) {
  return a4Ref * Math.pow(2, (noteIndex - 18) / 24) * Math.pow(2, octave - 4)
}

// Table en dur des 24 fréquences de l'octave 4 du tempérament Le Caire 1932,
// extraites de la table publiée sur aly-abbara.com et réindexées C-centrées
// (l'index 0 correspond à C). Ancrée sur 'Oshairan = A4 = 440 Hz quand
// a4Ref = 440. Les écarts apparents — E à +46¢, E↑ à +38¢, B à +42¢ — sont
// la signature des tierces et sixtes neutres des maqâmat ; ne pas "corriger"
// vers le 24-TET égal.
const CAIRO_1932_HZ_OCT4 = [
  261.335, 267.76,  275.63,  284.84,
  294.03,  300.43,  310.62,  320.47,
  338.48,  346.905, 351.075, 359.635,
  368.045, 382.815, 392.00,  403.56,
  413.52,  427.18,  440.00,  450.72,
  464.12,  479.46,  505.92,  514.43,
]

function twentyFourTetCairo1932Freq(noteIndex, octave, a4Ref) {
  return CAIRO_1932_HZ_OCT4[noteIndex] * (a4Ref / 440) * Math.pow(2, octave - 4)
}

// Ordre des clés = ordre d'apparition dans les sélecteurs UI : 12-TET en
// premier (cas par défaut), puis les systèmes alternatifs, puis 'free' en
// dernier (le cas "à part").
export const TUNING_SYSTEMS = {
  '12-TET': {
    id: '12-TET',
    label: '12-TET (Tempérament égal occidental)',
    notesPerOctave: 12,
    noteNames: TWELVE_TET_NOTE_NAMES,
    freq: twelveTetFreq,
    layout: 'piano-12',
    keyboardMap: TWELVE_KEY_MAP,
  },
  'pythagorean-12': {
    id: 'pythagorean-12',
    label: 'Pythagoricien 12 (quintes pures, centré sur C)',
    notesPerOctave: 12,
    noteNames: TWELVE_TET_NOTE_NAMES,
    freq: pythagoreanFreq,
    layout: 'piano-12',
    keyboardMap: TWELVE_KEY_MAP,
  },
  '24-tet-equal': {
    id: '24-tet-equal',
    label: '24-TET (tempérament égal)',
    notesPerOctave: 24,
    noteNames: TWENTYFOUR_NOTE_NAMES,
    freq: twentyFourTetEqualFreq,
    layout: 'grid-24',
    keyboardMap: TWENTYFOUR_KEY_MAP,
  },
  '24-tet-cairo-1932': {
    id: '24-tet-cairo-1932',
    label: '24-TET (Le Caire 1932, source: aly-abbara.com)',
    notesPerOctave: 24,
    noteNames: TWENTYFOUR_NOTE_NAMES,
    freq: twentyFourTetCairo1932Freq,
    layout: 'grid-24',
    keyboardMap: TWENTYFOUR_KEY_MAP,
  },
  free: {
    id: 'free',
    label: 'Libre (Hz)',
    notesPerOctave: null,
    noteNames: null,
    freq: null,
    layout: 'free',
    keyboardMap: null,
  },
}

export function getTuningSystem(id) {
  const sys = TUNING_SYSTEMS[id]
  if (sys) return sys
  console.warn(`Unknown tuning system "${id}", falling back to 12-TET`)
  return TUNING_SYSTEMS['12-TET']
}

// Bornes d'octave compatibles avec OctaveSelector (0..10).
const MIN_OCTAVE = 0
const MAX_OCTAVE = 10

// Snap générique : trouve la note (noteIndex, octave) du système `sysId` la
// plus proche de `hz` au sens des cents (1200·log2 du ratio). Itère sur
// toutes les positions de la grille × 11 octaves, garde le minimum.
//
// L'erreur max attendue est `1200/(2·notesPerOctave)` cents (centre de
// cluster) : 50¢ pour 12-TET, 25¢ pour 24-TET. Un snap depuis un système
// proche perd moins ; un snap depuis 'free' peut perdre jusqu'à cette borne.
//
// Le système 'free' (freq === null) n'a pas d'inverse — appel illégal.
export function frequencyToNearestIn(hz, sysId, a4Ref = DEFAULT_A4) {
  const sys = getTuningSystem(sysId)
  if (!sys.freq) {
    throw new Error(`frequencyToNearestIn: système "${sysId}" n'a pas de freq()`)
  }
  let best = { noteIndex: 0, octave: MIN_OCTAVE, cents: Infinity }
  for (let oct = MIN_OCTAVE; oct <= MAX_OCTAVE; oct++) {
    for (let i = 0; i < sys.notesPerOctave; i++) {
      const candidate = sys.freq(i, oct, a4Ref)
      if (candidate <= 0) continue
      const cents = Math.abs(1200 * Math.log2(candidate / hz))
      if (cents < best.cents) {
        best = { noteIndex: i, octave: oct, cents }
      }
    }
  }
  return { noteIndex: best.noteIndex, octave: best.octave }
}
