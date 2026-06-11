# Prompt T.6quinquies — Poignée disto : drive continu + point de distance max en mode replié

## Contexte

Affinage de la poignée 2D Drive/Mix (T.6quater, livrée), deux retours
d'usage :
1. **Drag saccadé** : le drive est quantifié en entiers — héritage de
   la convention de stepper, sans fondement mathématique (k est
   continu).
2. **Mode replié, demi-morte résiduelle** : la poignée est au premier
   sommet de la sinusoïde (x = 1/k) ; à drive → 1 ce sommet converge
   vers l'angle (1,1) **sur la diagonale**, alors que le point le plus
   éloigné de la diagonale est ailleurs (~x ≈ 0.56 à k = 1).

## Spec

### 1. Drive continu (les 3 modes)

- Le modèle stocke un **float** : clamp [1, 50] sans arrondi
  (reducer + validation `.osa` : accepter les décimaux — relâcher tout
  `Math.round`/contrôle d'entier résiduel).
- La poignée écrit le **float brut** issu de l'inversion (drag fluide,
  plus de crans).
- Steppers inchangés en comportement (pas 1, Shift 5) ; **affichage**
  arrondi à 0.1 dans le `NumberInput` (parse permissif existant — la
  saisie libre accepte les décimales).
- Cache de courbe (`lib/distortion.js`) : la clé `(curve, drive)`
  fonctionne telle quelle avec un float (les voix d'un même patch
  partagent la même valeur). Pendant un drag, recalcul par frame de
  draft — 2048 points, négligeable.

### 2. Mode replié : point de distance max à la diagonale

- Nouvelle abscisse caractéristique (remplace x = 1/k) :
  **x_c(k) = (2/kπ)·arccos(2/kπ)** — le point où `sin(kπx/2) − x` est
  maximal (dérivée nulle). Propriétés (commentaire dans le code) :
  - k = 1 → x_c ≈ 0.561, écart à la diagonale ≈ 0.21 : la poignée
    n'est plus jamais coincée dans l'angle (1,1) ;
  - k grand → x_c → 1/k (converge vers le sommet : le comportement
    actuel redevient correct là où il l'était) ;
  - strictement monotone en k → **inversion par dichotomie**, comme la
    douce (même petite routine, fonction pure).
- **Position de la poignée = sur la courbe effective** :
  `y = mix·f(x_c) + (1−mix)·x_c` (f = wet pure). Inversion mix :
  `mix = (y − x_c)/(f(x_c) − x_c)` — le dénominateur ne s'annule
  jamais (propriété du point de distance max), supprimer la garde
  devenue inutile sur ce mode.
- Le guide visuel de drag du mode replié (ligne verticale pointillée)
  suit la nouvelle abscisse.
- **Dure et douce inchangées** (l'angle d'écrêtage EST le point de
  distance max ; l'intersection des tangentes convient à l'usage).

## Commits

1. `feat(iter-T/phase-6.9): poignée disto — drive continu (float) +
   point de distance max en mode replié`
2. `docs: CONTEXT.md — Iteration T phase 6.9 (affinage poignée disto)`.

## Comportement attendu

- Drag horizontal parfaitement fluide dans les 3 modes (plus de
  crans) ; les steppers continuent d'incrémenter par 1 ; une valeur
  décimale saisie/draguée s'affiche arrondie à 0.1 et sonne.
- Mode replié à drive 1 : la poignée est vers x ≈ 0.56, nettement
  au-dessus de la diagonale, mix dosable immédiatement ; en tirant
  vers la gauche la séparation augmente — plus aucune configuration
  de poignée morte ou demi-morte.
- À drive élevé en replié, la poignée se retrouve quasiment sur le
  premier sommet (continuité avec l'ancien comportement).
- Round-trip `.osa` avec un drive décimal (ex. 7.3) : valeur
  préservée. Patch ancien (drive entier) : inchangé.
- Re-schedule live pendant le drag de drive : courbe audio mise à
  jour au relâchement comme avant (draft local, un cran d'undo).

## Hors scope

- Dure/douce : aucun changement de placement.
- Tout le reste de la disto et du module.
