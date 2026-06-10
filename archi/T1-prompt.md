# Prompt T.1 — Refonte du module Modulation en « Effets » (switcher d'effets en barre de titre)

## Contexte

Ouverture de l'**itération T « Effets sans mémoire »** : tour complet des
effets/modulations qui s'intègrent au cycle de vie audio actuel (chaîne
jetable par note, zéro queue) — auto-pan, pitch envelope, filtre +
enveloppe + wah, distorsion — avant le gros chantier des effets à mémoire
(delay-based). Cadrage complet dans `archi/BACKLOG.md`, section « Effets
et modulations ».

**T.1 est un socle UI pur** : le module Modulation devient « Effets » et
passe d'un corps à 2 sous-blocs côte à côte à un corps **un effet à la
fois**, sélectionné par des boutons dans la barre de titre du module. On
refond le switcher pendant qu'il n'y a que 2 locataires (vibrato,
trémolo) ; chaque phase suivante (T.2 auto-pan, T.3 pitch envelope, T.4
filtre, T.5 env+wah, T.6 disto) n'ajoutera plus qu'un bouton et un
panneau.

**Aucun changement audio, aucun changement de modèle de données, aucun
changement `.osa` dans cette phase.**

## Spec fonctionnelle

### 1. Renommage (label seul)

- `MODULE_META` (`lib/designerModules.js`) : le module `'modulation'`
  prend le label **« Effets »** (choisir une icône Lucide cohérente si
  l'actuelle ne convient plus — sinon la garder).
- **L'id `'modulation'` ne change pas.** Clés persistées intactes
  (`designerCollapsed.modulation`, `designerMobileModule`), pas de
  migration. Adapter les libellés visibles ailleurs (strings.js, tour
  guidé Designer, doc/raccourcis si « Modulation » y apparaît).

### 2. Boutons d'effet en barre de titre

- La barre de titre du module porte une rangée de **boutons toggle**, un
  par effet : **Vibrato**, **Trémolo** (libellés texte courts, pas
  d'Unicode décoratif). Items d'un **`OverflowToolbar`** (même pattern
  que les autres headers de module) : si la colonne se rétrécit, les
  derniers boutons passent dans le tiroir `⋯`.
- Deux notions visuelles **indépendantes** par bouton :
  - **En cours d'édition** (exclusif, toujours exactement un) :
    highlight du bouton (même styles `is-active` que les toggles
    existants), `aria-pressed`.
  - **Activé** (état audio, 0..n effets) : **pastille colorée** (accent)
    sur le bouton, reflète `editor.<effet>.enabled`. Indicateur **pur** :
    la pastille n'est pas une zone cliquable séparée.
- **Clic = mise en édition seule** (affiche le panneau de l'effet).
  L'activation/désactivation reste l'interrupteur on/off **dans** le
  panneau de l'effet (inchangé). Un bouton = un geste — tactile-safe.
- **Badge agrégé sur le tiroir** : si au moins un effet **activé** a son
  bouton caché dans le tiroir `⋯`, le trigger porte la même pastille.
  Étendre `OverflowToolbar` avec une prop **opt-in** minimale (ex.
  `triggerBadge: boolean`) — ne rien changer au comportement des autres
  usages.

### 3. Corps : un effet à la fois

- Le corps du module rend le panneau de l'effet **en cours d'édition**,
  pleine largeur. L'autre sous-bloc reste **monté mais masqué**
  (`display:none`) — contrainte canvas existante (cf. `DesignerModule`,
  vue ADSR compacte) : on ne démonte pas un canvas, on force un redraw
  au switch.
- La **boucle rAF unique** du module ne dessine plus que le graphe de
  l'effet visible. Le gating existant (`modulationVisible` + au moins
  un `enabled` + gel pendant drag) reste tel quel, en y ajoutant la
  condition de visibilité du sous-bloc.
- Le contenu des panneaux (interrupteur, switch de forme, 3
  `NumberInput`, graphe LFO à poignées, discipline d'undo draft +
  dispatch unique) **ne change pas**.

### 4. État de sélection

- Nouveau champ d'état UI : `designerEffectsSelected` ∈
  `{'vibrato','tremolo'}`, défaut `'vibrato'`.
- **Persisté** en localStorage (préférence UX, même esprit que
  `designerMobileModule`) ; validé à l'hydratation (valeur inconnue →
  défaut). **Hors undo** (comme tout l'UI state — la sélection d'un
  panneau n'est pas une édition).
- Action dédiée dans le reducer (nom à ta convenance, cohérent avec
  l'existant, ex. `SET_DESIGNER_EFFECTS_SELECTED`).

### 5. Mobile

- Le module `'modulation'` est aujourd'hui « sans contrôle » dans la
  toolbar mobile. Il expose désormais ses boutons d'effet via le
  pattern **`moduleHeaderItems`** (R.1.3a) : un
  `buildEffectsHeaderItems()` réutilisé entre le header in-body
  (desktop) et le relogement toolbar (mobile, quand le module est
  actif dans le switcher).

## Découpage en sous-commits

1. `refactor(iter-T/phase-1.1): module Effets — corps un-effet-à-la-fois
   + état de sélection persisté` — état `designerEffectsSelected` +
   action + corps qui n'affiche qu'un panneau (l'autre monté/masqué,
   redraw au switch, rAF sur le seul graphe visible). Switcher
   temporaire minimal acceptable à ce stade si besoin.
2. `feat(iter-T/phase-1.2): boutons d'effet en barre de titre
   (OverflowToolbar, pastille activé, badge tiroir)` — la rangée de
   boutons définitive, états visuels, extension `triggerBadge`.
3. `feat(iter-T/phase-1.3): relogement mobile des boutons + label
   « Effets »` — `buildEffectsHeaderItems`, `moduleHeaderItems.modulation`,
   rename label + retouches strings/tour/doc.
4. `docs: CONTEXT.md — Iteration T phase 1 (module Effets, switcher
   header)` (+ `CONTEXT-ARCHIVE.md` si tu y ouvres l'entrée
   d'historique de l'itération).

## Comportement attendu

- Au boot : module intitulé « Effets », bouton Vibrato highlighté
  (défaut), panneau Vibrato pleine largeur ; pastille visible sur chaque
  effet dont `enabled` est true.
- Clic Trémolo : le panneau bascule (sans flash ni resize du module),
  le highlight suit, **aucun changement audio** ; le graphe trémolo est
  correctement redessiné (pas de canvas 300×150 ni de graphe vide).
- Activer le vibrato depuis son panneau → la pastille apparaît sur le
  bouton Vibrato ; le désactiver → elle disparaît. La pastille ne
  dépend pas de quel panneau est affiché.
- Colonne rétrécie : les boutons excédentaires passent dans le tiroir
  `⋯` ; si un effet activé y est caché, le trigger porte la pastille.
  Rouvrir large → tout revient en barre.
- Mobile (switcher de modules) : module Effets actif → les boutons
  d'effet apparaissent dans la toolbar, même comportement.
- Sélection persistée au reload ; undo/redo n'est **pas** affecté par
  les changements de sélection ; les éditions de paramètres restent
  undoables comme avant.
- Lecture timeline pendant le switch : aucun re-schedule (les
  signatures de clips ne dépendent pas de la sélection UI).
- Tour guidé Designer : l'étape qui cible le module (si elle existe)
  fonctionne toujours (ancre + libellé à jour).

## Hors scope (T.1)

- **Aucun nouvel effet** (auto-pan = T.2, qui apportera aussi le bump
  `.osa` v4).
- Aucun changement de `Patch`/`types.ts`/`reducer` côté données métier,
  aucun changement de `lib/modulation.js` ni des 4 chemins de synthèse.
- Pas de réorganisation des autres modules ni de la grille 3×2.
- Pas d'indicateur d'effets côté Composer/PropertiesPanel (toujours au
  backlog).

## Validation manuelle suggérée

Desktop large / fenêtre étroite (overflow tiroir) / mobile (< 924) ;
switch de panneau pendant lecture timeline ; switch pendant que le
module est replié puis déplié ; reload (persistance sélection) ; thème
clair/sombre pour la pastille.
