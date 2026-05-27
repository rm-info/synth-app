// src/docs/index.js — Table TOC de l'onglet Documentation (iter-L
// phase-2.3). Point d'extension unique pour la liste des articles —
// l'ordre du tableau exporté = ordre d'affichage dans la sidebar.
//
// Format d'entrée :
//   - id        : string stable, sert d'identifiant cross-session
//                 (sessionStorage de la position de lecture). À ne pas
//                 changer une fois publié sans migration.
//   - title     : libellé affiché dans la TOC et l'en-tête (si rendu).
//   - section   : groupage visuel ("Le projet", "Référence", "Articles").
//                 L'ordre des sections suit l'ordre d'apparition des
//                 entrées dans le tableau.
//   - type      : 'markdown' (rendu via MarkdownRenderer + source brute)
//                 ou 'generated' (composant React dédié, dispatché par
//                 DocumentationTab — id 'shortcuts' = ShortcutsReference).
//   - source    : string Markdown brute (uniquement pour type 'markdown').
//                 Importée via le suffix `?raw` de Vite (zéro plugin
//                 nécessaire).
//
// Les sources .md sont enrichies en L.2.5 (stubs articles + fichier de
// test renderer).

export const DOC_TOC = [
  {
    id: 'shortcuts',
    title: 'Raccourcis clavier',
    section: 'Référence',
    type: 'generated',
  },
]
