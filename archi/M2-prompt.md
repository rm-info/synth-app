# Prompt — Iteration M, Phase M.2 : layout 3-vues + patch typé + éditeur Harmoniques + passerelle

> Spec de référence : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` (§4, §5, §7.1).
> Phase la plus **structurante** de l'itération : introduit la coexistence des
> modes de timbre et le layout adaptatif qui les héberge.
> **Le toggle auto-sizing est traité dans une phase séparée (M.2-AS)** —
> intentionnel, pour pouvoir isoler/évaluer l'essai sans contaminer M.2.

## Contexte

Quatre ajouts qui ne sont pas séparables proprement (le layout abrite
l'éditeur, l'éditeur a besoin du Patch typé, la passerelle déplace entre les
deux modes) :

1. **Patch typé** comme union discriminée (`draw` vs `harmonic`).
2. **Layout 3 colonnes** dans la moitié principale du Designer : Forme d'onde
   / Harmoniques / Spectrogramme.
3. **Éditeur Harmoniques** (barres + N), nouveau composant.
4. **Couplage mode → vue éditable** (les autres deviennent dérivées read-only).
5. **Passerelle de conversion** explicite draw ↔ harmonic (DFT + troncature ;
   iDFT).

## Découpage en sous-commits

### Sous-commit 2.1 — Patch typé (union discriminée)

- `src/types.ts` : `Patch = DrawPatch | HarmonicPatch`, discriminé par
  `mode: 'draw' | 'harmonic'`.
- **`DrawPatch`** : champs existants (points, amplitude, ADSR, `definition`,
  etc.) + `mode: 'draw'`.
- **`HarmonicPatch`** : `mode: 'harmonic'`, `N: number` (16..256),
  `amplitudes: number[]` (longueur N, valeurs ∈ [0..1] — *magnitudes* uniquement,
  pas de phase, cf. spec §4), + amplitude + ADSR (partagés).
- **Hydratation** : un patch sans champ `mode` (localStorage existant, imports
  `.osa` antérieurs) → `mode: 'draw'`. Pas de migration destructive.
- **Editor draft** : étendre pareil (à la `SET_EDITOR_DEFINITION` de M.1 —
  suivre le pattern). Champs editor : `mode`, `N`, `amplitudes`. Save copie sur
  Patch.
- Actions reducer (undoable via l'historique designer) :
  - `SET_EDITOR_N` (number).
  - `SET_EDITOR_HARMONIC_AMPLITUDE(k, value)` (mise à jour d'une barre).
- (Le changement de **mode** se fait via la passerelle 2.5, pas par une action
  libre.)
- Tag : `refactor(iter-M/phase-2.1): patch typé (draw | harmonic)`.

### Sous-commit 2.2 — Layout 3 colonnes

- **Moitié principale du Designer** = 3 colonnes côte à côte (cf. spec §7) :
  **Forme d'onde** (gauche), **Harmoniques** (centre), **Spectrogramme**
  (droite, **read-only**, déplacer le composant existant ici).
- **État de proportions** persisté (localStorage), un seul tableau de 3
  largeurs.
  - Défaut **piloté par le mode** : `draw` → ½ · ¼ · ¼ (Forme d'onde large) ;
    `harmonic` → ¼ · ½ · ¼ (Harmoniques large).
  - **Boutons preset** dans une petite barre dédiée : ⅓⅓⅓ · ½¼¼ · ¼½¼ · ¼¼½.
    Snap en un clic.
  - **Séparateurs glissables** entre colonnes (poignée visible, curseur
    `col-resize`). **`mousedown` sur la poignée capture l'event** (le clic ne
    doit pas se propager à la colonne — anticipation de M.2-AS).
- Le `Spectrogramme` existant garde son fonctionnement (statique + live).
- La colonne **Harmoniques est un placeholder vide** dans ce sous-commit
  (livré en 2.3).
- Libellés via `strings.js` : `Forme d'onde`, `Harmoniques`, `Spectro`.
- Tag : `feat(iter-M/phase-2.2): layout 3 colonnes + état de proportions`.

### Sous-commit 2.3 — Éditeur Harmoniques (barres + N)

- Nouveau composant `HarmonicsEditor` (dans la colonne du milieu).
- **Bouton N** (`NumberInput` pattern, à la `A4Input`/`BpmInput`), plage
  16..256, **défaut 16** à la création d'un nouveau patch harmonique. Visible
  uniquement en mode `harmonic`. Libellé `N` via `strings.js`.
- **Rendu des barres** :
  - **En mode `harmonic`** : exactement **N barres**, hauteur ∝ amplitude
    linéaire, fond bleu (cf. mockup `layout-v2.html` — bleu = éditable).
    Drag vertical sur une barre = set amplitude ∈ [0..1] (continu).
    Clic à une hauteur = set amplitude direct.
    Sweep horizontal pendant le drag = peindre plusieurs barres
    successives (nice-to-have ; pas bloquant si tu préfères « une barre à la
    fois » en premier jet).
  - **En mode `draw`** : **read-only**, montre les **magnitudes de la DFT**
    du dessin courant, **tronquées à `definition`** (cohérent avec la
    synthèse). Pas de barres au-delà de `definition`. Indicateur 🔒.
- Animation : la transition de N (changement de nombre de barres) doit être
  *lisible*, pas brutale (transition de hauteur OK, layout interpolé OK).
- Tag : `feat(iter-M/phase-2.3): éditeur Harmoniques (barres + N)`.

### Sous-commit 2.4 — Couplage mode ↔ vue éditable

Règle commune (cf. spec §7) : **la vue éditable suit le mode ; les autres
deviennent des vues dérivées read-only** avec indicateur 🔒.

- **Mode `draw`** :
  - `Forme d'onde` : **éditable** (tracé libre, comme aujourd'hui).
  - `Harmoniques` : read-only (DFT du dessin tronquée à `definition`, déjà
    spécifié en 2.3).
  - `Spectrogramme` : read-only (inchangé).
- **Mode `harmonic`** :
  - `Forme d'onde` : **read-only**, affiche la **reconstruction iDFT** de la
    courbe à partir de `amplitudes` (somme `Σ amplitudes[k] · sin(2πkx/600)`,
    k=1..N, échantillonnée sur 600 points). Pas d'édition possible.
    Indicateur 🔒.
  - `Harmoniques` : éditable (déjà spécifié en 2.3).
  - `Spectrogramme` : read-only (inchangé).
- L'indicateur 🔒 est subtil (petite icône dans le header de la colonne, ou
  équivalent) — au choix du dev, mais visible.
- Tag : `feat(iter-M/phase-2.4): vue éditable suit le mode (verrouillage)`.

### Sous-commit 2.5 — Passerelle de conversion

Action utilisateur **explicite** qui change le mode du patch courant. Deux
boutons, contextuels selon le mode actif :

- **En mode `draw`** : bouton « **Convertir en Harmoniques** » (label via
  `strings.js`). Au clic, ouvre un dialog :
  > « Conversion en mode Harmoniques. Choisissez N (nombre d'harmoniques à
  > conserver) : [input number, défaut 24, plage 16..256]. Les harmoniques
  > au-delà seront supprimées et la phase abandonnée. La forme dessinée sera
  > remplacée par une reconstruction. [Convertir] [Annuler] »
  - Au confirme : calcule la DFT (réutilise `pointsToHarmonics`), prend les
    **magnitudes** k=1..N, écrit dans `amplitudes`, set `mode='harmonic'`,
    `N=<choix>`. Action **undoable atomique** (un seul cran undo annule la
    conversion entière).
- **En mode `harmonic`** : bouton « **Convertir en Dessin** ». Dialog plus
  simple :
  > « Conversion en mode Dessin. La courbe sera reconstruite à partir des
  > harmoniques actuelles ; tu pourras la retoucher à la main. [Convertir]
  > [Annuler] »
  - Au confirme : calcule l'iDFT (Σ amplitudes[k] · sin(2πkx/600), k=1..N,
    sur 600 échantillons), écrit dans `points`, set `mode='draw'`. Conversion
    **non destructive** (rien n'est perdu — le mode harmonique n'avait que N
    amplitudes, toutes encodées dans la courbe). Undoable atomique.
- Les libellés des boutons et dialogs passent par `strings.js`.
- Tag : `feat(iter-M/phase-2.5): passerelle de conversion draw ↔ harmonic`.

## Comportement attendu

- **Mode `draw`** : aucune régression par rapport à M.1 (la Forme d'onde
  s'édite, le spectro suit, la nouvelle colonne Harmoniques montre la DFT
  tronquée du dessin).
- **Mode `harmonic`** : on règle les barres directement, la Forme d'onde se
  régénère en read-only via iDFT, le son change immédiatement (par construction
  : seules les N harmoniques cochées produisent du son, le reste est à zéro
  → timbre « propre » par construction).
- **Conversions** : draw→harmonic donne un timbre net plus pauvre (perte des
  harmoniques > N + phase). harmonic→draw donne une courbe lisse éditable
  fidèle aux amplitudes.
- Proportions : par défaut adaptent au mode, presets et drag fonctionnent,
  séparateur drag bien isolé de la colonne (pas de clic qui « fuit »).

## Hors scope

- **Auto-sizing au focus** (toggle, 3 états contextuels, focus-click sans
  édition) → phase **M.2-AS**, séparée.
- **Mode spline** → M.3.
- **Presets** → M.4.
- **Passe doc / extension renderer `\sum`** → M.5a / M.5b.

## Règles techniques

- **N par défaut** :
  - Création d'un nouveau patch harmonique (au bridge draw→harmonic) : choix
    utilisateur dans le dialog, **défaut suggéré 24**.
  - Création d'un nouveau patch déjà en harmonique (rare avant M.4 presets) :
    **défaut 16** (cf. spec § « défaut modeste »).
- **Définition vs N** : `definition` (M.1) ne s'applique **que** en mode
  `draw`. En mode `harmonic`, `N` joue ce rôle. Le slider de définition est
  **masqué** (ou désactivé) en mode `harmonic`.
- **Persistance localStorage** : ne PAS toucher aux clés. Le `mode` est un
  nouveau champ ajouté ; hydratation rétro-compat = défaut `'draw'`.
- **Imports `.osa`** : pareil. Un patch importé sans `mode` → `'draw'`.
- **Mémoïsation** : `pointsToHarmonics` reste inchangé. L'iDFT (2.4 et 2.5)
  est calculée à la volée — peut être mémoïsée si besoin perf (clé =
  `amplitudes` + `N`), mais c'est un calcul O(600·N) (max 600·256 = 153k
  multiplications, sub-milliseconde) — probablement pas nécessaire en premier
  jet.
- **`strings.js`** : ajouter toutes les nouvelles clés au passage (`Forme
  d'onde`, `Harmoniques`, `Spectro`, `N`, `Convertir en Harmoniques`,
  `Convertir en Dessin`, libellés des dialogs, indicateur 🔒).
- Build + typecheck + lint OK. Passe visuelle/audio à l'utilisateur (pas de
  dev server lancé par le dev).
- CONTEXT.md mis à jour en fin de phase (modèle Patch, composants, État
  actuel, Historique, Roadmap M.2 cochée).
