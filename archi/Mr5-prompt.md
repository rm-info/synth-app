# Prompt — Iteration M rattrapage, Phase M.r.5 : convention d'amplitude + cosmétique zone Harmoniques

> Spec de référence : `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md` (§§5.3, 7).
> **Dernière phase de code du rattrapage** avant la passe doc M.5b.
> Deux sujets indépendants regroupés ici parce qu'ils sont chacun
> léger : la convention d'amplitude de la zone Forme d'onde
> (auto-fit Y + marqueur ±1) et la cosmétique de la zone Harmoniques
> (couleur des barres selon état normalisé + repères horizontaux +
> axes labellisés).

## Contexte

**Zone Forme d'onde — problème d'amplitude.** La canonical peut
dépasser ±1 : `Σ amplitudes_k · sin(...)` culmine, en cas accumulatif,
à `Σ |amplitudes_k|`. Avec 4 harmoniques à 1.0, pic possible = 4.
Le navigateur auto-normalise `PeriodicWave` à pic 1.0 (l'audio reste
correct), mais le canvas actuel échantillonne fixe en `[-1, +1]` →
visuel écrêté sans indication, l'utilisateur ne voit pas qu'il y a
quelque chose au-delà.

Spec §7 (convention adoptée, option 1) :
- L'axe Y s'**auto-fit** pour que toute la courbe rentre.
- Un **trait pointillé fin** marque le **niveau ±1 = niveau audio
  référence**. L'utilisateur voit que la forme va « au-dessus du bord
  audio » et comprend que le moteur normalisera.
- Le bouton Normaliser ne touche **pas** ce niveau (il concerne la
  phase, pas l'amplitude).
- Garde-fou anti-jumpy : **transition douce** du zoom Y quand le pic
  change brutalement.

**Zone Harmoniques — cosmétique manquante.** Spec §5.3 demande :
- Barres en bleu si état normalisé, en gris si non normalisé
  (signal pédagogique : « tu ne peux pas éditer directement sans que
  le tracé saute »).
- Repères pointillés horizontaux : graduations d'amplitude relative.
- Axes labellisés : X en `kf` (cohérent avec la convention math du
  projet — `f` fondamentale, `k` multiplicateur entier), Y en 0/0.5/1.

Ces deux derniers étaient à laisser à M.r.5 selon le découpage initial.

## Décisions techniques actées avant le découpage

- **Auto-fit Y : minimum visible = ±1.** Le pic affiché est
  `max(max(|canonical|), max(|normalizedBg|), 1)`. Le minimum à 1
  garantit que le marqueur ±1 reste visible même pour une canonical
  qui n'atteint pas ±1 (ex. silence, ou petites amplitudes). Sinon le
  marqueur serait écrasé au bord du canvas, illisible.
- **Marqueur ±1 : deux lignes pointillées symétriques** (au +1 et au
  -1). Stroke fin, couleur atténuée (gris ou couleur d'accent à
  opacité réduite). Inclure `setLineDash([4, 4])` ou similaire.
  Toujours respecter `withSavedCtx` (hygiène canvas M.r.1.5).
- **Transition douce du zoom Y** : un `peakDisplayedRef` mis à jour
  via `requestAnimationFrame`, qui lerp vers la cible. Coefficient
  d'amortissement à calibrer (suggéré : `peakDisplayed += (target -
  peakDisplayed) * 0.15` par frame → convergence en ~10 frames =
  ~150 ms à 60 fps). Pas de CSS transition — le rendu canvas se fait
  au pixel, donc le lerp doit être dans la boucle de redraw.
- **Couleur des barres selon `editor.canonicalNormalized`** : bleu
  (couleur d'accent existante) si `true`, gris (atténué) si `false`.
  Pendant le drag de barre — qui *fait* passer à `true` via le dialog
  + NORMALIZE — les barres passent au bleu dès le commit de la
  normalisation. Cohérent avec le reste de l'UX M.r.4.
- **Repères horizontaux dans la zone Harmoniques** : 3 graduations
  (à `y=0`, `y=0.5`, `y=1`) en pointillés discrets, avec étiquettes
  textuelles à gauche (« 0 », « 0.5 », « 1 »). La spec §5.3 mentionne
  aussi 25/50/75/100 % comme exemple mais l'étiquetage 0/0.5/1 est
  plus mathématique et cohérent avec la convention amplitude véritable.
  3 graduations suffisent, plus serait chargé.
- **Étiquettes X (`kf`) : puissances de 2 jusqu'à `cap`**, plus
  systématiquement la première (`1f`). Concrètement, ensemble des
  étiquettes = `{1, 2, 4, 8, 16, 32, 64, 128, 256}` filtré à `≤ cap`,
  affiché comme `1f`, `2f`, `4f`, etc. Si `cap < 8`, on étiquette
  toutes les harmoniques (pas saturé à ce niveau). Si `cap ≥ 8`,
  on filtre aux puissances de 2.
- **Style des étiquettes** : petites (10-11 px), couleur atténuée
  (gris moyen), positionnées sous la dernière ligne du canvas
  Harmoniques pour X, à gauche du canvas pour Y. Si besoin, prévoir
  un padding-bottom / padding-left dans le `.we-harmonics-bars` pour
  laisser de la place.

## Découpage en sous-commits

### Sous-commit M.r.5.1 — Auto-fit Y axis + marqueur ±1 (zone Forme d'onde)

Modifier `drawCanvas` dans `WaveformEditor.jsx` :

1. **Calcul du pic** :
   ```
   const peakFromCanonical = points.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
   const peakFromNormalizedBg = normalizedBg
     ? normalizedBg.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
     : 0
   const peakTarget = Math.max(peakFromCanonical, peakFromNormalizedBg, 1)
   ```
   `peakTarget` est l'amplitude maximum à afficher. Au minimum 1 (pour
   garder le marqueur ±1 visible).

2. **Transition douce** : nouveau `peakDisplayedRef` (ref). À chaque
   render, comparer `peakTarget` au `peakDisplayedRef.current` ; si
   différence significative (> 0.01 par exemple), lancer une boucle
   rAF qui lerp `peakDisplayedRef.current += (peakTarget − peakDisplayedRef.current) × 0.15`
   et redessine, jusqu'à convergence (delta < 0.01). Annuler la rAF
   précédente si une nouvelle cible arrive.

3. **Échelle Y** : remplacer le mapping `y ∈ [-1, +1]` → `y_canvas ∈
   [canvasHeight, 0]` par `y ∈ [-peakDisplayed, +peakDisplayed]` →
   `y_canvas ∈ [canvasHeight, 0]`. Concrètement, dans toutes les
   conversions `valueToY` / `yToValue` du canvas Forme d'onde.

4. **Marqueur ±1** : après le tracé de la canonical (et du
   normalizedBg), dessiner deux lignes pointillées horizontales aux
   `y_canvas` correspondants à `y=+1` et `y=-1` (via la même échelle).
   Style : `setLineDash([4, 4])`, stroke fin (1 px), couleur atténuée
   (suggéré : `currentColor` à opacité ~0.35, ou la couleur d'accent
   du thème en gris ~0.5).

5. **Aucun changement** sur les autres rendus (poignées d'ancres,
   normalizedBg, etc.) — ils utilisent déjà `valueToY`, donc ils
   passent automatiquement à la nouvelle échelle.

**Subtilité du tracé libre** : actuellement, l'utilisateur dessine en
maintenant la souris dans le canvas. Le mapping `yToValue` interprète
sa position selon l'échelle. Avec auto-fit, si `peakDisplayed = 3`,
l'utilisateur peut dessiner jusqu'à `y = ±3` (sortir de l'audio range
mais visible). Faut-il **clamper la souris à ±1** au tracé libre, ou
laisser l'utilisateur dessiner librement dans l'espace canvas étendu ?
**Mon avis : ne pas clamper** — l'utilisateur a un marqueur ±1, il
sait où est le niveau audio. Le clip silencieux (signal au-delà de
±1) sera audible si la canonical reste hors borne (PeriodicWave
normalise). C'est cohérent avec « la canonical = vérité audio
éditée », sans aucun clamp dans `SET_EDITOR_CANONICAL` (ce qui est
le cas aujourd'hui). À discuter en revue si ça paraît contre-intuitif
en passe d'usage.

**Test manuel** :
1. Patch neuf (canonical = 0) : `peakDisplayed = 1`, le canvas affiche
   `[-1, +1]`, marqueur ±1 visible aux bords.
2. Tracé libre atteignant ±1 exactement : pas de changement d'échelle.
3. Charger preset rapide « Carré » (qui peut dépasser ±1 à cause des
   discontinuités) : auto-fit dilate l'échelle, marqueur ±1 visible
   à l'intérieur.
4. Click Normaliser sur un tracé qui dépasse ±1 : pas de changement
   d'amplitude (la normalisation concerne la phase). Auto-fit reste
   identique.
5. Dessiner une sin pure, puis ajouter mentalement une autre
   harmonique (clic sur barre k=3) : si la somme dépasse ±1, l'auto-fit
   s'adapte avec une transition fluide (~150 ms), pas de saut brutal.
6. Reset (silence) : retour à `peakDisplayed = 1` avec transition.

Tag : `feat(iter-M/phase-r.5.1): auto-fit Y axis + marqueur ±1 avec transition douce (zone Forme d'onde)`.

### Sous-commit M.r.5.2 — Couleur barres + repères horizontaux + axes labellisés (zone Harmoniques)

**Couleur des barres** dans le rendu de `.we-harmonics-bars` :

- Si `editor.canonicalNormalized === true` : barres en couleur
  d'accent du thème (la couleur actuelle, probablement bleu).
- Sinon : barres en gris atténué. Suggestion : `currentColor` à
  opacité ~0.45, ou une variable CSS dédiée
  (`--bar-color-unnormalized`).
- L'état est calculé dans WaveformEditor (déjà disponible via
  `editor.canonicalNormalized`). Passer une prop ou une classe au
  composant de barres si extrait, sinon condition inline.
- **Cohérence avec le dialog edit-bars (M.r.4.3)** : visuellement, le
  gris dit « si tu cliques, dialog ». Le bleu dit « tu peux éditer
  directement ». Pas besoin de tooltip supplémentaire — le dialog
  arrive de toute façon si l'utilisateur clique dans l'état gris.

**Repères horizontaux** : trois lignes horizontales pointillées dans
le rendu de la zone Harmoniques, aux niveaux d'amplitude `y=0`
(base), `y=0.5` (milieu) et `y=1` (sommet). Style : `setLineDash([3,
3])`, stroke fin (1 px), couleur atténuée (suggéré : `currentColor`
à opacité ~0.2). Dessiner **avant** les barres pour qu'elles passent
par-dessus.

**Axes labellisés** :

- **Y (à gauche du canvas)** : trois étiquettes textuelles « 0 », « 0.5 »,
  « 1 » alignées sur les trois graduations. Petite taille (10-11 px),
  couleur atténuée. Padding-left si nécessaire pour réserver la place.
- **X (sous le canvas)** : étiquettes `1f`, `2f`, `4f`, etc. Logique :
  ```
  const candidates = [1, 2, 4, 8, 16, 32, 64, 128, 256]
  const xLabels = cap < 8
    ? Array.from({length: cap}, (_, i) => i + 1)   // toutes
    : candidates.filter(k => k <= cap)             // puissances de 2
  ```
  Chaque étiquette positionnée au centre x de la barre `k`. Format :
  `${k}f` (sans espace, comme dans la convention math du projet).

Si les étiquettes ne tiennent pas (cas extrême `cap` très bas avec
canvas étroit), faire confiance au flex/CSS pour gérer l'overflow —
ne pas tenter d'algorithme de placement complexe.

**Test manuel** :
1. Patch neuf : canvas Harmoniques avec 256 barres invisibles
   (canonical = 0 → toutes magnitudes = 0). Repères horizontaux
   visibles, étiquettes Y visibles, étiquettes X `1f, 2f, 4f, …, 256f`
   visibles.
2. Tracer librement : barres apparaissent **en gris** (non normalisé).
3. Click Normaliser : barres passent au **bleu**.
4. Drag d'une barre : restent **bleues** (la canonical reste normalisée
   après l'iDFT).
5. Cap = 4 : axes étiquetés `1f`, `2f`, `3f`, `4f` (toutes les
   harmoniques, vu que `cap < 8`).
6. Cap = 32 : axes étiquetés `1f`, `2f`, `4f`, `8f`, `16f`, `32f`
   (puissances de 2).
7. Charger preset « Carré » : barres en gris (preset géométrique →
   `canonicalNormalized = false`).
8. Dialog edit-bars puis confirme : barres passent au bleu.

Tag : `feat(iter-M/phase-r.5.2): zone Harmoniques — couleur barres selon état normalisé + repères horizontaux + axes labellisés (kf, 0/0.5/1)`.

## Comportement attendu en fin de phase

- **Zone Forme d'onde rend compte de l'amplitude totale** : on voit ce
  que la canonical fait, jusqu'à son pic. Le marqueur ±1 dit
  visuellement où s'arrête le niveau audio référence. Transition
  douce, pas de saut visuel désagréable.
- **Zone Harmoniques pédagogique** : barres bleues quand on peut
  éditer directement, grises quand le dialog va apparaître. Repères
  et axes donnent les références numériques sans saturer.
- **La doctrine du résidu et du modèle unifié** reste intacte —
  aucune modification du reducer en M.r.5. Pure cosmétique de rendu.
- Build / typecheck / lint verts.

## Hors scope M.r.5

- **Migration TS strict opt-in `reducer.js`** : backlog.
- **Refonte presets sine/square/sawtooth/triangle en séries de Fourier
  bande-limitées** : backlog.
- **Bug FFT 600↔512** : backlog.
- **Overshoot Catmull-Rom sur transitions verticales** : backlog.
- **Doc M.5b** (passe writer sur le modèle stabilisé) : phase
  suivante, pas implémenteur.

## Mise à jour CONTEXT.md (commit séparé)

En fin de phase, commit `docs: CONTEXT.md — Iteration M phase r.5
(auto-fit Y + marqueur ±1 + cosmétique zone Harmoniques)`. Sections à
toucher :

- **TL;DR** : mention r.5 (dernier chantier de code du rattrapage).
- **État actuel** :
  - Canvas Forme d'onde : auto-fit Y, marqueur ±1, transition douce.
  - Canvas Harmoniques : code couleur barres (bleu/gris) selon
    `editor.canonicalNormalized`, repères horizontaux, étiquettes X
    (`kf`) et Y (0/0.5/1).
- **Décisions architecturales** :
  - Pic minimum affiché = 1 (pour garder le marqueur visible même au
    silence).
  - Tracé libre **non clampé** à ±1 — l'utilisateur peut dessiner
    au-delà de l'audio range visuellement, le marqueur ±1 sert de
    référence (le navigateur normalise audio).
  - Étiquettes X : puissances de 2 si `cap ≥ 8`, sinon toutes
    (1..cap).
- **Roadmap & Backlog** : cocher M.r.5. Le rattrapage M.r.* est
  **clos**. Reste : M.5b (doc writer).
- **Historique** : entrée r.5. Peut être suivie d'une note de clôture
  du rattrapage (option, si on veut acter la fin de phase).

## Workflow

- Commits linéaires sur `main`. Ne push pas tout seul.
- Sur la calibration du coefficient de lerp (0.15 suggéré), faire
  confiance à l'œil. Si ça paraît mou (transition trop longue),
  monter à 0.25. Si ça saccade encore (transition trop rapide,
  saute visiblement), descendre à 0.1.
- Sur le clamping ou non du tracé libre à ±1 (décision archi :
  non-clamper), si la passe d'usage suggère le contraire, remonter
  plutôt que de bricoler.
- Sur l'étiquetage X, ne pas chercher la perfection d'espacement.
  Un overflow occasionnel sur cap dégénéré (= 1 ou 2) est
  acceptable.

## Note de clôture du rattrapage

M.r.5 ferme le code du rattrapage Iteration M. Les 5 phases ont
livré :

| Phase | Apport |
|---|---|
| r.1 | Modèle unifié (canonical + cap + anchors + residual), drop union discriminée, migration v1→v2 |
| r.2 (+ .5 + .6) | UI réorganisée (barre du haut, cap unique, switch Libre/Ancres, icônes Lucide) |
| r.3 | Lentilles vivantes (re-fit auto des ancres) |
| r.4 | Normalisation explicite (flag d'état, dialog edit-bars, courbe gris background) |
| r.5 | Convention d'amplitude (auto-fit Y, marqueur ±1) + cosmétique zone Harmoniques (barres, repères, axes) |

Reste après r.5 : **M.5b — doc writer**. Phase d'écriture sur le
modèle stabilisé, à confier au rôle writer (pas dev). L'archi
préparera le handoff/prompt writer séparément.
