# Prompt — Iteration M rattrapage, Phase M.r.3 : lentilles vivantes (re-fit auto des ancres)

> Spec de référence : `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md` (§§2.1, 2.3, 4.1, 4.4).
> **Phase chirurgicale.** Le câblage modèle a été posé en M.r.1 (canonical
> unique + résidu) et l'UI en M.r.2 (toggle Spline, contrôles toujours
> visibles, icônes Lucide). Il manque la **synchronisation vivante des
> ancres** quand la canonical change par une voie autre que le drag
> d'ancre lui-même. C'est M.r.3.

## Contexte

Spec §2.1 : « *Une seule courbe canonique, trois lentilles. Les lentilles
sont des outils, pas des modes verrouillés. Toujours live, toujours
synchronisées avec la canonique.* »

Aujourd'hui (post-M.r.2.6) cette promesse est tenue pour la **canonical
lue par les vues** : les barres harmoniques et le spectrogramme sont
dérivés en lecture de `editor.canonical` et se mettent à jour à chaque
changement. La lentille Forme d'onde affiche aussi la canonical courante.
Bonne synchronisation **descendante**.

La synchronisation **ascendante** est partielle : quand l'utilisateur
modifie la canonical par une voie autre que le drag d'ancre (tracé
libre, drag de barre, Normaliser, chargement de preset), **les ancres ne
sont pas re-fittées sur la nouvelle canonical**. Conséquence visible : on
dessine librement une courbe, on bascule en lentille Spline, et on voit
des ancres restées à `y=0` (defaults) qui n'ont aucun rapport avec le
tracé. L'utilisateur peut contourner en jouant le slider Nombre d'ancres
(qui re-fitte explicitement), mais c'est un workaround.

M.r.3 corrige ça : à chaque action qui change `canonical` par une voie
non-spline, on re-fitte les ancres sur la nouvelle canonical avant de
recalculer le résidu.

## Mécanique attendue

La spec §4.1 précise le rôle du résidu :
> *Quand `canonical` est modifiée par une autre voie (tracé libre,
> normalisation, chargement de preset, changement de cap), `residual` est
> recalculé sur les ancres courantes.*

M.r.3 étend ça : non seulement le résidu est recalculé, mais les **ancres
sont re-fittées** d'abord. L'ordre est :

1. La canonical est mise à jour par l'action (tracé libre, iDFT, etc.).
2. **Re-fit** : `anchors_new = fitAnchorsToCurve(canonical_new, anchors_old.length)`.
3. **Résidu** : `residual = canonical_new − splineToPoints(anchors_new, interpolation)`.

Conséquence sémantique (cohérente avec la spec §4.1) : après un tracé
libre avec un `count` élevé d'ancres, la spline approche bien le tracé,
le résidu est petit, et un drag d'ancre subséquent déforme largement
autour de l'ancre. Avec un `count` faible, la spline est très lisse, le
résidu absorbe l'essentiel, et un drag d'ancre fait une petite
déformation locale en préservant les détails. C'est exactement l'effet
voulu.

## Actions à modifier (et celles à ne PAS toucher)

**À modifier — re-fit + résidu après changement de canonical :**

| Action | Modification |
|---|---|
| `SET_EDITOR_CANONICAL` (commit tracé libre) | Re-fit ancres sur le nouveau payload, puis résidu sur les nouvelles ancres |
| `SET_EDITOR_HARMONIC_AMPLITUDE` (commit drag de barre) | Idem après iDFT à phase canonique |
| `NORMALIZE_EDITOR_CANONICAL` | Idem après iDFT à phase canonique |
| `LOAD_PRESET` | Idem après iDFT du preset |

**À NE PAS toucher** — chacune pour une raison :

| Action | Raison |
|---|---|
| `MOVE_SPLINE_ANCHOR` / `ADD_SPLINE_ANCHOR` / `REMOVE_SPLINE_ANCHOR` | Édition explicite des ancres ; un re-fit annulerait le geste utilisateur. La mécanique actuelle (`canonical = splinePlusResidual(splineToPoints(newAnchors, interpolation), residual)`) reste — le résidu PRÉSERVÉ porte les détails du tracé original |
| `SET_SPLINE_INTERPOLATION` | Ne change pas les ancres. `canonical = spline(anchors, new_interp) + residual` ; les ancres restent telles quelles |
| `SET_EDITOR_ANCHOR_COUNT` | Re-fit explicite déjà câblé (c'est sa raison d'être) |
| `RESET_EDITOR_WAVEFORM` | Aplatit explicitement les ancres à `y=0` au count courant ; pas besoin de re-fitter |
| `SET_EDITOR_CAP` | Ne touche pas à la canonical (la troncature à `cap` vit dans la chaîne audio, pas dans le state) |

## Décisions techniques actées avant le découpage

- **Helper unique** : extraire la primitive `refitAnchorsAndResidual` (ou
  nom équivalent) dans `src/reducer.js`, qui prend
  `(canonical, currentAnchors, interpolation)` et renvoie
  `{ anchors, residual }`. Quatre call-sites (les 4 actions à modifier),
  donc justifié à factoriser. Évite de répéter la séquence
  fit+spline+residual.
- **`anchors_old.length` est la source du count préservé** : on re-fitte
  avec le même nombre d'ancres que ce que l'utilisateur avait avant
  l'action. C'est ce que veut la spec (« on préserve le réglage de
  l'utilisateur »).
- **Aucune nouvelle action**, aucun nouveau champ d'état. M.r.3 est
  purement une modification interne du reducer + nettoyage de type.
- **Cleanup `'bars'` du type `WaveformLens`** : plus aucun chemin
  utilisateur ne l'assigne depuis M.r.2.4 (boutons « Convertir vers »
  supprimés). À nettoyer maintenant, scope contenu : le type, le mapping
  `currentLens → mode` ligne ~349 de `WaveformEditor.jsx`, et tout
  call-site qui testait encore `=== 'bars'`.

## Découpage en sous-commits

### Sous-commit M.r.3.1 — Re-fit auto des ancres dans les 4 actions clés

`src/reducer.js` :

- Ajouter le helper :
  ```js
  // M.r.3 — primitive « lentilles vivantes » : après chaque modification
  // de canonical par une voie autre que le drag d'ancre, on re-fitte les
  // ancres sur la nouvelle canonical (en préservant leur nombre) puis on
  // recalcule le résidu. Conséquence (spec §4.1) : la lentille Ancres reste
  // toujours synchronisée avec le tracé courant, et un drag d'ancre
  // subséquent produit une déformation cohérente (amplitude du delta
  // proportionnelle à la finesse de la spline, modulée par le résidu).
  function refitAnchorsAndResidual(canonical, currentAnchors, interpolation) {
    const count = currentAnchors?.length || DEFAULT_SPLINE_ANCHOR_COUNT
    const anchors = fitAnchorsToCurve(canonical, count)
    const residual = computeResidual(canonical, splineToPoints(anchors, interpolation))
    return { anchors, residual }
  }
  ```
- **`SET_EDITOR_CANONICAL`** : remplacer la séquence
  `computeResidual(payload, splineToPoints(state.editor.anchors, …))`
  par `refitAnchorsAndResidual(payload, state.editor.anchors,
  state.editor.interpolation)`. Spread du résultat dans l'editor (les
  ancres aussi mises à jour).
- **`SET_EDITOR_HARMONIC_AMPLITUDE`** : après la reconstruction de
  `canonical` via `harmonicsToPoints(amplitudes, cap)`, appeler le helper
  au lieu du `computeResidual` direct.
- **`NORMALIZE_EDITOR_CANONICAL`** : idem après l'iDFT à phase
  canonique.
- **`LOAD_PRESET`** : idem après l'iDFT du preset.

**Test de non-régression manuel** (à passer **avant le commit**) :

1. Tracé libre → bascule en lentille Spline : les poignées d'ancres
   suivent le tracé (sont posées dessus, pas à `y=0`).
2. Drag d'une ancre après tracé libre : la zone autour de l'ancre se
   déforme, les détails fins distants sont préservés (signature du
   résidu).
3. Édition d'une barre harmonique : la lentille Spline affiche des
   ancres cohérentes avec la nouvelle canonical reconstituée.
4. Click Normaliser : les ancres se re-fittent sur la canonical
   normalisée.
5. Charge preset : ancres re-fittées sur le preset.
6. Drag d'ancre : pas de re-fit pendant ou après — l'utilisateur édite
   explicitement, son geste survit.
7. Toggle Doux/Anguleux : les ancres restent en place (changement
   d'interpolation seul) ; la canonical se recalcule via le résidu.
8. Slider Cap : aucun effet sur les ancres ou la canonical (troncature
   vit en aval, dans `pointsToPeriodicWave`).
9. Slider Nombre d'ancres : re-fit explicite, comme avant.
10. Reset (icône Eraser) : ancres aplaties au count courant, canonical
    à zéro. Comportement inchangé.

Tag : `feat(iter-M/phase-r.3.1): lentilles vivantes — re-fit auto des ancres après chaque changement de canonical (tracé libre, drag de barre, normaliser, preset)`.

### Sous-commit M.r.3.2 — Cleanup `'bars'` du type `WaveformLens`

`src/types.ts` :

- `WaveformLens` passe de `'free' | 'spline' | 'bars'` à `'free' | 'spline'`.

`src/components/WaveformEditor.jsx` :

- Ligne ~349 : `const mode = currentLens === 'bars' ? 'harmonic' : currentLens === 'spline' ? 'spline' : 'draw'`
  devient `const mode = currentLens === 'spline' ? 'spline' : 'draw'`.
  La variable locale `mode` peut continuer à exister (les call-sites
  internes qui testent `mode === 'draw'` / `'spline'` restent valides ;
  la branche `'harmonic'` était inatteignable de toute façon).
- Si tu trouves d'autres call-sites qui testaient `currentLens === 'bars'`
  ou `mode === 'harmonic'`, les nettoyer (ils sont morts).

`src/reducer.js` :

- Vérifier `defaultColumnWidthsForLens(lens)` : si une branche
  `'bars'` y existe, la supprimer (la map devient simplement
  `'spline' → [...]`, défaut `[...]`).
- Tout autre call-site qui produit ou teste `'bars'` : à nettoyer.

`src/App.jsx`, `src/components/DesignerColumns.jsx`, etc. :

- Si `currentLens === 'bars'` apparaît, drop la branche.

Tag : `refactor(iter-M/phase-r.3.2): drop 'bars' du type WaveformLens (vestigial depuis M.r.2.4)`.

## Comportement attendu en fin de phase

- **Bizarrerie corrigée** : on dessine librement, on bascule en lentille
  Spline, les ancres reflètent le tracé. Plus jamais d'ancres
  désynchronisées à `y=0` (sauf juste après Reset, comportement attendu).
- Drag d'ancre toujours intuitif (le résidu préserve les détails fins du
  tracé original).
- Édition de barre, Normaliser, chargement de preset : la lentille Spline
  reste cohérente — l'utilisateur peut basculer en Spline à n'importe
  quel moment et voir des ancres pertinentes.
- Type `WaveformLens` propre, plus de valeur vestigiale.
- Build / typecheck / lint verts.
- **Régressions assumées qui persistent** : édition de barre fait toujours
  « sauter » la phase (régression de phase, M.r.4 mettra le dialog
  « normalise avant »). Normaliser idem (c'est la même opération).

## Hors scope M.r.3

- **Détection d'état normalisé** + désactivation visuelle Normaliser +
  dialog edit-bars-requires-normalize : M.r.4.
- **Courbe normalisée en background gris** dans la zone Forme d'onde :
  M.r.4.
- **Repères pointillés / axes labellisés** zone Harmoniques : M.r.5.
- **Auto-fit Y axis + marqueur ±1** : M.r.5.
- **Bug FFT 600↔512** : backlog accepté.
- **Refonte presets sine/square/sawtooth/triangle** en séries de Fourier
  bande-limitées : backlog.

## Mise à jour CONTEXT.md (commit séparé)

En fin de phase, commit `docs: CONTEXT.md — Iteration M phase r.3
(lentilles vivantes + cleanup 'bars')`. Sections à toucher :

- **TL;DR** : mention r.3 (lentilles vivantes — re-fit auto des ancres).
- **État actuel** :
  - Modèle de données : `WaveformLens = 'free' | 'spline'` (drop `'bars'`).
  - Décisions architecturales : « les 4 actions qui modifient canonical
    par voie non-spline (SET_EDITOR_CANONICAL, SET_EDITOR_HARMONIC_AMPLITUDE,
    NORMALIZE_EDITOR_CANONICAL, LOAD_PRESET) re-fittent automatiquement
    les ancres sur la nouvelle canonical via `refitAnchorsAndResidual`.
    Les ancres sont *toujours* représentatives du tracé courant. »
  - Contraintes implicites : noter que `MOVE_SPLINE_ANCHOR` /
    `SET_SPLINE_INTERPOLATION` / `SET_EDITOR_ANCHOR_COUNT` /
    `RESET_EDITOR_WAVEFORM` / `SET_EDITOR_CAP` n'invoquent **pas** le
    re-fit (chacune pour une raison documentée dans le reducer).
- **Roadmap & Backlog** : cocher M.r.3, M.r.4 / M.r.5 toujours à venir.
- **Historique** : entrée r.3.

## Workflow

- Commits linéaires sur `main`. Ne push pas tout seul.
- Le test de non-régression manuel (les 10 scénarios listés ci-dessus)
  est **non négociable** avant de marquer r.3.1 prêt. C'est le cœur de
  la phase ; un re-fit raté n'est pas attrapable par typecheck/lint.
- Si le test #2 (drag d'ancre après tracé libre) ne préserve PAS les
  détails fins comme attendu, c'est probablement que le résidu n'a pas
  été correctement réinitialisé après le re-fit, ou que `MOVE_SPLINE_ANCHOR`
  utilise un résidu obsolète. Interpelle plutôt que de bricoler.
