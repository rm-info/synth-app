// src/lib/docTargets.js — Registre du mode « Documentation interactive »
// (Info / Ctrl+I, iter-U phase-2.2 ; couverture complète phase-3.3). Moule de
// `SHORTCUTS` (lib/shortcuts.js).
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
//                 ouverture en haut d'article (ex. annuler/rétablir Bibliothèque :
//                 pas de section dédiée).
//
// Couverture U.3 : la Création est couverte module par module par les articles
// `creation-*` (section « La Création en détail »). Les 16 entrées amorcées en
// U.2 (qui pointaient vers `guide-designer`) sont REMAPPÉES ici vers ces
// articles ; `guide-designer` redevient un pur survol narratif (ses `{#id}` U.2
// restent sans consommateur, c'est voulu — la couture viendra du writer en U.4).
// Granularité : un contrôle logique = une cible (poignées, boutons d'un même
// groupe, états de drag → dans la prose, pas en badges séparés).
//
// Règle modales : les contrôles vivant dans une modale (réglages système,
// PresetPicker…) n'ont jamais de badge (le mode Info est gaté modale-ouverte) ;
// ils se documentent dans la prose de leur section parente.

export const DOC_TARGETS = [
  // ===== creation-atelier : barre d'outils, actions, écoute =====
  {
    id: 'designer-patch-name',
    contexts: ['designer'],
    anchor: 'designer-patch-name',
    label: 'Nom du patch',
    doc: 'creation-atelier#nom-du-patch',
  },
  {
    id: 'designer-presets-button',
    contexts: ['designer'],
    anchor: 'designer-presets-button',
    label: 'Timbres',
    doc: 'creation-atelier#timbres-presets',
  },
  {
    id: 'designer-reset-button',
    contexts: ['designer'],
    anchor: 'designer-reset-button',
    label: 'Réinitialiser',
    doc: 'creation-atelier#reinitialiser',
  },
  {
    id: 'designer-equalize-button',
    contexts: ['designer'],
    anchor: 'designer-equalize-button',
    label: 'Égaliser les rangées',
    doc: 'creation-atelier#egaliser-rangees',
  },
  {
    id: 'designer-module-switcher',
    contexts: ['designer'],
    anchor: 'designer-module-switcher',
    label: 'Modules',
    doc: 'creation-atelier#switcher-modules',
  },
  {
    // Annuler & Rétablir : deux contrôles, deux badges, même fragment.
    id: 'global-undo-button-designer',
    contexts: ['designer'],
    anchor: 'global-undo-button-designer',
    label: 'Annuler',
    doc: 'creation-atelier#annuler-retablir',
  },
  {
    id: 'global-redo-button-designer',
    contexts: ['designer'],
    anchor: 'global-redo-button-designer',
    label: 'Rétablir',
    doc: 'creation-atelier#annuler-retablir',
  },
  {
    id: 'designer-new-button',
    contexts: ['designer'],
    anchor: 'designer-new-button',
    label: 'Nouveau patch',
    doc: 'creation-atelier#nouveau-patch',
  },
  {
    id: 'designer-save-button',
    contexts: ['designer'],
    anchor: 'designer-save-button',
    label: 'Enregistrer',
    doc: 'creation-atelier#enregistrer',
  },
  {
    id: 'designer-save-as-button',
    contexts: ['designer'],
    anchor: 'designer-save-as-button',
    label: 'Enregistrer sous',
    doc: 'creation-atelier#enregistrer-sous',
  },
  {
    id: 'designer-miniplayer',
    contexts: ['designer'],
    anchor: 'designer-miniplayer',
    label: 'Écouter',
    doc: 'creation-atelier#ecouter',
  },

  // ===== creation-forme-onde =====
  {
    id: 'designer-waveform',
    contexts: ['designer'],
    anchor: 'designer-waveform',
    label: 'Forme d’onde',
    doc: 'creation-forme-onde#dessiner',
  },
  {
    id: 'designer-lens-toggle',
    contexts: ['designer'],
    anchor: 'designer-lens-toggle',
    label: 'Libre / Ancres',
    doc: 'creation-forme-onde#libre-ancres',
  },
  {
    id: 'designer-interp-toggle',
    contexts: ['designer'],
    anchor: 'designer-interp-toggle',
    label: 'Doux / Anguleux',
    doc: 'creation-forme-onde#doux-anguleux',
  },
  {
    id: 'designer-anchor-count',
    contexts: ['designer'],
    anchor: 'designer-anchor-count',
    label: 'Nombre d’ancres',
    doc: 'creation-forme-onde#nombre-ancres',
  },
  {
    id: 'designer-normalize-button',
    contexts: ['designer'],
    anchor: 'designer-normalize-button',
    label: 'Normaliser',
    doc: 'creation-forme-onde#normaliser',
  },
  {
    id: 'designer-smooth-buttons',
    contexts: ['designer'],
    anchor: 'designer-smooth-buttons',
    label: 'Lissage',
    doc: 'creation-forme-onde#lissage',
  },

  // ===== creation-harmoniques =====
  {
    id: 'designer-harmonics',
    contexts: ['designer'],
    anchor: 'designer-harmonics',
    label: 'Harmoniques',
    doc: 'creation-harmoniques#barres-harmoniques',
  },
  {
    id: 'designer-cap-stepper',
    contexts: ['designer'],
    anchor: 'designer-cap-stepper',
    label: 'Plafond d’harmoniques',
    doc: 'creation-harmoniques#plafond-harmoniques',
  },

  // ===== creation-spectrogramme =====
  {
    id: 'designer-spectrogram',
    contexts: ['designer'],
    anchor: 'designer-spectrogram',
    label: 'Spectrogramme',
    doc: 'creation-spectrogramme#lire-le-spectrogramme',
  },
  {
    id: 'designer-spectro-mode',
    contexts: ['designer'],
    anchor: 'designer-spectro-mode',
    label: 'Direct / Statique',
    doc: 'creation-spectrogramme#direct-statique',
  },
  {
    id: 'designer-spectro-db',
    contexts: ['designer'],
    anchor: 'designer-spectro-db',
    label: 'Échelle dB',
    doc: 'creation-spectrogramme#echelle-db',
  },
  {
    id: 'designer-spectro-peakhold',
    contexts: ['designer'],
    anchor: 'designer-spectro-peakhold',
    label: 'Peak hold',
    doc: 'creation-spectrogramme#peak-hold',
  },

  // ===== creation-instrument =====
  {
    id: 'designer-system-selector',
    contexts: ['designer'],
    anchor: 'designer-system-selector',
    label: 'Système musical',
    doc: 'creation-instrument#systeme-musical',
  },
  {
    id: 'designer-keyboard',
    contexts: ['designer'],
    anchor: 'designer-keyboard',
    label: 'Clavier',
    doc: 'creation-instrument#clavier',
  },
  {
    id: 'designer-octave-selector',
    contexts: ['designer'],
    anchor: 'designer-octave-selector',
    label: 'Octaves',
    doc: 'creation-instrument#octaves',
  },
  {
    id: 'designer-visual-cues',
    contexts: ['designer'],
    anchor: 'designer-visual-cues',
    label: 'Repères visuels',
    doc: 'creation-instrument#reperes-visuels',
  },
  {
    // Mode Libre : slider/input fréquence + bouton Test, deux badges, même fragment.
    id: 'designer-free-frequency',
    contexts: ['designer'],
    anchor: 'designer-free-frequency',
    label: 'Fréquence libre',
    doc: 'creation-instrument#mode-libre',
  },
  {
    id: 'designer-test-free-button',
    contexts: ['designer'],
    anchor: 'designer-test-free-button',
    label: 'Test (mode Libre)',
    doc: 'creation-instrument#mode-libre',
  },

  // ===== creation-enveloppe =====
  {
    id: 'designer-adsr',
    contexts: ['designer'],
    anchor: 'designer-adsr',
    label: 'Enveloppe AHDSR',
    doc: 'creation-enveloppe#enveloppe-ahdsr',
  },
  {
    id: 'designer-amplitude',
    contexts: ['designer'],
    anchor: 'designer-amplitude',
    label: 'Amplitude',
    doc: 'creation-enveloppe#amplitude',
  },
  {
    id: 'designer-sustain-pastille',
    contexts: ['designer'],
    anchor: 'designer-sustain-pastille',
    label: 'Maintien',
    doc: 'creation-enveloppe#sustain',
  },
  {
    id: 'designer-adsr-view-toggle',
    contexts: ['designer'],
    anchor: 'designer-adsr-view-toggle',
    label: 'Vues',
    doc: 'creation-enveloppe#vues',
  },

  // ===== creation-effets =====
  {
    // Le switcher du header (ancre sur le <header> du module Effets).
    id: 'designer-modulation',
    contexts: ['designer'],
    anchor: 'designer-modulation',
    label: 'Effets',
    doc: 'creation-effets#choisir-un-effet',
  },
  // Les 9 sous-blocs : un seul visible à la fois (effectsSelected) → un seul
  // badge, qui suit l'effet édité (les autres sont en display:none, filtrés).
  {
    id: 'designer-effect-vibrato',
    contexts: ['designer'],
    anchor: 'designer-effect-vibrato',
    label: 'Vibrato',
    doc: 'creation-effets#vibrato',
  },
  {
    id: 'designer-effect-tremolo',
    contexts: ['designer'],
    anchor: 'designer-effect-tremolo',
    label: 'Trémolo',
    doc: 'creation-effets#tremolo',
  },
  {
    id: 'designer-effect-auto-pan',
    contexts: ['designer'],
    anchor: 'designer-effect-auto-pan',
    label: 'Auto-pan',
    doc: 'creation-effets#auto-pan',
  },
  {
    id: 'designer-effect-pitch-env',
    contexts: ['designer'],
    anchor: 'designer-effect-pitch-env',
    label: 'Enveloppe de hauteur',
    doc: 'creation-effets#hauteur',
  },
  {
    id: 'designer-effect-filter',
    contexts: ['designer'],
    anchor: 'designer-effect-filter',
    label: 'Filtre',
    doc: 'creation-effets#filtre',
  },
  {
    id: 'designer-effect-filter-env',
    contexts: ['designer'],
    anchor: 'designer-effect-filter-env',
    label: 'Enveloppe de filtre',
    doc: 'creation-effets#env-filtre',
  },
  {
    id: 'designer-effect-wah',
    contexts: ['designer'],
    anchor: 'designer-effect-wah',
    label: 'Wah',
    doc: 'creation-effets#wah',
  },
  {
    id: 'designer-effect-distortion',
    contexts: ['designer'],
    anchor: 'designer-effect-distortion',
    label: 'Distorsion',
    doc: 'creation-effets#disto',
  },
  {
    id: 'designer-effect-drive-env',
    contexts: ['designer'],
    anchor: 'designer-effect-drive-env',
    label: 'Enveloppe de drive',
    doc: 'creation-effets#env-drive',
  },

  // ===== Bibliothèque (PatchBank, partagé sidebar Création / onglet
  // Bibliothèque → contexts ['library', 'designer']) → guide-bibliotheque =====
  {
    id: 'library-item-list',
    contexts: ['library', 'designer'],
    anchor: 'library-item-list',
    label: 'Liste des patches',
    doc: 'guide-bibliotheque#tes-patches',
  },
  {
    id: 'library-new-folder-button',
    contexts: ['library', 'designer'],
    anchor: 'library-new-folder-button',
    label: 'Nouveau dossier',
    doc: 'guide-bibliotheque#tes-patches',
  },
  {
    id: 'library-select-all-button',
    contexts: ['library', 'designer'],
    anchor: 'library-select-all-button',
    label: 'Tout sélectionner',
    doc: 'guide-bibliotheque#tes-patches',
  },
  {
    id: 'library-hierarchy-mode',
    contexts: ['library', 'designer'],
    anchor: 'library-hierarchy-mode',
    label: 'Navigation',
    doc: 'guide-bibliotheque#naviguer-deux-vues',
  },
  {
    id: 'library-display-mode',
    contexts: ['library', 'designer'],
    anchor: 'library-display-mode',
    label: 'Affichage',
    doc: 'guide-bibliotheque#trois-modes-affichage',
  },
  {
    id: 'library-copy-button',
    contexts: ['library', 'designer'],
    anchor: 'library-copy-button',
    label: 'Copier',
    doc: 'guide-bibliotheque#organiser',
  },
  {
    id: 'library-cut-button',
    contexts: ['library', 'designer'],
    anchor: 'library-cut-button',
    label: 'Couper',
    doc: 'guide-bibliotheque#organiser',
  },
  {
    id: 'library-paste-button',
    contexts: ['library', 'designer'],
    anchor: 'library-paste-button',
    label: 'Coller',
    doc: 'guide-bibliotheque#organiser',
  },
  {
    id: 'library-rename-button',
    contexts: ['library', 'designer'],
    anchor: 'library-rename-button',
    label: 'Renommer',
    doc: 'guide-bibliotheque#organiser',
  },
  {
    id: 'library-clipboard-chip',
    contexts: ['library', 'designer'],
    anchor: 'library-clipboard-chip',
    label: 'Presse-papiers',
    doc: 'guide-bibliotheque#organiser',
  },
  {
    id: 'library-delete-button',
    contexts: ['library', 'designer'],
    anchor: 'library-delete-button',
    label: 'Supprimer',
    doc: 'guide-bibliotheque#supprimer',
  },
  {
    // Annuler/Rétablir Bibliothèque : pas de section dédiée → sans fragment.
    id: 'global-undo-button-library',
    contexts: ['library', 'designer'],
    anchor: 'global-undo-button-library',
    label: 'Annuler',
    doc: 'guide-bibliotheque',
  },
  {
    id: 'global-redo-button-library',
    contexts: ['library', 'designer'],
    anchor: 'global-redo-button-library',
    label: 'Rétablir',
    doc: 'guide-bibliotheque',
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
