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
  },
  'pythagorean-12': {
    id: 'pythagorean-12',
    label: 'Pythagoricien 12 (quintes pures, centré sur C)',
    notesPerOctave: 12,
    noteNames: TWELVE_TET_NOTE_NAMES,
    freq: pythagoreanFreq,
  },
  free: {
    id: 'free',
    label: 'Libre (Hz)',
    notesPerOctave: null,
    noteNames: null,
    freq: null,
  },
}

export function getTuningSystem(id) {
  return TUNING_SYSTEMS[id] ?? TUNING_SYSTEMS['12-TET']
}

// Inverse 12-TET : trouve la note la plus proche d'une fréquence. Utilisé au
// switch free→12-TET pour préserver la hauteur courante. Clamp midi ∈ [12, 143]
// (C0..B10) pour rester dans les bornes du sélecteur d'octave. Fonction
// spécifique au 12-TET : une généralisation à d'autres systèmes-based
// demanderait un inverse par système, à voir à l'ajout du premier tempérament
// non 12-TET.
export function frequencyToNearestNote(hz, a4Ref = DEFAULT_A4) {
  const midi = Math.round(69 + 12 * Math.log2(hz / a4Ref))
  const clamped = Math.max(12, Math.min(143, midi))
  return {
    noteIndex: ((clamped % 12) + 12) % 12,
    octave: Math.floor(clamped / 12) - 1,
  }
}
