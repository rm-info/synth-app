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

// Configure un WaveShaperNode depuis le modèle `distortion` (table + oversample 4x).
export function configureShaper(shaper, distortion) {
  shaper.curve = distortionCurveTable(distortion.curve, distortion.drive)
  shaper.oversample = '4x'
}

// Insère la distorsion entre `source` (osc) et `dest` (biquad si filtre actif, sinon
// gain). Insertion conditionnelle (`enabled && mix > 0`), comme le panner/biquad :
// désactivée → `source → dest` direct (chaîne bit-identique), aucun nœud.
// Mix = split wet/dry autour du SEUL shaper : `source → shaper → wetGain` et
// `source → dryGain`, les deux sommés vers `dest`. wetGain = mix, dryGain = 1−mix
// (statique). Retourne les nœuds créés pour un cleanup symétrique (aucun `.stop()`,
// comme panner/biquad). Helper partagé par les 4 chemins de synthèse.
export function connectDistortion(ctx, source, dest, distortion) {
  if (!distortion || !distortion.enabled || distortion.mix <= 0) {
    source.connect(dest)
    return []
  }
  const shaper = ctx.createWaveShaper()
  configureShaper(shaper, distortion)
  const wetGain = ctx.createGain()
  wetGain.gain.value = distortion.mix
  const dryGain = ctx.createGain()
  dryGain.gain.value = 1 - distortion.mix
  source.connect(shaper); shaper.connect(wetGain); wetGain.connect(dest)
  source.connect(dryGain); dryGain.connect(dest)
  return [shaper, wetGain, dryGain]
}
