# Prompt T.3bis — Pitch envelope : mode « Inverser »

## Contexte

Suite immédiate de T.3 (livré). À l'usage, le pitch envelope appelle son
miroir : au lieu de **partir décalé et rejoindre** la hauteur nominale,
le mode inversé **part de la hauteur nominale et s'en éloigne** vers
`amount` cents, sur la même rampe de `time` ms — puis y **reste**
(sirènes, bends, notes qui « tombent » en s'installant).

**Comportement assumé, à documenter** (commentaire + CONTEXT.md) : en
mode inversé, la note tenue reste décalée de `amount` cents — la hauteur
nominale du clip n'est que le point de départ. C'est le but de l'effet.

Pas de bump `.osa` (règle v4 : champ absent → défaut injecté).

## Spec

### Modèle
- `PitchEnv` += **`invert: boolean`**, défaut `false`. `types.ts`,
  `DEFAULT_PITCHENV`, validation `osaFormat`, `libraryTransfer`,
  hydratation localStorage (patches T.3 sans `invert` → `false`).
- Clamps/édition : `SET_EDITOR_MODULATION` accepte la clé `invert`
  (booléen), undoable.

### Audio
- Dans `applyModulation`, miroir de l'automation :
  - normal (existant) : `setValueAtTime(amount, start)` →
    `linearRampToValueAtTime(0, start + time/1000)` ;
  - inversé : `setValueAtTime(0, start)` →
    `linearRampToValueAtTime(amount, start + time/1000)` (et la valeur
    y reste — comportement par défaut d'un `AudioParam`).
- Sommation avec le vibrato inchangée. Vérifier que `invert` est bien
  couvert par la signature scheduler (le bloc `pitchEnv` y est déjà —
  s'assurer que le champ y participe).

### UI
- Panneau Hauteur : **toggle « Inverser »** à côté de l'interrupteur
  on/off (bouton toggle `is-active`/`aria-pressed`, icône Lucide de
  type flip/swap si une convient, sinon libellé texte seul — pas
  d'Unicode).
- **Graphe miroir** : courbe partant de la médiane et rejoignant
  `amount` à `time`, puis plateau jusqu'au bord droit. Les 2 poignées
  gardent leurs gestes mais la poignée verticale se place au **point
  d'arrivée** (coude de la rampe) en mode inversé ; tooltips adaptés
  (« Cible » / « Durée » en inversé, « Départ » / « Arrivée » en
  normal — ou formulation équivalente cohérente).
- Le franchissement de médiane pour changer le signe d'`amount`
  fonctionne dans les deux modes.

## Commits

1. `feat(iter-T/phase-3.4): pitch envelope — mode Inverser (part de la
   note, s'en éloigne et y reste)` — modèle + audio + UI (petit
   périmètre, un seul commit).
2. `docs: CONTEXT.md — Iteration T phase 3.4 (pitch envelope inversé)`.

## Comportement attendu

- Inversé, `amount` +1200, `time` long (≥ 1 s) : la note part juste et
  glisse vers l'octave supérieure où elle se stabilise — sur les
  4 chemins (clavier, note libre, timeline, WAV).
- Basculer le toggle pendant la lecture timeline → re-schedule.
- Patch T.3 existant rechargé/importé : `invert:false`, comportement
  strictement identique à avant.
- Undo/redo sur le toggle. Graphe et poignées cohérents dans les deux
  modes, y compris `amount` négatif.

## Hors scope

- « Fall » déclenché au **release** (chute de hauteur en fin de note,
  type cuivres) : variante intéressante mais autre mécanique (ancrage
  sur `releaseStart`) — à noter au backlog « inattendus », pas ici.
- Toute autre forme de courbe (exponentielle…) — toujours hors scope
  T.3.
