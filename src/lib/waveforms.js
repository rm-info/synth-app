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
