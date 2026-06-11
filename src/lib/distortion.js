// src/lib/distortion.js — distorsion par voix (itération T, T.6).
//
// Un WaveShaperNode (oversample 4x) inséré dans la chaîne de voix AVANT le filtre :
// `osc → shaper → biquad → gain → [panner] → suite` (logique soustractive — on
// enrichit le spectre, le filtre le dompte ensuite ; l'enveloppe de filtre / le wah
// sculptent alors le spectre distordu). Helper partagé par les 4 chemins de synthèse
// ET par le graphe de la courbe de transfert (même esprit que lib/filter.js).
//
// Le waveshaping crée des harmoniques au-delà de Nyquist → `oversample = '4x'`
// obligatoire (sinon aliasing). L'alias résiduel à drive très élevé sur notes aiguës
// est accepté (limites Web Audio documentées, même esprit que l'anti-aliasing iter J).

const CURVE_SAMPLES = 2048

// Courbe de transfert y = f(x), x ∈ [-1, 1], k = drive. Toutes NORMALISÉES pour que
// ±1 → ±1. Partagée par la table audio ET le graphe (dessin point par point).
//   soft : tanh(k·x)/tanh(k)  — saturation chaude (harmoniques impaires) ;
//   hard : clamp(k·x, -1, 1)  — clipping dur (spectre agressif) ;
//   fold : sin(k·x·π/2)       — wavefolding (replie plusieurs fois à k élevé → métallique).
export function distortionTransfer(curve, k, x) {
  if (curve === 'hard') return Math.max(-1, Math.min(1, k * x))
  if (curve === 'fold') return Math.sin(k * x * Math.PI / 2)
  return Math.tanh(k * x) / Math.tanh(k) // 'soft'
}

// Mémo simple : cache de la dernière (curve, drive) calculée — les voix d'un même
// patch (et le graphe au même réglage) réutilisent le même Float32Array.
let cached = null // { curve, drive, table }

export function distortionCurveTable(curve, drive) {
  if (cached && cached.curve === curve && cached.drive === drive) return cached.table
  const table = new Float32Array(CURVE_SAMPLES)
  for (let i = 0; i < CURVE_SAMPLES; i++) {
    const x = (i / (CURVE_SAMPLES - 1)) * 2 - 1
    table[i] = distortionTransfer(curve, drive, x)
  }
  cached = { curve, drive, table }
  return table
}

// Bornes de drive (miroir de reducer.js DISTORTION_DRIVE_MIN/MAX ; lib feuille, on
// évite la dépendance au reducer comme filter.js).
const DRIVE_MIN = 1
const DRIVE_MAX = 50

// x_c du mode FOLD (iter-T phase-6.9) : point où l'écart à la diagonale sin(kπx/2) − x
// est MAXIMAL (dérivée nulle → cos(kπx/2) = 2/kπ), soit x_c = (2/kπ)·arccos(2/kπ).
//   k=1   → x_c ≈ 0.561, écart ≈ 0.21 (la poignée n'est jamais coincée dans l'angle (1,1)) ;
//   k → ∞ → x_c → 1/k    (le 1ᵉʳ sommet : on retrouve l'ancien comportement là où il valait) ;
//   strictement DÉCROISSANT en k sur [1,50] → inversible par dichotomie.
const foldCharacteristicX = (k) => {
  const u = 2 / (k * Math.PI)
  return u * Math.acos(u)
}

// iter-T phase-6.8/6.9 — abscisse du POINT CARACTÉRISTIQUE de la courbe (lieu d'écart
// maximal à la diagonale, où l'on pose la poignée 2D). x_c DÉCROÎT quand le drive monte
// (gauche = drive ↑). hard : l'angle d'écrêtage (x_c = 1/k) ; soft : l'intersection de la
// tangente à l'origine et de l'asymptote y=1 (x_c = tanh(k)/k, hors courbe mais dans sa
// région) ; fold : le point de distance max à la diagonale (cf. foldCharacteristicX).
export function distortionCharacteristicX(curve, drive) {
  if (curve === 'soft') return Math.tanh(drive) / drive
  if (curve === 'fold') return foldCharacteristicX(drive)
  return 1 / drive // hard
}

// Inverse une x_c(k) STRICTEMENT DÉCROISSANTE sur [1,50] (soft, fold) → drive par
// dichotomie (~24 itérations, ±1e-5). Cible clampée aux x_c des bornes.
function bisectDrive(xcOf, x) {
  const xc = Math.max(xcOf(DRIVE_MAX), Math.min(xcOf(DRIVE_MIN), x)) // k=50 plus petit, k=1 plus grand
  let lo = DRIVE_MIN, hi = DRIVE_MAX
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (xcOf(mid) > xc) lo = mid // x_c décroît avec k : x_c(mid) trop haut → il faut un k plus grand
    else hi = mid
  }
  return (lo + hi) / 2
}

// Inversion de x_c → drive (FLOAT brut, clampé [1, 50] ; le drive est continu, plus
// d'arrondi). Analytique pour hard (k = 1/x) ; même petite routine de dichotomie pour
// soft et fold (x_c décroissant). Mapping naturellement log-perceptuel (les hauts drives
// se compriment côté gauche).
export function distortionDriveForX(curve, x) {
  if (curve === 'soft') return bisectDrive((k) => Math.tanh(k) / k, x)
  if (curve === 'fold') return bisectDrive(foldCharacteristicX, x)
  const k = 1 / Math.max(1e-6, x) // hard : x_c = 1/k
  return Math.max(DRIVE_MIN, Math.min(DRIVE_MAX, k))
}

// Configure un WaveShaperNode depuis le modèle `distortion` (table + oversample 4x).
export function configureShaper(shaper, distortion) {
  shaper.curve = distortionCurveTable(distortion.curve, distortion.drive)
  shaper.oversample = '4x'
}

// Insère la distorsion entre `source` (osc) et `dest` (biquad si filtre actif, sinon
// gain). Insertion conditionnelle (`enabled && mix > 0`), comme le panner/biquad :
// désactivée → `source → dest` direct (chaîne bit-identique), aucun nœud.
// Mix = split wet/dry autour du SEUL shaper : la branche wet `source → [inputGain →]
// shaper → wetGain`, la branche dry `source → dryGain` (signal PUR, jamais l'inputGain),
// les deux sommées vers `dest`. wetGain = mix, dryGain = 1−mix (statique).
// Env. de drive (T.6bis) : quand `driveEnv.enabled`, on insère un `inputGain` (base 1)
// AVANT le shaper — son gain est automatisé par applyModulation (la courbe du shaper
// n'est pas un AudioParam, on module le niveau d'entrée). Retourne { nodes, inputGain } :
// `nodes` pour un cleanup symétrique (aucun `.stop()`), `inputGain` pour l'automation.
export function connectDistortion(ctx, source, dest, distortion, driveEnv) {
  if (!distortion || !distortion.enabled || distortion.mix <= 0) {
    source.connect(dest)
    return { nodes: [], inputGain: null }
  }
  const shaper = ctx.createWaveShaper()
  configureShaper(shaper, distortion)
  let wetInput = source
  let inputGain = null
  if (driveEnv && driveEnv.enabled) {
    inputGain = ctx.createGain() // base 1 (gain.value par défaut) ; automation en applyModulation
    source.connect(inputGain)
    wetInput = inputGain
  }
  const wetGain = ctx.createGain()
  wetGain.gain.value = distortion.mix
  const dryGain = ctx.createGain()
  dryGain.gain.value = 1 - distortion.mix
  wetInput.connect(shaper); shaper.connect(wetGain); wetGain.connect(dest)
  source.connect(dryGain); dryGain.connect(dest) // dry = signal pur (pré-inputGain)
  const nodes = inputGain ? [inputGain, shaper, wetGain, dryGain] : [shaper, wetGain, dryGain]
  return { nodes, inputGain }
}
