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

export const TUNING_SYSTEMS = {
  '12-TET': {
    id: '12-TET',
    label: '12-TET (Tempérament égal occidental)',
    notesPerOctave: 12,
    noteNames: TWELVE_TET_NOTE_NAMES,
    freq: twelveTetFreq,
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
