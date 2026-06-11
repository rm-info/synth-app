// src/lib/filter.js — filtre statique par voix (itération T, T.4).
//
// Un BiquadFilterNode inséré dans la chaîne de voix selon la convention synthé
// VCO→VCF→VCA : `osc → biquad → gain (AHDSR) → [panner] → suite`. Filtrer AVANT
// le gain d'enveloppe évite de lisser les transitoires de l'enveloppe dans le
// filtre. Helper partagé par les 4 chemins de synthèse ET par le graphe de
// réponse en fréquence (biquad de mesure) pour que ce qu'on voit = ce qu'on entend.
//
// ⚠ PIÈGE D'UNITÉ DE `Q` (raison d'être de ce module) : dans la spec Web Audio,
// le `Q` d'un BiquadFilterNode est EN dB pour lowpass/highpass mais LINÉAIRE
// (facteur de qualité) pour bandpass/notch. Le modèle stocke un `q` linéaire
// UNIQUE (0.1..20) ; on le convertit ici pour que `q:1` ≈ neutre partout et
// `q:20` ≈ +26 dB de pic en LP/HP. Le graphe de mesure DOIT appeler la même
// fonction, sinon il ment.

// `q` linéaire (modèle) → valeur à poser sur `biquad.Q.value` selon le type.
export function biquadQValue(type, q) {
  // LP/HP : Q en dB (gain du pic de résonance) = 20·log10(q linéaire).
  // BP/notch : Q linéaire (largeur de bande) tel quel.
  return (type === 'lowpass' || type === 'highpass') ? 20 * Math.log10(q) : q
}

// Configure un BiquadFilterNode (chaîne audio OU biquad de mesure) depuis le
// modèle `filter`. `q` converti via biquadQValue (piège d'unité ci-dessus).
export function configureBiquad(biquad, filter) {
  biquad.type = filter.type
  biquad.frequency.value = filter.cutoff
  biquad.Q.value = biquadQValue(filter.type, filter.q)
}
