# Prompt — Iteration M, Phase M.3 : mode points/spline

> Spec de référence : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` (§4, §5, §10).
> Phase **« fun » 2D** : un éditeur de **points d'ancrage + courbe interpolée**,
> dans la lignée du précédent **éditeur ADSR à poignées**. Propre par
> construction (les courbes lisses portent peu d'harmoniques hautes).

## Contexte

Troisième et dernier mode de fabrication de timbre coexistant. Sa promesse :
**dessiner en 2D, contrôlé**. On pose 4–32 ancres ; le moteur trace la courbe
en interpolant soit **doux (Catmull-Rom périodique)**, soit **anguleux
(polyligne périodique)**. Le résultat est par essence band-limité — pas de
jitter de main, pas de bouillie d'harmoniques.

Architecturalement, ça réutilise le pattern d'interaction de l'éditeur ADSR
(poignées draggables, courbe recalculée à chaque drag) — *pas* une moonshot.

Comme pour `harmonic` (M.2 SC1), on garde le principe **« une vérité éditable
+ un dérivé `points` »** : la chaîne audio (playback, WAV export, miniatures,
spectro statique) **ne sera pas touchée**.

## Découpage en sous-commits

### Sous-commit 3.1 — `SplinePatch` + math de la courbe

- `src/types.ts` : étendre `Patch` avec un troisième variant **`SplinePatch`**,
  discriminé par `mode: 'spline'` :
  - `anchors: { x: number, y: number }[]` (longueur 4..32). `x ∈ [0..600)`,
    `y ∈ [-1..1]` (ou la convention canvas existante).
  - `interpolation: 'soft' | 'hard'`.
  - `points: number[]` (600, dérivé — **ombre** comme pour `harmonic`).
  - + champs partagés (amplitude, ADSR). **Pas de `definition`** (la courbe
    est propre par construction, cf. spec §6).
- Math de la courbe (nouveau module, ex. `src/lib/spline.js`), **deux
  variantes périodiques** :
  - `splineSoft(anchors)` : **Catmull-Rom périodique**. Aux bornes, les
    voisins wrappent : pour le segment `anchor[N-1] → anchor[0]`, le « prev »
    est `anchor[N-2]` et le « next » est `anchor[1]`, avec leurs x décalés de
    ±600 pour rester monotone dans l'interp.
  - `splineHard(anchors)` : **polyligne périodique** (segments droits, le
    dernier `anchor[N-1] → anchor[0]` ferme la boucle).
  - Sortie commune : `Float32Array(600)` d'amplitudes.
- Actions reducer (toutes undoable) :
  - `MOVE_SPLINE_ANCHOR(index, x, y)` — drag continu (debounce undo si
    nécessaire, comme les drafts ADSR existants).
  - `ADD_SPLINE_ANCHOR(x, y)` — insère en maintenant l'ordre cyclique des x.
  - `REMOVE_SPLINE_ANCHOR(index)` — refusé si N == 4 (minimum).
  - `SET_SPLINE_INTERPOLATION('soft' | 'hard')`.
- Hydratation rétro-compat : aucun patch existant n'a `mode: 'spline'`, rien
  à migrer.
- Tag : `refactor(iter-M/phase-3.1): SplinePatch + math Catmull-Rom/polyligne périodique`.

### Sous-commit 3.2 — Éditeur spline + couplage mode

- Le composant qui rend la colonne **Forme d'onde** devient un dispatcher
  complet par mode (s'il ne l'est pas déjà depuis M.2) :
  - `draw` : canvas freehand (existant).
  - `harmonic` : reconstruction iDFT read-only (M.2).
  - **`spline`** : éditeur spline (nouveau).
- L'éditeur spline rend :
  - la **courbe** (`points`, calculée via 3.1) ;
  - les **poignées d'ancres** par-dessus — cercles draggables, **réutiliser
    le composant ou le pattern visuel des poignées ADSR** existantes (style
    aligné, taille, hover/active, accessibilité).
- **Interactions** :
  - **Drag d'une poignée** → `MOVE_SPLINE_ANCHOR` en continu. Y libre dans
    [-1..1]. X libre dans [0..600) mais **clampé pour ne pas dépasser ses
    voisins cycliques** (préserve l'ordre).
  - **Clic sur la courbe** (en dehors d'une poignée existante) →
    `ADD_SPLINE_ANCHOR` à ce point.
  - **Suppression** : clic sur une poignée + `Suppr` / `Backspace`, **ou**
    clic droit sur la poignée → menu contextuel « Supprimer ».
- **Toggle interpolation** : petit interrupteur dans le header de la zone
  d'éditeur (ou à proximité immédiate), libellés via `strings.js`
  (« Doux » / « Anguleux »). Persisté per-patch.
- **Couplage mode (vues verrouillées pour les autres)** :
  - Harmoniques : read-only, montre la **DFT pleine** des `points` (jusqu'à
    256 composantes — pas de `definition` à appliquer en mode spline). Avec
    🔒.
  - Spectrogramme : read-only (inchangé).
- Tag : `feat(iter-M/phase-3.2): éditeur spline + couplage mode`.

### Sous-commit 3.3 — Passerelle étendue (4 nouveaux chemins)

Étendre la passerelle M.2 (sous-commit 2.5) pour intégrer le 3ᵉ mode. Un seul
**nouveau dialog** + réutilisation des deux dialogs existants :

- **Nouveau dialog : « Convertir en Spline »** (utilisé pour draw→spline et
  harmonic→spline) :
  > « Conversion en mode Spline. Choisissez le nombre d'ancres (4..32, défaut
  > **8**) et le type d'interpolation (Doux / Anguleux, défaut **Doux**). La
  > courbe sera reconstruite à partir des ancres ; les détails fins entre les
  > ancres seront perdus. [Convertir] [Annuler] »
  - Au confirme : on prend les `points` du patch courant (le draft editor
    contient déjà la courbe, qu'on soit en `draw` ou en `harmonic`), on
    échantillonne **N ancres équiréparties** :
    `anchors[i] = { x: i * 600 / N, y: points[round(i * 600 / N)] }`. Set
    `mode='spline'`, `interpolation = <choix>`.
- **spline → draw** : reuse le dialog **« Convertir en Dessin »** existant
  (confirmation simple). Les `points` (déjà calculés en ombre) deviennent le
  tracé éditable ; `anchors`/`interpolation` jetées. Set `mode='draw'`.
- **spline → harmonic** : reuse le dialog **« Convertir en Harmoniques »**
  existant (choix N + warning de perte). DFT des `points`, troncature à N,
  amplitudes posées. Set `mode='harmonic'`.
- Boutons contextuels par mode actif (2 boutons par mode, vers les deux
  autres). Snap des proportions au défaut du mode cible **conservé** (le
  follow-up M.2.5 s'applique tel quel, y compris pour les conversions
  impliquant `spline` — défaut spline = ½¼¼ (Forme d'onde large, comme `draw`)).
- Toutes les conversions **undoable atomiques** (un cran undo annule la
  conversion entière).
- Libellés via `strings.js`.
- Tag : `feat(iter-M/phase-3.3): passerelle étendue (spline aller-retour)`.

## Comportement attendu

- **Mode `spline`** : dragger une ancre déforme la courbe et change le son.
  Toggle Doux/Anguleux switche la courbe sans toucher aux ancres (mêmes points
  d'ancrage, courbe recalculée). Ajouter/supprimer une ancre fonctionne (min
  4). La courbe est **continue à la frontière** x=600↔x=0 (périodicité
  effective).
- Le timbre est par construction propre : peu d'harmoniques hautes, visible
  dans Harmoniques (DFT pleine) et le spectro statique / live.
- **Modes `draw` et `harmonic`** : aucune régression.
- **Passerelle** : tous les chemins fonctionnent, snap-on-convert préservé.

## Hors scope

- Ancres copier/coller, presets de formes spline (potentiellement M.4 ou
  backlog).
- Ordres supérieurs (B-spline, Bézier à poignées de tension) — on reste sur
  Catmull-Rom + polyligne.
- Réduction automatique d'ancres depuis un tracé `draw` (« auto-fit ») —
  backlog si l'usage le demande.
- Animation de transition entre modes — polish post-M.

## Règles techniques

- **Mémoïsation** : `splineSoft` et `splineHard` peuvent être mémoïsés sur
  `(anchors, interpolation)` si le profilage le justifie. Pour 32 ancres × 600
  samples, le calcul est sub-milliseconde — probablement inutile en premier
  jet.
- **Persistance** : `.osa` import/export doit gérer `mode: 'spline'` (champs
  `anchors`, `interpolation`). Forward-compat seulement — un `.osa` antérieur
  ne contient pas ce mode.
- `strings.js` : ajouter les nouvelles clés (« Convertir en Spline »,
  « Nombre d'ancres », « Interpolation », « Doux », « Anguleux », libellés du
  dialog, label du toggle).
- Build + typecheck + lint OK. Passe visuelle/audio à l'utilisateur (pas de
  dev server par le dev).
- CONTEXT.md : modèle Patch (ajout du 3ᵉ variant), composants (nouvel
  éditeur spline + module `spline.js`), État actuel, Historique, Roadmap M.3
  cochée.
