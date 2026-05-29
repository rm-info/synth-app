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

const fr = {
  // Onglets principaux (Designer→Création, Composer→Composition : iter-M).
  tabs: {
    designer: 'Création',
    composer: 'Composition',
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

  // Éditeur de patch (Création).
  editor: {
    waveformTitle: 'Forme d’onde',
    spectroToggle: 'Spectro', // à arbitrer (Spectro / Spectrogramme)
    clear: 'Effacer',
    test: 'Test',             // à arbitrer (Test / Tester)
    canvasEmpty: 'Canvas vide', // à arbitrer (Tracé vide / Toile vide)
  },

  // Presets de formes d'onde.
  presets: {
    sine: 'Sinusoïde',
    square: 'Carrée',
    sawtooth: 'Dent de scie',
    triangle: 'Triangle',
  },

  // Enveloppe AHDSR. « Sustain » conservé (à arbitrer) ; les autres étapes
  // ont un FR clair.
  adsr: {
    attack: 'Attaque',
    hold: 'Maintien',
    decay: 'Déclin',
    sustain: 'Sustain',       // à arbitrer (Sustain / Tenue)
    release: 'Relâchement',
    // Tooltips des poignées sur le tracé (P1 / P1h / P2 / P4).
    handleP1: 'Attaque + Amplitude',
    handleHold: 'Maintien',
    handleP2: 'Déclin + Sustain',
    handleRelease: 'Relâchement',
  },

  // Pistes (timeline).
  track: {
    muteTitle: 'Mettre en sourdine',
    unmuteTitle: 'Réactiver le son',
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
    root: 'Racine',
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
