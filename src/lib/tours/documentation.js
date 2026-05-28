// src/lib/tours/documentation.js — Séquence du Tour guidé pour l'onglet
// Documentation (iter-L phase-4). Cf. designer.js pour le format des étapes.

export const documentationTour = [
  {
    anchor: 'doc-toc',
    title: 'Le sommaire',
    body: 'Navigue entre les articles et la référence : le projet, les concepts musicaux, les raccourcis.',
    sidebar: 'doc',
  },
  {
    anchor: 'doc-content',
    title: 'La zone de lecture',
    body: 'L\'article courant s\'affiche ici. Certains liens te mènent droit à l\'élément d\'interface concerné.',
    article: 'about',
  },
  {
    anchor: 'header-shortcuts-button',
    title: 'Tous les raccourcis',
    body: 'Ouvre l\'aperçu des raccourcis clavier du contexte courant (Ctrl+K).',
  },
]
