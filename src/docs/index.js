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
//   - section   : groupage visuel ("Le projet", "Prise en main",
//                 "Comprendre", "Concepts", "Tempéraments", "Référence").
//   - type      : 'markdown' (rendu via MarkdownRenderer + source brute)
//                 ou 'generated' (composant React dédié, dispatché par
//                 DocumentationTab — id 'shortcuts' = ShortcutsReference).
//   - source    : string Markdown brute (uniquement pour type 'markdown').
//                 Importée via le suffix `?raw` de Vite (zéro plugin).

import aboutMd from './articles/about.md?raw'
import why12Md from './articles/why-12-notes.md?raw'
import comprendreTemperamentMd from './articles/comprendre-temperament.md?raw'
import comprendreFormeOndeMd from './articles/comprendre-forme-onde.md?raw'
import comprendrePianoPasJusteMd from './articles/comprendre-piano-pas-juste.md?raw'
import guideDesignerMd from './articles/guide-designer.md?raw'
import guideBibliothequeMd from './articles/guide-bibliotheque.md?raw'
import guideComposerMd from './articles/guide-composer.md?raw'
// iter-U phase-3.1 : articles par module de la Création (section « La Création
// en détail »). Squelettes factuels (faits vérifiés dans le code) ; la prose
// pédagogique vient en U.4 (writer).
import creationAtelierMd from './articles/creation-atelier.md?raw'
import creationFormeOndeMd from './articles/creation-forme-onde.md?raw'
import creationHarmoniquesMd from './articles/creation-harmoniques.md?raw'
import creationSpectrogrammeMd from './articles/creation-spectrogramme.md?raw'
import creationInstrumentMd from './articles/creation-instrument.md?raw'
import creationEnveloppeMd from './articles/creation-enveloppe.md?raw'
import creationEffetsMd from './articles/creation-effets.md?raw'
import limitesConnuesMd from './articles/limites-connues.md?raw'
import glossaireTechniqueMd from './articles/glossaire-technique.md?raw'
import glossaireMusicalMd from './articles/glossaire-musical.md?raw'
import temperament12TetMd from './articles/temperament-12-tet.md?raw'
import temperamentJusteMajeurMd from './articles/temperament-juste-majeur.md?raw'
import temperamentPythagoricienMd from './articles/temperament-pythagoricien.md?raw'
import temperamentMeantoneMd from './articles/temperament-meantone.md?raw'
import temperamentWerckmeisterMd from './articles/temperament-werckmeister.md?raw'
import temperament24TetMd from './articles/temperament-24-tet.md?raw'
import temperamentCairo1932Md from './articles/temperament-cairo-1932.md?raw'
import temperamentSlendroMd from './articles/temperament-slendro.md?raw'
import temperamentPelogMd from './articles/temperament-pelog.md?raw'
import temperamentShrutisBhatkhandeMd from './articles/temperament-shrutis-bhatkhande.md?raw'
import temperamentShrutisSarngadevaMd from './articles/temperament-shrutis-sarngadeva.md?raw'
import temperamentXEdoMd from './articles/temperament-x-edo.md?raw'
// Article de validation du renderer (iter-U phase-1.3) — couvre les features
// V1 + les nouveautés U (ids {#id}, liens doc:#fragment, <Details>, SVG).
// À retirer en fin d'itération U, comme l'édition L l'avait été en L.5.
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
    id: 'guide-designer',
    title: 'Guide : le Designer',
    section: 'Prise en main',
    type: 'markdown',
    source: guideDesignerMd,
  },
  {
    id: 'guide-bibliotheque',
    title: 'Guide : la Bibliothèque',
    section: 'Prise en main',
    type: 'markdown',
    source: guideBibliothequeMd,
  },
  {
    id: 'guide-composer',
    title: 'Guide : le Composer',
    section: 'Prise en main',
    type: 'markdown',
    source: guideComposerMd,
  },
  {
    id: 'creation-atelier',
    title: 'L\'atelier : barre d\'outils, actions, écoute',
    section: 'La Création en détail',
    type: 'markdown',
    source: creationAtelierMd,
  },
  {
    id: 'creation-forme-onde',
    title: 'Le module Forme d\'onde',
    section: 'La Création en détail',
    type: 'markdown',
    source: creationFormeOndeMd,
  },
  {
    id: 'creation-harmoniques',
    title: 'Le module Harmoniques',
    section: 'La Création en détail',
    type: 'markdown',
    source: creationHarmoniquesMd,
  },
  {
    id: 'creation-spectrogramme',
    title: 'Le module Spectrogramme',
    section: 'La Création en détail',
    type: 'markdown',
    source: creationSpectrogrammeMd,
  },
  {
    id: 'creation-instrument',
    title: 'Le module Instrument',
    section: 'La Création en détail',
    type: 'markdown',
    source: creationInstrumentMd,
  },
  {
    id: 'creation-enveloppe',
    title: 'Le module Enveloppe',
    section: 'La Création en détail',
    type: 'markdown',
    source: creationEnveloppeMd,
  },
  {
    id: 'creation-effets',
    title: 'Le module Effets',
    section: 'La Création en détail',
    type: 'markdown',
    source: creationEffetsMd,
  },
  {
    id: 'comprendre-piano-pas-juste',
    title: 'Pourquoi le piano n\'est pas juste',
    section: 'Comprendre',
    type: 'markdown',
    source: comprendrePianoPasJusteMd,
  },
  {
    id: 'why-12-notes',
    title: 'Pourquoi 12 notes ?',
    section: 'Comprendre',
    type: 'markdown',
    source: why12Md,
  },
  {
    id: 'comprendre-temperament',
    title: 'Qu\'est-ce qu\'un tempérament ?',
    section: 'Comprendre',
    type: 'markdown',
    source: comprendreTemperamentMd,
  },
  {
    id: 'comprendre-forme-onde',
    title: 'Ce que tu entends quand tu dessines une forme d\'onde',
    section: 'Comprendre',
    type: 'markdown',
    source: comprendreFormeOndeMd,
  },
  {
    id: 'glossaire-technique',
    title: 'Glossaire technique',
    section: 'Concepts',
    type: 'markdown',
    source: glossaireTechniqueMd,
  },
  {
    id: 'glossaire-musical',
    title: 'Glossaire musical',
    section: 'Concepts',
    type: 'markdown',
    source: glossaireMusicalMd,
  },
  {
    id: 'temperament-12-tet',
    title: '12-TET (tempérament égal)',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperament12TetMd,
  },
  {
    id: 'temperament-juste-majeur',
    title: 'Intonation juste majeure (do)',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperamentJusteMajeurMd,
  },
  {
    id: 'temperament-pythagoricien',
    title: 'Pythagoricien (12 notes)',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperamentPythagoricienMd,
  },
  {
    id: 'temperament-meantone',
    title: 'Mésotonique 1/4 de comma',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperamentMeantoneMd,
  },
  {
    id: 'temperament-werckmeister',
    title: 'Werckmeister III',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperamentWerckmeisterMd,
  },
  {
    id: 'temperament-24-tet',
    title: '24-TET (quarts de ton)',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperament24TetMd,
  },
  {
    id: 'temperament-cairo-1932',
    title: 'Maqâmât du Caire 1932 (mesuré)',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperamentCairo1932Md,
  },
  {
    id: 'temperament-slendro',
    title: 'Slendro (gamelan javanais)',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperamentSlendroMd,
  },
  {
    id: 'temperament-pelog',
    title: 'Pelog (gamelan javanais)',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperamentPelogMd,
  },
  {
    id: 'temperament-shrutis-bhatkhande',
    title: 'Shrutis (Bhatkhande)',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperamentShrutisBhatkhandeMd,
  },
  {
    id: 'temperament-shrutis-sarngadeva',
    title: 'Shrutis (Sarngadeva)',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperamentShrutisSarngadevaMd,
  },
  {
    id: 'temperament-x-edo',
    title: 'X-EDO (paramétrique)',
    section: 'Tempéraments',
    type: 'markdown',
    source: temperamentXEdoMd,
  },
  {
    id: 'shortcuts',
    title: 'Raccourcis clavier',
    section: 'Référence',
    type: 'generated',
  },
  {
    id: 'limites-connues',
    title: 'Limites connues',
    section: 'Référence',
    type: 'markdown',
    source: limitesConnuesMd,
  },
  {
    id: '_renderer-test',
    title: 'Test renderer',
    section: 'Interne',
    type: 'markdown',
    source: rendererTestMd,
  },
]
