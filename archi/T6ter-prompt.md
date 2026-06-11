# Prompt T.6ter — Graphe disto : poignée Mix

## Contexte

Rectificatif d'usage sur T.6bis (livré) : la courbe effective rend le
mix **visible**, mais l'intention était aussi de le rendre
**manipulable** au geste, comme tous les paramètres graphés du module.

## Spec

- **2ᵉ poignée « Mix »** sur le graphe de transfert, posée **sur la
  courbe effective** à une abscisse fixe x₀ distincte de celle de la
  poignée Drive (si Drive est côté positif, prendre x₀ négatif, ex.
  −0.6 — ajuster pour que les deux poignées ne se gênent jamais).
- **Geste = manipulation directe** : à x₀, la courbe effective vaut
  `mix·f(x₀) + (1−mix)·x₀` — le point voyage **linéairement** entre la
  diagonale identité (mix 0) et la wet pure (mix 1). Drag vertical →
  `mix` = inversion de cette interpolation, clampé [0,1]. La poignée
  reste collée à la courbe pendant le drag.
- **Course réduite à drive faible, assumée** : quand `f(x₀) ≈ x₀`
  (drive bas), la poignée bouge peu — fidèle à l'audio (le mix d'une
  disto douce change peu le son). Les steppers restent le chemin de
  précision. Pas de compensation artificielle.
- Discipline standard (T.1/AHDSR) : cercle isotrope, curseur
  grab/grabbing, tooltip « Mix », draft local + un dispatch au
  relâchement (`SET_EDITOR_MODULATION` distortion/mix), géométrie
  gelée au pointerdown, Pointer Events + capture + `pointercancel`,
  hit-test priorisé si chevauchement avec Drive (la plus proche
  gagne).
- Effet désactivé : poignée inerte/grisée comme la poignée Drive.

## Commits

1. `feat(iter-T/phase-6.7): graphe disto — poignée Mix (manipulation
   directe de la courbe effective)`
2. `docs: CONTEXT.md — Iteration T phase 6.7 (poignée Mix)`.

## Comportement attendu

- Drag de la poignée vers la diagonale → le mix descend, la courbe
  accent se couche, le stepper Mix suit ; vers la wet pure → mix
  monte. Un cran d'undo par geste.
- À mix 0 et 1 la poignée bute proprement (clamp) ; à drive élevé la
  course est ample, à drive 1 elle est courte (normal).
- Steppers, poignée et audio toujours synchrones ; tactile OK.

## Hors scope

- Tout le reste de la disto (courbes, drive, env. drive) — inchangé.
- C'est le vrai dernier rectificatif de T avant le prompt de clôture.
