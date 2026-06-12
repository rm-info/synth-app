# Prompt U.2 — Mode Info : bouton Ctrl+I, overlay cliquable, registre ancre → paragraphe

## Contexte

Itération U « Documentation utilisateur de la Création », phase 2.
U.1 (livré) a posé le socle : ids explicites `{#id}` sur les headings,
liens profonds `doc:article#fragment` (scroll + flash), bloc
`<Details>`, et surtout le point d'entrée externe
**`navigateToDoc(articleId, fragment)`** dans `App.jsx`.

U.2 livre la **mécanique complète du mode Info**, amorcée sur les
ancres existantes : un bouton Info dans le header (entre Raccourcis et
Tour), raccourci **Ctrl+I**, qui ouvre un overlay à la Ctrl+K où chaque
contrôle documenté **visible** porte un badge **cliquable** ; le clic
bascule vers le paragraphe dédié de l'onglet Documentation.

La couverture exhaustive de la Création (pose des ancres manquantes +
articles par module) viendra en U.3 — ici on valide la boucle complète
sur ce qui existe : ancres `designer-*` actuelles → sections de
`guide-designer.md`.

**Aucun changement de modèle de données métier, d'audio, ni de
persistance** (l'état du mode est volatile, comme `shortcutsOverlayOpen`).

## Spec fonctionnelle

### 1. Bouton Info + Ctrl+I

- **Bouton** dans le header (`Tabs.jsx`), **entre** le bouton Raccourcis
  et le bouton Tour. Icône Lucide **`Info`**, mêmes styles/taille que
  ses voisins, tooltip « Documentation interactive (Ctrl+I) » (libellé
  via `strings.js`, cohérent avec l'existant).
  `data-anchor="header-info-button"`.
- **Mobile/compact** : le bouton suit le même relogement OverflowToolbar
  que Raccourcis et Tour (même liste d'items, même ordre relatif).
- **Raccourci Ctrl+I** : nouvelle entrée dans la table `SHORTCUTS`
  (`lib/shortcuts.js`), contexte `global`, ancre `header-info-button`,
  sur le modèle exact de `global-shortcuts` (Ctrl+K). Bénéfices
  automatiques : badge dans l'overlay Raccourcis + ligne dans l'article
  généré « Raccourcis clavier ». `preventDefault` (même traitement que
  Ctrl+K/Ctrl+J — Firefox réserve Ctrl+I, on le capture pareil).
- **État** : `infoOverlayOpen`, booléen volatile — calqué sur
  `shortcutsOverlayOpen` : non persisté (toujours fermé au boot),
  **hors undo**.
- **Exclusions mutuelles**, mêmes règles que Ctrl+K : pas d'ouverture
  pendant le Tour, pas d'ouverture si un champ de saisie a le focus ou
  si une modale est ouverte (reprends le gating existant) ; ouvrir
  Info **ferme** l'overlay Raccourcis s'il est ouvert, et inversement.
  Ctrl+I overlay ouvert = fermeture (toggle).

### 2. Registre déclaratif `lib/docTargets.js`

- Nouvelle table **`DOC_TARGETS`**, moule de `SHORTCUTS` :

  ```js
  {
    id: 'designer-waveform',          // stable, unique
    contexts: ['designer'],           // onglets où la cible peut exister
    anchor: 'designer-waveform',      // data-anchor existant (ou fn(state) si besoin)
    label: 'Forme d’onde',       // libellé court du badge
    doc: 'guide-designer#lentille-forme-onde',  // article-id[#heading-id]
  }
  ```

- `doc` **sans fragment** est légal (ouverture en haut d'article) —
  pour les contrôles dont la section dédiée n'existera qu'en U.3.
- **Amorçage** : une entrée par ancre Designer existante
  (`designer-waveform`, `-harmonics`, `-spectrogram`, `-adsr`,
  `-modulation`, `-keyboard`, `-octave-selector`, `-system-selector`,
  `-amplitude`, `-sustain-pastille`, `-test-free-button`,
  `-save-button`, `-save-as-button`, `-new-button`, + undo/redo
  designer si pertinent). Cible : la section la plus proche dans
  `guide-designer.md`.
- Pour cela, **ajoute des `{#id}` aux headings existants de
  `guide-designer.md`** — suffixe invisible au rendu, **aucune
  modification de la prose** (la frontière writer reste respectée ;
  c'est exactement le cas d'usage des ids explicites). Kebab-case,
  descriptifs (`{#lentille-harmoniques}`, `{#enveloppe-ahdsr}`…).
  Un contrôle sans section raisonnable → entrée sans fragment.

### 3. Composant `InfoOverlay`

- Nouveau composant **calqué sur `ShortcutsOverlay`** (backdrop plein
  écran, `position: fixed`, z-index voisin) et consommant
  `getAnchoredPosition` : pour chaque entrée de `DOC_TARGETS` dont le
  contexte matche l'onglet actif **et** dont l'ancre est résolue
  visible, un **badge positionné sur l'élément**. Ancre non trouvée ou
  masquée (module replié, tiroir `⋯`, mobile) → pas de badge : la
  visibilité conditionnelle est déjà donnée par le filtre de
  `getAnchoredPosition`, ne rien réinventer.
- **Les badges sont des vrais `<button>`** (focusables, activables au
  clavier — Tab/Entrée fonctionnent gratuitement). Contenu : le `label`
  du registre, éventuellement précédé d'une petite icône `Info`.
- **Identité visuelle distincte** de l'overlay Raccourcis (qui est
  jaune) : utilise l'accent « info » (bleu) pour qu'on sache d'un coup
  d'œil dans quel mode on est. Curseur pointer, hover qui invite au
  clic (légère élévation/expansion — pas besoin de la mécanique
  rest→hover complète de ShortcutsOverlay si elle n'apporte rien ici).
- **Clic sur un badge** : ferme l'overlay puis appelle
  `navigateToDoc(articleId, fragment)` — bascule onglet Documentation,
  scroll + flash du heading (machinerie U.1, zéro code nouveau côté
  arrivée).
- **Fermeture** : mêmes gestes que ShortcutsOverlay — backdrop, bouton
  ×, toute touche non-modificateur (cohérence entre les deux modes),
  et Ctrl+I re-toggle.
- **Onglet sans aucune cible visible** (Composition/Bibliothèque/
  Documentation tant que le registre n'est pas peuplé) : l'overlay
  s'ouvre quand même avec un **message central discret** (« La
  documentation interactive arrive bientôt pour cet onglet » — libellé
  dans `strings.js`). Pas de bouton désactivé : le mode reste
  découvrable partout.

## Découpage en sous-commits

1. `feat(iter-U/phase-2.1): bouton Info header + Ctrl+I + état volatile
   infoOverlayOpen` — bouton (desktop + relogement mobile), entrée
   SHORTCUTS, gating/exclusions mutuelles, état + action reducer
   (non-undoable), overlay placeholder vide acceptable à ce stade.
2. `feat(iter-U/phase-2.2): InfoOverlay + registre DOC_TARGETS amorcé
   (ancres Designer → guide-designer)` — composant + CSS deux thèmes,
   table `lib/docTargets.js`, `{#id}` posés dans `guide-designer.md`,
   navigation au clic.
3. `docs: CONTEXT.md — Iteration U phase 2 (mode Info)` (+ entrée
   d'historique `CONTEXT-ARCHIVE.md`).

## Comportement attendu

- Ctrl+I (ou clic bouton Info) sur l'onglet Création : backdrop +
  badges bleus cliquables sur chaque contrôle documenté **visible**.
  Modules repliés / contrôles dans le tiroir `⋯` / éléments masqués →
  pas de badge. En mobile (switcher), seuls les badges du module
  affiché apparaissent.
- Clic sur le badge « Harmoniques » : l'overlay se ferme, l'onglet
  Documentation s'ouvre sur `guide-designer`, la section Harmoniques
  est scrollée et flashe. Les `DocLink` existants de la section
  ramènent vers la Création avec halo (boucle complète, déjà câblée).
- Ctrl+I puis Ctrl+K : l'overlay Info se ferme, l'overlay Raccourcis
  s'ouvre (et inversement). Jamais les deux superposés.
- Pendant le Tour : Ctrl+I inerte (même gating que Ctrl+K). Champ de
  saisie focusé : Ctrl+I inerte.
- Onglet Composition : l'overlay s'ouvre sur le message « bientôt »
  (aucune entrée de registre encore).
- L'overlay Raccourcis (Ctrl+K) affiche le badge du nouveau bouton
  Info ; l'article généré « Raccourcis clavier » liste Ctrl+I.
- Reload : mode toujours fermé au boot. Undo/redo insensibles à
  l'ouverture/fermeture.
- Thèmes clair/sombre : badges lisibles dans les deux.

## Hors scope (U.2)

- **Pose de nouvelles ancres** sur l'onglet Création (hors
  `header-info-button`) — c'est U.3, avec les articles par module.
- Articles squelettes par module, section TOC « Guide de la Création »
  (U.3) ; toute rédaction de prose (U.4, writer).
- Modification de la prose de `guide-designer.md` (les `{#id}` sur les
  headings existants sont autorisés, rien d'autre).
- Couverture des onglets Bibliothèque / Composition / Documentation
  (le registre les acceptera tels quels plus tard — `contexts` est déjà
  multi-onglets by design).
- Tour guidé (gros morceau suivant).

## Validation manuelle suggérée

Desktop large / fenêtre étroite (modules auto-collapsed, items en
tiroir) / mobile < 924 (switcher de modules, bouton Info dans le
hamburger) ; clic sur 3-4 badges et retour par DocLink ; Ctrl+I pendant
le Tour, pendant une modale, dans un input ; alternance rapide
Ctrl+I/Ctrl+K ; les deux thèmes ; reload.
