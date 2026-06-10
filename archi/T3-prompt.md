# Prompt T.3 — Pitch envelope (enveloppe de hauteur, par patch)

## Contexte

Itération T « Effets sans mémoire », phase 3. Après l'auto-pan (T.2,
3ᵉ LFO), le pitch envelope introduit la **première modulation non-LFO** :
une **enveloppe** — la hauteur part décalée de `amount` cents au début
de la note et **glisse vers la hauteur nominale** en `time` ms. C'est le
classique des attaques percussives (toms/kicks tonaux : départ une
octave au-dessus qui retombe vite ; basses synthétiques : montée depuis
le grave). La forme « enveloppe → paramètre » posée ici sera réutilisée
par l'enveloppe de filtre (T.5).

Pas de bump `.osa` : on reste en **v4**, champ absent → défaut injecté
(règle d'itération posée en T.2).

## Spec fonctionnelle

### 1. Modèle de données

- `Patch` et `Editor` += **`pitchEnv`**, nouveau type (pas un `Lfo`) :
  ```ts
  type PitchEnv = {
    enabled: boolean
    amount: number   // cents, −2400..+2400 (± 2 octaves), signé
    time: number     // ms, 0..2000 — durée du glissement vers 0
  }
  ```
- `DEFAULT_PITCHENV` : `{ enabled:false, amount:1200, time:150 }` —
  désactivé mais musical (+1 octave qui retombe en 150 ms = pluck/tom
  immédiatement parlant).
- `types.ts`, hydratation localStorage, `osaFormat` (validation
  `isPitchEnvValidOrAbsent` sur le modèle de `isLfoValidOrAbsent`),
  `libraryTransfer` : même mécanique que `autoPan` en T.2.1, **sans
  bump de version**.

### 2. Audio — automation directe sur `osc.detune`

- **Aucun nœud nouveau** : l'enveloppe est programmée comme automation
  de la **valeur de base** d'`osc.detune` —
  `setValueAtTime(amount, startTime)` puis
  `linearRampToValueAtTime(0, startTime + time/1000)`.
- **Coexistence avec le vibrato garantie par construction** : le
  vibrato est une *branche entrante* sur `osc.detune` (Web Audio
  **somme** les entrées à la valeur de base automatisée). Les deux
  effets composent sans interaction — à documenter en commentaire dans
  `lib/modulation.js`.
- Rampe **linéaire** (cohérent avec la convention AHDSR ; une courbe
  exponentielle serait plus « drum » mais c'est un polish hors scope —
  noter au backlog si l'envie revient à l'écoute).
- Intégré dans **`applyModulation`** (opts `pitchEnv`), donc présent
  d'office sur les **4 chemins**. Pas de cleanup à ajouter (pas de
  nœud), pas de traitement au release : si la note est plus courte que
  `time`, la rampe continue simplement pendant le release (assumé).
- **Signature scheduler** += `pitchEnv` (re-schedule en édition live).

### 3. UI — module Effets

- `DESIGNER_EFFECT_IDS` += `'pitchEnv'`. Bouton **« Hauteur »** en 4ᵉ
  position ; libellé complet « Enveloppe de hauteur » en titre de
  panneau. Pastille/highlight/badge hérités de T.1.
- Panneau : interrupteur on/off + **2 `NumberInput`** à steppers —
  **départ** (cents, −2400..+2400, signé) et **durée** (ms, 0..2000) —
  **pas de switch de forme** (ce n'est pas un LFO).
- **Graphe d'enveloppe** (pas le graphe LFO) : médiane = hauteur
  nominale (0 cent) ; la courbe part à `amount` (au-dessus si positif,
  en dessous si négatif) et rejoint la médiane à `time`. Affichage
  normalisé comme les graphes LFO : `|amount|` = demi-hauteur.
  **2 poignées** (mêmes cercles isotropes/curseurs/tooltips que
  l'existant) : **Départ** (drag vertical → `amount`, franchit la
  médiane pour changer de signe) et **Arrivée** (drag horizontal →
  `time`). Discipline d'undo identique (draft local, un dispatch au
  relâchement, géométrie gelée au down).
- **Pas d'animation** (pas de point de phase — rien ne boucle) : la
  boucle rAF du module ignore ce panneau quand il est affiché, ou ne
  le redessine qu'aux changements de valeurs/draft.
- Édition via `SET_EDITOR_MODULATION` (`effect:'pitchEnv'`, clés
  `enabled`/`amount`/`time`, clamps ci-dessus), undoable.

## Découpage en sous-commits

1. `feat(iter-T/phase-3.1): modèle pitchEnv + défauts + hydratation +
   validation .osa (v4 inchangé)`
2. `feat(iter-T/phase-3.2): audio — enveloppe de hauteur sur osc.detune
   via applyModulation (4 chemins + signature)`
3. `feat(iter-T/phase-3.3): UI — bouton Hauteur + panneau enveloppe à
   2 poignées`
4. `docs: CONTEXT.md — Iteration T phase 3 (pitch envelope)` (+
   CONTEXT-ARCHIVE).

## Comportement attendu

- Patch carré, decay court, pitchEnv +1200/100 ms → tom synthétique
  reconnaissable au clavier, sur la timeline et dans le WAV exporté.
  `amount` négatif → la hauteur monte vers la note. Audible sur les
  4 chemins.
- Vibrato + pitchEnv activés ensemble : le vibrato ondule **autour**
  de la trajectoire de l'enveloppe (sommation), pas d'écrasement
  mutuel.
- `time` très court (< 10 ms) ≈ transitoire ; `amount` 0 ou effet
  désactivé → strictement aucune automation posée (chaîne identique).
- Patch v3/v4-sans-pitchEnv (`.osa` ou localStorage) → défaut injecté,
  désactivé ; export → v4 avec `pitchEnv` ; round-trip OK.
- Édition pendant lecture → re-schedule. Undo/redo : paramètres
  undoables, sélection de panneau non.
- La hauteur **nominale** du clip (note/octave/fréquence libre) reste
  la cible finale — l'enveloppe ne décale jamais la note tenue, elle
  ne décale que l'attaque.

## Hors scope (T.3)

- Courbe exponentielle / time constant (polish éventuel, à l'écoute).
- Enveloppe de hauteur complète type ADSR (attack+decay+sustain sur la
  hauteur) — le besoin réel est l'attaque, on reste minimal.
- Filtre (T.4+), distorsion (T.6), portamento/glide entre notes
  (autre sujet, non cadré).

## Validation manuelle suggérée

Clavier (plusieurs hauteurs : l'intervalle de départ est constant en
cents, donc le même « plouc » à toute hauteur), note libre, timeline,
export WAV. Combinaisons : pitchEnv + vibrato, pitchEnv + auto-pan,
les trois. Round-trip `.osa`. Drag des 2 poignées (signe de `amount`
en franchissant la médiane), steppers, undo. Mobile : panneau dans le
switcher, boutons relogés dans la toolbar.
