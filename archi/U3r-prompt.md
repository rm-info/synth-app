# Prompt U.3.r — Rectificatif U.3 : recentrage Création, badges Effets en toolbar, placement propre, trous comblés

## Contexte

Retours de validation U.3. Quatre corrections, indépendantes :

1. **Recentrage sur la Création** : la couverture **Bibliothèque** (badges
   sur l'onglet Bibliothèque) est hors scope de l'itération — à retirer.
   C'était un ajout de cadrage de l'archi, pas une erreur du dev.
2. **Badges Effets** : aujourd'hui il faut **sélectionner** un effet
   puis cliquer le badge sur le canvas d'édition. Peu ergonomique. On
   veut **un badge par effet directement sur les boutons du switcher**
   (header du module Effets), tous accessibles sans présélection.
3. **Placement des badges aux bords** : la pastille des contrôles
   proches des bords gauche/droit est **décalée vers l'intérieur** (elle
   épingle un bord sur le centre du contrôle au lieu d'être centrée
   dessus). Aspect non propre et inutile — l'ouverture du libellé gère
   déjà la proximité des bords.
4. **Trous de couverture Création** : 4 contrôles logiques visibles non
   couverts (audit archi).

**Aucun changement de modèle de données, d'audio, de parser markdown.**

## Spec fonctionnelle

### 1. Retrait de la couverture Bibliothèque

- Dans `lib/docTargets.js` : **supprimer les 13 entrées `library-*`**
  (la section « Bibliothèque » du registre). Plus aucune entrée avec
  `'library'` dans `contexts`.
- Conséquence assumée : l'onglet Bibliothèque **et** la sidebar
  Bibliothèque de la Création n'affichent plus de badge Info ;
  l'onglet Bibliothèque retombe sur le message « bientôt »
  (`infoMode.comingSoon`). C'est voulu — la doc interactive de
  l'itération U porte exclusivement sur les contrôles **propres** à la
  Création.
- Dans `src/docs/articles/guide-bibliotheque.md` : **retirer les 6
  suffixes `{#id}`** ajoutés en U.3 (headings `tes-patches`,
  `naviguer-deux-vues`, `trois-modes-affichage`, `organiser`,
  `supprimer`, `aller-plus-loin`) → l'article redevient identique à son
  état pré-U.3 (prose intouchée, headings sans suffixe).
- Ne pas toucher aux `data-anchor` `library-*` dans `PatchBank.jsx`
  (ils préexistent, servent Raccourcis/Tour).
- **À conserver explicitement** : les badges des **boutons d'actions de
  la sidebar Création** (Nouveau / Enregistrer / Enregistrer sous +
  Annuler / Rétablir) sont en contexte `'designer'`
  (`designer-new-button`, `designer-save-button`,
  `designer-save-as-button`, `global-undo-button-designer`,
  `global-redo-button-designer`) — ils **ne sont pas** des entrées
  `library-*` et **restent**. Seuls les contrôles du **PatchBank** (les
  13 `library-*`) sont retirés.

### 2. Badges Effets sur les boutons du switcher

- Déplacer les 9 ancres `designer-effect-<clé>` **du sous-bloc de
  contenu vers le bouton toggle correspondant** dans
  `buildEffectsHeaderItems()` (`WaveformEditor.jsx`). Chaque bouton
  d'effet porte `data-anchor="designer-effect-<clé-kebab>"`.
  - **Mapping camelCase → kebab** (les `eff.id` du builder sont
    camelCase, les ancres/fragments kebab) : `vibrato`→`vibrato`,
    `tremolo`→`tremolo`, `autoPan`→`auto-pan`, `pitchEnv`→`pitch-env`,
    `filter`→`filter`, `filterEnv`→`filter-env`, `wah`→`wah`,
    `distortion`→`distortion`, `driveEnv`→`drive-env`.
  - Le bouton est rendu à l'identique en `bar` et `tray` (même élément)
    — l'ancre suit les deux, `getAnchoredPosition` résout l'instance
    visible (pattern `designer-presets-button`). En mobile, les boutons
    sont relogés en toolbar via `moduleHeaderItems.modulation`, mêmes
    ancres → badges OK.
- **Retirer l'ancre `designer-effect-<clé>` des sous-blocs** de contenu
  (là où elle est posée aujourd'hui) pour éviter le doublon d'ancre.
- Dans `lib/docTargets.js` : **supprimer l'entrée `designer-modulation`**
  (le badge unique « Effets » du header devient redondant et
  chevaucherait les 9 boutons). **Garder** le `data-anchor="designer-
  modulation"` sur le `<header>` dans le DOM (peut servir Tour/Raccourcis ;
  on retire seulement l'entrée de registre). Les 9 entrées
  `designer-effect-*` restent, fragments inchangés (`#vibrato` …
  `#env-drive`).
- **Limite assumée** (à documenter en commentaire registre) : un effet
  dont le bouton déborde dans le tiroir `⋯` (colonne étroite) n'a pas de
  badge tant que le tiroir est fermé — cohérent avec tout item
  OverflowToolbar. Le modèle « un badge par bouton visible » est ce qui
  est demandé.

### 3. Placement des badges : pastille toujours centrée

- **Découpler** la position de repos de la pastille et le sens
  d'ouverture du libellé. Aujourd'hui `placeBadge` couple les deux via
  les zones `left`/`right`/`center` (`InfoOverlay.jsx` + `.css`).
- **Cible** : la pastille (icône au repos) est **centrée sur le
  contrôle dans tous les cas** (comme la zone `center` actuelle) — plus
  aucun décalage horizontal au repos près des bords.
- **Conserver** l'adaptation du **sens d'ouverture du libellé** au
  survol/focus pour éviter le débordement hors viewport : près du bord
  droit, le libellé se déploie **vers la gauche** ; ailleurs vers la
  droite. L'icône, elle, ne bouge pas (le libellé s'étend sans pousser
  la pastille hors de son centre — p.ex. libellé en position absolue à
  côté de l'icône, ou équivalent ; implémentation à ta main).
- Résultat attendu : au repos, toutes les pastilles sont centrées sur
  leur contrôle ; au survol d'un contrôle proche d'un bord, le libellé
  s'ouvre vers l'intérieur sans jamais sortir du champ ni recouvrir le
  bord. `EDGE_REGION` ne sert plus qu'à choisir le sens d'ouverture.

### 4. Trous de couverture Création

Poser l'ancre + l'entrée de registre + le heading squelette d'article.

#### 4a. Contrôles Instrument & Atelier (4)

| Contrôle | Fichier (approx.) | Nouvelle ancre | `doc` |
|---|---|---|---|
| **Catégorie de système** (dropdown distinct du système) | WaveformEditor.jsx ~3456 | `designer-system-category` | `creation-instrument#systeme-musical` |
| **Tonique des repères** (dropdown, visible si repères actifs) | WaveformEditor.jsx ~3514 | `designer-tonic-selector` | `creation-instrument#reperes-visuels` |
| **Degrés X-EDO** (NumberInput 1..128, visible si système x-edo) | WaveformEditor.jsx ~3493 | `designer-xedo-degrees` | `creation-instrument#x-edo` |
| **Auto-réduction des modules** (toggle FoldHorizontal) | DesignerToolbar.jsx ~70 | `designer-auto-collapse` | `creation-atelier#gerer-les-modules` |

- **Affinage ancre Catégorie/Système** : aujourd'hui
  `data-anchor="designer-system-selector"` est sur **toute la rangée**
  `instrument-system-row` (WaveformEditor.jsx ~3453), qui contient
  **les deux** dropdowns Catégorie + Système → un seul badge centré sur
  la rangée. **Déplace** `designer-system-selector` sur le **champ
  Système** (`instrument-system-field` du Système, ~3472) et pose
  `designer-system-category` sur le **champ Catégorie** (~3454) → deux
  badges distincts, même fragment `#systeme-musical`.
- **Tonique** partage le fragment de son voisin Repères
  (`#reperes-visuels`) — deux badges, même section (pattern undo/redo).
- **Degrés X-EDO** : nouvelle section `## … {#x-edo}` dans
  `creation-instrument.md`. Dans sa prose squelette (faits bruts),
  mentionner aussi la **bannière de conversion X-EDO** (« correspond à
  12-TET/24-TET → utiliser le layout dédié ») : elle **n'a pas de badge
  propre** (contrôle contextuel transitoire, même traitement que les
  hints « Activer le filtre » des effets), elle se documente dans cette
  section.
- **Auto-réduction** : la section `#gerer-les-modules` de
  `creation-atelier.md` documente la gestion des modules. Elle couvre
  **en prose** (sans badge — décision validée) le **chrome de module**
  (Réduire / Agrandir-Restaurer, sur chacun des 6 modules) et le
  **repli de la sidebar** Création (chevron). Elle gagne **un badge** :
  l'**auto-réduction** (toggle de la toolbar). Complète le squelette en
  conséquence.
- Respecter la **règle modale** : en disposition compacte, Catégorie/
  Système/X-EDO/Tonique sont relogés dans une modale → pas de badge
  dans ce cas (le mode Info est gaté modale-ouverte), doc en prose de
  la section parente. Ne pose pas d'ancres dédiées dans la modale.

#### 4b. Segments de l'enveloppe AHDSR (5)

La vue **sliders** de l'Enveloppe expose 5 segments réglables sans
ancre. Chacun reçoit un badge dédié (granularité fine validée).

| Contrôle | Ancre | `doc` |
|---|---|---|
| **Attaque** (slider A) | `designer-adsr-attack` | `creation-enveloppe#attaque` |
| **Maintien** (slider H, plateau) | `designer-adsr-hold` | `creation-enveloppe#maintien` |
| **Déclin** (slider D) | `designer-adsr-decay` | `creation-enveloppe#declin` |
| **Soutien** (slider S, niveau) | `designer-adsr-sustain` | `creation-enveloppe#soutien` |
| **Relâche** (slider R) | `designer-adsr-release` | `creation-enveloppe#relache` |

- Ancres posées sur chaque `.adsr-slider` (WaveformEditor.jsx, fonctions
  `renderAdsrSlider`/`renderSustainSlider` ~3940-3996). `Amplitude`
  garde son badge existant (`designer-amplitude`).
- **Visibilité** : ces sliders n'existent qu'en **vue sliders**
  (`adsrView==='sliders'`). En **vue graphe**, ils ne sont pas rendus →
  pas de badge (filtre `getAnchoredPosition`), et c'est le graphe qui
  porte l'overview.
- **Découpler l'ancre overview** : `designer-adsr` est aujourd'hui sur
  `we-adsr-area` (englobe les deux vues) → en vue sliders, son badge se
  superposerait aux 6 badges de segments. **Déplace** `designer-adsr`
  sur le **canvas du graphe** (vue graphe uniquement) pour qu'il ne
  résolve qu'en vue graphe ; son fragment reste
  `creation-enveloppe#enveloppe-ahdsr` (l'overview du graphe). Vérifie
  que la vue inactive est en `display:none` (rect nul → filtrée).
- **Anomalie de mapping à corriger** (repérée à l'audit) : la pastille
  `designer-sustain-pastille` (le **cadenas de maintien de la note de
  test**, dans le module **Instrument** près du clavier, WaveformEditor.jsx
  ~3738) pointe aujourd'hui vers `creation-enveloppe#sustain` — c'est le
  **Soutien de l'enveloppe**, un concept **différent** (niveau de
  l'enveloppe vs maintien de la note jouée). Repointe
  `designer-sustain-pastille` vers une cible Instrument cohérente
  (p. ex. `creation-instrument#clavier`, section qui couvre le jeu/test
  au clavier) ; le `#soutien` ci-dessus est réservé au slider S.

#### 4c. Sous-contrôles des effets — sections de concept partagées

Chaque panneau d'effet expose des sous-contrôles (steppers, switch de
forme/type, graphe éditable) aujourd'hui sans ancre. On les badge, mais
les paramètres **récurrent par famille** → une **section de concept par
paramètre**, partagée entre tous les effets de la famille (DRY, calque
les builders partagés `renderLfoBlock(effect)` /
`renderParamEnvBlock(effect)`).

**Familles, sous-contrôles et fragments cibles** (dans
`creation-effets.md`) :

| Famille (effets) | Sous-contrôle | Fragment partagé |
|---|---|---|
| **LFO** (vibrato, trémolo, auto-pan, wah) | Vitesse (rate Hz) | `#lfo-vitesse` |
| | Profondeur (depth — unité variable) | `#lfo-profondeur` |
| | Installation (onset ms) | `#lfo-installation` |
| | Forme (switch sin/tri/carré) | `#lfo-forme` |
| | Graphe LFO (poignées) | `#lfo-graphe` |
| **Enveloppe** (hauteur, env. filtre, env. drive) | Cible (amount) | `#env-cible` |
| | Durée (time ms) | `#env-duree` |
| | Inverser (toggle) | `#env-inverser` |
| | Forme (switch 4 courbes) | `#env-forme` |
| | Graphe d'enveloppe | `#env-graphe` |
| **Filtre** | Fréquence (cutoff) | `#filtre-frequence` |
| | Résonance (q) | `#filtre-resonance` |
| | Type (switch 4) | `#filtre-type` |
| | Graphe de réponse | `#filtre-graphe` |
| **Disto** | Drive | `#disto-drive` |
| | Mix | `#disto-mix` |
| | Courbe (switch 3) | `#disto-courbe` |
| | Graphe de transfert | `#disto-graphe` |

→ **18 fragments de concept** ; le writer (U.4) en rédige 18 au lieu de
~30 redites. La note d'unité par effet (profondeur en cents pour
vibrato/wah, 0..1 pour trémolo/auto-pan ; cible en cents pour
hauteur/env. filtre, gain ±1 pour env. drive) est portée par la prose
de la section partagée.

**Ancres** : par (effet, sous-contrôle), distinctes mais menant au même
fragment. Schéma `designer-fx-<effet-kebab>-<param>` (ex.
`designer-fx-vibrato-rate`, `designer-fx-tremolo-rate`, tous deux →
`#lfo-vitesse`). camelCase→kebab comme en §2 (autoPan→auto-pan,
pitchEnv→pitch-env, filterEnv→filter-env, driveEnv→drive-env).

- **Pose des ancres dans les builders partagés** :
  `renderLfoBlock(effect)` et `renderParamEnvBlock(effect)` reçoivent
  déjà `effect` → `data-anchor={`designer-fx-${kebab(effect)}-rate`}`
  etc. (un seul point de code couvre les 4 LFO / 3 enveloppes).
  `renderFilterBlock` / `renderDistortionBlock` sont des singletons
  (ancres littérales).
- **Entrées de registre** : ~43 (≈ 4×5 + 3×5 + 4 + 4). Les générer par
  **boucles** dans `docTargets.js` (un petit builder par famille qui
  émet les entrées effet×paramètre vers les fragments partagés) plutôt
  que 43 entrées à la main — reste déclaratif, DRY, cohérent avec
  l'esprit `SHORTCUTS`. Documente le générateur en commentaire.
- **Visibilité** : un seul panneau d'effet est visible à la fois (les
  autres `display:none`) → au plus une famille de badges de panneau
  affichée, en plus des 9 badges de boutons. Pas de collision d'ancre
  (chaque effet a ses propres ancres).
- **Pas de badge** sur l'interrupteur on/off in-panel (couvert par le
  badge du bouton d'effet → section de l'effet) ni sur les hints
  « Activer le filtre / la disto » (transitoires, prose).
- **Granularité graphe** : un seul badge par graphe (`#…-graphe`),
  centré sur la surface — il documente l'édition visuelle (toutes les
  poignées), pas une poignée = un badge.

## Découpage en sous-commits

1. `fix(iter-U/phase-3.r1): retrait couverture Bibliothèque (registre +
   {#id} guide-bibliotheque)`
2. `feat(iter-U/phase-3.r2): badges Effets sur les boutons du switcher
   (ancres déplacées header, entrée designer-modulation retirée)`
3. `fix(iter-U/phase-3.r3): badges Info centrés sur le contrôle au repos
   (découplage position / sens d'ouverture du libellé)`
4. `feat(iter-U/phase-3.r4): couverture Instrument & Atelier (catégorie,
   tonique, degrés X-EDO, auto-réduction ; affinage ancre système)`
5. `feat(iter-U/phase-3.r5): badges des 5 segments AHDSR + découplage
   ancre overview + fix mapping sustain-pastille`
6. `feat(iter-U/phase-3.r6): sous-contrôles des effets — ancres dans les
   builders partagés + registre généré par famille (concepts partagés)`
7. `docs: CONTEXT.md — Iteration U phase 3.r (rectificatif couverture)`

## Comportement attendu

- Onglet Bibliothèque : Ctrl+I → message « bientôt », aucun badge. Sidebar
  Bibliothèque de la Création : aucun badge non plus. Les autres badges
  Création inchangés.
- Module Effets, Ctrl+I, colonne large : **9 badges**, un par bouton
  d'effet du switcher, chacun mène directement à sa section — **sans**
  présélection. Plus de badge sur le canvas d'édition, plus de badge
  « Effets » global sur le header. Colonne étroite : seuls les boutons
  restés en barre portent un badge (ceux du tiroir `⋯` non).
- Badges aux bords : pastilles **centrées** sur leur contrôle au repos
  (un bouton tout à droite a sa pastille sur lui, pas décalée vers
  l'intérieur). Au survol, le libellé s'ouvre vers l'intérieur sans
  déborder du viewport ni masquer le contrôle.
- Instrument : badge sur **Catégorie** (distinct de Système) → section
  Système ; badge sur **Tonique** (si repères actifs) → section Repères ;
  badge sur **Degrés X-EDO** (si système X-EDO) → section X-EDO. Bannière
  X-EDO : pas de badge, couverte en prose.
- Atelier : badge sur **Auto-réduction** → `#gerer-les-modules`. Chrome
  de module (réduire/agrandir/maximiser) et repli de la sidebar :
  **aucun badge**, couverts en prose dans cette section.
- Instrument : **deux** badges distincts Catégorie / Système (plus un
  seul badge centré sur la rangée).
- Enveloppe, **vue sliders** : badges Amplitude + **Attaque / Maintien /
  Déclin / Soutien / Relâche** (6 au total), chacun vers sa section ;
  **pas** de badge overview superposé. **Vue graphe** : un seul badge
  (le graphe → `#enveloppe-ahdsr`), pas de badge de segment.
- Pastille de maintien (cadenas, Instrument) → section Instrument
  (clavier/test), plus vers `#sustain` de l'enveloppe.
- Effets, panneau sélectionné : badges sur ses steppers + switch de
  forme/type + graphe, menant aux **sections de concept partagées**
  (le « Vitesse » du Vibrato et du Trémolo ouvrent la même `#lfo-vitesse`).
  Changer d'effet sélectionné → la famille de badges suit. Aucun badge
  sur les panneaux masqués. Cliquer chaque sous-contrôle : fragment
  partagé résolu, pas de warn DEV.
- Cliquer chaque badge Création : aucun warn DEV « fragment introuvable »
  (tout `doc:` du registre résout). `npx tsc --noEmit` + lint propres.
- `guide-bibliotheque.md` : diff = retrait des 6 `{#id}`, rien d'autre.

## Hors scope

- Toute prose pédagogique (writer, U.4) — on ne fait que les squelettes
  factuels des nouvelles sections/headings.
- Couverture Composition / Documentation.
- Réintroduction de la Bibliothèque sous une autre forme (si on veut un
  jour documenter la sidebar Bibliothèque de la Création, ce sera une
  décision dédiée).
- Tour guidé.

## Validation manuelle suggérée

Ctrl+I sur les 9 effets (large + tiroir étroit + mobile) ; badges aux
quatre coins de la fenêtre (centrage repos + ouverture libellé) ;
Instrument en système-based / X-EDO / repères actifs / disposition
compacte (modale, pas de badge) ; onglet Bibliothèque (message
« bientôt ») ; clic exhaustif des badges Création sans warn ; deux
thèmes ; reload.
