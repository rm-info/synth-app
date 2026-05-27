// src/docs/index.js — Table TOC de l'onglet Documentation.
//
// Point d'extension unique pour la liste des articles : l'ordre du
// tableau exporté = ordre d'affichage dans la sidebar. Le groupage en
// sections suit l'ordre d'apparition.
//
// Format d'entrée :
//   - id        : string stable, sert d'identifiant cross-session
//                 (sessionStorage de la position de lecture). À ne pas
//                 changer une fois publié sans migration.
//   - title     : libellé affiché dans la TOC (et en titre éventuel).
//   - section   : groupage visuel ("Le projet", "Référence", "Articles").
//   - type      : 'markdown' (rendu via MarkdownRenderer + source brute)
//                 ou 'generated' (composant React dédié, dispatché par
//                 DocumentationTab — id 'shortcuts' = ShortcutsReference).
//   - source    : string Markdown brute (uniquement pour type 'markdown').
//                 Importée via le suffix `?raw` de Vite (zéro plugin).
//
// L'entrée `_renderer-test` est un fichier de validation visuelle des
// features du renderer. À retirer en L.5 quand les vrais articles
// rédigés couvrent la même surface en conditions réelles.

import aboutMd from './articles/about.md?raw'
import why12Md from './articles/why-12-notes.md?raw'
import rendererTestMd from './articles/_renderer-test.md?raw'

export const DOC_TOC = [
  {
    id: 'about',
    title: 'À propos',
    section: 'Le projet',
    type: 'markdown',
    source: aboutMd,
  },
  {
    id: 'shortcuts',
    title: 'Raccourcis clavier',
    section: 'Référence',
    type: 'generated',
  },
  {
    id: '_renderer-test',
    title: 'Test renderer',
    section: 'Référence',
    type: 'markdown',
    source: rendererTestMd,
  },
  {
    id: 'why-12-notes',
    title: 'Pourquoi 12 notes ?',
    section: 'Articles',
    type: 'markdown',
    source: why12Md,
  },
]
