# Prompt — Iteration M, Phase M.1 : bump cap 256 + slider de définition

> Spec de référence : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` (§3, §6).
> Première phase audio de M, **volontairement détachée et en tête** : elle
> dé-risque l'UX cœur « dessine sale → glisse → propre » au coût le plus bas,
> *avant* la refonte structurelle M.2 (layout 3-vues + patch typé + barres).

## Contexte

Deux ajouts indépendants mais cohérents :

1. **Bump du plafond d'harmoniques 128 → 256.** On récupère la richesse que
   les 600 points portent et qu'on jetait au rééchantillonnage. Concret : les
   **basses** (par ex. G2 ≈ 98 Hz → ~204 harmoniques audibles, dont seules
   128 étaient livrées) gagnent leur plein potentiel. Au-dessus de ~156 Hz,
   **aucun changement** (128 suffisait déjà — les harmoniques manquantes
   passent > 20 kHz).
2. **Slider « Définition ».** Une troncature M/256 paramétrable par patch, qui
   nettoie un dessin **sans quitter la 2D**. C'est *la* feature qui réconcilie
   plaisir du tracé libre et timbre propre.

**À cette étape, le `Patch` reste mono-mode (dessin libre)**. Le typage en
union discriminée (`draw`/`spline`/`harmonic`) vient en M.2 ; le slider s'ajoute
ici comme un champ supplémentaire sur le Patch existant.

## Spec — découpage en sous-commits

### Sous-commit 1 — Bump 128 → 256 harmoniques

- `src/audio.js` : `NUM_SAMPLES` 256 → **512**, `HALF_HARMONICS` 129 → **257**.
- Rééchantillonnage 600 → 512 : **même logique** d'interpolation linéaire,
  seule la cible change.
- Troncature : on garde k=0..256 (257 coefs), on jette k=257..511 — c'est le
  même argument de **miroir conjugué redondant** qu'avant, juste avec N=512.
  Aucune nouvelle harmonique audible perdue.
- Mémoïsation `WeakMap` : **inchangée** (clé = `points`).
- Mettre à jour le commentaire d'en-tête de `pointsToHarmonics` (« 129
  premiers » → « 257 premiers », etc.).
- Conséquence à acter : les patches **graves** existants gagnent jusqu'à ~128
  harmoniques supplémentaires (changement de son léger, audible surtout en
  bas). **Stade dev → pas de migration localStorage.**
- Tag : `feat(iter-M/phase-1.1): bump cap 128→256 harmoniques (resample 600→512)`.

### Sous-commit 2 — Slider de définition

**Modèle**
- Nouveau champ `Patch.definition` (`number`, plage 1..256).
- Défaut nouveau patch : **256** (aucune troncature ; = comportement post-bump).
- **Hydratation** : si le champ est absent (patches localStorage existants ou
  imports `.osa` antérieurs), injecter `256` à la lecture (préserve leur son).
- Persisté avec le patch. Ajouter le champ dans `src/types.ts` (`Patch`).
- Action reducer dédiée (ex. `SET_PATCH_DEFINITION`), **undoable** par le
  mécanisme existant.

**Pipeline audio**
- **Laisser `pointsToHarmonics` inchangé** : il calcule le spectre complet
  k=0..256, mémoïsé per-`points`. Cache propre et cheap.
- Faire la troncature **en aval**, dans `pointsToPeriodicWave(points, ctx, definition)` :
  appeler `pointsToHarmonics`, puis `real[k] = imag[k] = 0` pour `k > definition`,
  puis `createPeriodicWave`. O(N), trivial.
- **Ne pas** introduire de cache par `definition` — la troncature est cheap
  (un parcours), un cache composite n'apporterait rien.
- Idem côté **spectrogramme statique** : utiliser la donnée tronquée pour
  l'affichage que pour la synthèse. **Suggestion d'affichage** (pédagogique) :
  rendre les 256 emplacements et mettre k > M à zéro visiblement, plutôt que
  de masquer — l'utilisateur *voit* le couperet du slider.

**UI**
- Slider dans la **sidebar du Designer**, à proximité ergonomique des
  paramètres patch (amplitude / ADSR) — emplacement précis au choix du dev,
  pourvu qu'il soit bien visible et trouvable.
- Pattern : à la `NumberInput` / `A4Input` existante.
- Libellé **« Définition »** consommé via `strings.js` (clé sémantique, pas
  de littéral).
- **Affichage de la valeur** : montrer la valeur courante à côté du slider
  (ex. `Définition : 47 / 256`) — gain pédago, pas optionnel.
- Plage 1..256, défaut 256. **Linéaire** pour ce premier jet. (Un log-spacing
  étalerait mieux les petites valeurs, mais on ne tranche pas avant d'utiliser.)
- Tag : `feat(iter-M/phase-1.2): slider de définition (troncature harmonique M/256)`.

## Comportement attendu

- **Slider à 256** : son strictement identique à l'état post-bump (pas de
  troncature). C'est le point d'invariance.
- **Slider abaissé** : les harmoniques au-dessus de M sont coupées net — on
  les *entend* disparaître à la lecture, on les *voit* tomber à zéro dans le
  spectro statique (et le live à la lecture suit).
- **Aucune régression** sur le reste (lecture, ADSR, multipiste, persistance,
  import/export `.osa`).

## Hors scope

- Pas de patch **typé** discriminé (`draw`/`spline`/`harmonic`) — M.2.
- Pas d'**éditeur d'harmoniques** (barres + N) — M.2.
- Pas de mode **spline** — M.3.
- Pas de refonte du **layout 3-vues** — M.2.
- Pas de toggle log/linéaire sur le slider — à décider seulement si l'usage
  le demande.

## Règles techniques

- Quand M.2 introduira le mode `harmonic`, le slider de définition disparaîtra
  (le **N** du mode barres joue ce rôle, cf. spec §6). **Pour M.1**, il
  s'affiche toujours (un seul mode, le dessin).
- Mettre à jour `CONTEXT.md` en fin de phase (État actuel, Historique,
  Roadmap, et le commentaire de l'arborescence sur la résolution audio).
- Vérifier `npm run build`, `npm run typecheck`, `npm run lint`. **Passe
  audio/visuelle laissée à l'utilisateur** (le dev ne lance pas le dev server).
- `strings.js` : ajouter la clé pour « Définition » au passage.
