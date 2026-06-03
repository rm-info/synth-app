# Prompt dev — Itération N · Phase 1.4 : quick wins perf (Groupe A, sans regret)

**Type** : `fix(iter-N/phase-1.4.x)`. Trois optimisations **indépendantes, à
faible risque, sans regret** — issues de l'audit perf statique + trace navigateur.
Elles tiennent quel que soit le verdict du profilage prod en cours.

## Contexte

L'audit (statique 5-dimensions + trace Firefox) a établi :
- Le DSP est déjà réglé (N.1.2 epsilon) — `createPeriodicWave` ≈ 4 ms TOTAL sur
  9,8 s, `harmonicsToPoints` ≈ 9 ms total. **Ne pas y retoucher.**
- L'essentiel du jank mesuré était un **artefact du dev** (jsxDEV, StrictMode
  double-render, defineProperty/SavedStacks). Une re-mesure prod est en cours.
- Les gros refactors React (isolation des drafts, mémoïsation d'arbre — ranks
  1-5/8/9 de l'audit) sont **gelés** tant que la prod n'a pas prouvé un résiduel
  réel : **HORS SCOPE de ce prompt.**

Ce prompt ne fait que les 3 gains propres et bornés.

## ⚠️ Invariant non négociable — transparence perceptive

Même son, mêmes courbes, mêmes couleurs à l'œil et à l'oreille. Seul le coût
change. Si un fix modifie une sortie observable, il est hors scope — interpelle.

> Les numéros de ligne ci-dessous (issus de l'audit) sont **indicatifs** —
> localise par symbole, ils ont pu bouger.

---

## Sous-commit 1.4.1 — Cache de `themeColor()` (le meilleur gain)

**Problème** : `themeColor(name)` fait `getComputedStyle(documentElement).getPropertyValue()`
à **chaque appel**, sans cache (`src/lib/themeColor.js`, ~l.16-18). Sur le hot
path de drag, c'est appelé ~9× par draw dans `WaveformEditor` (drawCanvas), ~9 +
**2×N_ancres** dans `SplineEditor` (l.192, DANS la boucle ancres), ~13× dans
drawAdsr. `getComputedStyle` peut déclencher un forced style recalc. Les couleurs
ne changent qu'au **changement de thème**.

**Fix** : cache module-level `{nom → valeur}` dans `themeColor.js`, vidé sur
l'event `themechange`.
- L'event `themechange` est **déjà émis** par `App.jsx` (~l.753) au toggle de
  thème, et déjà écouté par les éditeurs (`SplineEditor` ~l.269, `WaveformEditor`
  ~l.1685). **Vérifie la cible de l'event** (`window` vs `document`) et branche le
  listener d'invalidation dessus, une seule fois au chargement du module.
- `themeColor(name)` : retourne la valeur cachée si présente, sinon calcule +
  stocke.

**Garde-fous** :
- Vérifie que **toutes** les propriétés lues par `themeColor` sont bien
  pilotées par le thème (CSS vars qui ne bougent qu'au `themechange`). Si une
  valeur lue peut changer sans `themechange`, ne la cache pas (ou élargis
  l'invalidation).
- Transparence : la valeur retournée doit être **identique** à l'actuelle ;
  teste un toggle de thème → les couleurs doivent suivre correctement (cache
  bien invalidé).

---

## Sous-commit 1.4.2 — Cache de la `PeriodicWave` (propre, gain mesuré faible)

**Problème** : `pointsToPeriodicWave(canonical, audioCtx, cap)` (`src/audio.js`,
~l.155-168) appelle `createPeriodicWave` **inconditionnellement à chaque note**,
alors que `pointsToHarmonics` est déjà un cache-hit (WeakMap). En lecture pure,
`canonical` (réf) et `cap` sont stables → N notes reconstruisent N fois la **même**
wavetable.

**Fix** : mémoïser la `PeriodicWave` sur la même logique que `harmonicsCache` —
WeakMap par référence `canonical`, sous-clé par `cap`, garde sur l'identité du
`ctx` :
```
// WeakMap<canonical, { ctx, byCap: Map<cut, PeriodicWave> }>
```
On ne reconstruit qu'à la 1re note après une édition (la réf `canonical` change →
le WeakMap évince l'ancienne entrée). Normalise la clé : `cut = Number.isFinite(cap) ? cap : HARMONIC_COUNT`.

**Honnêteté sur l'ampleur** : la trace mesure `createPeriodicWave` à ~0,13 ms/note
— le gain est **négligeable en absolu**. On le fait parce que c'est propre et le
seul item sur le chemin frappe→son, **pas** parce que ça débloquera un ressenti.
Reste simple : pas de cache multi-ctx élaboré (un seul AudioContext en pratique),
juste la garde d'identité. Réutiliser un buffer scratch pour la branche `cap<256`
est optionnel et secondaire.

**Garde-fou** : wave identique pour mêmes `(canonical, cap)` → son inchangé.
`disableNormalization: false` conservé.

---

## Sous-commit 1.4.3 — Réduction du payload persisté (arrondi 1e-4)

**Problème** : `canonical`(600) + `residual`(600) en floats pleine précision =
~24 Ko JSON/patch. Sérialisé à l'écriture localStorage (`App.jsx` ~l.651).
30 patches ≈ 713 Ko / ~8,5 ms par écriture.

**Fix (sûr, recommandé)** : **arrondir `canonical` et `residual` à 4 décimales
uniquement à l'écriture localStorage** (map sur les patches au point de
sérialisation), en gardant le modèle en mémoire en pleine précision.
- 1e-4 = exactement notre `HARMONIC_EPSILON` → **sous le plancher audible et
  sous-pixel** (transparence acquise par notre propre standard N.1.2).
- L'arrondi est **idempotent** (`round(round(x)) === round(x)`) → pas de dérive
  au cycle reload→resave.

**Garde-fous** (persistance = données, sois prudent) :
- Vérifie que l'**export `.osa`** n'est PAS affecté (il sérialise depuis le
  modèle mémoire pleine précision via `osaFormat.js` — confirme qu'il n'emprunte
  pas le chemin d'arrondi).
- Vérifie que le flag `canonicalNormalized` et l'hydratation au reload restent
  cohérents (recharger un patch arrondi ne doit pas casser l'aperçu ni le son,
  à 1e-4 près).
- Ne touche PAS à la fréquence de persistance (le re-déclenchement par
  `testNoteIndex` = rank 4b, **Groupe B, gelé**).

**Alternative plus agressive (à évaluer, pas imposée)** : ne pas persister
`residual` et le recalculer à l'hydratation (`residual = canonical −
splineToPoints(anchors)`), −50 % du payload forme d'onde. Risque round-trip plus
élevé (dépend d'un recalcul exact) → ne la retiens que si tu confirmes l'égalité
stricte au reload. Sinon, garde l'arrondi.

---

## Vérifications de fin

- Aucune sortie observable modifiée : son identique, courbes identiques, couleurs
  correctes au toggle de thème, patches identiques (à 1e-4) au reload.
- `npm run build && npm run lint && npm run typecheck` verts.
- MAJ `CONTEXT.md` (protocole 2-fichiers : État actuel + roadmap N.1.4) et coche
  les ranks 6/7/4a dans le backlog.
- Commits `fix(iter-N/phase-1.4.x): …`, push `origin/main` après chacun.

## Hors scope

- Tout le Groupe B/C (ranks 1-5, 8, 9) : re-renders par note/frame, isolation des
  drafts, mémoïsation d'arbre, mount-gating Timeline, débounce persistance → gelés
  jusqu'au verdict du profilage prod.
- Mismatch FFT #12.
- Toute modif du DSP déjà réglé en N.1.2.
