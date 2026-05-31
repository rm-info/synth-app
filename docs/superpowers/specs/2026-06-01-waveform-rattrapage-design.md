# Spec — Itération M rattrapage : Designer en courbe canonique + lentilles vivantes

> Date : 2026-06-01
> Statut : spec validée (session pivot 2026-05-30 / 2026-06-01) — en attente
> de découpage en prompts d'implémentation par phase
> Origine : rattrapage de l'Iteration M après la passe d'usage qui a révélé
> que le modèle livré (M.1 → M.4) traite trois représentations interchangeables
> comme trois objets séparés, avec des conversions destructives et des silos
> artificiels.
> Référence historique : ancienne spec
> `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` (préservée
> pour la chronologie du projet — voir §1 ci-dessous).

## 1. Pourquoi un rattrapage

### 1.1 Ce qui était posé en M.1-M.4

- **Patch typé en union discriminée** par mode de fabrication
  (`draw` | `harmonic` | `spline`), chaque mode stockant sa propre
  représentation canonique.
- **Conversions destructives** entre modes via dialogs (passerelle M.2.5
  étendue en M.3.3).
- **Vue éditable suit le mode actif** ; les autres deviennent dérivées
  read-only avec 🔒.
- **`definition`** (mode dessin, slider M/256) et **`N`** (mode barres,
  NumberInput) — deux paramètres distincts dans des UI distinctes pour la
  même chose audible.

### 1.2 Ce que la passe d'usage a révélé

1. Les trois modes ne sont pas trois objets — ce sont **trois lentilles sur
   une seule forme d'onde**. Le verrouillage les transforme artificiellement
   en silos.
2. Les conversions destructives forcent à choisir/perdre alors que la
   plupart du temps l'utilisateur veut **passer de l'une à l'autre librement**.
3. `definition` et `N` ont la même sémantique audio (« plafond
   d'harmoniques ») mais deux noms, deux UI, deux plages. Pure redondance.
4. Bugs symptomatiques (preset bouton dans Harmoniques cassé ; artefacts
   visuels après conversion spline→autre) sont des conséquences directes du
   modèle siloté et de l'absence de discipline canvas entre modes.
5. La courbe change visiblement à la conversion draw→harmonique parce que la
   phase est jetée — l'utilisateur le subit sans contrôle visuel pré-action.

### 1.3 Décision

Pivoter **avant** la rédaction de la doc M.5b. Documenter le modèle siloté
serait cristalliser de la complexité accidentelle. La doc viendra après le
rattrapage, sur un modèle propre.

## 2. Le nouveau modèle — vue d'ensemble

### 2.1 Principe directeur

**Une seule *courbe canonique* (600 points), trois *lentilles* pour la lire
et l'éditer.** Les lentilles sont des outils, pas des modes verrouillés.
Toujours live, toujours synchronisées avec la canonique. Pas de conversion
explicite entre lentilles (sauf un cas — voir §4.2).

### 2.2 Les trois lentilles

| Lentille | Affichage | Édition |
|---|---|---|
| **Forme d'onde** | la courbe canonique (600 points) + une *normalisée* en arrière-plan (§4.3) | tracé libre (à main levée) OU drag d'ancres (spline), selon outil actif |
| **Harmoniques** | barres = magnitudes DFT de la canonique, tronquées au `cap` | drag d'une barre → exige normalisation préalable (§4.2) |
| **Spectrogramme** | inchangé (statique DFT + live FFT, Hz absolus) | read-only (moniteur) |

### 2.3 Ce qui disparaît du modèle

- L'union discriminée `Patch = DrawPatch | HarmonicPatch | SplinePatch`.
- Les actions `CONVERT_EDITOR_TO_*` et leurs dialogs.
- Le verrouillage 🔒 sur les vues non éditables (toutes sont *toujours
  affichables et synchronisées* ; la lentille active détermine seulement
  *où on agit*, pas ce qu'on *voit*).
- Les champs `definition` (mode dessin) et `N` (mode barres). Remplacés
  par un champ unique `cap` (§6).

## 3. Modèle de données

### 3.1 Patch

```
Patch {
  id, name, savedAt, …                  (méta inchangée)

  canonical: Float32Array(600)          forme d'onde réelle, vérité absolue
  cap: number                           plafond d'harmoniques [1..256]
  anchors: Array<{x, y}>                ancres spline (4..32)
  interpolation: 'soft' | 'hard'        spline interp
  residual: Float32Array(600)           voir §4.1
  amplitude, ahdsr…                     champs partagés (inchangés)
}
```

- Plus de `mode` sur le Patch — la lentille active est un état d'**editor
  draft uniquement** (volatile, pas persisté).
- `canonical` est l'unique source de vérité audio. Toute la chaîne audio
  (playback / WAV / spectro statique) lit `canonical`. **Aucune ligne audio
  ne change** par rapport à M.2+ — c'est le même invariant « `points` =
  vérité éditable », juste renommé.
- `anchors` et `residual` permettent une réédition spline préservant les
  détails locaux du tracé.

### 3.2 Editor draft

```
editor {
  …champs Patch ci-dessus
  currentLens: 'free' | 'spline' | 'bars'   volatile, défaut 'free'
}
```

### 3.3 Migration des patches existants

Hydratation au démarrage / à l'import `.osa` :

- **`DrawPatch` existant** → `canonical = points`, `cap = definition`,
  `anchors = fit(canonical, defaultN)`, `residual = canonical − spline_fit`.
- **`HarmonicPatch` existant** → `canonical = iDFT(amplitudes)`,
  `cap = N`, `anchors = fit(canonical, defaultN)`, `residual = 0`.
- **`SplinePatch` existant** → `canonical = generated curve`, `cap = 256`
  (pas de cap actuellement en spline), `anchors` préservées,
  `residual = 0`.
- **`defaultN`** pour la fit initiale = 8.

Le champ `mode` est dropé silencieusement. Les champs `definition`, `N`,
`amplitudes`, `points` deviennent obsolètes ; on les ignore à la lecture,
on ne les écrit plus.

## 4. Comportements clés

### 4.1 Préservation du résidu (spline)

Concept : quand on bascule à la lentille spline et qu'on bouge une ancre,
les **détails fins du tracé survivent**.

Mécanique :
- À tout instant : `residual = canonical − spline_smooth(anchors, interpolation)`.
- Au drag d'ancre : nouvelles ancres → nouvelle `spline_smooth` → nouvelle
  `canonical = spline_smooth_new + residual`.
- Recalcul du `residual` : quand `canonical` est modifiée par une autre
  voie (tracé libre, normalisation, chargement de preset, changement de
  `cap`), `residual` est *recalculé* sur les ancres courantes.

Conséquence intuitive :
- Si `N` est grand → la spline approche bien le tracé → `residual` est
  petit → bouger une ancre déforme presque tout.
- Si `N` est petit → la spline est très lisse → `residual` contient
  l'essentiel du tracé → bouger une ancre fait une petite déformation, les
  détails survivent.

### 4.2 Normalisation (et son garde-fou)

Concept : éditer une barre d'harmonique signifie éditer une magnitude. Or
les magnitudes seules ne déterminent pas la courbe — il manque la phase.
Pour éditer cohéremment, il faut d'abord **normaliser** : remplacer
`canonical` par sa reconstruction iDFT à phase canonique (toutes harmoniques
en phase sinus). Après normalisation, l'édition de barres et la courbe sont
cohérentes (chaque drag de barre régénère la canonical via iDFT).

Mécanique :
- Bouton **Normaliser** dans la barre du haut. Action explicite,
  undoable atomique. Remplace `canonical` par
  `Σ magnitudes[k] · sin(2πkx/600)` (k=1..cap).
- Détection d'état « non normalisé » : `canonical` ≠ sa propre normalisation
  (à un epsilon près).
- Tentative d'édition d'une barre en état non normalisé :
  dialog « Pour modifier une harmonique, le tracé doit être normalisé
  (la phase sera abandonnée, la forme reconstruite à partir des
  magnitudes). [Normaliser et continuer] [Annuler] ». Au confirme :
  normalisation puis édition de la barre cliquée.
- Une fois normalisé, les éditions de barres ne demandent plus rien jusqu'à
  ce qu'une modification de courbe (tracé libre, ancre, preset) re-introduise
  une phase non canonique.

### 4.3 Courbe normalisée en arrière-plan

Toujours affichée dans la lentille Forme d'onde, en gris discret derrière
la courbe canonique :

- `normalized = Σ magnitudes_du_canonical[k] · sin(2πkx/600)` (k=1..cap).
- Coïncide avec `canonical` après normalisation explicite ; diverge sinon.
- Pédagogique : « voilà ce que ça deviendrait si tu normalisais maintenant ».
- Pas de coût : c'est une iDFT (sub-milliseconde), recalculée à chaque
  changement de canonical.

### 4.4 Lentilles toujours synchronisées, jamais lockées

Conséquence du modèle « canonique unique » :
- Drag d'une barre (post-normalisation) → màj magnitudes → màj canonical →
  màj courbe affichée + ancres re-fittées + spectro recalculé.
- Drag d'une ancre → màj canonical (via §4.1) → màj barres + spectro.
- Tracé libre → màj canonical → màj ancres re-fittées + barres + spectro.
- Aucune vue n'est jamais en read-only verrouillé. Toutes sont *réactives*.

## 5. UI réorganisée

### 5.1 Barre du haut (au-dessus des 3 zones)

Une seule barre horizontale qui regroupe les contrôles globaux du patch :

```
[Nom du patch]   [▼ Presets]   [⟲ Reset]   [⚖ Normaliser]   |   [⅓⅓⅓] [½¼¼] [¼½¼] [¼¼½]   [⏵ Auto]
```

- **Nom du patch** : à gauche, là où il est aujourd'hui (zone Forme d'onde).
- **Dropdown Presets** : remplace l'actuelle modale dans Harmoniques. Liste
  unifiée groupée par catégorie (évocateurs / inattendus-propres + tout
  ajout futur). Cliquer un preset charge directement (avec dialog dirty si
  modifications non sauvegardées).
- **Reset** : remet tracé + cap + ancres à un état neutre (sinusoïde
  fondamentale, cap = 256, ancres équiréparties). Confirmation si dirty.
- **Normaliser** : voir §4.2. Désactivé visuellement si déjà normalisé.
- **Séparateur** : visuel.
- **Boutons de proportions + toggle Auto** : ce qui existait déjà (M.2 +
  M.2-AS), juste déplacé là.

### 5.2 Zone Forme d'onde

Header :
- Switch **Libre ⇆ Ancres** (sélection de la lentille active).
- Switch **Doux ⇆ Anguleux** (visible quand Ancres est actif).
- Slider+text **Nombre d'ancres** (4..32, visible quand Ancres est actif).

Canvas :
- **Courbe canonique** au premier plan, accent bleu.
- **Courbe normalisée** en arrière-plan, gris discret (§4.3).
- En mode Ancres : **poignées draggables** sur la courbe (réutilise le
  pattern ADSR-poignées).
- Petite **légende discrète** rappelant « bleu = forme actuelle, gris =
  forme si normalisée ».

### 5.3 Zone Harmoniques

Header :
- Slider+text **`cap`** (1..256), libellé **« Harmoniques »**. Affichage
  de la valeur courante (« Harmoniques : 24 / 256 »).

Canvas :
- **Barres** d'amplitude (autant que `cap`), en bleu si état normalisé
  (éditables sans friction), en gris si état non normalisé (cliquable,
  déclenche le dialog §4.2).
- **Repères pointillés horizontaux** : amplitude relative (par ex. 25%, 50%,
  75%, 100%).
- **Axes labellisés** :
  - X : indice de l'harmonique, étiqueté sous forme **`kf`** (cohérent
    avec la convention math du projet où `f` est la fondamentale et `k`
    le multiplicateur entier). Étiquettes sur quelques colonnes
    représentatives (1f, 2f, 4f, 8f, …) pour ne pas saturer.
  - Y : amplitude relative, étiquetée 0 / 0.5 / 1.

### 5.4 Zone Spectrogramme

**Inchangée.** Toujours read-only, statique DFT + live FFT, Hz absolus.

## 6. Cap unifié (absorbe M.4.5)

- Champ `cap` unique, sur Patch et editor draft. Plage **1..256**.
- Action reducer unique `SET_EDITOR_CAP(value)`, undoable.
- Sémantique mode-dépendante mais cohérente :
  - **Lentille Forme d'onde (libre ou ancres)** : tronque le DFT à `cap`
    avant synthèse → `cap` basses harmoniques actives, le reste à zéro.
  - **Lentille Harmoniques** : nombre de barres affichées/éditables.
- Une seule UI (slider+text dans le header de la zone Harmoniques),
  visible et identique dans toutes les lentilles. **Plus dans la zone
  AHDSR** (qui est l'enveloppe d'amplitude, un autre concept).
- Conversion : la passerelle disparaît, donc plus de question de
  « préservation à la conversion » — `cap` reste tout simplement ce qu'il
  est.

## 7. Convention d'amplitude (auto-fit + marqueur ±1)

Problème : `Σ amplitudes[k] · sin(2πkx)` peut culminer à `Σ amplitudes[k]`
en un x donné. Avec 4 harmoniques à 1.0, pic possible = 4. La browser
auto-normalise `PeriodicWave` à pic 1.0, donc l'**audio est normalisé**,
mais l'affichage de la courbe canonique brute dépasse ±1.

**Convention adoptée (option 1 du triage)** :

- L'axe Y du canvas Forme d'onde **s'auto-fit** pour que toute la courbe
  rentre (pic visible, pas d'écrêtage visuel).
- Un **trait pointillé fin horizontal** marque le **niveau ±1 = niveau
  audio référence**. L'utilisateur voit que la forme va « au-dessus du
  bord audio » et comprend que le moteur normalisera.
- Le bouton Normaliser ne touche **pas** ce niveau (la normalisation
  concerne la phase, pas l'amplitude).
- Garde-fou anti-jumpy : transition douce du zoom Y plutôt qu'instantanée
  quand le pic change brutalement (transition CSS ou rAF lerp).

## 8. Hygiène canvas (règle technique transverse)

Les artefacts visuels après conversion spline observés en M.3 sont des
symptômes d'état canvas mal réinitialisé entre rendus. Discipline à
appliquer dans **tous** les composants canvas du Designer :

- **`ctx.save()` au début, `ctx.restore()` à la fin** de chaque fonction
  de rendu (waveform, harmoniques, spectro, ancres, courbe normalisée).
- **`lineWidth`, `strokeStyle`, `fillStyle`, `globalAlpha`, transforms** :
  jamais persistants entre rendus. Toujours réinitialisés au début.
- **Tests de non-régression** : switcher rapidement entre Libre/Ancres et
  faire varier `cap` rapidement ne doit jamais produire d'artefact visuel.

## 9. Découpage en phases prévu

À détailler dans les prompts dev `archi/Mr*-prompt.md`.

| Phase | Contenu | Poids |
|---|---|---|
| **M.r.1** | Nouveau modèle Patch (canonical + cap + anchors + residual), action `SET_EDITOR_CAP` unique, migration localStorage et `.osa`, suppression du `mode` discriminé. Hygiène canvas posée. | Lourd |
| **M.r.2** | UI réorganisée : barre du haut (nom + presets dropdown + Reset + Normaliser + séparateur + dimensionnement). Cap UI déplacé hors AHDSR vers header Harmoniques. Suppression de l'ancienne modale presets et des dialogs de conversion. | Moyen |
| **M.r.3** | Lentilles vivantes — switch Libre/Ancres inline dans le header Forme d'onde, anchors toujours fittées, résidu calculé, suppression du verrouillage 🔒. Tracé libre et drag d'ancres co-existent sans dialog. | Lourd |
| **M.r.4** | Courbe normalisée en background + bouton Normaliser fonctionnel + détection d'état + dialog edit-bars-requires-normalize. | Moyen |
| **M.r.5** | Convention d'amplitude — auto-fit Y axis + marqueur pointillé ±1 (transition douce). Repères horizontaux et axes labellisés dans la zone Harmoniques (`kf`, Y 0/0.5/1). | Léger |
| **M.5b** | (inchangé) passe doc writer, sur le modèle stabilisé. | Moyen |

Toutes les phases du rattrapage doivent passer build / typecheck / lint
verts, et inclure la mise à jour CONTEXT.md en fin de phase.

## 10. Hors scope

- **Refonte audio** : la chaîne `canonical → pointsToPeriodicWave →
  oscillator` ne change pas (invariant M.2 préservé).
- **Nouvelles lentilles** au-delà de Forme d'onde (libre/ancres) /
  Harmoniques / Spectro.
- **Animation** entre lentilles (à part la transition douce du zoom Y de
  §7 et celle des proportions en mode Auto qui existait déjà).
- **Refonte de la chaîne preset** : la liste/recettes (M.4.1) restent,
  seule l'UI de chargement change.
- **i18n complet** : reste backlog.

## 11. Bugs absorbés par le rattrapage

- **Preset bouton cassé dans Harmoniques** : la modale disparaît au profit
  du dropdown unifié de la barre du haut. Chemin de code éliminé.
- **Affichage waveform dégueulasse après conversion spline→autre** : le
  chemin « conversion » disparaît. La règle d'hygiène canvas (§8) évite
  qu'un équivalent réapparaisse via un autre déclencheur.

## 12. Risques / vigilance

- **Migration des patches** : tester avec un localStorage rempli des
  3 anciens types. Risque : un patch perdu = mauvaise UX immédiate.
- **Résidu** : valider à l'usage que la préservation des détails au drag
  d'ancre produit un comportement intuitif. Si non, fallback simple = pas
  de résidu (l'ancre écrase tout). Décision à prendre en passe d'usage
  post-M.r.3.
- **Auto-fit Y** : éviter le « jumpy zoom » quand le pic change
  brutalement (utilisation systématique d'une transition douce).
- **`cap = 1`** : tester que la lentille Harmoniques fonctionne avec une
  seule barre (cas dégénéré mais valide).
- **Bouton Normaliser désactivé** : s'assurer que la détection d'état
  normalisé/non est numériquement robuste (epsilon adapté).
