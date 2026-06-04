# Prompt dev — Itération N · Phase 4 : boutons de lissage du tracé

**Type** : `feat(iter-N/phase-4)`. Deux opérations de lissage du tracé, en
boutons. **Expérimental assumé** : on livre les deux, on garde le pertinent après
passe d'usage (cf. backlog). 2 sous-commits.

Les deux sont **undoable** (un cran d'undo par clic), **répétables** (recliquer =
lisser davantage), et posent **`canonicalNormalized = false`** (le lissage ne
produit pas une phase canonique iDFT).

Placement : dans le **header de la zone Forme d'onde** (à côté de Normaliser Σ,
cf. M.r.2.6.8). Icônes **Lucide** (convention projet, jamais d'Unicode).

---

## Sous-commit 4.1 — Lissage passe-bas (indépendant des ancres)

**But** : gommer les tremblements de souris d'un tracé libre.

- Nouvelle action reducer (ex. `SMOOTH_EDITOR_CANONICAL`) : applique un
  **passe-bas périodique** sur `canonical` — moyenne mobile (ou Gaussien local)
  **modeste** (suggestion : Gaussien σ ≈ 3 points, ou moyenne mobile fenêtre ~7
  sur 600), **avec wrap** (la canonical boucle). Modéré pour rester répétable
  (un clic ≠ tout aplatir).
- C'est un changement de canonical par voie **non-spline** → **re-fit des ancres**
  (`refitAnchorsAndResidual`, comme `SET_EDITOR_CANONICAL`) + résidu recalculé +
  `canonicalNormalized = false`.
- Bouton + icône Lucide (`Waves` ou `Brush`).

---

## Sous-commit 4.2 — Tendre vers la spline (dépend des ancres)

**But** : rapprocher le tracé de son squelette d'ancres (régularise vers la
lentille Spline).

- Nouvelle action reducer (ex. `TEND_TOWARD_SPLINE`) :
  `canonical_new = lerp(canonical, splineToPoints(anchors, interpolation), α)`
  avec **α ≈ 0.5** (répétable → converge vers la spline ; à α cumulé = 1, la
  canonical **est** la spline, résidu = 0).
- **Garder les ancres telles quelles** (on tend *vers elles*, on ne les re-fitte
  pas) ; **recalculer seulement le résidu** = `canonical_new − spline(anchors)` ;
  `canonicalNormalized = false`.
- Bouton + icône Lucide (`ChartSpline` ou `WandSparkles`).

---

## Comportement attendu / notes

- Les deux sont **sémantiquement différents** : 4.1 supprime les hautes fréquences
  spatiales du tracé (indépendant des ancres) ; 4.2 force le tracé à respecter la
  lentille Spline (dépend du nombre d'ancres — peu d'ancres = lisse beaucoup, 32 =
  peu d'effet). On garde les deux pour les **comparer à l'usage**.
- Disponibles dans la zone Forme d'onde (lentilles Libre/Ancres). Pas de slider de
  force — force fixe + répétition.
- Le son et les autres lentilles suivent (canonical = source unique).

## Vérifications

- Tracer à main levée « sale » → 4.1 lisse progressivement (clics répétés) ; les
  ancres se re-posent (DP) sur le tracé lissé.
- 4.2 répété → la courbe converge vers la spline des ancres (résidu → 0) ; avec peu
  d'ancres, lisse fort ; avec beaucoup, effet faible.
- Undo : un cran par clic, restaure l'état précédent.
- `npm run build && npm run lint && npm run typecheck` verts.
- MAJ `CONTEXT.md` (deux ops, expérimentales) + backlog. Commits
  `feat(iter-N/phase-4.{1,2}): …`, push.

## Hors scope

- Slider de force (force fixe + répétition suffit pour l'essai).
- Décider lequel garder (se fait après passe d'usage, pas dans ce prompt).
- N.6.
