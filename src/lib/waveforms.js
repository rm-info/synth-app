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
  { id: 'sine', type: 'sine', twoViews: false, snap: 'fixed1', anchorCount: 4 },
  { id: 'square', type: 'square', twoViews: true, defaultN: 16, snap: 'odd', anchorCount: 8 },
  { id: 'sawtooth', type: 'sawtooth', twoViews: true, defaultN: 16, snap: 'all', anchorCount: 6 },
  { id: 'triangle', type: 'triangle', twoViews: true, defaultN: 16, snap: 'odd', anchorCount: 6 },
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

/** Forme classique brute, 600 points [-1, 1]. */
export function idealWaveform(type) {
  const pts = new Array(POINTS).fill(0)
  for (let i = 0; i < POINTS; i++) {
    const t = i / POINTS
    switch (type) {
      case 'sine': pts[i] = Math.sin(2 * Math.PI * t); break
      case 'square': pts[i] = t < 0.5 ? 1 : -1; break
      case 'sawtooth': pts[i] = 2 * t - 1; break
      case 'triangle': pts[i] = t < 0.5 ? 4 * t - 1 : 3 - 4 * t; break
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
export function bandlimitedWaveform(type, N) {
  const ideal = idealWaveform(type)
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
