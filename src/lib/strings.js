// Graine i18n (iter-M, préalable B) — libellés UI centralisés.
//
// FR uniquement pour l'instant ; structuré pour qu'un jour `fr` / `en`
// cohabitent (ajouter un objet sibling + un sélecteur de locale). PAS de lib
// i18n, pas de framework : un simple objet de clés sémantiques.
//
// Convention : les composants consomment ces clés (`STRINGS.tabs.designer`)
// plutôt que des littéraux, pour que la francisation — et l'i18n futur — se
// fasse ici, en un seul endroit. La graine inclut aussi les termes
// volontairement conservés (acronymes, « patch », et les arbitrages archi
// gardés tels quels). Cf. `archi/M0-audit-francisation.md`.

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
    playLabel: '▶ Lire',
    stopLabel: '■ Arrêter',
    playAria: 'Lire',
    stopAria: 'Arrêter',
    exportIdle: 'Exporter WAV',
    exportBusy: 'Exporter…',
  },

  // Éditeur de patch (Création).
  editor: {
    waveformTitle: 'Forme d’onde',
    spectroToggle: 'Spectro', // conservé (abrév. FR de Spectrogramme) — archi
    clear: 'Effacer',
    test: 'Tester',
    canvasEmpty: 'Zone de dessin vide',
  },

  // Presets de formes d'onde.
  presets: {
    sine: 'Sinusoïde',
    square: 'Carrée',
    sawtooth: 'Dent de scie',
    triangle: 'Triangle',
  },

  // Enveloppe AHDSR. « Soutenir » (Sustain) : terme culture clavier/synthé
  // conservé en forme verbale, glosé au glossaire — décision archi.
  adsr: {
    attack: 'Attaque',
    hold: 'Maintien',
    decay: 'Déclin',
    sustain: 'Soutenir',
    release: 'Relâchement',
    // Tooltips des poignées sur le tracé (P1 / P1h / P2 / P4).
    handleP1: 'Attaque + Amplitude',
    handleHold: 'Maintien',
    handleP2: 'Déclin + Soutenir',
    handleRelease: 'Relâchement',
  },

  // Pistes (timeline). « Solo » conservé (mot français, paire avec Sourdine).
  track: {
    muteTitle: 'Mettre en sourdine',
    unmuteTitle: 'Réactiver le son',
    soloOnTitle: 'Solo',
    soloOffTitle: 'Désactiver solo',
  },

  // Spectrogramme.
  spectro: {
    live: 'Direct',
    peak: 'Crête',
  },

  // Bibliothèque.
  library: {
    root: 'Racine',
  },

  // Termes volontairement CONSERVÉS (graine complète — décision archi).
  // Listés ici pour documenter le vocabulaire de référence ; l'affichage n'en
  // dépend pas partout (rewiring opportuniste), mais le terme est figé.
  // « OK » (boutons de dialogue) est conservé tel quel, standard en UI FR.
  kept: {
    patch: 'patch',
    adsr: 'ADSR',
    bpm: 'BPM',
    a4: 'A4',
    hz: 'Hz',
  },
}

export const STRINGS = fr
