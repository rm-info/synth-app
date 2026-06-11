// src/lib/modulation.js — modulations LFO (vibrato/trémolo) par patch (itération P).
//
// `applyModulation` crée et BRANCHE les LFO sur un couple (osc, gain) DÉJÀ créé
// par l'appelant. Il n'alloue jamais osc/gain et ne les connecte pas à `dest` :
// l'appelant possède la chaîne principale, le helper ne fait qu'AJOUTER des
// branches. Il retourne les nœuds créés pour que l'appelant les stoppe et les
// déconnecte symétriquement à `osc` (le cleanup diffère selon le chemin :
// programmé via `stopTime` pour la timeline/export, manuel au release pour les
// previews qui sustainent indéfiniment).
//
// Vibrato → `osc.detune` (CENTS) : indépendant de la note, et n'écrase pas la
// fréquence déjà programmée par l'appelant sur `osc.frequency`.
// Trémolo → `gain.gain` : Web Audio SOMME ce signal à l'automation AHDSR déjà
// programmée (on ne multiplie pas, on ne reprogramme pas l'enveloppe).
// Auto-pan (itération T) → `panner.pan` d'un StereoPannerNode que l'APPELANT a
// inséré dans la chaîne principale (osc → gain → panner → suite). Le helper ne
// crée jamais le panner : il n'ajoute que la branche LFO sur `panner.pan` (base
// 0, le LFO s'y somme dans [-depth, +depth]). `panner` absent → pas d'auto-pan
// (appels existants sans stéréo restent valides).
// Pitch envelope (itération T, T.3) → automation de la VALEUR DE BASE d'`osc.detune`
// (aucun nœud). La hauteur part à `amount` cents et glisse vers 0 en `time` ms.
// COEXISTENCE AVEC LE VIBRATO PAR CONSTRUCTION : le vibrato est une branche
// ENTRANTE sur `osc.detune` (depthGain → osc.detune) ; Web Audio SOMME les entrées
// connectées à la valeur de base automatisée. L'enveloppe pose la trajectoire, le
// vibrato ondule autour — les deux composent sans s'écraser, sans coordination.
//
// Enveloppe de filtre + wah (itération T, T.5) → biquad.detune. CLÉ ARCHITECTURALE :
// BiquadFilterNode possède un `detune` EN CENTS, comme l'oscillateur. L'enveloppe de
// filtre est donc le pitch env (scheduleParamEnv) appliqué à `biquad.detune`, et le
// wah le vibrato (branche LFO sommée) appliqué à `biquad.detune` — réutilisations à
// l'identique. Ils composent par construction comme pitch env + vibrato sur osc.detune
// (automation de base + branche entrante sommée). Le `biquad` est inséré par
// l'APPELANT (= filter.enabled, T.4) ; absent → les deux effets sont des no-ops.
// Le cutoff effectif (frequency × 2^(detune/1200)) est clampé par la spec Web Audio
// à [0, Nyquist] : les sweeps extrêmes (±4 oct. env + ±3 oct. wah) sont sans danger.
//
// 100 % Web Audio API native (OscillatorNode + GainNode + StereoPannerNode +
// BiquadFilterNode existants), zéro dépendance.

// Progression normalisée p(t) ∈ [0,1] sur le temps normalisé t ∈ [0,1] (T.3ter).
// ORTHOGONALE au mode Inverser (qui n'échange que départ/arrivée) : la valeur posée
// est toujours `départ + (arrivée − départ) · p(t)`, donc tout compose sans cas
// particulier. Source unique partagée par l'audio (setValueCurveAtTime) et le graphe.
export function pitchProgression(curve, t) {
  switch (curve) {
    case 'easeOut': return 1 - (1 - t) * (1 - t)                      // plonge vite, se pose en douceur
    case 'expo':    return (1 - Math.exp(-5 * t)) / (1 - Math.exp(-5)) // idem, brutale
    case 'easeIn':  return t * t                                      // traîne au départ, plonge à l'arrivée
    default:        return t                                          // 'linear' : p(t) = t
  }
}

// Programme la rampe d'onset (fondu d'installation depuis le début de la note).
// onset === 0 → pose directement la valeur cible à startTime.
function scheduleOnset(param, target, startTime, onsetMs) {
  const onset = (onsetMs ?? 0) / 1000
  if (onset > 0) {
    param.setValueAtTime(0, startTime)
    param.linearRampToValueAtTime(target, startTime + onset)
  } else {
    param.setValueAtTime(target, startTime)
  }
}

/**
 * Programme l'automation d'une ParamEnv sur la VALEUR DE BASE d'un AudioParam en
 * cents (osc.detune pour le pitch env T.3, biquad.detune pour l'env de filtre T.5).
 * Une seule implémentation des 4 formes, partagée. No-op silencieux si l'enveloppe
 * est absente/désactivée, d'amplitude nulle, ou de durée nulle (cran statique).
 *
 * @param {AudioParam} param
 * @param {import('../types').ParamEnv} [env]
 * @param {number} startTime
 */
export function scheduleParamEnv(param, env, startTime) {
  if (!env || !env.enabled || env.amount === 0 || (env.time ?? 0) <= 0) return
  const durSec = env.time / 1000
  // T.3bis « Inverser » échange départ/arrivée (orthogonal à la forme T.3ter) :
  // normal = part décalé de `amount` → rejoint la nominale (0) ; inversé = part de la
  // nominale (0) → s'éloigne vers `amount`, où la valeur RESTE (dernière valeur tenue).
  const from = env.invert ? 0 : env.amount
  const to = env.invert ? env.amount : 0
  const curve = env.curve ?? 'linear'
  if (durSec <= 0) {
    // Durée nulle interdite par l'API (setValueCurveAtTime) : on pose l'arrivée.
    param.setValueAtTime(to, startTime)
  } else if (curve === 'linear') {
    // Chemin historique (T.3) : rampe linéaire.
    param.setValueAtTime(from, startTime)
    param.linearRampToValueAtTime(to, startTime + durSec)
  } else {
    // Formes non linéaires (T.3ter) : un SEUL chemin via setValueCurveAtTime — PAS
    // exponentialRampToValueAtTime, qui ne peut ni atteindre ni traverser zéro (cible
    // = 0 cent, `amount` signé). On échantillonne p(t) sur 64 points ; la dernière
    // valeur tient ensuite (0 normal, `amount` inversé).
    const N = 64
    const values = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      values[i] = from + (to - from) * pitchProgression(curve, i / (N - 1))
    }
    param.setValueCurveAtTime(values, startTime, durSec)
  }
}

/**
 * @param {BaseAudioContext} ctx
 * @param {{
 *   osc: OscillatorNode, gain: GainNode, panner?: StereoPannerNode|null,
 *   biquad?: BiquadFilterNode|null,
 *   vibrato?: import('../types').Lfo, tremolo?: import('../types').Lfo,
 *   autoPan?: import('../types').Lfo, pitchEnv?: import('../types').ParamEnv,
 *   filterEnv?: import('../types').ParamEnv, wah?: import('../types').Lfo,
 *   startTime: number, stopTime?: number, releaseStart?: number,
 *   baseAmplitude: number,
 * }} opts
 *   `releaseStart` (chemins programmés timeline/export) = instant où démarre le
 *   release de l'enveloppe principale. Sert au trémolo pour rester constant
 *   pendant le sustain puis ne s'éteindre que sur la durée du release.
 *   `panner` = StereoPannerNode inséré par l'appelant (auto-pan only). `biquad` =
 *   BiquadFilterNode inséré par l'appelant (filtre T.4) ; sert de cible à l'env de
 *   filtre et au wah (T.5) — absent → les deux sont des no-ops silencieux.
 * @returns {{ nodes: AudioNode[], tremoloDepthGain: GainNode|null }}
 *   `nodes` = [] si aucun effet enabled. `tremoloDepthGain` exposé pour que les
 *   previews (sans stopTime) éteignent le trémolo au release.
 */
export function applyModulation(ctx, { osc, gain, panner, biquad, vibrato, tremolo, autoPan, pitchEnv, filterEnv, wah, startTime, stopTime, releaseStart, baseAmplitude }) {
  const nodes = []
  let tremoloDepthGain = null

  // Pitch envelope (T.3) : automation de la valeur de base d'osc.detune (helper
  // partagé). Posée avant les branches LFO — l'ordre est indifférent (base
  // automatisée + entrées connectées se somment). Pas de cleanup (aucun nœud).
  scheduleParamEnv(osc.detune, pitchEnv, startTime)

  // Enveloppe de filtre (T.5) : MÊME helper sur biquad.detune (cents, comme osc).
  // No-op si pas de biquad (filtre désactivé → aucun nœud à moduler).
  if (biquad) scheduleParamEnv(biquad.detune, filterEnv, startTime)

  if (vibrato && vibrato.enabled) {
    const lfo = ctx.createOscillator()
    lfo.type = vibrato.shape
    lfo.frequency.setValueAtTime(vibrato.rate, startTime)
    const depthGain = ctx.createGain()
    // depth en cents → modulation de la hauteur indépendante de la note.
    scheduleOnset(depthGain.gain, vibrato.depth, startTime, vibrato.onset)
    lfo.connect(depthGain)
    depthGain.connect(osc.detune)
    lfo.start(startTime)
    if (stopTime != null) lfo.stop(stopTime)
    nodes.push(lfo, depthGain)
  }

  if (tremolo && tremolo.enabled) {
    const lfo = ctx.createOscillator()
    lfo.type = tremolo.shape
    lfo.frequency.setValueAtTime(tremolo.rate, startTime)
    const depthGain = ctx.createGain()
    // Cible de profondeur = baseAmplitude × depth (échelle sur l'amplitude patch).
    const target = baseAmplitude * tremolo.depth
    scheduleOnset(depthGain.gain, target, startTime, tremolo.onset)
    // Extinction en fin de note : un trémolo doit rester CONSTANT pendant le
    // sustain et ne s'éteindre qu'AU release (sinon il décroît sur toute la note —
    // fort à l'attaque puis effacé, audible sur les notes longues). On ancre donc
    // la profondeur à `target` à `releaseStart` (plateau implicite : la valeur
    // tient entre deux events sans rampe), puis on la ramène à 0 sur la seule
    // durée du release. Sans `releaseStart` (sécurité), on retombe sur une rampe
    // jusqu'à `stopTime`. Pour les previews (stopTime absent), l'appelant fait
    // cette rampe au release.
    if (stopTime != null) {
      if (releaseStart != null) depthGain.gain.setValueAtTime(target, releaseStart)
      depthGain.gain.linearRampToValueAtTime(0, stopTime)
    }
    lfo.connect(depthGain)
    depthGain.connect(gain.gain)
    lfo.start(startTime)
    if (stopTime != null) lfo.stop(stopTime)
    nodes.push(lfo, depthGain)
    tremoloDepthGain = depthGain
  }

  // Auto-pan (itération T) : LFO → `panner.pan` (base 0). depth ∈ [0,1] =
  // excursion symétrique → pan oscille dans [-depth, +depth]. Comme le vibrato,
  // depth reste CONSTANT jusqu'au bout de la note : StereoPannerNode est
  // equal-power (pas d'énergie ajoutée), donc pas de plateau/release spécial à
  // la trémolo. Le panner n'existe que si l'appelant l'a inséré (enabled && depth>0).
  if (autoPan && autoPan.enabled && panner) {
    const lfo = ctx.createOscillator()
    lfo.type = autoPan.shape
    lfo.frequency.setValueAtTime(autoPan.rate, startTime)
    const depthGain = ctx.createGain()
    scheduleOnset(depthGain.gain, autoPan.depth, startTime, autoPan.onset)
    lfo.connect(depthGain)
    depthGain.connect(panner.pan)
    lfo.start(startTime)
    if (stopTime != null) lfo.stop(stopTime)
    nodes.push(lfo, depthGain)
  }

  // Wah (T.5) : MÊME fabrique de branche LFO que le vibrato, mais sur biquad.detune
  // (cents). depth en cents → excursion de cutoff [-depth, +depth]. Comme le vibrato,
  // depth reste CONSTANT jusqu'au bout (pas de plateau/release spécial). Se SOMME à
  // l'env de filtre (automation de base) par construction. No-op sans biquad.
  if (wah && wah.enabled && biquad) {
    const lfo = ctx.createOscillator()
    lfo.type = wah.shape
    lfo.frequency.setValueAtTime(wah.rate, startTime)
    const depthGain = ctx.createGain()
    scheduleOnset(depthGain.gain, wah.depth, startTime, wah.onset)
    lfo.connect(depthGain)
    depthGain.connect(biquad.detune)
    lfo.start(startTime)
    if (stopTime != null) lfo.stop(stopTime)
    nodes.push(lfo, depthGain)
  }

  return { nodes, tremoloDepthGain }
}
