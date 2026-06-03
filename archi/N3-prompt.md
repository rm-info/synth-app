# Prompt dev — Itération N · Phase 3 : drag d'ancre = déformation 2D à support local

**Type** : `feat(iter-N/phase-3)`. Refonte de l'interaction **déplacer une
ancre** dans la lentille Ancres. **Remplace** l'ancien N.3 (PCHIP/overshoot) :
avec ce modèle, le détail suit la tendance, l'overshoot Catmull-Rom devient
secondaire.

> Préalable : la phase 2.1 (switch Doux/Anguleux = no-op) doit être livrée avant
> (cohérence résidu↔mode).

## Le problème qu'on corrige

Aujourd'hui `MOVE_SPLINE_ANCHOR` fait `canonical = spline(nouvelles_ancres) +
résidu GELÉ`. Le détail dessiné (notamment la *netteté* d'une pointe, qui vit
dans le résidu car une ancre Catmull-Rom seule ne sait pas faire une pointe)
**reste planté à sa position d'origine** tandis qu'une nouvelle bosse lisse
apparaît à l'ancre → **double pointe**. L'utilisateur s'attend à ce que la pointe
**suive l'ancre en 2D**.

## Le modèle cible — « le détail ride sur la tendance »

La spline (douce ou anguleuse) est la **tendance**. Déplacer une ancre déforme le
tracé **uniquement entre l'ancre gauche et l'ancre droite** (support local), en
**2D** : le détail est *emporté* avec la tendance, pas laissé sur place.

Formulation (préserve la décomposition `canonical = spline + résidu`) :

```
nouvelle_canonical(X) = spline(nouvelles_ancres, mode)(X) + résidu_remappé(X)
```

où **`résidu_remappé` = le résidu de départ, ré-échantillonné le long d'un warp
horizontal** du support, de sorte que le détail se déplace en x avec l'ancre.

### Détail mathématique

Soit l'ancre `i` déplacée de `(x0, y0)` (position **au début du drag**) vers
`(xN, yN)`. Voisins : `L = ancres[i-1]`, `R = ancres[i+1]` (avec **wrap
périodique** pour la première/dernière ancre, cf. cas limites). Support = `(Lx, Rx)`.

1. **Warp horizontal, linéaire par morceaux** (monotone, sans repli — garanti par
   le clamp existant `Lx < xN < Rx`). Map des x du support :
   - `x ∈ [Lx, x0]  →  x' = Lx + (x − Lx)·(xN − Lx)/(x0 − Lx)`
   - `x ∈ [x0, Rx]  →  x' = xN + (x − x0)·(Rx − xN)/(Rx − x0)`
2. **Résidu remappé** : pour chaque X entier du support, trouver la **pré-image**
   `x` par l'inverse (lui aussi linéaire par morceaux) et échantillonner le résidu
   de départ (interp. linéaire) :
   - `X ∈ [Lx, xN]  →  x = Lx + (X − Lx)·(x0 − Lx)/(xN − Lx)`
   - `X ∈ [xN, Rx]  →  x = x0 + (X − xN)·(Rx − x0)/(Rx − xN)`
   - `résidu_remappé[X] = lerp(résidu_départ, x)`
   - Hors support : `résidu_remappé[X] = résidu_départ[X]` (inchangé).
3. **Recomposition** : `nouvelle_canonical = splineToPoints(nouvelles_ancres,
   mode) + résidu_remappé`. Le résidu **stocké** devient `résidu_remappé`
   (cohérent : `canonical − spline = résidu_remappé`).

**Doux vs Anguleux** : la différence passe par la **tendance** `spline(…, mode)`
(bosse lisse en Doux, sommet anguleux en Anguleux) — c'est elle que le détail
suit. Le warp horizontal du résidu est géométrique (indépendant du mode). Ça
satisfait « la déformation est appliquée différemment selon le mode ».

## Contrainte critique — référence figée au début du drag

Le warp se calcule **depuis l'état au début du drag** (résidu + ancres + `x0` de
l'ancre capturés au `mousedown`), par le **déplacement total** `x0→xN`. **Ne pas**
warper de frame en frame depuis la canonical courante (ça accumulerait les
ré-échantillonnages et dégraderait la courbe).

Plomberie suggérée (à toi d'ajuster) : capture la référence au début du drag
(`refResidual`, `refAnchors`, `i`), calcule le **preview live** dans le composant
(la lentille Ancres a déjà un draft local isolé), et **commit en une action sur
`mouseup`** → **une seule entrée d'undo** par drag. Le helper de warp/remap va
dans `src/lib/spline.js` (pur). L'action de commit pose `canonical`, `anchors` (la
draggée à `(xN,yN)`), `residual = résidu_remappé`, `canonicalNormalized: false`,
**sans re-fit DP** (on garde les positions d'ancres voulues).

## Cas limites (impératifs)

- **Première/dernière ancre** : les voisins **wrap** modulo `RESOLUTION` (le
  support traverse `x=0`). Travaille dans un repère déroulé autour de l'ancre
  (offsets ±RESOLUTION) puis réécris modulo. Le drag d'une ancre de bord doit
  marcher comme les autres.
- **`xN` clampé** entre voisins (`SPLINE_MIN_GAP`) — déjà fait par le handler
  actuel, conserve-le → garantit le warp monotone.
- Garde anti-NaN sur le résidu remappé (lerp aux bords).
- ADD/REMOVE_SPLINE_ANCHOR **inchangés** (restent additifs) — on ne refait que le
  **drag**.

## Comportement attendu

- Drague une ancre posée sur une **pointe**, vers la droite → la pointe
  **translate avec l'ancre** (plus de double pointe), détail conservé.
- Drague verticalement → le détail monte/descend avec la tendance, atténué vers
  les voisins.
- **Doux vs Anguleux** donnent des déformations visiblement différentes (tendance
  lisse vs anguleuse).
- Les autres lentilles (Harmoniques, courbe normalisée) restent cohérentes (la
  canonical reste la source unique).
- Un drag = **une** entrée d'undo.

## Vérifications

- Scénarios manuels ci-dessus + : drag d'une ancre de **bord** (wrap) ; drag avec
  peu/beaucoup d'ancres ; switch de mode entre deux drags (grâce à 2.1, no-op).
- Pas de dégradation de la courbe sur drags répétés (référence figée OK).
- `npm run build && npm run lint && npm run typecheck` verts ; perf de drag
  fluide (warp ~600 pts/frame, draft isolé comme aujourd'hui).
- MAJ `CONTEXT.md` (modèle de drag d'ancre documenté en décision archi) + backlog
  (raye « Fit/overshoot PCHIP » : rendu secondaire par ce modèle). Commit
  `feat(iter-N/phase-3): …`, push.

## Hors scope

- PCHIP / interpolation monotone (l'ancien N.3) : abandonné au profit de ce modèle.
- ADD/REMOVE d'ancre (restent additifs).
- N.4 (boutons de lissage), N.5 (presets Fourier), N.6.
