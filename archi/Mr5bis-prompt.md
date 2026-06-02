# Prompt — Iteration M rattrapage, Phase M.r.5.bis : finitions UX (auto-fit Y en spline + spline parfaite permanente + clic droit)

> Suite immédiate de M.r.5 — trois points remontés en passe d'usage,
> tous des finitions cosmétiques/UX. Phase courte (3 sous-commits).

## Contexte

M.r.5 a livré l'auto-fit Y + marqueur ±1 dans la zone Forme d'onde, le
code couleur des barres, les repères horizontaux et les axes labellisés
de la zone Harmoniques. Passe d'usage utilisateur signale trois choses :

1. **Auto-fit Y absent en mode spline.** L'auto-fit est dans le
   `drawCanvas` de `WaveformEditor.jsx` (utilisé pour la lentille
   libre). En mode spline, c'est `SplineEditor.jsx` qui rend le canvas
   avec sa propre logique de mapping `y → canvas`. L'auto-fit ne le
   touche pas.
2. **Troisième tracé apparaît/disparaît contextuellement.**
   Actuellement, la « spline parfaite » (= `splineToPoints(anchors,
   interpolation)`, soit le squelette des ancres sans résidu) ne
   s'affiche que pendant les manipulations d'ancres dans SplineEditor.
   Perturbant à l'usage. Décision archi : passer à un **affichage
   permanent** dans la lentille Forme d'onde, comme la courbe
   normalisée gris background — couleur distincte, légende, cachée
   uniquement quand elle se confond avec la canonical (résidu ≈ 0).
3. **Clic droit sur barre d'harmonique** déclenche le mousedown gauche
   (édition) **et** le menu contextuel du navigateur. Comportement
   par défaut indésirable. Décision archi : recâbler le clic droit
   vers la **mise à zéro de l'harmonique** (geste rapide « éteindre
   cette harmonique »).

## Décisions techniques actées avant le découpage

- **Auto-fit Y aligné** entre les deux composants canvas : extraire la
  logique de calcul de `peakDisplayed` (avec lerp rAF) dans un hook ou
  un helper partagé entre `WaveformEditor` et `SplineEditor`, ou
  dupliquer proprement. Mon avis : dupliquer si chacun a ~30 lignes,
  factoriser si ça déborde. Coût léger.
- **Spline parfaite en background permanent** : calculée toujours,
  mais dessinée uniquement si le résidu n'est pas négligeable. Critère
  de visibilité : `max(|residual|) > 0.01` (seuil à calibrer, mais peu
  sensible — soit le résidu est nul/quasi-nul après reset/preset, soit
  il porte du contenu visible). Visible dans **les deux lentilles**
  (libre et spline) — la spline parfaite est un repère visuel utile
  partout.
- **Couleur de la spline parfaite** : choix entre orange, jaune-vert,
  violet. À calibrer visuellement par le dev. Critère : distinguable
  contre bleu (canonical) et gris (normalisée) sur thème clair ET sur
  thème sombre. Suggestion : `oklch(0.7 0.15 60)` (orange chaud) ou
  équivalent. Stroke fin (1 px), opacité ~0.5-0.6, pas de fill.
- **Légende étendue** : ajouter la 3ème entrée à `<NormalizeLegend />`
  (ou la renommer si elle est trop spécifique). Affichage des entrées
  conditionnel — si l'une des courbes (normalisée, spline parfaite)
  n'est pas affichée, ne pas en parler dans la légende. Exemple :
  - Tracé libre récent : « bleu = forme actuelle, gris = forme si
    normalisée, orange = spline des ancres »
  - Tracé normalisé : « bleu = forme actuelle, orange = spline des
    ancres » (la grise est cachée car canonical = normalisée)
  - Tracé spline parfaite (cas extrême : tracé qui coïncide avec la
    spline = résidu nul) : « bleu = forme actuelle » seul.
- **Clic droit = setHarmonicAmplitude(index, 0)** : même chemin que le
  clic gauche pour la **détection d'état normalisé** — si
  `!editor.canonicalNormalized`, le dialog edit-bars apparaît avant
  l'opération. Pas de raccourci silencieux qui contournerait la garde
  de phase. Au confirme : `normalize()` + `setHarmonicAmplitude(index,
  0)`. Au cancel : no-op.
- **Pas de drag au clic droit** : un clic discret, pas un geste
  continu. Aucun draft initié, aucun mousemove handler ne se branche
  spécifiquement au bouton droit.

## Sous-commits

### Sous-commit M.r.5.bis.1 — Auto-fit Y aligné entre WaveformEditor et SplineEditor

`src/components/SplineEditor.jsx` :

- Calculer `peakTarget` localement (même logique que dans
  `WaveformEditor.drawCanvas` — pic sur la canonical affichée + sur le
  normalizedBg si présent, minimum 1).
- Ajouter `peakDisplayedRef` + boucle rAF de lerp (coef ~0.15) si
  pas déjà présente, ou réutiliser une primitive partagée si tu
  factorises.
- Remplacer le mapping y → canvas qui supposait `[-1, +1]` par le
  mapping `[-peakDisplayed, +peakDisplayed]`.
- Le marqueur ±1 doit aussi être dessiné par SplineEditor — extraire
  la primitive de dessin du marqueur si elle vit dans WaveformEditor.
- Les poignées d'ancres doivent suivre la même échelle (un drag à
  `peakDisplayed = 3` doit pouvoir placer une ancre n'importe où dans
  cette plage).

**Test manuel** :
1. En mode libre, dessiner un signal dépassant ±1 → auto-fit visible.
2. Basculer en mode Ancres → l'échelle doit rester cohérente (pas de
   saut visuel à la transition). Les ancres apparaissent à la bonne
   hauteur.
3. Drag d'une ancre vers le haut au-delà de la valeur 1 → l'auto-fit
   suit progressivement.
4. Charger preset « Carré » en mode Ancres → auto-fit dilate.

Tag : `fix(iter-M/phase-r.5.bis.1): auto-fit Y aligné en mode spline (SplineEditor adopte la même échelle dynamique que WaveformEditor)`.

### Sous-commit M.r.5.bis.2 — Spline parfaite en background permanent + légende étendue

`src/components/WaveformEditor.jsx` (lentille libre) ET
`src/components/SplineEditor.jsx` (lentille spline) :

1. **Calcul de la spline parfaite** : `splinePerfect = splineToPoints(
   editor.anchors, editor.interpolation)`. Mémoïser via `useMemo` sur
   `(anchors, interpolation)` — coût `splineToPoints` sub-ms mais
   évite les recalculs inutiles.
2. **Critère de visibilité** : afficher `splinePerfect` uniquement si
   `max(|residual[i]|) > 0.01` (le résidu porte du contenu non
   négligeable). Sinon, la spline parfaite se confond avec la
   canonical → bruit visuel.
3. **Dessin** : après la courbe gris normalisée (si visible), avant
   la canonical bleue. Couleur distincte (orange suggéré), stroke 1 px,
   opacité ~0.55, pas de fill. Toujours respecter `withSavedCtx`.
4. **Légende `<NormalizeLegend />`** : étendre pour porter jusqu'à 3
   entrées, affichées conditionnellement :
   ```
   bleu = forme actuelle
   [si !canonicalNormalized] gris = forme si normalisée
   [si splinePerfect visible] orange = spline des ancres
   ```
   Si une seule entrée reste (canonical seul), la légende devient
   vide ou s'efface visuellement (pas d'info à donner).
5. **Retirer l'ancien rendu conditionnel** de la spline pendant le
   drag d'ancre dans SplineEditor s'il existait (le mécanisme
   permanent le remplace).

**Test manuel** :
1. Patch neuf (silence, ancres plates) : résidu = 0 → pas de spline
   orange. Légende : « bleu = forme actuelle » seul.
2. Tracé libre → résidu non nul, spline orange apparaît (souvent très
   différente du tracé bleu sur un dessin chaotique).
3. Drag d'ancre → la spline orange suit l'ancre déplacée, le tracé
   bleu = orange + résidu invariant. L'utilisateur voit
   simultanément la spline qu'il édite et le tracé qui en résulte
   après ajout du résidu.
4. Click Normaliser → la canonical bondit, le gris disparaît, la
   spline orange reste visible (le résidu n'est pas affecté par
   Normaliser).
5. `SET_EDITOR_ANCHOR_COUNT` à un count plus grand → résidu plus
   petit → la spline orange se rapproche de la canonical → disparaît
   quand le seuil 0.01 est franchi.

Tag : `feat(iter-M/phase-r.5.bis.2): spline parfaite en background permanent (3ᵉ courbe orange) + légende étendue conditionnelle`.

### Sous-commit M.r.5.bis.3 — Clic droit sur barre d'harmonique → mise à zéro

`src/components/WaveformEditor.jsx`, dans la zone Harmoniques :

1. **Bloquer le menu contextuel natif** : sur le conteneur des
   barres, `onContextMenu={e => e.preventDefault()}`.
2. **Intercepter le bouton droit** dans `handleHarmonicMouseDown` :
   ```js
   const handleHarmonicMouseDown = (e) => {
     if (autoSizing && autoSizeFocusGuardRef?.current) return
     const index = harmonicIndexFromEvent(e, amplitudes.length)

     // Clic droit : raccourci « mettre à zéro »
     if (e.button === 2) {
       e.preventDefault()
       if (!editor.canonicalNormalized) {
         openConfirm({
           title: 'Normaliser le tracé ?',
           message: 'Pour modifier une harmonique, le tracé doit être normalisé. La phase sera abandonnée, la forme reconstruite à partir des magnitudes.',
           confirmLabel: 'Normaliser et continuer',
           cancelLabel: 'Annuler',
           onConfirm: () => {
             editorActions.normalize()
             editorActions.setHarmonicAmplitude(index, 0)
           },
         })
         return
       }
       editorActions.setHarmonicAmplitude(index, 0)
       return
     }

     // Clic gauche : chemin actuel (draft + dialog si nécessaire)
     // ... reste du handler inchangé ...
   }
   ```
3. **Pas de mousemove / mouseup** sur le clic droit : on dispatche
   directement, pas de draft.

**Subtilité importante** : la version actuelle du `mousedown` doit
*ne pas* initier de `dragBarRef` ni de `draftAmplitudes` quand
`e.button === 2`, sinon le clic droit ouvrirait aussi un draft de
drag qui resterait coincé en attendant un mouseup gauche qui ne
viendra jamais.

**Test manuel** :
1. État normalisé, clic gauche sur barre k=3 → dialog n'apparaît
   pas, drag classique.
2. État normalisé, clic droit sur barre k=3 → barre k=3 passe à 0
   immédiatement, pas de menu contextuel, pas de dialog. Undoable
   en un Ctrl+Z.
3. État non-normalisé, clic droit → dialog apparaît. Confirme →
   barre passe à 0 + canonical normalisée. Annule → rien ne
   change.
4. Glisser-déposer après clic droit relâché : aucun comportement
   parasite (pas de drag fantôme).
5. Clic gauche puis clic droit pendant le drag : le clic droit
   l'emporte ? Comportement à valider — mon avis : `e.button` au
   mousedown initial dicte, mais les browsers sont parfois étranges
   ici. Tester.

Tag : `feat(iter-M/phase-r.5.bis.3): clic droit sur barre d'harmonique = mise à zéro (préserve la garde edit-bars si non normalisé)`.

## Comportement attendu en fin de phase

- L'auto-fit Y fonctionne uniformément dans les deux lentilles de la
  zone Forme d'onde. Plus de saut visuel au switch Libre↔Ancres
  quand l'amplitude dépasse ±1.
- Trois courbes empilées dans la zone Forme d'onde, chacune avec son
  rôle pédagogique : bleu = vérité audio, gris = phase canonique
  alternative, orange = squelette des ancres. Légende reflète
  fidèlement ce qui est affiché.
- Clic droit sur une barre devient un geste utile (« éteindre cette
  harmonique »), pas une nuisance.
- Build / typecheck / lint verts.

## Hors scope M.r.5.bis

- **Fit intelligent des ancres (Douglas-Peucker)** : backlog
  post-M.5b.
- **Boutons de lissage (passe-bas + vers la spline)** : backlog
  post-M.5b.
- **Bug FFT 600↔512** : backlog.
- **Overshoot Catmull-Rom sur transitions verticales** : backlog.

## Mise à jour CONTEXT.md (commit séparé)

En fin de phase, commit `docs: CONTEXT.md — Iteration M phase r.5.bis
(finitions UX : auto-fit Y en spline + spline parfaite permanente +
clic droit barres)`. Sections à toucher :

- **TL;DR** : mention r.5.bis (finitions UX).
- **État actuel** :
  - Mention de l'auto-fit Y commun aux deux lentilles.
  - Trois courbes empilées avec leur rôle pédagogique et la légende
    conditionnelle.
  - Clic droit sur barre = mise à zéro avec garde edit-bars.
- **Décisions architecturales** :
  - Spline parfaite affichée en permanence, cachée uniquement si
    résidu négligeable (seuil 0.01).
  - Clic droit conserve la garde dialog edit-bars-requires-normalize
    (pas de raccourci qui contournerait la convention de phase).
- **Historique** : entrée r.5.bis.

## Workflow

- Commits linéaires sur `main`. Ne push pas tout seul.
- Sur le choix de la 3ᵉ couleur (orange / jaune-vert / violet),
  faire confiance à l'œil. Critère : reste lisible contre bleu et
  gris sur thèmes clair ET sombre. Si tu hésites, propose deux
  options en commentaire du commit message — l'utilisateur arbitrera
  en passe d'usage.
- Sur le seuil 0.01 pour la visibilité de la spline parfaite, c'est
  un seuil pragmatique. Si la spline disparaît trop souvent (cas où
  le résidu est petit mais perceptible visuellement), baisser à
  0.005. Si elle reste visible alors qu'elle se confond pixel-perfect
  avec la canonical, monter à 0.02.

## Note de clôture

M.r.5.bis ferme **définitivement** le code du rattrapage iter-M.
Bilan complet : 5 phases principales + 3 finitions (M.r.2.5 / M.r.2.6
/ M.r.5.bis). Le modèle est désormais stable pour la passe doc M.5b.
