// src/lib/tours/designer.js — Séquence du Tour guidé pour l'onglet Designer
// (iter-L phase-4). Chaque étape pointe une ancre `data-anchor` ; le moteur
// (Tour.jsx) résout la position via getAnchoredPosition et skippe les ancres
// absentes (ex. spectrogramme masqué).
//
// Champs d'une étape :
//   - anchor  : valeur data-anchor de l'élément ciblé.
//   - title   : titre court (3-5 mots).
//   - body    : 1-2 phrases. Premier jet dev — passe rédactionnelle à venir
//               (cf. archi/L4-redaction-prompt.md).
//   - article : (optionnel) id DOC_TOC pour le bouton « En savoir plus ».
//   - sidebar : (optionnel) sidebar à déplier avant de pointer l'ancre
//               ('designer' | 'doc' | 'composer-bank' | 'composer-aside').

export const designerTour = [
  {
    anchor: 'designer-waveform',
    title: 'Dessiner le timbre',
    body: 'Trace la forme d\'onde à la souris, ou pars d\'un preset (sinus, carré, dent de scie…). C\'est la couleur sonore de ton instrument.',
  },
  {
    anchor: 'designer-system-selector',
    title: 'Le système musical',
    body: 'Choisis la façon de découper l\'octave : la gamme à 12 notes habituelle, ou des tempéraments alternatifs (X-EDO, systèmes historiques).',
    article: 'why-12-notes',
  },
  {
    anchor: 'designer-adsr',
    title: 'L\'enveloppe AHDSR',
    body: 'Sculpte le volume dans le temps : attaque, maintien, déclin, tenue, extinction. C\'est ce qui distingue une cloche d\'un coup d\'archet.',
  },
  {
    anchor: 'designer-keyboard',
    title: 'Le clavier de test',
    body: 'Joue les notes du système courant pour écouter ton patch en direct, à la souris ou aux touches du clavier.',
  },
  {
    anchor: 'designer-sustain-pastille',
    title: 'La pédale de sustain',
    body: 'Maintiens Espace pour prolonger les notes jouées : leur extinction est différée jusqu\'au relâchement.',
  },
  {
    anchor: 'designer-octave-selector',
    title: 'Changer d\'octave',
    body: 'Décale l\'octave de référence du clavier de test (PageUp / PageDown).',
  },
  {
    anchor: 'designer-spectrogram',
    title: 'Le spectrogramme',
    body: 'Visualise le contenu harmonique du son joué : les fréquences présentes et leur intensité.',
  },
  {
    // Ancre toujours présente (le bouton « Enregistrer » existe sans patch
    // chargé, contrairement à designer-save-button qui n'apparaît qu'avec un
    // patch courant). Évite une étape vide quand le tour démarre à froid.
    anchor: 'designer-save-as-button',
    title: 'Enregistrer le patch',
    body: 'Sauvegarde ton timbre dans la bibliothèque pour le rejouer dans le Composer.',
    sidebar: 'designer',
  },
  {
    anchor: 'designer-new-button',
    title: 'Repartir de zéro',
    body: 'Vide l\'éditeur pour commencer un nouveau patch (Ctrl+Alt+N).',
    sidebar: 'designer',
  },
]
