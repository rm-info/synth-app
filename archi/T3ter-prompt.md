# Prompt T.3ter — Pitch envelope : formes de progression (linéaire, décélérée, exponentielle, accélérée)

## Contexte

Suite de T.3/T.3bis (livrés). La progression du pitch envelope est
aujourd'hui linéaire ; or la **forme** de la trajectoire est ce qui
distingue un glissando régulier d'une attaque percussive (chute rapide
qui « se pose »). On ajoute un **switch segmenté de 4 formes**, même
idiome que le switch de forme des LFO.

Cadrage acté avec l'archi :
- La forme est une **progression normalisée p(t) ∈ [0,1]** sur le temps
  normalisé t ∈ [0,1] ; la valeur posée est
  `départ + (arrivée − départ) · p(t)`. La forme est donc
  **orthogonale au mode Inverser** (qui ne fait qu'échanger
  départ/arrivée) — tout compose sans cas particulier.
- Implémentation par **`setValueCurveAtTime`** (tableau ~64 points) pour
  les formes non linéaires — PAS `exponentialRampToValueAtTime`, qui ne
  peut ni atteindre ni traverser zéro (notre cible est 0 cent et
  `amount` est signé).

Pas de bump `.osa` (règle v4 : champ absent → défaut injecté).

## Spec

### Modèle
- `PitchEnv` += **`curve: 'linear' | 'easeOut' | 'expo' | 'easeIn'`**,
  défaut `'linear'`. Libellés UI (strings.js) : **Linéaire /
  Décélérée / Exponentielle / Accélérée**.
- Progressions :
  - `linear`  : p(t) = t
  - `easeOut` : p(t) = 1 − (1−t)²  (plonge vite, se pose en douceur)
  - `expo`    : p(t) = (1 − e^(−5t)) / (1 − e^(−5))  (idem, brutale)
  - `easeIn`  : p(t) = t²  (traîne au départ, plonge à l'arrivée)
- `types.ts`, `DEFAULT_PITCHENV`, validation `osaFormat` (enum),
  `libraryTransfer`, hydratation localStorage (champ absent →
  `'linear'`). Édition via `SET_EDITOR_MODULATION` (clé `curve`),
  undoable.

### Audio (`lib/modulation.js`)
- `curve === 'linear'` : chemin existant inchangé (setValueAtTime +
  linearRampToValueAtTime).
- Formes non linéaires : **un seul chemin** —
  `setValueCurveAtTime(Float32Array(64), startTime, time/1000)` avec
  `values[i] = départ + (arrivée − départ) · p(i/63)`. La dernière
  valeur du tableau tient ensuite (comportement natif d'un
  `AudioParam`) : 0 en mode normal, `amount` en mode inversé — comme
  aujourd'hui.
- Garde `time` ≈ 0 (durée nulle interdite par l'API) : poser
  directement la valeur d'arrivée via `setValueAtTime`.
- Note en commentaire : `setValueCurveAtTime` verrouille le paramètre
  sur sa fenêtre — sans conséquence ici, le pitch env est la **seule**
  automation de base d'`osc.detune` (le vibrato est une branche
  entrante sommée, pas une automation).
- Identique live / export offline. **Signature scheduler** : vérifier
  que `curve` participe au bloc `pitchEnv` (re-schedule live).

### UI — panneau Hauteur
- **Switch segmenté 4 positions** (même composant/style que le switch
  de forme des LFO), entre l'interrupteur/Inverser et les steppers.
  Icônes = **glyphes SVG custom de la trajectoire** (style Lucide,
  précédent IconDoux/IconAnguleux) : segment droit / coude décéléré /
  coude exponentiel / coude accéléré. Tooltips = libellés français.
  Pas d'Unicode.
- **Le graphe dessine la vraie courbe** : appliquer p(t) au tracé (et
  au mode inversé). Les 2 poignées gardent leurs gestes et positions
  (départ/cible et durée) — seule la trajectoire entre elles change.

## Commits

1. `feat(iter-T/phase-3.5): pitch envelope — 4 formes de progression
   (setValueCurveAtTime)` — modèle + audio + UI.
2. `docs: CONTEXT.md — Iteration T phase 3.5 (formes du pitch envelope)`.

## Comportement attendu

- Tom percussif (amount +1200, time 150 ms) : `easeOut` adoucit,
  `expo` claque, `easeIn` donne un effet « aspiré » inhabituel —
  audibles sur les 4 chemins, identiques dans le WAV exporté.
- Chaque forme fonctionne en mode normal ET inversé, amount positif
  ET négatif (la courbe traverse la médiane sans artefact).
- Patch antérieur rechargé/importé : `curve:'linear'`, comportement
  bit-identique. Round-trip `.osa` v4.
- Switch pendant lecture → re-schedule. Undo/redo sur le switch.
- Le graphe reflète exactement la forme choisie (comparer visuellement
  easeOut vs expo : même direction, genou plus marqué).

## Hors scope

- Courbure continue draggable sur le graphe (noté : pourrait remplacer
  les toggles plus tard, les 4 formes devenant des presets de
  courbure — le modèle n'aurait pas à casser).
- Formes sur les LFO (sine/triangle/square suffisent) et sur l'AHDSR
  (autre chantier, autre convention).
- T.4+ (filtre, distorsion).
