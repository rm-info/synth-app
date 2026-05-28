// src/lib/tours/library.js — Séquence du Tour guidé pour l'onglet Bibliothèque
// (iter-L phase-4). Cf. designer.js pour le format des étapes.
//
// library-clipboard-chip n'apparaît que lorsque le presse-papier bibliothèque
// est non vide : son étape est skippée gracieusement sinon.

export const libraryTour = [
  {
    anchor: 'library-item-list',
    title: 'Tes patches',
    body: 'Tous les sons enregistrés depuis le Designer, rangés en dossiers. Clique pour sélectionner ; Ctrl ou Maj pour une sélection multiple.',
  },
  {
    anchor: 'library-hierarchy-mode',
    title: 'Navigation ou arborescence',
    body: 'Bascule entre une vue « un dossier à la fois » et l\'arborescence complète dépliable.',
  },
  {
    anchor: 'library-display-mode',
    title: 'Modes d\'affichage',
    body: 'Liste compacte, détails, ou tuiles avec aperçu de la forme d\'onde.',
  },
  {
    anchor: 'library-copy-button',
    title: 'Copier, couper, coller',
    body: 'Réorganise patches et dossiers dans la hiérarchie via le presse-papier (Ctrl+C / Ctrl+X / Ctrl+V).',
  },
  {
    anchor: 'library-clipboard-chip',
    title: 'Le presse-papier',
    body: 'Indique ce qui est en attente de collage. Échap le vide.',
  },
  {
    anchor: 'library-delete-button',
    title: 'Supprimer',
    body: 'Retire les items sélectionnés. Un avertissement s\'affiche si un patch est utilisé dans le Composer.',
  },
  {
    anchor: 'header-shortcuts-button',
    title: 'Tous les raccourcis',
    body: 'Ouvre l\'aperçu des raccourcis clavier du contexte courant (Ctrl+K).',
  },
]
