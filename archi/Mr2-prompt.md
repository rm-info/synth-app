# Prompt — Iteration M rattrapage, Phase M.r.2 : réorganisation UI (barre du haut + cap unifié + switch Libre/Ancres)

> Spec de référence : `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md` (§§5.1, 5.2, 5.3, 6).
> **Phase UI.** On déplace, on consolide, on supprime — pas de changement de
> modèle (M.r.1 a posé l'unification, M.r.3 fera la synchronisation vivante,
> M.r.4 ajoutera la normalisation comme garde-fou). M.r.2 rend l'app
> cohérente à l'œil : une seule barre d'outils globale, un seul contrôle
> pour le plafond d'harmoniques, plus de boutons « Convertir vers » qui
> étaient des reliques du modèle siloté.

## Contexte

M.r.1 a livré le modèle unifié `canonical + cap + anchors + residual`,
supprimé les dialogs de conversion et le verrouillage 🔒, et corrigé en
chemin trois hotfixes (init store, commit de barre cassé, convention
amplitude véritable vs magnitude FFT bilatérale via `canonicalToBars`).
Mais l'UI reste celle de M.4 : le bouton « Convertir vers harmoniques »
existe encore (il fait désormais juste `setCurrentLens('bars')`), le
contrôle `cap` est dupliqué (slider « Définition » dans la sidebar +
NumberInput « Harmoniques » dans le header de la zone Harmoniques, les
deux dispatchant la même action via des alias), la modale Presets se
déclenche depuis le header Harmoniques, le bouton « Nouveau patch » /
« Reset » manque comme entrée globale, et il n'y a pas de bouton
Normaliser.

M.r.2 met de l'ordre dans cet héritage transitoire.

## Décisions techniques actées avant le découpage

- **Modale Presets conservée** (choix utilisateur : option A). Pas de
  dropdown. On déplace simplement son bouton déclencheur du header
  Harmoniques vers la barre du haut. La modale (PresetPicker) reste
  identique — descriptions inclus.
- **Bouton Normaliser fonctionnel en M.r.2, sans détection d'état.**
  Toujours cliquable. Click → exécute l'iDFT à phase canonique sur les
  `cap` premières amplitudes. La désactivation visuelle « si déjà
  normalisé » et le dialog edit-bars-requires-normalize sont M.r.4.
- **Bouton Reset distinct de « Nouveau patch ».** Reset ne touche **pas**
  à `currentPatchId`, `ADSR`, `amplitude`, `test*`, `visualCue*` : c'est
  une réinitialisation **du timbre** (canonical + cap + anchors +
  interpolation + residual), pas une remise à zéro de l'éditeur. Nouvelle
  action `RESET_EDITOR_WAVEFORM`. ConfirmDialog systématique au click
  (pas de détection « dirty » — trop coûteuse pour le gain).
- **Sinusoïde fondamentale comme état neutre.** `DEFAULT_EDITOR.canonical`
  passe de `[0,…,0]` (silence) à `harmonicsToPoints([1], 1)` (sin pur
  d'amplitude 1). Reset utilise la même valeur. Pédagogique : un nouveau
  patch produit du son, l'utilisateur a quelque chose à entendre.
- **`WaveformLens` reste à 3 valeurs** (`'free' | 'spline' | 'bars'`) pour
  M.r.2. Mais le switch utilisateur dans le header Forme d'onde
  ne bascule **qu'entre `'free'` et `'spline'`** (les deux modes d'édition
  exclusifs de la zone Forme d'onde). La valeur `'bars'` reste légitime
  pour piloter le focus auto-sizing quand l'utilisateur interagit avec la
  zone Harmoniques — pas de switch utilisateur explicite.
- **Cap unifié dans le header Harmoniques.** Suppression des deux UI
  actuelles (slider Définition `data-anchor="designer-definition"` dans
  la sidebar + NumberInput Harmoniques du header). Remplacement par un
  **slider+text** unique : input range 1..256 + étiquette « Harmoniques :
  N / 256 » (cohérent avec spec §5.3).
- **Nombre d'ancres exposé.** Nouvelle action `SET_EDITOR_ANCHOR_COUNT`
  (undoable) : ré-équiréparti `count` ancres sur la canonical courante
  via `fitAnchorsToCurve`, recompute le résidu. Visible dans le header
  Forme d'onde quand la lentille active est `'spline'`.
- **Suppression des alias `setN` et `setDefinition`** dans `editorActions`
  (App.jsx). Seul `setCap` reste — plus de double appellation.

## Découpage en sous-commits

### Sous-commit M.r.2.1 — Barre du haut (squelette, nom, dimensionnement)

Nouveau composant `DesignerToolbar` (ou équivalent) **au-dessus** des
trois colonnes (Forme d'onde / Harmoniques / Spectro). Layout
horizontal, hauteur fixe, style cohérent avec les headers de colonne.

- Contenu à ce sous-commit (les autres boutons arrivent ensuite) :
  - **Gauche** : nom du patch + sound tag. Déplacés depuis le header de
    la zone Forme d'onde (qui devient plus léger). Inclut l'édition
    inline du nom si elle existait déjà là-bas.
  - **Droite** : boutons de proportions (`⅓⅓⅓` / `½¼¼` / `¼½¼` / `¼¼½`)
    + toggle `Auto`. Déplacés depuis leur emplacement actuel (voir
    `DesignerColumns.jsx` — la rangée de boutons est probablement
    rendue par ce composant ou par son parent).
- Le header de la zone Forme d'onde garde le titre `STRINGS.editor.waveformTitle`
  mais perd le nom + sound tag.
- `DesignerColumns` continue à gérer les **séparateurs glissables** des 3
  colonnes (drag entre colonnes), mais les **presets de proportions** +
  Auto vivent dans la barre du haut.
- Aucun changement de comportement audio / data / lentilles à ce
  sous-commit. Juste un déplacement de pixels.

Tag : `refactor(iter-M/phase-r.2.1): barre du haut Designer (nom + dimensionnement)`.

### Sous-commit M.r.2.2 — Bouton Presets + bouton Reset

- **Bouton Presets** dans la barre du haut. Click → ouvre
  `PresetPicker` (modale existante, inchangée — descriptions préservées).
  - **Suppression** du bouton Presets dans le header de la zone
    Harmoniques (`data-anchor="designer-presets-button"`).
- **Bouton Reset** dans la barre du haut. Click → ouvre `ConfirmDialog`
  systématique (texte du genre « Réinitialiser le timbre actuel ? Tracé,
  harmoniques et ancres reviendront à leur état neutre. »). Confirmer →
  dispatch `RESET_EDITOR_WAVEFORM`.
- Nouvelle action **`RESET_EDITOR_WAVEFORM`** dans le reducer (undoable
  Designer) :
  - `canonical` ← `harmonicsToPoints([1], 1)` (sin fondamentale amp 1)
  - `cap` ← `DEFAULT_CAP` (256)
  - `anchors` ← `defaultSplineAnchors()` (8 ancres équiréparties à y=0)
  - `interpolation` ← `'soft'`
  - `residual` ← `new Array(600).fill(0)`
  - **Préservés** : ADSR, amplitude, test*, visualCue*, currentLens,
    currentPatchId, preset.
  - **Note** : `preset` est mis à `null` (le timbre vient d'être effacé
    — il n'a plus de filiation avec un preset chargé).
- **Modification de `DEFAULT_EDITOR.canonical`** dans `src/reducer.js` :
  passe de `new Array(600).fill(0)` à `harmonicsToPoints([1], 1)`.
  Conséquence : `RESET_EDITOR` (Ctrl+Alt+N « Nouveau patch ») produit
  aussi une sin fondamentale au lieu du silence. C'est attendu et
  cohérent.
- Vérifier que `loadPersistedState` et `migrateLegacyPatch` ne tombent
  pas dans des branches qui assumaient un canonical plat à l'init —
  rien ne devrait casser vu que ces deux chemins partent du localStorage,
  pas de `DEFAULT_EDITOR.canonical`. Mais à vérifier à l'œil.

Tag : `feat(iter-M/phase-r.2.2): boutons Presets et Reset dans la barre du haut + DEFAULT_EDITOR.canonical = sin fondamentale`.

### Sous-commit M.r.2.3 — Bouton Normaliser

- **Bouton Normaliser** dans la barre du haut, entre Reset et le
  séparateur visuel. **Toujours cliquable en M.r.2** (la désactivation
  conditionnelle arrive en M.r.4).
- Nouvelle action **`NORMALIZE_EDITOR_CANONICAL`** dans le reducer
  (undoable Designer) :
  ```
  const cap = state.editor.cap
  const amplitudes = canonicalToBars(state.editor.canonical, cap)
  const canonical = harmonicsToPoints(amplitudes, cap)
  const residual = computeResidual(
    canonical,
    splineToPoints(state.editor.anchors, state.editor.interpolation),
  )
  return { ...state, editor: { ...state.editor, canonical, residual } }
  ```
  Une iDFT à phase canonique sur les `cap` premières amplitudes
  véritables. Le résidu est recalculé sur les ancres courantes (cohérent
  avec `SET_EDITOR_CANONICAL` / `SET_EDITOR_HARMONIC_AMPLITUDE`).
- Pas de dialog de confirmation : l'action est undoable, l'utilisateur
  peut Ctrl+Z si elle a un effet inattendu.
- **Aucune détection** d'état normalisé en M.r.2. Si l'utilisateur clique
  alors que la canonical est déjà à phase canonique (cas où l'editor n'a
  fait que du drag de barres), l'action est un quasi no-op (≈ identité à
  un epsilon FFT près) mais ajoute un cran d'undo. Documenté, M.r.4
  améliore.

Tag : `feat(iter-M/phase-r.2.3): bouton Normaliser fonctionnel (iDFT phase canonique)`.

### Sous-commit M.r.2.4 — Cap unique + switch Libre/Ancres + nombre d'ancres

**Côté zone Harmoniques :**

- Refonte du `we-harmonics-controls` dans le header :
  - **Suppression** du `<NumberInput>` Harmoniques + son label.
  - **Suppression** des boutons `convertToDraw` et `convertToSpline`.
  - **Ajout** d'un slider+text unique : input range `min=1 max=256
    step=1`, et une étiquette `Harmoniques : N / 256` (texte cliquable
    optionnel pour éditer la valeur via input number, mais MVP = slider
    + readout).
  - Le label respecte `STRINGS.editor.harmonicCount` (ou clé adjacente
    cohérente). Style cohérent avec les autres sliders du Designer.
- **Suppression** du slider `data-anchor="designer-definition"` ailleurs
  dans le composant (probablement dans une sidebar AHDSR-adjacente).
  Tout `cap` passe par le slider du header Harmoniques.
- `editorActions.setN` et `editorActions.setDefinition` **supprimés**
  d'App.jsx (gardés en r.1.4 comme alias). Seul `editorActions.setCap`
  reste. Recâbler les call-sites qui utilisaient les alias (probablement
  uniquement les deux contrôles supprimés ci-dessus).

**Côté zone Forme d'onde :**

- Refonte du header :
  - Titre `STRINGS.editor.waveformTitle` (déjà là, sans le nom du patch
    désormais — déplacé en M.r.2.1).
  - **Ajout** d'un switch segmenté `Libre ⇆ Ancres` (2-state, type
    radio/toggle visuel). Click bascule `editor.currentLens` entre
    `'free'` et `'spline'` via `setCurrentLens`.
  - **Quand `currentLens === 'spline'`** : afficher en plus
    - un slider+text `Ancres : N / 32` (input range 4..32) qui
      dispatche la nouvelle action `SET_EDITOR_ANCHOR_COUNT`.
    - le toggle existant `Doux ⇆ Anguleux` (déjà présent dans
      `SplineEditor`, à remonter dans le header s'il était à
      l'intérieur du canvas — vérifier l'emplacement actuel).
- Si tu trouves des boutons « Convertir vers harmoniques » /
  « Convertir vers dessin » / « Convertir vers spline » qui traînent
  encore (header de la zone Forme d'onde, header de la zone Harmoniques,
  ou intérieur de `SplineEditor` via la prop `convertButtons`), tu les
  supprime tous. La bascule entre lentilles passe par le switch dans le
  header Forme d'onde (pour `'free'`↔`'spline'`) et n'a pas de chemin
  utilisateur explicite vers `'bars'` (l'édition de barres se fait
  directement dans la zone Harmoniques, sans bascule préalable).
- **Suppression** de la prop `convertButtons` de `SplineEditor` (et de
  son call-site dans `WaveformEditor`).

**Côté reducer :**

- Nouvelle action **`SET_EDITOR_ANCHOR_COUNT { count }`** (undoable
  Designer) :
  ```
  const count = clamp(count, SPLINE_ANCHOR_MIN, SPLINE_ANCHOR_MAX)
  const anchors = fitAnchorsToCurve(state.editor.canonical, count)
  const residual = computeResidual(
    state.editor.canonical,
    splineToPoints(anchors, state.editor.interpolation),
  )
  return { ...state, editor: { ...state.editor, anchors, residual } }
  ```
  Le re-fit produit `count` ancres équiréparties qui passent par la
  canonical courante ; le résidu est recalculé (la spline change, donc
  `canonical − spline_new` change). **Note importante** : ne pas
  toucher à la canonical elle-même (Reset, oui ; SET_EDITOR_ANCHOR_COUNT,
  non — c'est juste un re-fit de la lentille spline).
- Type `Action` mis à jour : ajout de `SET_EDITOR_ANCHOR_COUNT`,
  `RESET_EDITOR_WAVEFORM`, `NORMALIZE_EDITOR_CANONICAL`. Drop de
  `setN` / `setDefinition` côté App.jsx (pas un type d'action, juste
  des helpers).
- Inclure ces 3 nouvelles actions dans la liste `DESIGNER_UNDOABLE`.

**Côté `editorActions` (App.jsx) :**

- Ajout : `setAnchorCount`, `resetWaveform`, `normalize`.
- Drop : `setN`, `setDefinition`.

Tag : `feat(iter-M/phase-r.2.4): cap unique + switch Libre/Ancres + nombre d'ancres + suppression conversions héritées`.

## Comportement attendu en fin de phase

- L'utilisateur voit, dès le Designer :
  - Une **barre du haut homogène** : Nom du patch | Presets | Reset |
    Normaliser | (séparateur) | proportions | Auto.
  - **Trois colonnes** avec leurs headers propres :
    - Forme d'onde : titre + switch Libre/Ancres + (si Ancres)
      Doux/Anguleux + Nombre d'ancres.
    - Harmoniques : titre + slider+text Harmoniques (cap).
    - Spectrogramme : inchangé.
- Plus aucun bouton « Convertir vers… » nulle part.
- Plus de double contrôle cap (slider Définition disparu, NumberInput
  Harmoniques disparu, remplacés par le slider du header).
- Plus de bouton Presets dans le header Harmoniques.
- Reset → dialog → confirme → tracé devient sin pure, cap=256,
  8 ancres plates à y=0.
- Normaliser → tracé redessiné comme la somme des `cap` magnitudes
  courantes à phase canonique. Peut sauter visuellement (régression de
  phase, comme l'édition d'une barre — c'est l'opération sous-jacente
  identique). C'est undoable.
- Switch Libre → l'utilisateur dessine à main levée sur la canvas
  Forme d'onde (comportement actuel inchangé). Switch Ancres → poignées
  draggables apparaissent, l'utilisateur peut bouger ou
  ajouter/supprimer une ancre.
- Changer le nombre d'ancres → re-fitting **immédiat** sur la canonical
  courante. Le résidu absorbe la différence (c'est l'idée même du
  résidu : le tracé survit au changement d'ancres). **Régression de
  phase éventuelle ?** Non — `fitAnchorsToCurve` n'altère pas la
  canonical, juste les ancres. Le canonical resté tel quel, le résidu
  recalculé permet aux drags d'ancres suivants de préserver ce tracé.
- Changer cap → toujours pas de re-quantification visible (la
  troncature vit dans la chaîne audio, comme en r.1.2).
- Build / typecheck / lint verts.

## Hors scope M.r.2

- **Re-fit auto des ancres au tracé libre / au switch de lentille** : c'est
  M.r.3. En M.r.2, les ancres ne se re-fittent **qu'au click explicite**
  sur le slider Nombre d'ancres (via `SET_EDITOR_ANCHOR_COUNT`) ou à
  l'hydratation d'un patch. Donc la bizarrerie « basculer en Ancres
  affiche des ancres à y=0 désynchronisées du tracé » **persiste**
  jusqu'à M.r.3 — sauf si l'utilisateur ajuste manuellement le slider
  Nombre d'ancres, ce qui déclenche un re-fit.
- **Détection d'état normalisé** + désactivation visuelle Normaliser +
  dialog edit-bars-requires-normalize : M.r.4.
- **Courbe normalisée en background gris** dans la zone Forme d'onde :
  M.r.4.
- **Repères pointillés / axes labellisés** dans la zone Harmoniques
  (`kf` en X, 0/0.5/1 en Y) : M.r.5.
- **Auto-fit Y axis + marqueur ±1** dans la canvas Forme d'onde : M.r.5.
- **Refonte des presets sine/square/sawtooth/triangle** en séries de
  Fourier bande-limitées : backlog.

## Mise à jour CONTEXT.md (commit séparé)

En fin de phase, commit `docs: CONTEXT.md — Iteration M phase r.2
(réorganisation UI Designer)`. Sections à toucher :

- **TL;DR** : ajouter une ligne sur M.r.2 (réorganisation UI : barre du
  haut + cap unifié + switch Libre/Ancres).
- **État actuel** :
  - Architecture du Designer : décrire la nouvelle barre du haut +
    les 3 colonnes (avec leurs nouveaux headers).
  - Décisions architecturales : « cap unifié, plus de boutons
    "Convertir vers", switch Libre/Ancres pour les deux modes d'édition
    de la zone Forme d'onde ».
  - Contraintes implicites : `RESET_EDITOR_WAVEFORM` réinitialise le
    timbre sans toucher au reste de l'editor ; `NORMALIZE_EDITOR_CANONICAL`
    est exécuté sans détection d'état (M.r.2) ; `DEFAULT_EDITOR.canonical`
    = sin fondamentale (pas silence).
  - Composants : mention de `DesignerToolbar` (nouveau).
- **Roadmap & Backlog** : cocher M.r.2, M.r.3 / M.r.4 / M.r.5 toujours à
  venir.
- **Historique** : entrée « Iteration M rattrapage phase r.2 — barre du
  haut + cap unifié + switch Libre/Ancres + Reset/Normaliser
  fonctionnels (2026-06-xx) ».

## Workflow

- Commits linéaires sur `main`. Ne push pas tout seul — signaler à
  l'utilisateur à chaque sous-commit prêt.
- Si tu détectes une incohérence (ex. : un emplacement du bouton Presets
  qui ne « rentre » pas naturellement dans la barre du haut, ou un
  conflit avec l'auto-sizing), interpelle plutôt que de bricoler.
- Le mot-clef de M.r.2 c'est **homogénéité** : à la fin, l'utilisateur
  doit voir un Designer qui « parle d'une seule voix » (un seul cap,
  une seule barre d'outils, un seul mécanisme pour basculer entre les
  deux modes d'édition de la zone Forme d'onde). Si une décision te
  donne le choix entre « légèrement plus de cohérence » et « légèrement
  moins de churn », privilégie la cohérence — c'est l'objectif explicite
  de la phase.
