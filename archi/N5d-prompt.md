# Prompt dev — Itération N · Phase 5d : finitions modale (vignettes + ancres)

**Type** : `fix(iter-N/phase-5d.1)` et `fix(iter-N/phase-5d.2)`. Deux correctifs
chirurgicaux remontés en passe d'usage de N.5c. Indépendants.

## 5d.1 — Vignettes tronquées en hauteur (`PatchThumbnail`)

**Problème** : `src/components/PatchThumbnail.jsx` mappe `v → ymid − v·ymid·0.9`
en supposant `|v| ≤ 1`. Les formes dont l'amplitude dépasse ±1 (band-limitées à
pic ~1.09, tracés non clampés) **débordent et sont coupées** en haut/bas.

**Fix** : **auto-fit Y au pic réel, uniquement vers le bas** — on réduit pour que
ça rentre, on n'agrandit jamais :
```
const peak = Math.max(1, ...points.map(Math.abs))   // floor à 1
const y = ymid - v * (ymid * 0.9 / peak)
```
- Formes `≤ ±1` : **inchangées** (peak = 1).
- Formes qui dépassent : **réduites** pour afficher la forme **complète**.
- Garde anti-NaN/`points` vide (peak ≥ 1 par le floor, pas de division par 0).

Bénéficie aussi aux vignettes de la Bibliothèque (mêmes patches à pic > 1).

## 5d.2 — Ancres auto bloquées à ±1 (`fitAnchorsToCurve`)

**Problème** : `src/lib/spline.js` (~l.204) clampe encore le `y` des ancres à
`[-1, 1]` :
```
const y = Number.isFinite(yRaw) ? Math.max(-1, Math.min(1, yRaw)) : 0
```
C'est un **oubli** de la doctrine non-clamp (M.r.5.bis a retiré ce clamp partout
ailleurs). Conséquence : quand la canonical dépasse ±1, l'ancre posée par DP est
ramenée à 1 → **pas sur la trace**.

**Fix** : retirer le clamp, garder seulement la garde anti-NaN :
```
const y = Number.isFinite(yRaw) ? yRaw : 0
```
La borne défensive `[-10, 10]` de `sanitizeAnchors` (persistance/`.osa`) protège
toujours ; `sampleSpline` ne clampe pas non plus → cohérent.

## Vérifications

- Charger un preset band-limité à pic > 1 / une forme idéale : la **vignette
  montre la forme entière** (plus de troncature) ; les formes ≤ ±1 sont rendues
  comme avant.
- Sur une canonical qui dépasse ±1, les **ancres auto sont sur la trace** (plus
  collées à ±1).
- `npm run build && npm run lint && npm run typecheck` verts.
- MAJ `CONTEXT.md` + backlog. Commits `fix(iter-N/phase-5d.{1,2}): …`, push.

## Hors scope

- N.4 (lissage), N.6 (durcissements).
