// iter-N phase-5b — moteur de formes classiques : deux vues du même son.
//
// - idealWaveform(type)        : la forme brute (plate/droite), telle quelle.
// - bandlimitWaveform(pts, N)  : reconstruction des harmoniques 1..N par DFT
//                                directe sur la grille native 600 (phase
//                                naturelle conservée).
// - bandlimitedWaveform(type, N) : idéale → band-limitée, normalisée pour que
//                                  la plus grande magnitude d'harmonique = 1.
//
// DFT *directe sur 600* (pas via la FFT 512 d'audio.js) : on évite le resample
// 600↔512 linéaire et son leakage (mismatch #12). Une harmonique k pure rendue
// puis ré-analysée redonne k seul. O(N·600) analyse + O(N·600) synthèse,
// sub-ms pour N ≤ 256.
//
// Fonctions pures, 600 points, convention `points` du projet, aucune mutation.

const POINTS = 600

// iter-N phase-5c — descripteurs des 4 formes de base de la modale Presets.
// `twoViews` : carré/scie/triangle ont une vue idéale (brute) + une band-limitée
// (reconstruction à N) ; le sinus n'a qu'une vue (N figé à 1). `snap` recadre la
// saisie de N (cf. snapN). `anchorCount` = nombre d'ancres DP posées au chargement
// (ajustable à l'œil). Libellés via strings.js (clé = `type`, STRINGS.presets).
export const BASE_WAVEFORMS = [
  { id: 'sine', type: 'sine', twoViews: false, snap: 'fixed1', anchorCount: 4, params: [] },
  { id: 'square', type: 'square', twoViews: true, defaultN: 16, snap: 'odd', anchorCount: 8, params: [] },
  { id: 'sawtooth', type: 'sawtooth', twoViews: true, defaultN: 16, snap: 'all', anchorCount: 6, params: [] },
  { id: 'triangle', type: 'triangle', twoViews: true, defaultN: 16, snap: 'odd', anchorCount: 6, params: [] },
]

// iter-N phase-5f — formes de base PARAMÉTRIQUES : en plus du N harmonique, un ou
// deux *paramètres de forme* (nb de marches, rapport cyclique…) que la modale
// expose. Même dualité idéale / band-limitée. `params: [{ key, label, min, max,
// default, step }]` décrit les contrôles. `anchorCount` peut être un nombre ou une
// fonction des params résolus (escalier/scie-à-étages suivent K — le reducer
// reclampe à [SPLINE_ANCHOR_MIN, SPLINE_ANCHOR_MAX]). `snap: 'all'` partout (ces
// formes ont en général des harmoniques paires + impaires). Libellés de nom via
// STRINGS.parametricWaveforms (clé = `type`).
export const PARAMETRIC_WAVEFORMS = [
  {
    id: 'staircase', type: 'staircase', twoViews: true, defaultN: 16, snap: 'all',
    params: [{ key: 'steps', label: 'Marches', min: 2, max: 16, default: 4, step: 1 }],
    anchorCount: (p) => 2 * p.steps,
  },
  {
    id: 'step-saw', type: 'step-saw', twoViews: true, defaultN: 16, snap: 'all',
    params: [{ key: 'steps', label: 'Marches', min: 2, max: 16, default: 4, step: 1 }],
    anchorCount: (p) => 2 * p.steps,
  },
  {
    id: 'decaying-sine', type: 'decaying-sine', twoViews: true, defaultN: 16, snap: 'all',
    params: [
      { key: 'cycles', label: 'Cycles', min: 1, max: 16, default: 4, step: 1 },
      { key: 'ratio', label: 'Ratio', min: 0, max: 1, default: 0.5, step: 0.05 },
    ],
    anchorCount: 12,
  },
  {
    id: 'pulse', type: 'pulse', twoViews: true, defaultN: 16, snap: 'all',
    params: [{ key: 'duty', label: 'Rapport cyclique', min: 0.05, max: 0.95, default: 0.25, step: 0.05 }],
    anchorCount: 8,
  },
  {
    id: 'trapezoid', type: 'trapezoid', twoViews: true, defaultN: 16, snap: 'all',
    params: [{ key: 'edge', label: 'Bord', min: 0, max: 0.25, default: 0.1, step: 0.01 }],
    anchorCount: 8,
  },
  {
    id: 'half-sine', type: 'half-sine', twoViews: true, defaultN: 16, snap: 'all',
    params: [],
    anchorCount: 8,
  },
  {
    id: 'impulse', type: 'impulse', twoViews: true, defaultN: 16, snap: 'all',
    params: [{ key: 'width', label: 'Largeur', min: 0.02, max: 0.2, default: 0.05, step: 0.01 }],
    anchorCount: 8,
  },
]

// Recadre une saisie libre de N selon la règle de snap de la forme, borné [1, 256].
// 'fixed1' → 1 (sinus) ; 'odd' → impair le plus proche (carré/triangle : pas
// d'harmoniques paires) ; 'all' → entier (scie). Pour 'odd', un pair se rabat
// vers l'impair inférieur (les deux voisins sont équidistants).
export function snapN(n, snap) {
  const clamped = Math.max(1, Math.min(256, Math.round(Number(n) || 1)))
  if (snap === 'fixed1') return 1
  if (snap === 'odd') return clamped % 2 === 1 ? clamped : Math.max(1, clamped - 1)
  return clamped
}

const clampNum = (v, lo, hi, dflt) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt
}
const clampInt = (v, lo, hi, dflt) => clampNum(Math.round(Number(v)), lo, hi, dflt)

/**
 * Forme classique brute, 600 points (convention `points` du projet : centrée,
 * non clampée — laisse dépasser ±1, le marqueur / la normalisation gèrent).
 * `params` (optionnel) porte les paramètres de forme des formes paramétriques
 * (iter-N phase-5f) ; ignoré par les 4 formes de base.
 */
export function idealWaveform(type, params = {}) {
  const pts = new Array(POINTS).fill(0)
  // Paramètres de forme résolus une fois (bornes = celles de PARAMETRIC_WAVEFORMS).
  const steps = clampInt(params.steps, 2, 16, 4)        // escalier, scie-à-étages
  const cycles = clampInt(params.cycles, 1, 16, 4)      // sinus décroissante
  const ratio = clampNum(params.ratio, 0, 1, 0.5)       // sinus décroissante
  const duty = clampNum(params.duty, 0.05, 0.95, 0.25)  // pulse
  const edge = clampNum(params.edge, 0, 0.25, 0.1)      // trapèze
  const width = clampNum(params.width, 0.02, 0.2, 0.05) // impulsion
  for (let i = 0; i < POINTS; i++) {
    const t = i / POINTS
    switch (type) {
      case 'sine': pts[i] = Math.sin(2 * Math.PI * t); break
      case 'square': pts[i] = t < 0.5 ? 1 : -1; break
      // Scie descendante (1 → −1) : série de Fourier en +sin = phase canonique.
      // La version montante (2t−1) est en −sin → flip parasite au Normaliser.
      case 'sawtooth': pts[i] = 1 - 2 * t; break
      case 'triangle': pts[i] = t < 0.5 ? 4 * t - 1 : 3 - 4 * t; break
      // Escalier descendant : K paliers égaux de +1 à −1.
      case 'staircase': {
        const s = Math.min(steps - 1, Math.floor(t * steps))
        pts[i] = 1 - (2 * s) / (steps - 1)
        break
      }
      // Scie à étages : marche inclinée centrée sur le niveau du palier (saut entre
      // paliers). Forme inventée — à ajuster à l'œil.
      case 'step-saw': {
        const x = t * steps
        const s = Math.floor(x)
        const f = x - s
        const h = 2 / (steps - 1)
        pts[i] = 1 - (2 * s) / (steps - 1) + (f - 0.5) * h
        break
      }
      // Sinus décroissante : K cycles successifs dont l'amplitude décroît en r^s
      // (r=1 → sinus pur à K·f0 ; r→0 → burst d'un cycle).
      case 'decaying-sine': {
        const x = t * cycles
        const s = Math.floor(x)
        const ph = (x - s) * 2 * Math.PI
        pts[i] = Math.pow(ratio, s) * Math.sin(ph)
        break
      }
      // Pulse : créneau à rapport cyclique variable (duty=0.5 = carré ; sinon des
      // harmoniques paires apparaissent).
      case 'pulse': pts[i] = t < duty ? 1 : -1; break
      // Trapèze : triangle dont les flancs sont raidis par un gain puis clampé.
      // `edge` = largeur du bord : edge→0 raidit jusqu'au carré, edge→0.25 → gain 1
      // = triangle pur (orientation conforme aux vérifications archi ; l'annotation
      // littérale du prompt était inversée — à confirmer à l'œil).
      case 'trapezoid': {
        const tri = 1 - 4 * Math.abs(((t + 0.25) % 1) - 0.5)
        const g = 1 / Math.max(1e-3, 4 * edge)
        pts[i] = Math.max(-1, Math.min(1, g * tri))
        break
      }
      // Demi-sinus redressé : bosse positive + plat (DC ignoré par createPeriodicWave).
      case 'half-sine': pts[i] = Math.max(0, Math.sin(2 * Math.PI * t)); break
      // Impulsion : doublet bipolaire (+1 puis −1 sur `width` chacun, 0 ailleurs) —
      // spectre quasi plat à faible largeur.
      case 'impulse': pts[i] = t < width ? 1 : (t < 2 * width ? -1 : 0); break
    }
  }
  return pts
}

// Coefficients de Fourier réels (a_k cos + b_k sin) des harmoniques 1..N,
// par DFT directe sur la grille des points. a[0]/b[0] inutilisés (DC ignoré).
function dftCoeffs(points, N) {
  const len = points.length
  const a = new Array(N + 1).fill(0)
  const b = new Array(N + 1).fill(0)
  for (let k = 1; k <= N; k++) {
    let ak = 0
    let bk = 0
    for (let i = 0; i < len; i++) {
      const ang = (2 * Math.PI * k * i) / len
      ak += points[i] * Math.cos(ang)
      bk += points[i] * Math.sin(ang)
    }
    a[k] = (2 / len) * ak
    b[k] = (2 / len) * bk
  }
  return { a, b }
}

function synthFromCoeffs(a, b, N, len) {
  const out = new Array(len).fill(0)
  for (let i = 0; i < len; i++) {
    let sum = 0
    for (let k = 1; k <= N; k++) {
      const ang = (2 * Math.PI * k * i) / len
      sum += a[k] * Math.cos(ang) + b[k] * Math.sin(ang)
    }
    out[i] = sum
  }
  return out
}

/** Reconstruction band-limitée (harmoniques 1..N) d'une forme quelconque. */
export function bandlimitWaveform(points, N) {
  const { a, b } = dftCoeffs(points, N)
  return synthFromCoeffs(a, b, N, points.length)
}

/**
 * Vue band-limitée d'une forme classique : reconstruction 1..N de la forme
 * idéale, normalisée pour que la plus grande magnitude d'harmonique = 1
 * (barres honnêtes, pas de clamp). Normalisation purement d'affichage : l'audio
 * est renormalisé à la lecture, donc idéal et band-limité sonnent pareil à N égal.
 */
export function bandlimitedWaveform(type, N, params) {
  const ideal = idealWaveform(type, params)
  const len = ideal.length
  const { a, b } = dftCoeffs(ideal, N)
  let maxMag = 0
  for (let k = 1; k <= N; k++) {
    const mag = Math.hypot(a[k], b[k])
    if (mag > maxMag) maxMag = mag
  }
  const out = synthFromCoeffs(a, b, N, len)
  if (maxMag > 0) for (let i = 0; i < len; i++) out[i] /= maxMag
  return out
}
