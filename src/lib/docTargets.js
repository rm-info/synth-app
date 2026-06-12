// src/lib/docTargets.js — Registre du mode « Documentation interactive »
// (Info / Ctrl+I, iter-U phase-2.2). Moule de `SHORTCUTS` (lib/shortcuts.js).
//
// Une table déclarative `DOC_TARGETS` consommée par `InfoOverlay.jsx` : pour
// chaque entrée dont le `contexts` matche l'onglet actif ET dont l'ancre
// `data-anchor` est résolue visible (filtre `getAnchoredPosition`), l'overlay
// pose un badge cliquable qui mène — via `navigateToDoc(articleId, fragment)`
// (App.jsx, machinerie U.1) — au paragraphe dédié de l'onglet Documentation.
//
// Convention (identique à SHORTCUTS) :
//   - id        : stable, unique.
//   - contexts  : onglets où la cible peut exister ('designer' | 'composer'
//                 | 'library' | 'documentation'). Multi-onglets by design.
//   - anchor    : string = valeur `data-anchor` posée sur l'élément, OU une
//                 fonction `(state) => string` pour les ancres contextuelles.
//   - label     : libellé court du badge.
//   - doc       : 'article-id' ou 'article-id#heading-id'. Sans fragment =
//                 ouverture en haut d'article (légal — pour les contrôles dont
//                 la section dédiée n'existera qu'en U.3).
//
// Amorçage U.2 : les contrôles Designer existants → sections de
// `guide-designer.md` (headings dotés d'un `{#id}` en U.2, sans toucher à la
// prose). La couverture exhaustive de la Création (ancres manquantes +
// articles par module) viendra en U.3 ; le registre accepte déjà les autres
// onglets tels quels.

export const DOC_TARGETS = [
  // ----- Création (Designer) : les trois lentilles -----
  {
    id: 'designer-waveform',
    contexts: ['designer'],
    anchor: 'designer-waveform',
    label: 'Forme d’onde',
    doc: 'guide-designer#lentille-forme-onde',
  },
  {
    id: 'designer-harmonics',
    contexts: ['designer'],
    anchor: 'designer-harmonics',
    label: 'Harmoniques',
    doc: 'guide-designer#lentille-harmoniques',
  },
  {
    id: 'designer-spectrogram',
    contexts: ['designer'],
    anchor: 'designer-spectrogram',
    label: 'Spectrogramme',
    doc: 'guide-designer#lentille-spectrogramme',
  },

  // ----- Création : instrument / enveloppe / effets -----
  {
    id: 'designer-adsr',
    contexts: ['designer'],
    anchor: 'designer-adsr',
    label: 'Enveloppe AHDSR',
    doc: 'guide-designer#enveloppe-ahdsr',
  },
  {
    id: 'designer-amplitude',
    contexts: ['designer'],
    anchor: 'designer-amplitude',
    label: 'Amplitude',
    doc: 'guide-designer#amplitude',
  },
  {
    // Le module « Effets » n'a pas encore de section dédiée dans guide-designer
    // → entrée sans fragment (ouverture en haut d'article). Section en U.3/U.4.
    id: 'designer-modulation',
    contexts: ['designer'],
    anchor: 'designer-modulation',
    label: 'Effets',
    doc: 'guide-designer',
  },

  // ----- Création : hauteur / clavier de test -----
  {
    id: 'designer-system-selector',
    contexts: ['designer'],
    anchor: 'designer-system-selector',
    label: 'Système musical',
    doc: 'guide-designer#choisir-systeme-musical',
  },
  {
    id: 'designer-octave-selector',
    contexts: ['designer'],
    anchor: 'designer-octave-selector',
    label: 'Octave',
    doc: 'guide-designer#tester-au-clavier',
  },
  {
    id: 'designer-keyboard',
    contexts: ['designer'],
    anchor: 'designer-keyboard',
    label: 'Clavier de test',
    doc: 'guide-designer#tester-au-clavier',
  },
  {
    id: 'designer-sustain-pastille',
    contexts: ['designer'],
    anchor: 'designer-sustain-pastille',
    label: 'Maintien',
    doc: 'guide-designer#tester-au-clavier',
  },
  {
    id: 'designer-test-free-button',
    contexts: ['designer'],
    anchor: 'designer-test-free-button',
    label: 'Test (mode Libre)',
    doc: 'guide-designer#tester-au-clavier',
  },

  // ----- Création : barre du haut -----
  {
    // « Repartir de zéro » est expliqué dans la section Enregistrer.
    id: 'designer-new-button',
    contexts: ['designer'],
    anchor: 'designer-new-button',
    label: 'Nouveau patch',
    doc: 'guide-designer#enregistrer',
  },
  {
    id: 'designer-presets-button',
    contexts: ['designer'],
    anchor: 'designer-presets-button',
    label: 'Timbres',
    doc: 'guide-designer#barre-du-haut',
  },
  {
    id: 'designer-reset-button',
    contexts: ['designer'],
    anchor: 'designer-reset-button',
    label: 'Réinitialiser',
    doc: 'guide-designer#barre-du-haut',
  },
  {
    id: 'designer-save-button',
    contexts: ['designer'],
    anchor: 'designer-save-button',
    label: 'Enregistrer',
    doc: 'guide-designer#enregistrer',
  },
  {
    id: 'designer-save-as-button',
    contexts: ['designer'],
    anchor: 'designer-save-as-button',
    label: 'Enregistrer comme nouveau',
    doc: 'guide-designer#enregistrer',
  },
]

// Résout l'ancre (string) d'une entrée compte tenu du state (fonction ou
// string) — même contrat que `getAnchor` de lib/shortcuts.js.
export function getTargetAnchor(entry, state) {
  return typeof entry.anchor === 'function' ? entry.anchor(state) : entry.anchor
}

// Sépare `doc` en [articleId, fragment|null] pour `navigateToDoc`.
export function splitDocTarget(doc) {
  const hash = doc.indexOf('#')
  return hash === -1 ? [doc, null] : [doc.slice(0, hash), doc.slice(hash + 1)]
}
