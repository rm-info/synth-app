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
    harmonicsTitle: 'Harmoniques', // iter-M phase-2 : colonne éditeur de barres
    spectroToggle: 'Spectro', // conservé (abrév. FR de Spectrogramme) — archi
    clear: 'Effacer',
    test: 'Tester',
    canvasEmpty: 'Zone de dessin vide',
    definition: 'Définition',
    // iter-M phase-2 : nombre d'harmoniques (mode barres) + verrou des vues
    // dérivées read-only + passerelle de conversion.
    harmonicCount: 'N',
    harmonicCountTitle: 'Nombre d’harmoniques',
    readOnlyHint: 'Vue dérivée (lecture seule)',
    convertToHarmonic: 'Convertir en Harmoniques',
    convertToDraw: 'Convertir en Dessin',
  },

  // Passerelle de conversion draw ↔ harmonic (dialogs).
  convert: {
    toHarmonicTitle: 'Conversion en mode Harmoniques',
    toHarmonicBody:
      'Choisis N (nombre d’harmoniques à conserver). Les harmoniques au-delà ' +
      'seront supprimées et la phase abandonnée. La forme dessinée sera ' +
      'remplacée par une reconstruction.',
    toHarmonicConfirm: 'Convertir',
    toDrawTitle: 'Conversion en mode Dessin',
    toDrawBody:
      'La courbe sera reconstruite à partir des harmoniques actuelles ; tu ' +
      'pourras la retoucher à la main.',
    toDrawConfirm: 'Convertir',
    cancel: 'Annuler',
  },

  // Presets de formes d'onde.
  presets: {
    sine: 'Sinusoïde',
    square: 'Carrée',
    sawtooth: 'Dent de scie',
    triangle: 'Triangle',
  },

  // Enveloppe AHDSR : Attaque / Tenue / Déclin / Maintien / Relâchement.
  // Hold→Tenue libère « Maintien » pour Sustain (et la pédale clavier Espace),
  // plus parlant que « Soutenir » — décision archi.
  adsr: {
    attack: 'Attaque',
    hold: 'Tenue',
    decay: 'Déclin',
    sustain: 'Maintien',
    release: 'Relâchement',
    // Tooltips des poignées sur le tracé (P1 / P1h / P2 / P4).
    handleP1: 'Attaque + Amplitude',
    handleHold: 'Tenue',
    handleP2: 'Déclin + Maintien',
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
