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
// `anchorCount` (iter-N N.5c) = nombre d'ancres DP posées au chargement (lentille
// Ancres exploitable d'emblée) ; ~8 par défaut, ajustable à l'œil.
export const TIMBRE_PRESETS = [
  // --- Évocateurs d'instruments ---
  // N.5c : carré/triangle/scie (anciens évocateurs, amplitudes = band-limité N=16)
  // retirés d'ici — ils vivent désormais dans BASE_WAVEFORMS (« Formes de base »,
  // 2 vues idéale/band-limitée). Ne restent que les vrais timbres conçus.
  {
    id: 'flute',
    category: 'evocateurs',
    name: S.names.flute,
    description: S.descriptions.flute,
    anchorCount: 6,
    patch: { mode: 'harmonic', N: 8, amplitudes: [1, 0.15, 0.05, 0.02, 0, 0, 0, 0] },
  },
  {
    id: 'organ',
    category: 'evocateurs',
    name: S.names.organ,
    description: S.descriptions.organ,
    anchorCount: 8,
    patch: { mode: 'harmonic', N: 8, amplitudes: [1, 1, 1, 1, 1, 1, 1, 1] },
  },
  {
    id: 'brass',
    category: 'evocateurs',
    name: S.names.brass,
    description: S.descriptions.brass,
    anchorCount: 8,
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
    anchorCount: 8,
    patch: { mode: 'harmonic', N: 8, amplitudes: [1, 0, 1, 0, 1, 0, 1, 0] },
  },
  {
    id: 'evenOnly',
    category: 'inattendus',
    name: S.names.evenOnly,
    description: S.descriptions.evenOnly,
    anchorCount: 8,
    patch: { mode: 'harmonic', N: 8, amplitudes: [0, 1, 0, 1, 0, 1, 0, 1] },
  },
  {
    id: 'triad135',
    category: 'inattendus',
    name: S.names.triad135,
    description: S.descriptions.triad135,
    anchorCount: 8,
    patch: { mode: 'harmonic', N: 8, amplitudes: [1, 0, 1, 0, 1, 0, 0, 0] },
  },
  {
    id: 'octaves',
    category: 'inattendus',
    name: S.names.octaves,
    description: S.descriptions.octaves,
    anchorCount: 8,
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
    anchorCount: 8,
    patch: { mode: 'harmonic', N: 8, amplitudes: [1, 0, 0, 1, 0, 0, 1, 0] },
  },
  {
    id: 'sparse159',
    category: 'inattendus',
    name: S.names.sparse159,
    description: S.descriptions.sparse159,
    anchorCount: 8,
    patch: { mode: 'harmonic', N: 9, amplitudes: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
  },
]
