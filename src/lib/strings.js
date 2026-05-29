// Graine i18n (iter-M, préalable B) — libellés UI centralisés.
//
// FR uniquement pour l'instant ; structuré pour qu'un jour `fr` / `en`
// cohabitent (ajouter un objet sibling + un sélecteur de locale). PAS de lib
// i18n, pas de framework : un simple objet de clés sémantiques.
//
// Convention : les composants consomment ces clés (`STRINGS.tabs.designer`)
// plutôt que des littéraux, pour que la francisation — et l'i18n futur — se
// fasse ici, en un seul endroit. La graine inclut aussi les termes
// volontairement conservés (acronymes, « patch ») et les cas « à arbitrer »
// (laissés EN), pour qu'une décision archi future soit un changement d'une
// ligne. Cf. `archi/M0-audit-francisation.md`.
//
// NB : ce commit (phase-0b SC1) CENTRALISE à valeurs inchangées (refactor
// neutre) ; les traductions FR claires sont appliquées en SC2.

const fr = {
  // Onglets principaux.
  tabs: {
    designer: 'Designer',
    composer: 'Composer',
    library: 'Bibliothèque',
    documentation: 'Documentation',
  },

  // Transport (lecture / arrêt / export).
  transport: {
    playLabel: '▶ Play',      // à arbitrer (jargon audio) — title voisin déjà FR
    stopLabel: '■ Stop',      // à arbitrer
    playAria: 'Play',         // à arbitrer
    stopAria: 'Stop',         // à arbitrer
    exportIdle: 'Exporter WAV',
    exportBusy: 'Export…',    // à arbitrer (Export… / Exportation…)
  },

  // Éditeur de patch (Designer).
  editor: {
    waveformTitle: 'Waveform',
    spectroToggle: 'Spectro', // à arbitrer (Spectro / Spectrogramme)
    clear: 'Clear',
    test: 'Test',             // à arbitrer (Test / Tester)
    canvasEmpty: 'Canvas vide', // à arbitrer (Tracé vide / Toile vide)
  },

  // Presets de formes d'onde.
  presets: {
    sine: 'Sine',
    square: 'Square',
    sawtooth: 'Sawtooth',
    triangle: 'Triangle',
  },

  // Enveloppe AHDSR. « Sustain » conservé (à arbitrer) ; les autres étapes
  // ont un FR clair (appliqué en SC2).
  adsr: {
    attack: 'Attack',
    hold: 'Hold',
    decay: 'Decay',
    sustain: 'Sustain',       // à arbitrer (Sustain / Tenue)
    release: 'Release',
    // Tooltips des poignées sur le tracé (P1 / P1h / P2 / P4).
    handleP1: 'Attack + Amplitude',
    handleHold: 'Hold',
    handleP2: 'Decay + Sustain',
    handleRelease: 'Release',
  },

  // Pistes (timeline).
  track: {
    muteTitle: 'Mute',
    unmuteTitle: 'Unmute',
    soloOnTitle: 'Solo',          // à arbitrer (Solo / Isoler)
    soloOffTitle: 'Désactiver solo',
  },

  // Spectrogramme.
  spectro: {
    live: 'Live',             // à arbitrer (Live / Direct)
    peak: 'Peak',             // à arbitrer (Peak / Pics)
  },

  // Bibliothèque.
  library: {
    root: 'root',
  },

  // Termes volontairement CONSERVÉS (graine complète — décision archi).
  // Listés ici pour documenter le vocabulaire de référence ; l'affichage n'en
  // dépend pas partout (rewiring opportuniste), mais le terme est figé.
  kept: {
    patch: 'patch',
    adsr: 'ADSR',
    bpm: 'BPM',
    a4: 'A4',
    hz: 'Hz',
  },
}

export const STRINGS = fr
