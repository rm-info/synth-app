# Prompt — Iteration M, préalable A : migration TypeScript (Phase 0 + 1)

> Spec de référence : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` (§4, §10).
> Décision archi : migration TS **incrémentale, fichier par fichier, sans casse**,
> à poser **avant** l'itération G perf et **avant** M.2 (qui a besoin d'un Patch typé).

## Contexte

L'Iteration M va introduire un **Patch typé** : une union discriminée par le
mode de fabrication du timbre (`draw` / `spline` / `harmonic`, posés en M.2).
Prérequis : adopter TypeScript progressivement, en commençant par le **setup**
puis le **typage du modèle existant** (gros ROI, autocomplétion + check sur
tout ce qui touche un `Clip`, un `Patch`, un `dispatch`).

**Ce prompt ne touche PAS encore aux features Waveform.** Il pose uniquement le
terrain TS sur le modèle **actuel**.

## Révision de contrainte — à acter dans `CLAUDE.md`

⚠️ Le `CLAUDE.md` racine liste « Pas de TypeScript. Pas de `.ts`/`.tsx`. »
parmi les contraintes **non négociables**. Cette contrainte est **levée par
décision archi** (adoption incrémentale, cf. BACKLOG « Migration TypeScript
progressive »). Mettre à jour `CLAUDE.md` racine en conséquence : remplacer la
règle « Pas de TypeScript » par « **TypeScript incrémental** : `allowJs`, pas
de big-bang, `strict` activé en opt-in fichier par fichier ; pas de lib de
types lourde sans validation archi ». Garder toutes les autres contraintes
intactes.

## Spec — découpage en sous-commits

### Sous-commit 1 — Phase 0 : setup (neutre fonctionnellement)

- `npm i -D typescript @types/react @types/react-dom`
  (⚠️ ajout de **devDependencies** uniquement — pas de dépendance runtime ;
  cohérent avec la règle « ajout npm = validation archi » : ici validé).
- Créer `tsconfig.json` : `allowJs: true`, `checkJs: false`, `strict: false`,
  `noEmit: true`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`,
  `target`/`lib` adaptés à Vite + React 19, `skipLibCheck: true`.
- Vérifier que `npm run dev` et `npm run build` sont **inchangés** (aucune
  régression, aucun changement de comportement).
- Mettre à jour `CLAUDE.md` racine (cf. section ci-dessus).
- Commit : `chore(iter-M/phase-0): setup TypeScript (allowJs, noEmit)`.

### Sous-commit 2 — Phase 1 : typer le modèle EXISTANT

- Créer `src/types.ts` avec les types du modèle **actuel, tel quel** :
  `Patch`, `Clip`, `Track`, `TuningSystem`, `AppState`, et l'union
  **discriminée** `Action` du reducer (`{ type: '...' } | ...`).
  **Ne PAS anticiper** les champs Waveform de M (`draw`/`spline`/`harmonic`,
  `definition`, coefficients, `N`) — ils arrivent en M.2.
- Convertir `src/lib/tuningSystems.js` → `.ts` (modèle central, gros ROI).
  Ajuster les imports avec extension explicite si besoin.
- Câbler les types sur le reducer pour obtenir l'autocomplétion/le check sur
  `dispatch({ type: ... })` : soit annotations JSDoc `@type` dans le `.js`,
  soit conversion ciblée du fichier reducer si raisonnable (au choix, viser le
  bénéfice de check sur les actions sans tout convertir).
- Discipline : préférer `unknown` à `any` ; `strict: false` global conservé ;
  **ne pas** activer `strict: true` global.
- Vérifier dev/build **inchangés**, **zéro changement runtime**.
- Sous-commits possibles : `src/types.ts` ; `tuningSystems.ts` ; câblage reducer.
  Tag : `refactor(iter-M/phase-1): types du modèle (Patch/Clip/Track/Action)`.

## Comportement attendu

- **Aucun changement fonctionnel ni runtime.** Les annotations s'effacent au
  build (Vite). `npm run dev` et `npm run build` fonctionnent comme avant.
- Pas de régression visuelle ou audio. Le typage est muet à l'exécution.

## Hors scope

- **Pas de big-bang** : ne PAS convertir l'ensemble du code. Seulement le setup
  + `tuningSystems` + `types.ts` + le câblage reducer.
- **Pas** d'activation de `strict: true` global.
- **Pas** d'ajout des types Waveform M (réservé M.2).
- Pas de refacto non lié, pas de changement de comportement.

## Règles techniques

- Vite gère `.js` et `.ts`/`.tsx` côte à côte ; un `.tsx` peut importer un
  `.js` et inversement (les types s'effacent au runtime).
- Imports avec extension explicite (`'./foo.js'`) à ajuster (`'./foo'` ou
  `'./foo.ts'`) à la conversion.
- Les composants React qui seraient convertis vont en `.tsx` (pas `.ts`), mais
  ce prompt ne convertit pas de composant — surtout des libs/modèle.
- Si une lib sans types : `@types/<lib>` (devDep) ou `declare module` ponctuel.
