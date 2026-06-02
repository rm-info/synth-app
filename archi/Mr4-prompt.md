# Prompt — Iteration M rattrapage, Phase M.r.4 : normalisation explicite (détection d'état + courbe normalisée background + dialog edit-bars)

> Spec de référence : `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md` (§§4.2, 4.3, 5.2).
> **Phase UX-sémantique.** Le bouton Normaliser existe et est
> fonctionnel depuis M.r.2.3, mais il est posé comme un outil opaque :
> rien ne dit à l'utilisateur quand il a un effet, quand il n'en a pas,
> et l'édition d'une barre harmonique écrase silencieusement la phase
> (régression assumée jusqu'à présent). M.r.4 ferme ces trois trous :
> détection d'état normalisé + désactivation visuelle, courbe normalisée
> en arrière-plan comme aperçu pédagogique, et dialog edit-bars-requires-
> normalize comme garde-fou avant l'écrasement de phase.

## Contexte

Spec §4.2 : la lentille Harmoniques affiche des magnitudes, mais une
magnitude isolée ne suffit pas à reconstruire un signal — il manque la
phase. La canonical peut porter n'importe quelle phase (issue d'un tracé
libre, d'un drag d'ancre, d'une normalisation antérieure modifiée
depuis). Éditer une barre en partant d'une canonical à phase
non-canonique force, à la reconstruction iDFT, à choisir une phase — et
le choix actuel est la phase canonique sinus pour toutes les
harmoniques. Conséquence : la canonical « saute » visuellement au
premier drag de barre. C'est la **régression de phase** documentée
depuis M.r.1.2.

M.r.4 explicite ce trade-off : avant d'éditer une barre, l'utilisateur
est invité à normaliser (ou à annuler). La courbe normalisée en
background montre ce qu'il aurait après normalisation, donc il sait à
quoi s'attendre.

## Décisions techniques actées avant le découpage

- **Détection d'état normalisé par flag d'état** (amendement 2026-06-02
  suite à investigation du dev). La première version du prompt
  prévoyait une détection numérique `isCanonicalNormalized(canonical, cap, eps)`
  reposant sur l'idempotence du round-trip `R(x) = harmonicsToPoints(canonicalToBars(x))`.
  Cette idempotence est **fausse** : le resample 600↔512 par interpolation
  linéaire réinjecte du leakage à chaque passe (mesuré : ~15 %/passe sur
  un créneau à `cap=256`, 4 normalisations nécessaires pour converger).
  Les deux classes (« vraiment normalisé » vs « tracé libre quasi-en-phase »)
  se chevauchent sur la métrique → impossible de séparer par un seuil.
  → **Nouvelle stratégie** : champ `editor.canonicalNormalized: boolean`
  comme état d'éditeur, mis à `true`/`false` par les actions selon
  qu'elles produisent un signal à phase canonique sinus pur. Déterministe,
  idempotent (1 click Normaliser → grisé), zéro fragilité FFT.
  Sémantiquement plus honnête : « normalisé » est une propriété de
  l'histoire de l'éditeur, pas une propriété intrinsèque du tableau
  `canonical`. Pas persisté dans le patch ni dans `.osa` (coût/bénéfice
  défavorable — un patch rechargé repart à `false`).

  **Effets par action** (tableau exhaustif) :

  | Action | `canonicalNormalized` |
  |---|---|
  | `NORMALIZE_EDITOR_CANONICAL` | → `true` |
  | `SET_EDITOR_HARMONIC_AMPLITUDE` | → `true` (iDFT phase canonique) |
  | `LOAD_PRESET` (modale, amplitudes définies) | → `true` |
  | `APPLY_EDITOR_PRESET('sine')` | → `true` (sin pur = phase canonique) |
  | `APPLY_EDITOR_PRESET('square'\|'sawtooth'\|'triangle')` | → `false` (formes stepped, phase non-canonique au sens DFT) |
  | `RESET_EDITOR_WAVEFORM` | → `true` (canonical = 0) |
  | `SET_EDITOR_CANONICAL` (tracé libre) | → `false` |
  | `MOVE_SPLINE_ANCHOR` / `ADD` / `REMOVE` | → `false` (`splinePlusResidual` ≠ iDFT canonique) |
  | `SET_SPLINE_INTERPOLATION` | → `false` |
  | `SET_EDITOR_CAP` | → `false` (cap change l'interprétation, conservative) |
  | `HYDRATE_EDITOR_FROM_PATCH` | → `false` |
  | `SET_EDITOR_ANCHOR_COUNT` / `SET_EDITOR_CURRENT_LENS` / `SET_EDITOR_AMPLITUDE` / `SET_EDITOR_ADSR` / autres | inchangé |

  **Valeur initiale** : `DEFAULT_EDITOR.canonicalNormalized = true`
  (canonical = `[0,…,0]` = iDFT(magnitudes nulles), trivialement
  normalisée).

- **Correction du commentaire faux dans `src/audio.js`** : les lignes
  ~176-181 (commentaire de `harmonicsToPoints`) affirment « son résultat,
  repassé dans `pointsToHarmonics` → `createPeriodicWave`, redonne
  exactement les mêmes magnitudes (k ≤ 256 tombe sur un bin FFT à
  NUM_SAMPLES = 512) ». C'est faux dès qu'il y a du contenu haute-
  fréquence (resample linéaire 600→512 → leakage). À corriger dans le
  même sous-commit r.4.1 : mentionner honnêtement le leakage et
  pointer vers l'entrée backlog « Mismatch de grille FFT 600 ↔ 512 ».
- **Courbe normalisée en background** : un second tracé sur le **même
  canvas** que la canonical de la lentille Forme d'onde, dessiné
  **avant** la canonical, en gris discret (couleur dérivée de la
  couleur du tracé principal, alpha réduit, ou opacité CSS). Pas de
  canvas séparé. Recalculée à chaque render via
  `harmonicsToPoints(canonicalToBars(canonical, cap), cap)`. Coût :
  sub-ms (≈ `cap × 600` mults, déjà toléré ailleurs).
- **Quand est-ce que la courbe normalisée est visible ?** Toujours
  dans la lentille Forme d'onde, *tant que `editor.canonicalNormalized`
  vaut `false`*. Quand elle vaut `true`, la normalisée se confond avec
  la canonical → pas besoin de la dessiner (économie de bruit visuel).
  Note : la courbe normalisée dessinée en background reste calculée par
  `harmonicsToPoints(canonicalToBars(canonical, cap), cap)` — son rendu
  n'a pas besoin d'être pixel-perfect (juste un aperçu), donc le
  leakage FFT y est tolérable.
- **Dialog edit-bars-requires-normalize** : modale (`ConfirmDialog`
  existant) qui apparaît quand l'utilisateur essaie d'éditer une barre
  *alors que* `!editor.canonicalNormalized`. Deux issues :
  - **Normaliser et continuer** : dispatch `NORMALIZE_EDITOR_CANONICAL`
    puis dispatch `SET_EDITOR_HARMONIC_AMPLITUDE` avec la valeur du
    mousedown originel. L'utilisateur fait son édition de barre comme
    prévu, sans répéter le geste.
  - **Annuler** : pas de dispatch. Le draft de barre n'est jamais
    initié. L'utilisateur reste dans son état précédent.
  Le dialog est **non-bloquant pour les sessions suivantes** : tant que
  la canonical reste normalisée (édition de barre successives, click
  Normaliser, etc.), aucun dialog. Dès qu'un événement non-spline
  remet la canonical en phase non-canonique (tracé libre, chargement
  de preset, etc.), le dialog réapparaîtra au prochain drag de barre.
- **Bouton Normaliser désactivé visuellement quand déjà normalisé** :
  `disabled={editor.canonicalNormalized}`, style atténué via CSS
  (`:disabled` ou classe). Tooltip change : « Déjà normalisé »
  au lieu de l'explication. Le bouton reste sémantiquement présent
  (l'utilisateur sait qu'il existe et apprend ce qu'il signifie).

## Découpage en sous-commits

### Sous-commit M.r.4.1 — Flag d'état `canonicalNormalized` + désactivation Normaliser + correction commentaire audio.js

**Côté type / état :**

- `src/types.ts` : ajouter `canonicalNormalized: boolean` à l'interface
  `Editor`. Pas de modification de `Patch` ni de `PatchData` (le flag
  n'est pas persisté — décision archi).
- `src/reducer.js` : `DEFAULT_EDITOR.canonicalNormalized = true`
  (canonical par défaut = zéros = iDFT(magnitudes nulles), trivialement
  normalisée).

**Côté reducer** — chaque action concernée propage explicitement le flag
selon le tableau en tête du prompt. Suggestion d'implémentation :

- Pour les actions qui mettent `true` : ajouter `canonicalNormalized: true`
  au spread de l'editor (`{ ...state.editor, canonical, residual,
  canonicalNormalized: true, ... }`).
- Pour les actions qui mettent `false` : idem avec `false`.
- Pour celles qui ne touchent pas (`SET_EDITOR_ANCHOR_COUNT`,
  `SET_EDITOR_CURRENT_LENS`, `SET_EDITOR_AMPLITUDE`, `SET_EDITOR_ADSR`,
  `SET_EDITOR_ADSR_AND_AMP`, etc.) : aucune mention (le spread `...state.editor`
  préserve la valeur courante).

**Cas spécial `APPLY_EDITOR_PRESET`** : la valeur dépend du sous-preset.
Concrètement :
```js
case 'APPLY_EDITOR_PRESET': {
  const { preset, points } = action.payload
  const canonical = points
  const canonicalNormalized = preset === 'sine'
  // ... (reste de la logique inchangée, y compris refitAnchorsAndResidual)
  return { ...state, editor: {
    ...state.editor, canonical, anchors, residual, preset,
    canonicalNormalized,
  } }
}
```

**Côté UI** : passer `disabled={!editor.canonicalNormalized ? false : true}`
(ou plus clairement `disabled={editor.canonicalNormalized}`) au bouton
Normaliser dans le header de la zone Forme d'onde (déplacé en M.r.2.6.8).
Adapter le tooltip dynamiquement : « Déjà normalisé » si désactivé,
message explicatif sinon. CSS : prévoir l'état `:disabled` cohérent
avec le reste des boutons icônes du Designer (la classe `.icon-btn`
existante a-t-elle déjà un style `:disabled` ? Si non, l'ajouter).

**Correction du commentaire faux dans `src/audio.js`** : remplacer les
lignes ~176-181 du commentaire de `harmonicsToPoints` qui affirment
faussement « redonne exactement les mêmes magnitudes ». Texte suggéré :
« Note : le round-trip `harmonicsToPoints → pointsToHarmonics` n'est
**pas** idempotent à haut `cap` sur des signaux riches en hautes
harmoniques. Le resample 600→512 par interpolation linéaire (cf.
ligne 111) réinjecte du leakage spectral à chaque passe (mesuré
~15 %/passe sur un créneau à `cap=256`). Conséquence : la détection
"canonical normalisée" repose sur un flag d'état dans l'editor
(`editor.canonicalNormalized`), pas sur une comparaison numérique
de round-trip. Voir entrée backlog "Mismatch de grille FFT 600 ↔ 512". »

**Test de non-régression manuel** :
1. Patch neuf (canonical = 0, flag init à `true`) : bouton Normaliser
   désactivé, tooltip « Déjà normalisé ».
2. Tracé libre quelconque → flag passe à `false`. Bouton actif.
3. Click Normaliser → flag remis à `true`. Bouton redésactivé en un
   seul click (≠ la version numérique qui demandait 3-4 clicks).
4. Drag d'une barre depuis l'état normalisé → flag reste à `true`
   (l'iDFT régénère la canonical à phase canonique sinus, et l'action
   met explicitement `true`).
5. Drag d'une barre depuis l'état non-normalisé → flag passe à `true`
   (après dialog — voir r.4.3 — l'action de normalisation + édition
   produit une canonical normalisée).
6. Charge preset modale (LOAD_PRESET) → flag à `true`.
7. APPLY_EDITOR_PRESET('sine') → `true`. APPLY_EDITOR_PRESET('square'|
   'sawtooth'|'triangle') → `false`.
8. Drag d'ancre, changement d'interpolation, changement de cap → `false`.
9. Hydratation d'un patch sauvegardé → `false` (l'utilisateur cliquera
   Normaliser explicitement avant d'éditer une barre si besoin).

Tag : `feat(iter-M/phase-r.4.1): flag editor.canonicalNormalized + désactivation bouton Normaliser quand normalisé + correction commentaire audio.js`.

### Sous-commit M.r.4.2 — Courbe normalisée en background dans la lentille Forme d'onde

Dans le `useEffect` (ou layout effect) de rendu canvas de la zone Forme
d'onde, **avant** le tracé de la canonical :

- Si `editor.canonicalNormalized` → ne rien dessiner en background (la normalisée se
  confond avec la canonical, ce serait du bruit visuel).
- Sinon → calculer
  `normalized = harmonicsToPoints(canonicalToBars(canonical, cap), cap)`
  et le dessiner en gris discret. Suggestion couleur : reprendre la
  couleur du tracé principal (`patch.color` ou la couleur d'accent du
  thème), passer en grayscale, alpha 0.35-0.5. À ajuster visuellement.
- Stroke fin (1px), pas de fill.
- Toujours respecter `withSavedCtx` (hygiène canvas M.r.1.5).

Petite légende discrète dans le header de la zone Forme d'onde
(spec §5.2) : « bleu = forme actuelle, gris = forme si normalisée ».
Ne s'affiche que quand `!editor.canonicalNormalized` (sinon pas de gris à
légender). Position : sous le toggle Spline, en petit gris (CSS
`opacity: 0.6` ou similaire). À adapter si le layout est trop chargé.

**Test manuel** :
1. Patch neuf : pas de courbe grise (canonical = normalisée = zéro,
   editor.canonicalNormalized = true).
2. Tracé libre : courbe grise apparaît, montre la version « phase
   canonique » du tracé. La différence est visible aux points où la
   phase compte (transitions raides, asymétries).
3. Click Normaliser : la canonical bondit pour coller à la grise, la
   grise disparaît (editor.canonicalNormalized devient true).
4. Drag d'ancre depuis état normalisé : la canonical se remet à
   diverger de la normalisée → la grise réapparaît (l'utilisateur
   voit que son geste a remis le tracé en phase non-canonique).

Tag : `feat(iter-M/phase-r.4.2): courbe normalisée en background gris dans la lentille Forme d'onde + légende discrète`.

### Sous-commit M.r.4.3 — Dialog edit-bars-requires-normalize

Côté `WaveformEditor.jsx`, dans `handleHarmonicMouseDown` :

```
const handleHarmonicMouseDown = (e) => {
  if (autoSizing && autoSizeFocusGuardRef?.current) return
  const index = harmonicIndexFromEvent(e, amplitudes.length)
  const value = harmonicAmplitudeFromEvent(e)

  if (!editor.canonicalNormalized) {
    // Dialog interceptif : on n'initie pas le draft tant que la
    // décision n'est pas prise. Au confirme, on enchaîne normalize
    // + édition de la barre cliquée (sans re-clic utilisateur).
    openConfirm({
      title: 'Normaliser le tracé ?',
      message: 'Pour modifier une harmonique, le tracé doit être normalisé. La phase sera abandonnée, la forme reconstruite à partir des magnitudes.',
      confirmLabel: 'Normaliser et continuer',
      cancelLabel: 'Annuler',
      onConfirm: () => {
        editorActions.normalize()
        editorActions.setHarmonicAmplitude(index, value)
      },
    })
    return
  }

  // Chemin normal (déjà normalisé) : draft + drag classique.
  dragBarRef.current = index
  dragBarInitialRef.current = amplitudes[index]
  const next = Array.from(draftAmplitudes ?? amplitudes)
  next[index] = value
  setDraftAmplitudes(next)
}
```

**Subtilité importante** : au confirme du dialog, on dispatch
`normalize()` puis `setHarmonicAmplitude(index, value)` — deux actions
distinctes. Cela crée **deux crans d'undo** consécutifs (annuler une
fois revient à l'état normalisé pré-édition de barre ; annuler deux
fois revient à l'état non-normalisé d'origine). À toi de juger si
c'est OK ou si tu préfères regrouper en une seule action atomique
côté reducer (par ex. `NORMALIZE_AND_EDIT_BAR { index, value }`). Mon
avis : laisser les deux dispatchs séparés — c'est lisible
sémantiquement et l'utilisateur peut « réannuler la normalisation »
si elle est venue d'un geste qu'il n'a pas voulu commettre. Mais si
ça crée une UX étrange en test, on regroupe.

Au cancel du dialog : rien ne se passe. Pas de draft initié, pas
d'état modifié. L'utilisateur peut continuer son édition normalement
(par exemple aller faire un drag d'ancre, ou cliquer Normaliser
manuellement avant de retourner sur la barre).

**Comportement après le dialog confirme** : la canonical devient
normalisée (donc `editor.canonicalNormalized` → `true`), la courbe grise disparaît,
le bouton Normaliser passe à désactivé. Une session ultérieure de
drags de barres ne déclenchera plus le dialog (tant qu'aucune action
non-spline n'a remis la canonical en phase non-canonique).

**Test manuel** :
1. Tracé libre (non-normalisé) → click sur une barre → dialog
   apparaît. Annuler : rien ne change. Confirmer : la canonical
   devient normalisée et la barre cliquée prend la valeur du clic
   (= un seul geste utilisateur, sans re-clic).
2. Suite d'éditions de barres après confirm initial : pas de dialog
   à chaque fois (la canonical reste normalisée).
3. Tracer librement à nouveau après plusieurs édits de barres : la
   canonical redevient non-normalisée, prochain drag de barre →
   dialog à nouveau.
4. Drag d'ancre depuis état normalisé : la canonical redevient
   non-normalisée (drag d'ancre = `splinePlusResidual`, qui n'est
   pas un iDFT à phase canonique). Prochain drag de barre → dialog.

Tag : `feat(iter-M/phase-r.4.3): dialog edit-bars-requires-normalize avant édition d'une barre sur canonical non-normalisée`.

## Comportement attendu en fin de phase

- **Régression de phase domptée** : l'utilisateur ne subit plus
  silencieusement le « saut » de la canonical au premier drag de barre.
  Il est prévenu, voit l'aperçu en background, choisit en connaissance
  de cause.
- **Bouton Normaliser pédagogique** : l'utilisateur apprend par
  l'usage que ce bouton est « actif quand il y a quelque chose à
  normaliser, désactivé sinon ». Il comprend implicitement le concept
  d'état « normalisé » sans qu'on doive le lui expliquer en mots.
- **Courbe grise en background** : élément didactique fort de la
  lentille Forme d'onde. La doc M.5b pourra capitaliser dessus pour
  expliquer la DFT.
- Build / typecheck / lint verts.

## Hors scope M.r.4

- **Auto-fit Y axis + marqueur ±1** dans la zone Forme d'onde : M.r.5.
- **Repères pointillés / axes labellisés** zone Harmoniques : M.r.5.
- **Bug FFT 600↔512** : backlog accepté. La détection numérique de
  normalisation aurait été son premier symptôme bloquant, mais le
  passage au flag d'état (amendement 2026-06-02) la contourne. La
  refonte de `pointsToHarmonics` reste hors scope.
- **Overshoot Catmull-Rom sur transitions verticales** : backlog
  (M.r.3 follow-up).
- **Refonte presets sine/square/sawtooth/triangle** : backlog.

## Mise à jour CONTEXT.md (commit séparé)

En fin de phase, commit `docs: CONTEXT.md — Iteration M phase r.4
(normalisation explicite + courbe normalisée background + dialog
edit-bars)`. Sections à toucher :

- **TL;DR** : mention r.4 (normalisation explicite).
- **État actuel** :
  - Mention du champ `editor.canonicalNormalized: boolean` + son rôle
    pour les 3 chemins (bouton désactivé, courbe background, dialog
    edit-bars). Tableau des actions qui le mettent à `true`/`false`/
    inchangé.
  - Décrire la courbe normalisée en background et la légende.
  - Décrire le dialog edit-bars-requires-normalize + le double
    dispatch normalize + setHarmonicAmplitude au confirme.
- **Décisions architecturales** :
  - « Phase canonique sinus pour toutes les harmoniques » comme
    convention de normalisation (la phase n'étant pas portée par les
    barres, c'est un choix de défaut).
  - **Détection « normalisée » par flag d'état, pas par comparaison
    numérique** : amendement 2026-06-02 suite à mesure du round-trip
    non idempotent. Voir entrée historique r.4 pour le diagnostic
    complet.
  - **Commentaire corrigé** dans `audio.js` (lignes ~176-181) : le
    round-trip `harmonicsToPoints → pointsToHarmonics` n'est PAS exact
    sur signaux riches en hautes harmoniques (resample 600→512
    linéaire = leakage).
- **Historique** : entrée r.4.

## Workflow

- Commits linéaires sur `main`. Ne push pas tout seul.
- Le sous-commit r.4.1 demande de propager `canonicalNormalized` à
  travers toutes les actions concernées du reducer. Vérifie
  exhaustivement le tableau du prompt avant commit — un oubli sur une
  action mineure (par exemple `APPLY_EDITOR_PRESET('triangle')`) ne
  sera pas attrapé par typecheck/lint.
- Le double dispatch dans r.4.3 (normalize + setHarmonicAmplitude) est
  un choix UX. Si à l'usage tu trouves que l'expérience d'undo est
  étrange (deux Ctrl+Z pour revenir, ou Ctrl+Z une fois remet juste
  la normalisation et c'est confus), regroupe en une seule action
  atomique côté reducer. Décision à l'œil.
