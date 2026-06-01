# Prompt — Iteration M rattrapage, Phase M.r.1 : modèle unifié `canonical` + `cap` + `anchors` + `residual`

> Spec de référence : `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md` (§§2, 3, 3.3, 6, 8).
> **Phase structurelle lourde.** Elle prépare M.r.2 (UI), M.r.3 (lentilles
> vivantes), M.r.4 (normalisation) et M.r.5 (convention d'amplitude). Ici
> on pose le modèle, on supprime les conversions destructives et le `mode`
> discriminé, on fait passer la migration localStorage et `.osa`, et on
> dépose la règle d'hygiène canvas. L'UI globale n'est **pas** encore
> réorganisée (c'est M.r.2) et la coexistence vivante des lentilles n'est
> **pas** encore câblée (c'est M.r.3) — mais le code doit rester
> fonctionnel à chaque sous-commit (build / typecheck / lint verts, son
> jouable, patches créables/chargeables).

## Contexte

L'iter-M (M.1 → M.4) a livré trois représentations du timbre — dessin
libre, barres harmoniques, courbe spline — modélisées comme une **union
discriminée** `Patch = DrawPatch | HarmonicPatch | SplinePatch`, avec
des **conversions destructives** entre modes via dialogs et un
**verrouillage 🔒** des vues non éditables. La passe d'usage du 2026-05-30
a révélé que ces trois représentations sont en réalité **trois lentilles
sur une seule forme d'onde** : les silos et les conversions sont de la
complexité accidentelle.

Décision (spec §1.3) : on bascule vers **une seule courbe canonique**
(600 points) avec trois lentilles **toujours synchronisées et toutes
éditables** (chacune à sa façon, voir M.r.3 pour le câblage fluide).
M.r.1 pose les fondations data + drop des conversions + migration.

## Décisions techniques actées avant le découpage

- **`canonical` reste un `number[]` de longueur 600**, pas un `Float32Array`.
  Cohérent avec l'existant (`points` est déjà un plain array, c'est attendu
  par `pointsToHarmonics`, par la validation `.osa`, et par `JSON.stringify`
  côté localStorage). Idem pour `residual`.
- **`cap` couvre `[1, 256]`**, valeur entière. Défaut nouveau patch : **256**
  (équivalent de l'ancien `DEFAULT_DEFINITION`). Pas de borne basse à 16
  (ancien `HARMONIC_N_MIN`) — `cap = 1` est un cas dégénéré valide
  (cf. spec §12).
- **`anchors`** : longueur `[SPLINE_ANCHOR_MIN, SPLINE_ANCHOR_MAX]` = `[4, 32]`,
  invariants existants conservés (ordre cyclique des x, gap min, sanitize).
- **`interpolation`** : `'soft' | 'hard'`, défaut `'soft'`.
- **`residual`** : `number[]` de longueur 600, défaut `[0, 0, …, 0]`.
- **OSA_VERSION bumpé à 2.** L'import accepte v1 (ancien format avec `mode`)
  ET v2 (nouveau format). L'export écrit toujours v2. Cf. M.r.1.3.
- **`currentLens`** : `'free' | 'spline' | 'bars'`, défaut `'free'`,
  porté uniquement par l'`Editor`, **volatile** (non persisté en localStorage,
  non écrit dans `.osa`). En M.r.1 il remplace `editor.mode` au niveau du
  state, mais l'UI continue de l'utiliser exactement comme avant (toggle
  inchangé). C'est M.r.3 qui retravaille l'expérience.

## Découpage en sous-commits

### Sous-commit M.r.1.1 — Types et constantes du nouveau modèle

Refonte de `src/types.ts` et du `DEFAULT_EDITOR` dans `src/reducer.js`.

- **`src/types.ts`** :
  - Drop `WaveformMode`, `DrawPatch`, `HarmonicPatch`, `SplinePatch`.
    Drop l'union discriminée `Patch = DrawPatch | … | SplinePatch`.
  - Nouveau `Patch` (interface unique) :
    ```
    interface Patch extends AdsrEnvelope {
      id, name, color, preset, defaultTuningSystem, folderId, updatedAt   (méta inchangée)
      amplitude: number                       (inchangé)
      canonical: number[]                     (longueur 600 — vérité audio)
      cap: number                             (entier [1, 256])
      anchors: SplineAnchor[]                 (longueur [4, 32])
      interpolation: SplineInterpolation
      residual: number[]                      (longueur 600)
    }
    ```
  - `PatchData` aligné sur le nouveau shape :
    drop `mode`, `definition`, `N`, `amplitudes`, `points`. Ajouter
    `canonical`, `cap`, `residual` (en plus de `anchors` /
    `interpolation` déjà présents).
  - `Editor` :
    drop `points`, `definition`, `mode`, `N`, `amplitudes`. Ajouter
    `canonical: number[]`, `cap: number`, `residual: number[]`,
    `currentLens: 'free' | 'spline' | 'bars'`. `anchors` et
    `interpolation` restent.
  - Drop l'action `SET_EDITOR_DEFINITION` et `SET_EDITOR_N`. Ajouter
    `SET_EDITOR_CAP: number`, `SET_EDITOR_CURRENT_LENS: 'free' | 'spline' | 'bars'`.
    Drop `CONVERT_EDITOR_TO_HARMONIC`, `CONVERT_EDITOR_TO_DRAW`,
    `CONVERT_EDITOR_TO_SPLINE`.
  - `SET_EDITOR_POINTS` → renomme en `SET_EDITOR_CANONICAL`, payload reste
    un `number[]` de longueur 600 (c'est la même action côté tracé libre,
    juste un renommage sémantique).
  - `LOAD_PRESET` payload : drop `mode`. Devient
    `{ cap: number, amplitudes: number[] }` (les presets ne sont définis
    que dans le domaine harmonique). Le reducer reconstruira la
    `canonical` via iDFT à phase canonique.
- **`src/reducer.js`** : constantes
  - Drop `DEFAULT_DEFINITION`, `DEFAULT_HARMONIC_N`, `HARMONIC_N_MIN`,
    `HARMONIC_N_MAX`, `clampHarmonicN` (intégrer au `CAP_MIN/MAX`).
  - Ajouter `CAP_MIN = 1`, `CAP_MAX = 256`, `DEFAULT_CAP = 256`,
    `clampCap(value)` (entier clamp).
  - Refondre `DEFAULT_EDITOR` : `canonical = new Array(600).fill(0)`,
    `cap = DEFAULT_CAP`, `anchors = defaultSplineAnchors()` (8 ancres plates,
    inchangé), `interpolation = 'soft'`, `residual = new Array(600).fill(0)`,
    `currentLens = 'free'`. **Drop** `points`, `definition`, `mode`, `N`,
    `amplitudes`.
- À ce sous-commit, **le reste du code ne compile plus** (les composants
  lisent encore `editor.points`, `editor.mode`, etc.). C'est attendu et
  rattrapé dans les sous-commits suivants — le commit M.r.1.1 lui-même
  peut être en build rouge. **Note importante** : si tu peux raisonnablement
  faire passer ce commit en build vert en bouclant les `as any` ou des
  shims temporaires, fais-le ; sinon, indique clairement dans le message
  de commit que la rouge est attendue et résolue dans le sous-commit
  suivant (« build vert restauré en M.r.1.2 »).

Tag : `refactor(iter-M/phase-r.1.1): nouveau modèle Patch unifié (canonical + cap + anchors + residual)`.

### Sous-commit M.r.1.2 — Reducer : actions unifiées, suppression des conversions

- Ajouter `SET_EDITOR_CAP` (undoable) : `editor.cap = clampCap(payload)`.
  **Ne touche pas** `canonical` à ce sous-commit — la troncature à `cap`
  vit dans la chaîne audio (`pointsToPeriodicWave(canonical, ctx, cap)`,
  M.r.1.4).
- Ajouter `SET_EDITOR_CURRENT_LENS` (non undoable, volatile) :
  `editor.currentLens = payload`. En M.r.1, ce switch ne déclenche **aucun
  effet** sur `canonical` / `anchors` / `residual` (la coexistence vivante
  arrive en M.r.3).
- `SET_EDITOR_CANONICAL` (ex-`SET_EDITOR_POINTS`) :
  - Recalcule `residual` sur les ancres courantes :
    `residual[x] = canonical[x] − splineToPoints(anchors, interpolation)[x]`.
  - **Ne re-fitte pas les ancres** en M.r.1 (la spec §4.1 implique le
    re-fit en M.r.3 quand on bascule de lentille ; ici on n'en a pas
    encore besoin).
- `SET_EDITOR_HARMONIC_AMPLITUDE { index, value }` : édite directement
  la magnitude `index` parmi `cap` barres, puis **régénère** la `canonical`
  par iDFT à phase canonique sur les `cap` premières harmoniques de
  l'état courant. Concrètement, en M.r.1 :
  - Lire les magnitudes courantes par `pointsToHarmonics(canonical).magnitudes`
    sur les `cap` premières harmoniques.
  - Remplacer la magnitude à `index` par `value`.
  - Reconstruire `canonical = harmonicsToPoints(newMagnitudes, cap)` (iDFT
    phase canonique sinus).
  - Recalculer `residual` comme ci-dessus.
  - **Note** : en M.r.1, on n'a **pas encore** le dialog « normalise avant
    d'éditer une barre » (c'est M.r.4). Ici l'édition de barre **écrase
    silencieusement la phase**. C'est sciemment temporaire ; documenter
    dans le commit message qu'on accepte cette régression UX **jusqu'à M.r.4**.
- `MOVE_SPLINE_ANCHOR`, `ADD_SPLINE_ANCHOR`, `REMOVE_SPLINE_ANCHOR`,
  `SET_SPLINE_INTERPOLATION` : préservés. Adaptés à la nouvelle mécanique
  spec §4.1 :
  - Nouvelle `canonical = splineToPoints(newAnchors, interpolation) + residual`
    (somme élément par élément). Pas de recalcul du `residual` ici (il
    survit à l'édition d'ancre — c'est l'intérêt même du résidu).
  - Clamp `canonical[x]` à `[-1, 1]` après somme (le résidu peut pousser
    hors borne).
- **Drop** les cases `CONVERT_EDITOR_TO_HARMONIC`, `CONVERT_EDITOR_TO_DRAW`,
  `CONVERT_EDITOR_TO_SPLINE`, `SET_EDITOR_DEFINITION`, `SET_EDITOR_N`.
- `LOAD_PRESET { cap, amplitudes }` : `editor.cap = cap`,
  `editor.canonical = harmonicsToPoints(amplitudes, cap)`,
  `editor.residual = canonical − splineToPoints(anchors, interpolation)`,
  ADSR/amplitude inchangés (le preset porte un timbre, pas une enveloppe).
- `HYDRATE_EDITOR_FROM_PATCH` : copie `canonical`, `cap`, `anchors`,
  `interpolation`, `residual` du patch dans l'editor. `currentLens`
  remis à `'free'`.
- `SAVE_PATCH` / `UPDATE_PATCH` : `patchModeFields` disparaît. Le patch
  enregistré porte simplement `canonical`, `cap`, `anchors`, `interpolation`,
  `residual` recopiés de l'editor (+ champs méta + ADSR + amplitude).
- **À ce sous-commit, build/typecheck doit redevenir vert.** Les
  composants UI qui lisent `editor.canonical` au lieu de `editor.points`
  doivent suivre (changement le plus mécanique du sous-commit).
- Mettre à jour `defaultColumnWidthsForMode` : la fonction prenait un
  `WaveformMode` ; la renommer en `defaultColumnWidthsForLens` et accepter
  `'free' | 'spline' | 'bars'`. Map : `'bars' → [0.25, 0.5, 0.25]`,
  `'free' | 'spline' → [0.5, 0.25, 0.25]` (inchangé sémantiquement).

Tag : `refactor(iter-M/phase-r.1.2): actions unifiées (SET_EDITOR_CAP, drop CONVERT_*) + suppression mode discriminé`.

### Sous-commit M.r.1.3 — Migration localStorage et `.osa`

- **`src/lib/spline.js`** : nouveau helper
  `fitAnchorsToCurve(canonical, count)` qui produit `count` ancres
  équiréparties (x = i·600/count, y = `canonical[Math.round(x)]`), clampées
  comme `sanitizeAnchors`. `count` défaut = 8. Utilisé par la migration.
- **`src/reducer.js` → `loadPersistedState`** : pour chaque patch
  d'entrée :
  - Si `p.mode === 'harmonic'` : `cap = clampCap(p.N ?? 256)`,
    `amplitudes = sanitizeAmplitudes(p.amplitudes, cap)`,
    `canonical = harmonicsToPoints(amplitudes, cap)`,
    `anchors = fitAnchorsToCurve(canonical, 8)`,
    `interpolation = 'soft'`,
    `residual = new Array(600).fill(0)`.
  - Si `p.mode === 'spline'` :
    `anchors = sanitizeAnchors(p.anchors) ?? defaultSplineAnchors()`,
    `interpolation = p.interpolation === 'hard' ? 'hard' : 'soft'`,
    `canonical = splinePoints(anchors, interpolation)`,
    `cap = 256`,
    `residual = new Array(600).fill(0)`.
  - Sinon (ou `p.mode === 'draw'`) :
    `canonical = Array.isArray(p.points) && p.points.length === 600
      ? p.points.map(v => clampToUnit(v))
      : new Array(600).fill(0)`,
    `cap = clampCap(p.definition ?? 256)`,
    `anchors = fitAnchorsToCurve(canonical, 8)`,
    `interpolation = 'soft'`,
    `residual = canonical − splineToPoints(anchors, 'soft')` (élément par
    élément ; pas de clamp ici, le résidu peut avoir des magnitudes >1 ou
    <-1, c'est *attendu*).
  - Dans tous les cas : strip silencieusement `p.mode`, `p.definition`,
    `p.N`, `p.amplitudes`, `p.points`. Ne pas écrire ces champs dans le
    state hydraté.
- **`src/lib/osaFormat.js`** :
  - Bump `OSA_VERSION = 2`.
  - `validatePayload` : accepter `obj.version === 1` (legacy) **ou** `=== 2`.
    En v1, valider comme aujourd'hui (l'union discriminée existe encore).
    En v2, valider le nouveau shape : `canonical` (array de 600 dans [-1, 1]),
    `cap` (entier [1, 256]), `anchors` (4..32, contraintes existantes),
    `interpolation` ('soft' | 'hard'), `residual` (array de 600 dans
    `[-2, 2]` — borne défensive, le résidu peut sortir de [-1, 1]).
    Pour v2, drop totalement les vérifs `mode`/`definition`/`N`/`amplitudes`/`points`.
  - `decodeOsa` : laisse `validatePayload` faire le tri. Pas de migration
    interne ici — c'est le `loadPersistedState` (et l'`IMPORT_LIBRARY`
    handler du reducer) qui font la conversion v1 → v2 à l'hydratation.
  - Extraire la logique de migration patch-à-patch dans une fonction
    exportée `migrateLegacyPatch(p)` côté reducer (`src/reducer.js`), puis
    l'appliquer **soit** à l'hydratation localStorage **soit** à l'import
    .osa v1. Une seule implémentation, deux call-sites.
- **`buildPayload`** (cherche-le dans le code, c'est le constructeur
  utilisé par l'export `.osa`) : `version: 2`, et il sérialise les patches
  tels qu'ils sont dans le state (déjà au nouveau format).

Tag : `feat(iter-M/phase-r.1.3): migration v1→v2 localStorage et .osa (canonical/cap/anchors/residual)`.

### Sous-commit M.r.1.4 — Audio path, composants et nettoyage des dialogs

- **`src/audio.js`** :
  - `pointsToPeriodicWave(points, audioCtx, definition)` →
    `pointsToPeriodicWave(canonical, audioCtx, cap)`. La signature
    interne reste la même (un array + un nombre), seul le naming bouge.
    Tous les call-sites qui passaient `editor.definition` ou
    `patch.definition` passent désormais `editor.cap` / `patch.cap`.
    Tous les call-sites qui passaient `editor.points` ou `patch.points`
    passent désormais `editor.canonical` / `patch.canonical`.
  - `harmonicsToPoints` : inchangé.
  - `pointsToHarmonics` : inchangé.
- **Composants** : renommage de surface, partout :
  - `patch.points` → `patch.canonical`, `editor.points` → `editor.canonical`.
  - `patch.definition` / `editor.definition` → `patch.cap` / `editor.cap`.
  - `patch.mode` / `editor.mode` → utiliser `editor.currentLens` pour l'UI
    de lentille active **uniquement** (l'editor) ; le patch n'a plus de
    notion de mode → toute lecture `patch.mode` doit disparaître.
  - `patch.N` / `editor.N` → remplacer par `patch.cap` / `editor.cap`.
  - `patch.amplitudes` / `editor.amplitudes` → calculé à la volée via
    `pointsToHarmonics(canonical).magnitudes.slice(0, cap + 1)` (les
    barres ne sont plus stockées, elles dérivent de la canonical).
  - `patch.anchors` / `editor.anchors` / `patch.interpolation` /
    `editor.interpolation` : inchangés.
- **PatchThumbnail** (miniatures dans la bibliothèque) : lecture sur
  `canonical`.
- **PatchBank** / **RecentPatchesList** / **PresetPicker** / **PatchPicker** :
  lecture sur `canonical`.
- **WaveformEditor** : édition libre → dispatch `SET_EDITOR_CANONICAL`
  (renommé). Suppression de toute lecture/affichage `editor.definition`.
- **SplineEditor** : inchangé sémantiquement (édite `editor.anchors`),
  mais la prop qu'il reçoit pour afficher la courbe est `editor.canonical`
  (avec résidu intégré).
- **Spectrogram** (mode statique) : input passé = `canonical`.
- **DesignerColumns** : utilise `defaultColumnWidthsForLens` (renommé).
- **Suppression de fichiers** :
  - `src/components/ConvertToHarmonicDialog.jsx` + `.css` associés.
  - `src/components/ConvertToSplineDialog.jsx`.
  - Toute UI 🔒 (icône cadenas / message « mode actif ») dans
    WaveformEditor, SplineEditor, et la zone Harmoniques : drop visuel
    sans réorganisation (la réorganisation, c'est M.r.2). En attendant
    M.r.2, le toggle entre lentilles peut rester là où il est aujourd'hui.
- **Note importante sur l'éditeur de barres en M.r.1** : sans dialog de
  normalisation (M.r.4), l'édition de barre régénère la canonical à
  phase canonique → la phase est silencieusement réécrite à chaque drag.
  C'est cohérent avec le reducer M.r.1.2 ; visuellement, ça veut dire
  que le tracé peut « sauter » au premier drag d'une barre depuis un
  dessin libre. **Acceptable jusqu'à M.r.4**, mais à documenter dans le
  commit message.
- **`src/components/PresetPicker.jsx`** : payload `LOAD_PRESET` ajusté
  (`mode: 'harmonic'` → drop ; passe `{ cap, amplitudes }`).
- **Bug absorbé** (spec §11) : le bouton preset cassé dans Harmoniques
  disparaît au profit du chemin commun via `LOAD_PRESET`. À M.r.2, la
  modale d'overlay sera remplacée par un dropdown en barre du haut ; ici,
  l'objectif minimal est que **`LOAD_PRESET` fonctionne** (un preset
  cliqué charge le timbre).

Tag : `refactor(iter-M/phase-r.1.4): audio path + composants → canonical/cap, suppression dialogs de conversion et 🔒`.

### Sous-commit M.r.1.5 — Règle d'hygiène canvas

- Nouveau `src/lib/canvas.js` exposant `withSavedCtx(ctx, fn)` :
  ```
  export function withSavedCtx(ctx, fn) {
    ctx.save()
    try { fn(ctx) } finally { ctx.restore() }
  }
  ```
- Audit et application dans **toutes** les fonctions de rendu canvas du
  Designer :
  - `WaveformEditor.jsx` : `drawCanvas` (et toute sous-fonction de tracé).
  - `SplineEditor.jsx` : rendu des ancres + courbe.
  - `Spectrogram.jsx` : rendu DFT statique + FFT live.
  - `PatchThumbnail.jsx` : rendu mini.
  - Toute autre fonction qui touche un `CanvasRenderingContext2D` et qui
    set `lineWidth`/`strokeStyle`/`fillStyle`/`globalAlpha`/transform.
- Discipline appliquée : `save` au début, `restore` à la fin (via
  `withSavedCtx`) ; **aucune** propriété de contexte ne persiste entre
  deux rendus.
- Test manuel de non-régression à faire passer avant commit :
  - Switcher rapidement Libre ⇆ Ancres dans le Designer → aucun artefact.
  - Faire varier rapidement `cap` (slider) → aucun artefact résiduel.
  - Switcher de patch dans la bibliothèque → aucun artefact dans la
    miniature.

Tag : `chore(iter-M/phase-r.1.5): hygiène canvas (withSavedCtx) dans tout le Designer`.

## Comportement attendu en fin de phase

- L'utilisateur peut **créer un nouveau patch**, le dessiner (lentille
  Forme d'onde), basculer en Harmoniques (toggle inchangé), éditer une
  barre, basculer en Ancres, bouger une ancre. Tout cela sans dialog de
  conversion. La courbe affichée doit rester cohérente avec ce qui sort
  audio.
- Les **patches sauvegardés** (mode draw / harmonic / spline confondus,
  produits sous M.4) doivent **continuer de fonctionner** après la
  migration v1 → v2 — leur son ne doit pas être radicalement différent
  (à phase près pour les anciens dessins libres : le résidu préserve la
  forme, donc même le drag d'ancre ultérieur reste cohérent ; à phase
  canonique pour les anciens harmoniques : pas de changement audible vu
  que la phase n'est pas audible isolément).
- Les **exports `.osa` v2** peuvent être réimportés (round-trip).
- Les **anciens `.osa` v1** doivent encore s'importer (avec migration
  silencieuse au passage).
- `build`, `typecheck`, `lint` verts. (Le typecheck est en mode
  incrémental : la phase M.0 avait posé les bases TS. Vérifier qu'aucun
  fichier passé à `strict` ne régresse.)
- **Pas de nouvelles UI** (barre du haut, slider cap dans la zone
  Harmoniques au lieu de `definition` slider, etc.). L'UI actuelle reste
  pixel-pour-pixel inchangée à part :
  - Disparition des dialogs de conversion (déclencheurs supprimés).
  - Disparition de toute icône/message 🔒.
  - Le slider `definition` (mode dessin) et le NumberInput `N` (mode
    barres) sont remplacés par **un seul** contrôle qui pilote `cap`
    (réutilise le composant le plus proche — préférer le slider, plus
    direct). **Ce contrôle vit là où il est aujourd'hui** ; son
    déplacement vers le header Harmoniques est M.r.2.
- **AHDSR (enveloppe) inchangée.** La spec §6 insiste : `cap` n'est pas
  dans la zone AHDSR. Vérifier que rien n'ait été câblé par erreur de ce
  côté.

## Hors scope M.r.1

- Réorganisation UI (barre du haut avec Nom + Presets dropdown + Reset +
  Normaliser + séparateur + Proportions/Auto). → M.r.2.
- Switch fluide entre lentilles avec auto-fit des ancres et synchronisation
  vivante de toutes les vues. → M.r.3.
- Courbe normalisée en arrière-plan dans la lentille Forme d'onde et
  bouton **Normaliser** fonctionnel + détection d'état + dialog
  edit-bars-requires-normalize. → M.r.4.
- Convention d'amplitude (auto-fit Y axis + marqueur pointillé ±1,
  transition douce). → M.r.5.
- Mise à jour de la documentation interne (`src/docs/` / writer). → M.5b.
- Migration des tests (s'il y en a qui passaient sur l'ancien shape) :
  les adapter au strict nécessaire pour qu'ils tournent — pas de
  réécriture profonde.

## Mise à jour CONTEXT.md (commit séparé)

En fin de phase, commit `docs: CONTEXT.md — Iteration M phase r.1
(modèle unifié + migration + hygiène canvas)`. Sections à toucher :

- **TL;DR** : ajouter une mention de l'iter-M rattrapage (pivot vers
  courbe canonique).
- **État actuel** :
  - Modèle de données : remplacer la description « union discriminée
    `Patch = DrawPatch | HarmonicPatch | SplinePatch` » par le nouveau
    shape (canonical + cap + anchors + interpolation + residual). Idem
    pour l'Editor.
  - Décisions architecturales : ajouter « courbe canonique unique, trois
    lentilles, pas de conversion destructive, hygiène canvas systématique ».
  - Contraintes implicites : ajouter « `cap` unifié remplace `definition`
    et `N` ; `currentLens` est volatile (non persisté) ; le résidu vit
    sur l'editor et sur le patch ».
- **Roadmap & Backlog** : cocher M.r.1, lister M.r.2 / M.r.3 / M.r.4 /
  M.r.5 / M.5b comme à venir.
- **Historique** : entrée « Iteration M rattrapage phase r.1 — modèle
  unifié + migration v1→v2 + hygiène canvas (2026-06-01) ».

## Workflow

- Commits linéaires sur `main`. **Ne push pas tout seul** : à chaque
  sous-commit prêt, signaler à l'utilisateur qui décide quand pousser.
- En cas de doute sur un détail (par exemple : faut-il préserver le
  résidu à l'import d'un ancien `.osa` v1 mode `draw` ? Réponse : oui,
  même règle qu'en localStorage), interroger plutôt que deviner.
- Si tu détectes une incohérence avec la spec ou un cas non couvert
  (ex. : un patch v1 sans `points` ni `amplitudes` valides), arrêter et
  remonter — la migration ne doit jamais silencieusement perdre un patch.
