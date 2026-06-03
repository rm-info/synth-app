# Prompt dev — Itération N · Phase 2 : disposition des ancres (Douglas-Peucker)

**Type** : `feat(iter-N/phase-2)`. Améliore le **placement des ancres** du mode
spline : aujourd'hui équiréparties, demain posées aux **points qui comptent**.
Première vraie amélioration produit de l'itération N (N.1 latence close).

## Pourquoi

`fitAnchorsToCurve` (`src/lib/spline.js:111`) pose `n` ancres à `x = i·600/n`
(équiréparties). Sous-optimal : sur un créneau, deux ancres tombent **au plat**
(inutile) et **aucune à la transition** (là où elles compteraient). Conséquences :
drag d'ancre peu intuitif, et **overshoot Catmull-Rom** aggravé (segments longs
autour des transitions raides).

Le fix : sélectionner les ancres par **simplification Douglas-Peucker** — les
points de plus grande déviation à la courbe, jusqu'à atteindre exactement `N`.
Bénéfice double : ancres aux endroits utiles **+** densité plus forte autour des
transitions → atténue mécaniquement l'overshoot (rend probablement N.3/PCHIP
superflu — on jugera après).

## Périmètre : un seul fichier

Réécrire **uniquement le corps de `fitAnchorsToCurve`** dans `src/lib/spline.js`.
**API, signature et forme de retour INCHANGÉES** :
`fitAnchorsToCurve(canonical, count = 8) → [{x, y}, …]`, longueur exactement
`max(2, round(count))`, triées par `x` croissant, `x ∈ [0, 600)` entiers
distincts, `y = canonical[x]` clampé `[-1, 1]` (comme aujourd'hui).

→ Les ~8 call-sites (`refitAnchorsAndResidual`, migration v1→v2, Reset,
`SET_EDITOR_ANCHOR_COUNT`, etc.) **héritent automatiquement**. **Ne touche pas au
reducer.**

## Algorithme (DP à compte fixe, signal périodique)

La courbe est **périodique** (cf. `sampleSpline`, wrap modulo 600). On traite
donc une polyligne ouverte `[0 … 600]` dont l'extrémité `x=600` **reboucle** sur
`x=0` (y identique), et on ancre `x=0` comme point de référence de boucle (stable,
cohérent avec le comportement actuel).

1. **Déviation** : verticale (la courbe est une fonction `y(x)`), pas
   perpendiculaire. Pour un segment entre ancres `A=(xa,ya)` et `B=(xb,yb)`, la
   corde est l'interpolation linéaire ; déviation en `x` =
   `|canonical[x] − (ya + (yb−ya)·(x−xa)/(xb−xa))|`. Mesure la déviation sur la
   **canonical brute** (non clampée) pour bien choisir les points.
2. **Amorce** : deux extrémités `(0, c[0])` et `(600, c[0])` (la seconde est le
   wrap de la première — **virtuelle, non stockée**). Compte d'ancres réelles = 1.
3. **Boucle** : tant que `réelles < N`, prends le **segment dont le pire point
   intérieur a la plus grande déviation**, et **scinde** à ce point (ajoute-le
   comme ancre réelle). Recompute les deux sous-segments.
4. **Sortie** : toutes les ancres sauf la virtuelle `x=600`, `y` clampé `[-1,1]`,
   `x` entier, triées, **distinctes**. Exactement `N`.

## Cas limites (impératifs)

- **Toujours renvoyer exactement `N` ancres.** Si la DP n'a plus de point de
  déviation significative (`> ~1e-6`) avant d'atteindre `N` (courbe plate ou
  quasi), **complète** en scindant le(s) plus large(s) segment(s) à leur
  **milieu géométrique** jusqu'à `N`. Jamais moins, jamais de boucle infinie.
- **`x` distincts** : si le pire point coïncide avec un `x` déjà pris, prends le
  meilleur suivant, ou le milieu du segment. Garantis l'unicité (le
  `sampleSpline` a un garde `h<=0` mais on ne doit pas s'en remettre à lui).
- **N = 2** : `x=0` + le point de déviation maximale global (ex. créneau → x=0 +
  la transition). 
- **N grand / ≥ nb de points** : borne défensive, pas de crash (en pratique le
  compteur d'ancres est petit, 4..~32).
- Pas de mutation de `canonical` ni d'aucune entrée (cohérent avec `sortedByX`).

## Comportement attendu / invariant

- **La canonical (audio + courbe affichée) est INCHANGÉE.** `fitAnchorsToCurve`
  ne décide que *où* sont les ancres ; le résidu `= canonical − splineToPoints(anchors)`
  est recalculé par les call-sites existants et **absorbe** la différence → son
  identique, forme d'onde affichée identique. Seules **changent** les positions
  d'ancres et l'aperçu « spline parfaite ». C'est l'amélioration voulue, pas une
  régression.
- **Patches existants** : intacts (ils gardent `sanitizeAnchors(p.anchors)` ;
  le nouveau fit ne s'applique qu'au prochain re-fit — Reset, changement de
  nombre d'ancres, édition non-spline, ou migration d'un patch sans ancres).

## Vérifications

- `npm run build && npm run lint && npm run typecheck` verts.
- Test manuel : (1) charge/Reset un **créneau** → ancres **sur les transitions**,
  plus au plat ; (2) une **sinusoïde** → ancres raisonnablement réparties ;
  (3) courbe **plate** → N ancres, pas de crash ; (4) drag d'ancre toujours
  fluide et correct ; (5) **le son ne change pas** au re-fit (canonical
  inchangée) ; (6) fais varier le **nombre d'ancres** (slider) → toujours N
  ancres bien placées.
- MAJ `CONTEXT.md` (protocole 2-fichiers : État actuel + roadmap N.2) et coche
  l'item « Fit intelligent des ancres / Douglas-Peucker » au backlog.
- Commit `feat(iter-N/phase-2): …`, push `origin/main`.

## Hors scope

- **N.3 (PCHIP / interpolation monotone)** : on juge sa nécessité **après** avoir
  vu l'effet de N.2 sur l'overshoot. Pas dans ce prompt.
- Toute modif du reducer, des call-sites, de `defaultSplineAnchors` (ancres
  plates par défaut = autre rôle), de l'API de `fitAnchorsToCurve`.
- `sampleSpline` / `splineToPoints` (le rendu de courbe ne change pas).
