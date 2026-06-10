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
// 100 % Web Audio API native (OscillatorNode + GainNode + StereoPannerNode
// existants), zéro dépendance.

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
 * @param {BaseAudioContext} ctx
 * @param {{
 *   osc: OscillatorNode, gain: GainNode, panner?: StereoPannerNode|null,
 *   vibrato?: import('../types').Lfo, tremolo?: import('../types').Lfo,
 *   autoPan?: import('../types').Lfo, pitchEnv?: import('../types').PitchEnv,
 *   startTime: number, stopTime?: number, releaseStart?: number,
 *   baseAmplitude: number,
 * }} opts
 *   `releaseStart` (chemins programmés timeline/export) = instant où démarre le
 *   release de l'enveloppe principale. Sert au trémolo pour rester constant
 *   pendant le sustain puis ne s'éteindre que sur la durée du release.
 *   `panner` = StereoPannerNode inséré par l'appelant (auto-pan only).
 * @returns {{ nodes: AudioNode[], tremoloDepthGain: GainNode|null }}
 *   `nodes` = [] si aucun effet enabled. `tremoloDepthGain` exposé pour que les
 *   previews (sans stopTime) éteignent le trémolo au release.
 */
export function applyModulation(ctx, { osc, gain, panner, vibrato, tremolo, autoPan, pitchEnv, startTime, stopTime, releaseStart, baseAmplitude }) {
  const nodes = []
  let tremoloDepthGain = null

  // Pitch envelope (T.3) : automation de la valeur de base d'osc.detune. Posée
  // avant la branche vibrato — l'ordre est indifférent (base automatisée + entrées
  // connectées se somment), mais on la pose tôt pour la lisibilité. Guard `amount
  // !== 0 && time > 0` : à 0/désactivé, AUCUNE automation (detune reste à 0, chaîne
  // identique). Pas de cleanup (pas de nœud), pas de traitement au release : si la
  // note est plus courte que `time`, la rampe continue pendant le release (assumé).
  if (pitchEnv && pitchEnv.enabled && pitchEnv.amount !== 0 && (pitchEnv.time ?? 0) > 0) {
    const end = startTime + pitchEnv.time / 1000
    if (pitchEnv.invert) {
      // T.3bis « Inverser » : part de la nominale (0) et s'éloigne vers `amount`,
      // où la note RESTE (l'AudioParam tient sa dernière valeur de rampe). La
      // nominale du clip n'est que le point de départ — comportement assumé.
      osc.detune.setValueAtTime(0, startTime)
      osc.detune.linearRampToValueAtTime(pitchEnv.amount, end)
    } else {
      // Normal : part décalé de `amount` et rejoint la nominale (0).
      osc.detune.setValueAtTime(pitchEnv.amount, startTime)
      osc.detune.linearRampToValueAtTime(0, end)
    }
  }

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

  return { nodes, tremoloDepthGain }
}
