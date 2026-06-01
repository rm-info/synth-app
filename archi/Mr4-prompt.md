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

- **Détection numérique d'état normalisé** : `isCanonicalNormalized(canonical, cap)`
  compare la canonical à sa propre normalisation (`harmonicsToPoints(canonicalToBars(canonical, cap), cap)`)
  via une **norme L∞ pondérée** ou simplement `max(|delta_i|)`, avec
  une tolérance `EPS`. Calibration empirique attendue : commencer à
  `EPS = 0.01` (1% en amplitude). À ajuster si trop strict (rare false
  negative après normalisation due au leakage FFT 600↔512) ou trop
  laxiste (un tracé libre passe pour normalisé). À tester en passe
  d'usage avec : (a) tracé libre quelconque → `false` attendu ;
  (b) post-Normaliser → `true` attendu ; (c) après drag de barre →
  `true` attendu (l'iDFT régénère la canonical à phase canonique).
- **Courbe normalisée en background** : un second tracé sur le **même
  canvas** que la canonical de la lentille Forme d'onde, dessiné
  **avant** la canonical, en gris discret (couleur dérivée de la
  couleur du tracé principal, alpha réduit, ou opacité CSS). Pas de
  canvas séparé. Recalculée à chaque render via
  `harmonicsToPoints(canonicalToBars(canonical, cap), cap)`. Coût :
  sub-ms (≈ `cap × 600` mults, déjà toléré ailleurs).
- **Quand est-ce que la courbe normalisée est visible ?** Toujours
  dans la lentille Forme d'onde, *tant que la canonical n'est pas
  normalisée*. Si elle l'est, la normalisée se confond avec la canonical
  → pas besoin de la dessiner (économie de bruit visuel). La détection
  utilise `isCanonicalNormalized` (même primitive que pour le bouton).
- **Dialog edit-bars-requires-normalize** : modale (`ConfirmDialog`
  existant) qui apparaît quand l'utilisateur essaie d'éditer une barre
  *alors que* `!isCanonicalNormalized`. Deux issues :
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
  `disabled={isCanonicalNormalized}`, style atténué via CSS
  (`:disabled` ou classe). Tooltip change : « Déjà normalisé »
  au lieu de l'explication. Le bouton reste sémantiquement présent
  (l'utilisateur sait qu'il existe et apprend ce qu'il signifie).

## Découpage en sous-commits

### Sous-commit M.r.4.1 — Détection d'état normalisé + désactivation Normaliser

`src/audio.js` ou `src/lib/` (à toi de juger l'emplacement le plus
cohérent — probablement `audio.js` à côté de `canonicalToBars`) :

```js
// M.r.4 : la canonical est dite « normalisée » quand elle coïncide
// (à `eps` près) avec sa reconstruction iDFT à phase canonique sur les
// `cap` premières harmoniques. C'est le critère qui dit si éditer une
// barre va « sauter » ou pas : si déjà normalisée, l'édition régénère
// quasi-identiquement la canonical avec juste la barre modifiée.
export function isCanonicalNormalized(canonical, cap, eps = 0.01) {
  const bars = canonicalToBars(canonical, cap)
  const reconstructed = harmonicsToPoints(bars, cap)
  let maxDelta = 0
  for (let i = 0; i < canonical.length; i++) {
    const d = Math.abs(canonical[i] - reconstructed[i])
    if (d > maxDelta) maxDelta = d
  }
  return maxDelta < eps
}
```

Câbler ce calcul **comme un `useMemo`** dans `WaveformEditor.jsx`
(dépendances `editor.canonical`, `editor.cap`) — il est lu par le
bouton Normaliser ET par la courbe normalisée (sous-commit suivant)
ET par le mousedown sur barre (sous-commit suivant). Évite trois
recalculs par render.

Côté UI : passer `disabled={isNormalized}` au bouton Normaliser dans
le header de la zone Forme d'onde (déplacé en M.r.2.6.8). Adapter le
tooltip dynamiquement : « Déjà normalisé » si désactivé, message
explicatif sinon. CSS : prévoir l'état `:disabled` cohérent avec le
reste des boutons icônes du Designer.

**Test de non-régression manuel** :
1. Patch neuf (canonical = 0) : `isCanonicalNormalized` → `true`
   (zéros + zéros = zéros). Bouton Normaliser désactivé.
2. Tracé libre quelconque : `isCanonicalNormalized` → `false`. Bouton
   actif.
3. Click Normaliser : la canonical se redessine, bouton repasse à
   désactivé.
4. Drag d'une barre depuis l'état normalisé : `isCanonicalNormalized`
   doit rester `true` (l'iDFT à phase canonique préserve l'invariance).
5. Charge preset (modale ou bouton rapide) : selon que le preset
   produit une canonical déjà à phase canonique ou non.
6. Calibration EPS : si le scénario 4 passe à `false` après quelques
   drags consécutifs (à cause du leakage FFT 600↔512 qui s'accumule),
   augmenter `EPS` jusqu'à ce que ça stabilise. Si le scénario 2 passe
   à `true` sur un tracé doux, diminuer.

Tag : `feat(iter-M/phase-r.4.1): détection isCanonicalNormalized + désactivation bouton Normaliser quand déjà normalisé`.

### Sous-commit M.r.4.2 — Courbe normalisée en background dans la lentille Forme d'onde

Dans le `useEffect` (ou layout effect) de rendu canvas de la zone Forme
d'onde, **avant** le tracé de la canonical :

- Si `isNormalized` → ne rien dessiner en background (la normalisée se
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
Ne s'affiche que quand `!isNormalized` (sinon pas de gris à
légender). Position : sous le toggle Spline, en petit gris (CSS
`opacity: 0.6` ou similaire). À adapter si le layout est trop chargé.

**Test manuel** :
1. Patch neuf : pas de courbe grise (canonical = normalisée = zéro,
   isNormalized = true).
2. Tracé libre : courbe grise apparaît, montre la version « phase
   canonique » du tracé. La différence est visible aux points où la
   phase compte (transitions raides, asymétries).
3. Click Normaliser : la canonical bondit pour coller à la grise, la
   grise disparaît (isNormalized devient true).
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

  if (!isNormalized) {
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
normalisée (donc `isNormalized` → `true`), la courbe grise disparaît,
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
- **Bug FFT 600↔512** : backlog accepté. Si le calibrage d'EPS révèle
  des cas borderline, les noter en commentaire mais ne pas refondre
  la chaîne FFT en M.r.4.
- **Overshoot Catmull-Rom sur transitions verticales** : backlog
  (M.r.3 follow-up).
- **Refonte presets sine/square/sawtooth/triangle** : backlog.

## Mise à jour CONTEXT.md (commit séparé)

En fin de phase, commit `docs: CONTEXT.md — Iteration M phase r.4
(normalisation explicite + courbe normalisée background + dialog
edit-bars)`. Sections à toucher :

- **TL;DR** : mention r.4 (normalisation explicite).
- **État actuel** :
  - Mention `isCanonicalNormalized` + son rôle pour les 3 chemins
    (bouton désactivé, courbe background, dialog edit-bars).
  - Décrire la courbe normalisée en background et la légende.
  - Décrire le dialog edit-bars-requires-normalize + le double
    dispatch normalize + setHarmonicAmplitude au confirme.
- **Décisions architecturales** :
  - « Phase canonique sinus pour toutes les harmoniques » comme
    convention de normalisation (la phase n'étant pas portée par les
    barres, c'est un choix de défaut).
  - `EPS` de détection (valeur retenue après calibrage).
- **Historique** : entrée r.4.

## Workflow

- Commits linéaires sur `main`. Ne push pas tout seul.
- Le sous-commit r.4.1 (détection) est le plus délicat : la
  calibration d'`EPS` ne peut être validée qu'empiriquement. Si tu
  hésites entre deux valeurs (`0.005` vs `0.01` vs `0.02`), commit
  avec une valeur de départ et mentionne dans le commit message les
  alternatives à valider en passe d'usage.
- Le double dispatch dans r.4.3 (normalize + setHarmonicAmplitude) est
  un choix UX. Si à l'usage tu trouves que l'expérience d'undo est
  étrange (deux Ctrl+Z pour revenir, ou Ctrl+Z une fois remet juste
  la normalisation et c'est confus), regroupe en une seule action
  atomique côté reducer. Décision à l'œil.
