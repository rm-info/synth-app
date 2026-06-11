# Prompt T.6quater — Graphe disto : poignée 2D unique Drive/Mix au point caractéristique

## Contexte

Remplace l'ergonomie des poignées de T.6/T.6ter (livrées), sur retour
d'usage archi/utilisateur :
- la poignée Drive (drag vertical) ne correspond pas à l'effet visuel
  du drive (horizontal : le genou/les plis se resserrent) ;
- la poignée Mix à abscisse fixe a un **cas mort** en mode replié :
  quand la sinusoïde traverse la diagonale à l'abscisse de la poignée
  (`f(x₀) = x₀`), la course du mix s'effondre à zéro — poignée
  inutilisable.

Nouveau design : **une seule poignée 2D** posée au **point
caractéristique** de la courbe — horizontal = drive, vertical = mix.
Les deux anciennes poignées disparaissent.

## Spec

### Point caractéristique (abscisse = drive)

Pour k = drive :
- `hard` : l'angle d'écrêtage — **x_c = 1/k** ;
- `soft` : l'intersection des deux tangentes (pente initiale depuis
  l'origine × asymptote y = 1) — **x_c = tanh(k)/k** (hors courbe,
  dans sa région : c'est voulu) ;
- `fold` : le premier sommet de la sinusoïde — **x_c = 1/k**.

Dans les trois cas x_c **décroît quand le drive monte** : tirer la
poignée vers la gauche resserre le genou / les plis. La poignée est le
lieu d'écart maximal à la diagonale → la course du mix ne s'effondre
plus jamais (le piège du croisement disparaît par construction).

### Position et gestes

- **Position** : `(x_c(drive), mix·1 + (1−mix)·x_c)` — l'ordonnée
  voyage linéairement entre la diagonale (y = x_c, mix 0) et le
  sommet (y = 1, mix 1).
- **Drag horizontal → drive** : inversion de x_c — analytique pour
  hard/fold (`k = 1/x`), **dichotomie** pour soft (x_c(k) est
  strictement monotone sur k ∈ [1,50] ; ~20 itérations suffisent,
  fonction pure dans `lib/distortion.js` à côté des courbes). Clamp
  [1, 50]. Le mapping est naturellement log-perceptuel (1/k comprime
  les hauts drives) — pas de mapping supplémentaire.
- **Drag vertical → mix** : `mix = (y − x_c)/(1 − x_c)`, clamp [0,1] ;
  garde si `x_c ≈ 1` (dénominateur ~0) → mix inchangé pendant le
  geste.
- Drag libre en 2D (les deux à la fois), comme P1/P2 de l'AHDSR.
- **Un geste = UN cran d'undo** : commit atomique des deux valeurs au
  relâchement (aligner le mécanisme sur ce que font les poignées 2D
  AHDSR ; étendre l'action si nécessaire pour porter
  `{ drive, mix }` ensemble — pas deux dispatchs).
- Discipline standard : draft local, géométrie gelée au pointerdown,
  Pointer Events + capture + `pointercancel`, cercle isotrope,
  curseur grab/grabbing, tooltip 2D « Drive / Mix ».
- Suppression des deux poignées T.6ter (code + hit-test). Les
  steppers Drive et Mix restent (chemin de précision).

### Cas limites (documenter, ne pas corriger)

- `hard`, drive → 1 : l'angle converge vers (1,1), course mix → 0 —
  cohérent : `clamp(x)` = identité, l'audio n'a plus d'effet non plus.
- `fold`, drive → 1 : même convergence alors que `sin(x·π/2)` n'est
  pas l'identité — petite incohérence résiduelle assumée, steppers en
  fallback.

### Repères visuels (légers)

- Pendant le drag (uniquement) : afficher les guides du point
  caractéristique — `hard`/`soft` : les deux tangentes/segments qui
  forment l'angle ; `fold` : ligne verticale pointillée au sommet.
  Discrets (1px, alpha faible), disparaissent au relâchement.

## Commits

1. `feat(iter-T/phase-6.8): graphe disto — poignée 2D unique Drive/Mix
   au point caractéristique (remplace les poignées 6.3/6.7)`
2. `docs: CONTEXT.md — Iteration T phase 6.8 (poignée 2D disto)`.

## Comportement attendu

- Mode dure : la poignée est posée sur l'angle ; gauche = clip plus
  tôt (drive ↑), bas = vers la diagonale (mix ↓). L'angle suit la
  poignée exactement.
- Mode douce : poignée dans l'angle des tangentes, même gestes — la
  courbe « respire » autour pendant le drag.
- Mode replié : poignée sur le premier sommet ; gauche = sinusoïde
  resserrée (plis supplémentaires visibles), bas = couchée vers la
  diagonale. **Plus aucun cas de poignée morte**, quel que soit
  l'endroit où la courbe croise la diagonale.
- Un drag diagonal règle drive et mix ensemble, un cran d'undo.
- Steppers ↔ poignée ↔ audio synchrones ; switch de courbe pendant
  l'édition : la poignée saute à son nouveau point caractéristique.
- Tactile OK ; thèmes OK ; effet désactivé → poignée inerte/grisée.

## Hors scope

- Tout le reste de la disto (courbes, env. drive) et des autres
  panneaux — inchangé.
