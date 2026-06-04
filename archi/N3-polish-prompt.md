# Prompt dev — Itération N · Phase 3 polish : édition d'ancres sans surprise

**Type** : `fix(iter-N/phase-3.1)` et `fix(iter-N/phase-3.2)`. Deux correctifs du
volet édition d'ancres, indépendants. Principe directeur (déjà appliqué en N.2.1) :

> **Changer la représentation** (ajouter/retirer une ancre, basculer Doux/Anguleux)
> → **canonical inchangée**, on recalcule juste le résidu.
> **Changer la forme** (dragger une ancre) → canonical change (warp N.3).

---

## Sous-commit 3.1 — warp lisse du résidu en mode doux

### Diagnostic

`warpResidualForAnchorMove` (`src/lib/spline.js`, ~l.227) re-mappe le résidu par
un **warp horizontal linéaire par morceaux** (pré-image, l.250-252). Ce PL a des
**ruptures de pente** en `xN` (jonction des deux morceaux) et en `Lx`/`Rx` (pente
warpée dedans, identité dehors) → angles **sur l'ancre** et **à l'ancre voisine**.
Invisibles en Anguleux (courbe déjà anguleuse), **glaring en Doux** sur les formes
nettes (triangle, carrée), avec impression de « pli à l'envers ».

### Fix : pré-image C¹ lisse en doux (PL conservé en anguleux)

Rendre la pré-image **lisse (C¹) et monotone** en mode doux. Bump smoothstep
centré sur l'ancre :

```
φ⁻¹(X) = X + (x0 − xN) · W(X)
```
avec `W` = 1 à `xN`, 0 à `Lx`/`Rx`, **dérivée nulle à `Lx`, `xN`, `Rx`** :
- `X ∈ [Lx, xN]` : `t = (X − Lx)/(xN − Lx)` ; `W = 3t² − 2t³`
- `X ∈ [xN, Rx]` : `u = (Rx − X)/(Rx − xN)` ; `W = 3u² − 2u³`

Propriétés : `φ⁻¹(Lx)=Lx`, `φ⁻¹(Rx)=Rx`, `φ⁻¹(xN)=x0` ; pente `= 1 + (x0−xN)·W'`,
donc **1 à Lx/Rx** (raccord C¹ avec l'identité hors support → plus d'angle voisin)
et **continue à xN** (plus d'angle sur l'ancre). Puis `résidu_remappé[X] =
sample(refResidual, φ⁻¹(X))` (inchangé sinon).

**Garde anti-repli** : la pente `1 + (x0−xN)·W'` doit rester `> 0` (`|W'|` culmine
à `1.5/h`). Pour un gros déplacement vers un voisin proche, clampe l'amplitude (ou
retombe sur le PL) pour garantir la monotonie.

**Branche par mode** : ajoute un paramètre `interpolation` à
`warpResidualForAnchorMove` (l'appelant le passe). `soft` → pré-image lisse ;
`hard` → PL actuel inchangé. La **verticale** est déjà portée par la tendance
(sans kink) — n'y touche pas. On ne lisse **pas** les vrais angles du dessin (un
triangle reste un triangle) ; on supprime seulement les angles **parasites** du warp.

### Vérif 3.1
Triangle/carrée en **Doux** : drag d'ancre → déformation lisse, plus d'angle
parasite (ni sur l'ancre, ni sur la voisine), le détail ride toujours.
**Anguleux** : inchangé. Gros déplacement : pas de repli.

---

## Sous-commit 3.2 — ADD/REMOVE d'ancre préservent la canonical

### Diagnostic

`ADD_SPLINE_ANCHOR` (reducer ~l.1896) et `REMOVE_SPLINE_ANCHOR` (~l.1916)
recomposent `canonical = splinePlusResidual(spline(next), résidu GELÉ)`. Donc
`nouvelle_canonical = ancienne + [spline(next) − spline(prev)]` :
- **ADD déforme le tracé** même quand on clique dessus (delta de spline ≠ 0), et
  au point d'ajout `canonical(x) = y_ancre + résidu(x)` → **l'ancre n'est pas sur
  le tracé** (off de `résidu(x)`).
- **REMOVE déforme** aussi (le tracé bouge en retirant un point de contrôle).

### Fix : canonical inchangée, résidu recalculé (modèle N.2.1)

**ADD_SPLINE_ANCHOR** :
- Garder le clamp d'`x` et les gardes de gap (`leftOk`/`rightOk`) actuels.
- **Snap sur la courbe** (décision archi : option A) : `y = canonical[x]` (la
  valeur du tracé courant à cet `x`) — **ignorer `action.payload.y`** (la hauteur
  du clic). L'ancre se pose donc sur le tracé.
- `canonical` **inchangée** (= `state.editor.canonical`).
- `residual = computeResidual(canonical, splineToPoints(next, interpolation))`.
- `canonicalNormalized` **préservé** (canonical inchangée — ne plus forcer `false`).
- Effet : ajouter une ancre = poser un point de contrôle sur le tracé, **zéro
  déformation** ; au point d'ajout le résidu vaut 0 → l'ancre est exactement sur
  le tracé. Pour la déplacer ensuite, on la dragge (N.3).

**REMOVE_SPLINE_ANCHOR** :
- Garder la garde `SPLINE_ANCHOR_MIN`.
- `canonical` **inchangée** ; `residual = computeResidual(canonical,
  splineToPoints(next, interpolation))` ; `canonicalNormalized` préservé.

> Note UX (facultatif, si simple) : pendant le survol d'ajout, l'aperçu de la
> future ancre peut se caler sur la courbe (`y = canonical[x]`) pour refléter le
> snap. Sinon, le clic suffit.

### Vérif 3.2
- Tracé horizontal entre deux ancres, clic au milieu **loin au-dessus** → l'ancre
  se pose **sur le tracé** (au niveau horizontal), **aucune déformation**. La
  dragger ensuite vers le haut → le tracé suit (warp N.3 + 3.1).
- Ajouter une ancre sur un pic / une pente → aucune déformation, ancre sur le tracé.
- Retirer une ancre → tracé **inchangé**, juste moins de points de contrôle.

---

## Vérifications globales

- `npm run build && npm run lint && npm run typecheck` verts.
- MAJ `CONTEXT.md` (le principe « représentation = canonical inchangée / forme =
  warp » mérite une ligne en décision archi) + backlog (raye 3.1 et 3.2).
- Commits séparés `fix(iter-N/phase-3.1): …` et `fix(iter-N/phase-3.2): …`, push.

## Hors scope

- N.4 (lissage), N.5 (presets Fourier), N.6.
- La verticale du warp (déjà correcte).
