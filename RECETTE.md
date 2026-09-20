# RECETTE.md — Synth App

> Tout ce qui a été livré **sans validation visuelle en navigateur** et qui attend
> une passe de recette. Tenu par l'implémenteur : chaque livraison non vérifiée à
> l'écran ajoute ses points ici, en haut de « À recetter ».
>
> **Mode d'emploi** : coche `[x]` ce qui passe. Si un point échoue, laisse `[ ]` et
> note dessous `→ KO : ce que tu as vu` (navigateur, taille de fenêtre, étapes). Un
> lot entièrement coché descend dans « Recetté » (une ligne, avec la date) ; les
> entrées « à valider » correspondantes de `archi/BACKLOG.md` peuvent alors être
> retirées.
>
> Les points marqués **(prod)** se jugent sur un build de prod (`npm run build` +
> `npm run preview`) : en dev, StrictMode et jsxDEV gonflent les temps de rendu et
> faussent tout ce qui touche à la fluidité.

---

## À recetter

### Lot 2026-09-21 — clôture U (v1.13.0) + correctifs post-U

#### 1. Release et retrait de l'article de test — `47ccb88`, `0e46302`

- [ ] Le numéro de version affiché dans le header est **1.13.0**.
- [ ] Onglet Documentation : la section « Interne » et l'article « Test renderer »
      ont disparu du sommaire ; les autres sections sont intactes.
- [ ] Les sept articles « La Création en détail » s'ouvrent, et leurs schémas SVG
      s'affichent (enveloppe, filtre, distorsion, harmoniques, forme d'onde, LFO).
- [ ] Si ta session doc pointait sur l'article de test (dernier article ouvert
      restauré au chargement), l'onglet Documentation s'ouvre quand même proprement.

#### 2. Bibliothèque sous 900 px — `2694ff9` (qw.1)

Avant : sous 900 px de large, l'onglet entier s'écrasait en bandeau de ~250 px.

- [ ] Fenêtre à ~850 px de large : la Bibliothèque occupe **toute la hauteur**
      disponible, la liste défile à l'intérieur.
- [ ] Même chose dans les deux hiérarchies (Navigation, Arborescence) et les deux
      affichages (liste, tuiles).
- [ ] À ~600 px et en dessous : rien ne déborde horizontalement, les chips restent
      lisibles. *(La passe responsive complète de l'onglet n'est pas faite : note ce
      qui te gêne, ça nourrira le chantier au backlog.)*
- [ ] Au-dessus de 900 px : aucun changement par rapport à avant.
- [ ] Sidebar et popover de patches en Création et en Composition : inchangés à
      toutes les largeurs (ils n'utilisaient pas cette règle).

#### 3. Icônes undo/redo de la Composition — `da941fb` (qw.2)

- [ ] Les deux boutons affichent les icônes Lucide (flèches courbes), **centrées**
      dans leur carré, de la même famille visuelle que celles de la Création et de
      la Bibliothèque.
- [ ] Poids optique cohérent avec les boutons voisins de la toolbar (ni trop gros,
      ni trop fin).
- [ ] État désactivé (rien à annuler / rétablir) : icône estompée.
- [ ] Survol et focus clavier : même rendu que les autres boutons de la toolbar.
- [ ] Thème clair **et** thème sombre.
- [ ] Toolbar en largeur réduite (passage en tiroir `⋯`) : les boutons restent
      corrects.

#### 4. Ctrl+D n'ouvre plus les favoris — `0cd1fd3` (qw.4)

Rappel : Ctrl+D = diviser par 2, Ctrl+Shift+D = diviser par 3. À faire dans
**Chrome et Firefox**. Dans tous les cas ci-dessous, le dialogue de favori du
navigateur ne doit **jamais** s'ouvrir.

- [ ] Composition, **aucun clip sélectionné** (clic dans le vide puis Ctrl+D).
- [ ] Onglet Création.
- [ ] Onglet Bibliothèque.
- [ ] Onglet Documentation.
- [ ] Composition, juste après avoir bougé un **slider de volume** de piste (le
      focus reste dessus).
- [ ] Composition, juste après avoir changé un **menu déroulant** (patch, système…).
- [ ] Mêmes cas avec **Ctrl+Shift+D** (dans Chrome : « ajouter tous les onglets
      aux favoris »).
- [ ] Non-régression : avec un clip sélectionné, Ctrl+D le divise bien en deux, et
      Ctrl+Shift+D en trois.
- [ ] Comportement voulu : dans un **champ texte** (renommage de piste, nom de
      patch), Ctrl+D garde le comportement du navigateur.

#### 5. Zoom horizontal de la timeline sans micro-sauts — `c5816f8` (qw.5) **(prod)**

Avant : au dezoom à la molette, la timeline faisait un petit saut d'une ou deux
frames avant de se recaler. Prends une timeline **longue et chargée**.

- [ ] Ctrl+molette en **dezoom rapide**, souris au milieu : plus de saut, le temps
      sous la souris reste fixe.
- [ ] Même chose, souris près de la **fin** de la timeline.
- [ ] Même chose, défilement proche de **0** (tout à gauche).
- [ ] Ctrl+molette en **zoom avant**, mêmes trois positions.
- [ ] Un cran de molette à la fois : la position finale est juste, sans saut
      transitoire.
- [ ] En **butée** de zoom (min puis max) : un cran de plus ne fait rien bouger.
- [ ] **Zoom rectangle Alt+drag** : la zone sélectionnée arrive centrée — au milieu,
      en fin de timeline, et quand le zoom est déjà en butée max.
- [ ] Après un zoom molette, change le zoom par les boutons **+ / −** de la
      toolbar : pas de saut parasite.

#### 6. Page et overlay Raccourcis — `d6ddae6` (qw.3)

- [ ] Overlay Raccourcis (Ctrl+K) : une étiquette **Ctrl+J** apparaît sur le bouton
      Visite guidée du header, sans chevaucher celle du bouton Info (Ctrl+I).
- [ ] Article Raccourcis (onglet Documentation), section Global : entrée « Visite
      guidée — Ctrl+J ».
- [ ] Section Création : entrée « Supprimer l'ancre sélectionnée — Suppr ». Elle
      n'apparaît **pas** dans l'overlay (pas d'ancre, c'est voulu).
- [ ] Les descriptions nomment les onglets « Création » et « Composition » (plus
      « Designer » / « Composer »).
- [ ] Relis les descriptions réécrites et dis si elles collent à ce que tu observes :
      Coller (Composition), Durée — base (1 = carrée, 2 = ronde), Durée —
      coefficient (rappuyer retire), Fusionner (même piste, patch **et hauteur**),
      Coller et Renommer (Bibliothèque), Touches notes (Shift+touche en X-EDO à
      partir de N = 44).

---

## Diagnostics à confirmer à la main

Pas des livraisons : des anomalies **déduites de la lecture du code**, jamais
observées. Ton constat décide si elles deviennent des bugs à corriger. Note le
résultat sous chaque point.

#### A. `isDirty` de la Création (préalable à l'indicateur « patch modifié »)

- [ ] **Faux positif** : charge un patch enregistré, ne touche à **rien**, puis
      charge un autre patch. Si « Abandonner les modifications ? » apparaît → confirmé.
- [ ] **Faux négatif** : charge un patch, clique « Mettre à jour », puis modifie
      **seulement un effet** (par ex. active le filtre) ou le tracé libre, puis
      charge un autre patch. Si **aucun** confirm n'apparaît → confirmé.

#### B. Suppr / Échap sans filtre d'onglet ⚠ destructif

Travaille sur une composition jetable (Ctrl+Z en Composition doit rattraper).

- [ ] Composition : sélectionne deux clips. Passe en Création, appuie sur **Suppr**.
      Reviens en Composition : si les clips ont disparu → confirmé.
- [ ] Variante : en Création, mode Ancres, une ancre sélectionnée **et** une
      sélection de clips laissée en Composition : Suppr retire-t-il les deux ?

#### C. Flèches ↑/↓ sur un clip hors 12-TET

- [ ] Pose un clip en 24-TET (ou shrutis, slendro, pelog, X-EDO), note sa hauteur,
      sélectionne-le, **↑** puis **↓**. S'il ne revient pas à la hauteur de départ,
      ou saute à une note incohérente → confirmé. Essaie aussi Shift+↑ (octave).

#### D. Note bloquée en mode Libre (mineur)

- [ ] Seulement si tu as une disposition clavier autre qu'AZERTY/QWERTY sous la
      main : en mode Libre, maintiens puis relâche la touche de test ; la note
      s'arrête-t-elle ?

---

## Recetté

*(rien pour l'instant)*
