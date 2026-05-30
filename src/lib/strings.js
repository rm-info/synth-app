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
    convertToSpline: 'Convertir en Spline',
    // iter-M phase-2-as : toggle auto-sizing des 3 colonnes (essai).
    autoSizing: 'Dimension auto',
    autoSizingTitle: 'La colonne en cours d’édition s’élargit automatiquement',
    // iter-M phase-3 : éditeur spline (points/courbe).
    splineInterpolation: 'Interpolation',
    splineSoft: 'Doux',
    splineHard: 'Anguleux',
    splineSoftTitle: 'Courbe lisse (Catmull-Rom)',
    splineHardTitle: 'Segments droits (polyligne)',
    splineAddHint: 'Clic sur la courbe : ajouter une ancre · glisser : déplacer · Suppr / clic droit : retirer',
    splineRemove: 'Supprimer l’ancre',
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
    // iter-M phase-3 : conversion vers le mode spline (draw→spline, harmonic→spline).
    toSplineTitle: 'Conversion en mode Spline',
    toSplineBody:
      'Choisis le nombre d’ancres et le type d’interpolation. La courbe sera ' +
      'reconstruite à partir des ancres ; les détails fins entre les ancres ' +
      'seront perdus.',
    toSplineConfirm: 'Convertir',
    anchorCount: 'Nombre d’ancres',
    cancel: 'Annuler',
  },

  // Presets de formes d'onde (mode dessin).
  presets: {
    sine: 'Sinusoïde',
    square: 'Carrée',
    sawtooth: 'Dent de scie',
    triangle: 'Triangle',
  },

  // iter-M phase-4 : bibliothèque de presets de timbre (mode harmonique).
  // Libellés UI du bouton/picker, catégories, dialog de confirmation, puis
  // noms + descriptions de chaque recette (clés = `id` dans lib/presets.js).
  timbrePresets: {
    loadButton: 'Presets',
    loadButtonTitle: 'Charger un timbre prédéfini',
    pickerTitle: 'Presets de timbre',
    categoryEvocateurs: 'Évocateurs d’instruments',
    categoryInattendus: 'Inattendus-propres',
    dirtyConfirmTitle: 'Charger ce preset ?',
    dirtyConfirmBody: 'Tes modifications non sauvegardées seront perdues.',
    dirtyConfirmLoad: 'Charger',
    dirtyConfirmCancel: 'Annuler',
    names: {
      square: 'Onde carrée',
      triangle: 'Triangle',
      sawtooth: 'Dent de scie',
      flute: 'Flûte',
      organ: 'Orgue',
      brass: 'Cuivre',
      oddOnly: 'Harmoniques impaires',
      evenOnly: 'Harmoniques paires',
      triad135: 'Triade 1+3+5',
      octaves: 'Octaves',
      cluster147: 'Cluster 1+4+7',
      sparse159: '1+5+9 (creux)',
    },
    descriptions: {
      square: 'Harmoniques impaires en 1/k — son creux d’anche.',
      triangle: 'Harmoniques impaires en 1/k² — doux, peu de mordant.',
      sawtooth: 'Toutes les harmoniques en 1/k — riche et brillant.',
      flute: 'Fondamentale dominante, harmoniques très atténuées — timbre aérien.',
      organ: 'Huit premières harmoniques pleines — registres d’orgue.',
      brass: 'Décroissance lente avec emphase des bas rangs — cuivré.',
      oddOnly: 'Seules les harmoniques impaires, à plein niveau.',
      evenOnly: 'Seules les harmoniques paires, à plein niveau.',
      triad135: 'Trois premières harmoniques impaires (1, 3, 5).',
      octaves: 'Harmoniques en puissances de 2 (1, 2, 4, 8, 16).',
      cluster147: 'Harmoniques espacées de trois rangs (1, 4, 7).',
      sparse159: 'Trois harmoniques très espacées (1, 5, 9) — timbre creux.',
    },
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
