# Prompt U.3.s — Sous-contrôles des effets : badges via sections de concept partagées

## Contexte

Itération U « Documentation interactive de la Création ». U.3 et U.3.r
sont livrées et validées : le mode Info (Ctrl+I) couvre les contrôles de
la Création, **dont les 9 boutons d'effet** du switcher (`designer-effect-
<clé>` → `creation-effets#<effet>` : que fait chaque effet).

**Reste à couvrir** : à l'intérieur du panneau d'un effet sélectionné,
les **sous-contrôles** (steppers de paramètres, switch de forme/type,
graphe éditable) n'ont pas de badge. Un débutant ne sait pas ce qu'est
une « résonance », un « onset » ou une « profondeur en cents ». Cette
phase les badge.

Ce lot avait été spécifié en fin de prompt U.3.r (§4c) mais est arrivé
après la clôture de la phase côté dev — il n'a pas été implémenté. Il
est ici **autonome**.

**Décision d'architecture actée** (2026-06-13) : **sections de concept
partagées par famille** (DRY). Les paramètres récurrent par famille
d'effet ; on documente chaque paramètre **une seule fois**, et tous les
effets de la famille y pointent. Le « Vitesse » du Vibrato et celui du
Trémolo ouvrent la **même** section `#lfo-vitesse`.

**Aucun changement de modèle de données, d'audio, de parser markdown.**

## Spec fonctionnelle

### 1. Familles, sous-contrôles et fragments cibles

Nouvelles sections (headings `{#id}`) à **ajouter** dans
`creation-effets.md` — **18 fragments de concept** :

| Famille (effets concernés) | Sous-contrôle | Fragment |
|---|---|---|
| **LFO** (vibrato, trémolo, auto-pan, wah) | Vitesse (rate, Hz) | `#lfo-vitesse` |
| | Profondeur (depth — unité variable) | `#lfo-profondeur` |
| | Installation (onset, ms) | `#lfo-installation` |
| | Forme (switch sin/tri/carré) | `#lfo-forme` |
| | Graphe LFO (poignées) | `#lfo-graphe` |
| **Enveloppe** (hauteur, env. filtre, env. drive) | Cible (amount) | `#env-cible` |
| | Durée (time, ms) | `#env-duree` |
| | Inverser (toggle) | `#env-inverser` |
| | Forme (switch 4 courbes) | `#env-forme` |
| | Graphe d'enveloppe | `#env-graphe` |
| **Filtre** | Fréquence (cutoff) | `#filtre-frequence` |
| | Résonance (q) | `#filtre-resonance` |
| | Type (switch 4 types) | `#filtre-type` |
| | Graphe de réponse | `#filtre-graphe` |
| **Disto** | Drive | `#disto-drive` |
| | Mix | `#disto-mix` |
| | Courbe (switch 3 courbes) | `#disto-courbe` |
| | Graphe de transfert | `#disto-graphe` |

- **Squelettes uniquement** (faits bruts : rôle, unité, bornes, ce que
  fait la poignée du graphe). La prose pédagogique + accordéons + SVG
  viendront du writer en U.4. Ligne « *Version provisoire…* » comme les
  autres sections `creation-*`.
- Chaque section porte la **note d'unité par effet** quand elle varie :
  profondeur LFO = **cents** (vibrato, wah) ou **0..1** (trémolo,
  auto-pan) ; cible enveloppe = **cents** (hauteur, env. filtre) ou
  **gain ±1** (env. drive). Faits exacts dans le code / `CONTEXT.md`.
- Lien de retour `DocLink` vers l'ancre du sous-contrôle, comme les
  autres sections.

### 2. Ancres dans les builders partagés

Schéma `designer-fx-<effet-kebab>-<param>` (distinctes par effet, même
fragment cible). camelCase→kebab : `autoPan`→`auto-pan`,
`pitchEnv`→`pitch-env`, `filterEnv`→`filter-env`, `driveEnv`→`drive-env`.

- **`renderLfoBlock(effect)`** (WaveformEditor.jsx, sert vibrato/trémolo/
  auto-pan/wah) : poser sur les 3 `NumberInput`
  `data-anchor={`designer-fx-${kebab(effect)}-rate|depth|onset`}`, sur le
  switch de forme `…-shape`, sur le wrap du graphe `…-graph`. **Un seul
  point de code** couvre les 4 effets.
- **`renderParamEnvBlock(effect)`** (sert hauteur/env. filtre/env. drive) :
  `…-amount`, `…-time`, `…-invert` (toggle Inverser), `…-curve` (switch
  forme), `…-graph`.
- **`renderFilterBlock`** (singleton) : `designer-fx-filter-cutoff`,
  `…-q`, `…-type`, `…-graph`.
- **`renderDistortionBlock`** (singleton) : `designer-fx-distortion-drive`,
  `…-mix`, `…-curve`, `…-graph`.
- Ne pas badger l'**interrupteur on/off** in-panel (déjà couvert par le
  badge du bouton d'effet → section de l'effet) ni les **hints**
  « Activer le filtre / la disto » (transitoires → prose).
- **Graphe = un seul badge** par panneau (`…-graph`), centré sur la
  surface : il documente l'édition visuelle (toutes les poignées), pas
  une poignée = un badge.

### 3. Entrées de registre (générées par famille)

Dans `lib/docTargets.js`, ajouter ~43 entrées (≈ 4×5 + 3×5 + 4 + 4).
**Les générer par boucle** (un petit builder par famille qui émet les
entrées effet×sous-contrôle vers les fragments partagés) plutôt que de
les écrire à la main — reste déclaratif, DRY, cohérent avec l'esprit
`SHORTCUTS`. Documenter le générateur en commentaire. `contexts:
['designer']`, `label` = libellé court du paramètre (ex. « Vitesse »,
« Résonance »).

## Découpage en sous-commits

1. `feat(iter-U/phase-3.s1): sections de concept des effets dans
   creation-effets.md (18 fragments squelettes)`
2. `feat(iter-U/phase-3.s2): ancres designer-fx-* dans les builders
   d'effets + registre généré par famille`
3. `docs: CONTEXT.md — Iteration U phase 3.s (sous-contrôles des effets)`

(1 avant 2 pour que les `doc:` du registre résolvent dès leur ajout —
pas de warn DEV transitoire.)

## Comportement attendu

- Effets, un effet LFO sélectionné (ex. Vibrato), Ctrl+I : badges sur
  Vitesse / Profondeur / Installation / Forme / Graphe (+ les 9 badges
  de boutons au-dessus). Chacun mène à sa section de concept.
- Sélectionner Trémolo puis Ctrl+I : mêmes badges de famille LFO, le
  badge « Vitesse » ouvre **la même** `#lfo-vitesse` (note d'unité 0..1
  pour le trémolo dans la prose).
- Effet Filtre / Disto sélectionné : badges Fréquence/Résonance/Type/
  Graphe, resp. Drive/Mix/Courbe/Graphe.
- Panneaux d'effet **masqués** (`display:none`, non sélectionnés) : pas
  de badge (filtre `getAnchoredPosition`). Aucune collision d'ancre.
- Colonne étroite / mobile : les sous-contrôles suivent la visibilité
  réelle du panneau ; pas de badge fantôme (cf. fix r7).
- Cliquer **chaque** sous-contrôle des 9 effets : fragment résolu,
  **aucun warn DEV** « fragment introuvable ». `npx tsc --noEmit` + lint
  propres.
- Les badges déjà en place (boutons d'effet, segments AHDSR, etc.)
  inchangés.

## Hors scope

- Prose pédagogique, accordéons, SVG (writer, U.4).
- Tout contrôle hors module Effets.
- Badge par poignée de graphe (un graphe = un badge).
- Badge sur l'on/off in-panel et les hints d'activation.

## Validation manuelle suggérée

Les 9 effets un par un (LFO ×4, enveloppe ×3, filtre, disto), Ctrl+I sur
chacun, clic de chaque sous-contrôle → bonne section ; large + tiroir
étroit + mobile ; deux thèmes ; auto-contrôle : zéro warn DEV en
parcourant tous les badges.
