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
//
// 100 % Web Audio API native (OscillatorNode + GainNode existants), zéro dépendance.

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
 *   osc: OscillatorNode, gain: GainNode,
 *   vibrato?: import('../types').Lfo, tremolo?: import('../types').Lfo,
 *   startTime: number, stopTime?: number, baseAmplitude: number,
 * }} opts
 * @returns {{ nodes: AudioNode[], tremoloDepthGain: GainNode|null }}
 *   `nodes` = [] si aucun effet enabled. `tremoloDepthGain` exposé pour que les
 *   previews (sans stopTime) éteignent le trémolo au release.
 */
export function applyModulation(ctx, { osc, gain, vibrato, tremolo, startTime, stopTime, baseAmplitude }) {
  const nodes = []
  let tremoloDepthGain = null

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
    scheduleOnset(depthGain.gain, baseAmplitude * tremolo.depth, startTime, tremolo.onset)
    // Extinction en fin de note : ramener la profondeur à 0 pour que le LFO ne
    // fasse plus osciller gain.gain autour de 0 pendant l'extinction AHDSR
    // (sinon souffle audible dans la traîne). Pour les previews (stopTime
    // absent), l'appelant fait cette rampe au release.
    if (stopTime != null) depthGain.gain.linearRampToValueAtTime(0, stopTime)
    lfo.connect(depthGain)
    depthGain.connect(gain.gain)
    lfo.start(startTime)
    if (stopTime != null) lfo.stop(stopTime)
    nodes.push(lfo, depthGain)
    tremoloDepthGain = depthGain
  }

  return { nodes, tremoloDepthGain }
}
