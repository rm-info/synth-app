// src/lib/tours/composer.js — Séquence du Tour guidé pour l'onglet Composer
// (iter-L phase-4). Cf. designer.js pour le format des étapes.
//
// Plusieurs ancres dépendent d'un contexte transitoire (sélection, presse-
// papier, clip ancre) : sans clip ni sélection, composer-anchor-clip n'existe
// pas et son étape est skippée gracieusement (pas de clip témoin créé — hors
// scope médian). La toolbar (transport, BPM, durées, copier/coller) est, elle,
// toujours présente.

export const composerTour = [
  {
    anchor: 'composer-timeline',
    title: 'La timeline',
    body: 'Dépose tes patches sur les pistes pour les arranger dans le temps. Chaque bloc est un clip jouant un son à une hauteur et une durée données.',
  },
  {
    anchor: 'composer-transport',
    title: 'Lecture et arrêt',
    body: 'Lance ou stoppe la lecture de la composition. Le curseur balaie la timeline pendant le jeu.',
  },
  {
    anchor: 'composer-bpm',
    title: 'Le tempo',
    body: 'Règle la vitesse en battements par minute (noires par minute).',
  },
  {
    anchor: 'composer-octave-indicator',
    title: 'L\'octave de saisie',
    body: 'Indique l\'octave de référence pour les notes posées au clavier (PageUp / PageDown).',
  },
  {
    anchor: 'composer-duration-buttons',
    title: 'La durée par défaut',
    body: 'Choisis la durée des prochains clips : de la ronde à la triple croche, avec coefficients (pointé, double-pointé).',
  },
  {
    anchor: 'composer-copy-button',
    title: 'Copier, couper, coller',
    body: 'Duplique ou déplace les clips sélectionnés (Ctrl+C / Ctrl+X / Ctrl+V).',
  },
  {
    anchor: 'composer-anchor-clip',
    title: 'Placement contigu',
    body: 'Le dernier clip touché sert d\'ancre : une touche de note pose le clip suivant juste après, à la hauteur jouée.',
  },
  {
    anchor: 'composer-properties',
    title: 'Le panneau Propriétés',
    body: 'Édite finement le clip sélectionné : patch, hauteur, durée — et fusionne ou divise plusieurs clips contigus.',
    sidebar: 'composer-aside',
  },
]
