// src/lib/tours/designer.js — Séquence du Tour guidé de l'onglet Création
// (réécrite iter-U phase-5.3). Rampe d'accueil narrative resserrée — le
// parcours d'un débutant : faire un son → le sculpter → l'écouter → découvrir
// les effets → enregistrer. Le Tour ORIENTE, l'Info (Ctrl+I) DÉTAILLE : chaque
// étape pointe la bonne section de son article `creation-*` via « En savoir
// plus », et le tour se referme en renvoyant vers la doc interactive.
//
// Champs d'une étape (résolus par Tour.jsx, qui skippe les ancres absentes) :
//   - anchor       : valeur data-anchor de l'élément ciblé.
//   - title        : titre court (3-5 mots).
//   - body         : 1-2 phrases au tutoiement (microcopie, pas de prose).
//   - article      : (optionnel) 'article-id#fragment' DOC_TOC → bouton « En
//                    savoir plus » (route via navigateToDoc : scroll + flash).
//   - revealModule : (optionnel) module rendu visible avant de pointer
//                    ('canvas' | 'harmonics' | 'spectrogram' | 'params' |
//                    'adsr' | 'modulation') — déplié en bande, sorti d'une
//                    maximisation concurrente, ou amené plein cadre en mobile.
//   - sidebar      : (optionnel) sidebar à déplier ('designer' | …).

export const designerTour = [
  {
    anchor: 'designer-waveform',
    title: 'Dessiner le timbre',
    body: 'Trace la forme d\'onde à la souris : c\'est la « couleur » de ton son. Tu peux aussi partir d\'une onde classique (sinus, carré, dent de scie…).',
    article: 'creation-forme-onde#dessiner',
    revealModule: 'canvas',
  },
  {
    anchor: 'designer-lens-toggle',
    title: 'Deux façons d\'éditer',
    body: 'Bascule entre dessin Libre (à main levée) et mode Ancres (quelques points reliés). Deux gestes pour façonner la même onde.',
    article: 'creation-forme-onde#libre-ancres',
    revealModule: 'canvas',
  },
  {
    anchor: 'designer-harmonics',
    title: 'Vu par ses harmoniques',
    body: 'Le même son, décomposé en barres : chaque barre est une harmonique. Tire-les pour sculpter le timbre autrement.',
    article: 'creation-harmoniques#barres-harmoniques',
    revealModule: 'harmonics',
  },
  {
    anchor: 'designer-spectrogram',
    title: 'Voir les fréquences',
    body: 'Le spectrogramme affiche les fréquences réellement jouées et leur intensité — une fenêtre sur ce que tu entends.',
    article: 'creation-spectrogramme#lire-le-spectrogramme',
    revealModule: 'spectrogram',
  },
  {
    anchor: 'designer-system-selector',
    title: 'Choisir l\'accordage',
    body: 'Découpe l\'octave à ta façon : la gamme à douze notes habituelle, ou des tempéraments alternatifs.',
    article: 'creation-instrument#systeme-musical',
    revealModule: 'params',
  },
  {
    anchor: 'designer-keyboard',
    title: 'Jouer pour écouter',
    body: 'Joue les notes à la souris ou au clavier physique pour entendre ton timbre en direct. PageUp / PageDown changent d\'octave.',
    article: 'creation-instrument#clavier',
    revealModule: 'params',
  },
  {
    anchor: 'designer-adsr',
    title: 'Le volume dans le temps',
    body: 'L\'enveloppe AHDSR sculpte l\'évolution du volume : attaque, maintien, déclin, tenue, extinction. C\'est ce qui distingue une cloche d\'un coup d\'archet.',
    article: 'creation-enveloppe#enveloppe-ahdsr',
    revealModule: 'adsr',
  },
  {
    anchor: 'designer-modulation',
    title: 'Une boîte à effets',
    body: 'Vibrato, filtre, distorsion… neuf effets « sans mémoire » qui transforment le son à la volée. À explorer un par un dans le module.',
    article: 'creation-effets#choisir-un-effet',
    revealModule: 'modulation',
  },
  {
    anchor: 'designer-presets-button',
    title: 'Partir d\'un timbre tout fait',
    body: 'Pas envie de tout dessiner ? Charge un timbre prêt à l\'emploi et retouche-le à ton goût.',
    article: 'creation-atelier#timbres-presets',
  },
  {
    anchor: 'designer-miniplayer',
    title: 'Écouter la composition',
    body: 'Le mini-lecteur joue le morceau en cours sans quitter la Création — pratique pour situer ton timbre dans la composition.',
    article: 'creation-atelier#ecouter',
  },
  {
    anchor: 'designer-save-as-button',
    title: 'Enregistrer dans la Bibliothèque',
    body: 'Sauvegarde ton timbre pour le réutiliser et le poser sur la timeline du Composer.',
    article: 'creation-atelier#enregistrer-sous',
    sidebar: 'designer',
  },
  {
    anchor: 'header-info-button',
    title: 'Le détail, à la demande',
    body: 'Pour le détail de n\'importe quel contrôle, ouvre la doc interactive (Ctrl+I) : elle pose un repère cliquable sur chaque réglage à l\'écran.',
  },
]
