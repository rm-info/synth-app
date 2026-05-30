// iter-M phase-4 : bibliothèque de presets de timbre. Code-only, read-only —
// indépendante du PatchBank utilisateur. Chaque entrée est « un vecteur
// d'amplitudes (sous un nom) » en mode harmonique ; les autres champs du patch
// (amplitude globale, ADSR) prennent les défauts du Designer au chargement
// (cf. reducer LOAD_PRESET). Les libellés (noms, descriptions, catégories)
// vivent dans strings.js, clés = `id` ci-dessous.
//
// Pas de presets `spline`/`draw` (M.4) : un utilisateur convertit un preset
// harmonique vers spline s'il veut éditer en ancres.

import { STRINGS } from './strings'

const S = STRINGS.timbrePresets

// Catégories, dans l'ordre d'affichage du picker.
export const PRESET_CATEGORIES = [
  { id: 'evocateurs', label: S.categoryEvocateurs },
  { id: 'inattendus', label: S.categoryInattendus },
]

// `amplitudes[k-1]` = magnitude de l'harmonique k (∈ [0, 1]). N = longueur du
// vecteur = plus haute harmonique posée. Recettes telles que spécifiées par
// l'archi (à ajuster à l'oreille en passe audio si besoin).
export const TIMBRE_PRESETS = [
  // --- Évocateurs d'instruments ---
  {
    id: 'square',
    category: 'evocateurs',
    name: S.names.square,
    description: S.descriptions.square,
    patch: {
      mode: 'harmonic',
      N: 16,
      amplitudes: [1, 0, 1 / 3, 0, 1 / 5, 0, 1 / 7, 0, 1 / 9, 0, 1 / 11, 0, 1 / 13, 0, 1 / 15, 0],
    },
  },
  {
    id: 'triangle',
    category: 'evocateurs',
    name: S.names.triangle,
    description: S.descriptions.triangle,
    patch: {
      mode: 'harmonic',
      N: 16,
      amplitudes: [1, 0, 1 / 9, 0, 1 / 25, 0, 1 / 49, 0, 1 / 81, 0, 1 / 121, 0, 1 / 169, 0, 1 / 225, 0],
    },
  },
  {
    id: 'sawtooth',
    category: 'evocateurs',
    name: S.names.sawtooth,
    description: S.descriptions.sawtooth,
    patch: {
      mode: 'harmonic',
      N: 16,
      amplitudes: [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6, 1 / 7, 1 / 8, 1 / 9, 1 / 10, 1 / 11, 1 / 12, 1 / 13, 1 / 14, 1 / 15, 1 / 16],
    },
  },
  {
    id: 'flute',
    category: 'evocateurs',
    name: S.names.flute,
    description: S.descriptions.flute,
    patch: { mode: 'harmonic', N: 8, amplitudes: [1, 0.15, 0.05, 0.02, 0, 0, 0, 0] },
  },
  {
    id: 'organ',
    category: 'evocateurs',
    name: S.names.organ,
    description: S.descriptions.organ,
    patch: { mode: 'harmonic', N: 8, amplitudes: [1, 1, 1, 1, 1, 1, 1, 1] },
  },
  {
    id: 'brass',
    category: 'evocateurs',
    name: S.names.brass,
    description: S.descriptions.brass,
    patch: {
      mode: 'harmonic',
      N: 12,
      amplitudes: [1, 0.6, 0.37, 0.25, 0.2, 0.17, 0.14, 0.13, 0.11, 0.1, 0.09, 0.08],
    },
  },
  // --- Inattendus-propres ---
  {
    id: 'oddOnly',
    category: 'inattendus',
    name: S.names.oddOnly,
    description: S.descriptions.oddOnly,
    patch: { mode: 'harmonic', N: 8, amplitudes: [1, 0, 1, 0, 1, 0, 1, 0] },
  },
  {
    id: 'evenOnly',
    category: 'inattendus',
    name: S.names.evenOnly,
    description: S.descriptions.evenOnly,
    patch: { mode: 'harmonic', N: 8, amplitudes: [0, 1, 0, 1, 0, 1, 0, 1] },
  },
  {
    id: 'triad135',
    category: 'inattendus',
    name: S.names.triad135,
    description: S.descriptions.triad135,
    patch: { mode: 'harmonic', N: 8, amplitudes: [1, 0, 1, 0, 1, 0, 0, 0] },
  },
  {
    id: 'octaves',
    category: 'inattendus',
    name: S.names.octaves,
    description: S.descriptions.octaves,
    patch: {
      mode: 'harmonic',
      N: 16,
      amplitudes: [1, 0.7, 0, 0.5, 0, 0, 0, 0.3, 0, 0, 0, 0, 0, 0, 0, 0.1],
    },
  },
  {
    id: 'cluster147',
    category: 'inattendus',
    name: S.names.cluster147,
    description: S.descriptions.cluster147,
    patch: { mode: 'harmonic', N: 8, amplitudes: [1, 0, 0, 1, 0, 0, 1, 0] },
  },
  {
    id: 'sparse159',
    category: 'inattendus',
    name: S.names.sparse159,
    description: S.descriptions.sparse159,
    patch: { mode: 'harmonic', N: 9, amplitudes: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
  },
]
