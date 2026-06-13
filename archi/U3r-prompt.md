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

### 4. Trous de couverture Création (4 contrôles)

Poser l'ancre + l'entrée de registre + le heading squelette d'article.

| Contrôle | Fichier (approx.) | Nouvelle ancre | `doc` |
|---|---|---|---|
| **Catégorie de système** (dropdown distinct du système) | WaveformEditor.jsx ~3456 | `designer-system-category` | `creation-instrument#systeme-musical` |
| **Tonique des repères** (dropdown, visible si repères actifs) | WaveformEditor.jsx ~3514 | `designer-tonic-selector` | `creation-instrument#reperes-visuels` |
| **Degrés X-EDO** (NumberInput 1..128, visible si système x-edo) | WaveformEditor.jsx ~3493 | `designer-xedo-degrees` | `creation-instrument#x-edo` |
| **Auto-réduction des modules** (toggle FoldHorizontal) | DesignerToolbar.jsx ~70 | `designer-auto-collapse` | `creation-atelier#gerer-les-modules` |

- **Catégorie** et **Tonique** partagent le fragment de leur voisin
  (système / repères) — deux badges, même section, pattern déjà en
  place (undo/redo, free-frequency/test). Vérifie que l'ancre
  `designer-system-category` est bien posée sur le dropdown **Catégorie**
  et reste **distincte** de `designer-system-selector` (le dropdown
  Système).
- **Degrés X-EDO** : nouvelle section `## … {#x-edo}` dans
  `creation-instrument.md`. Dans sa prose squelette (faits bruts),
  mentionner aussi la **bannière de conversion X-EDO** (« correspond à
  12-TET/24-TET → utiliser le layout dédié ») : elle **n'a pas de badge
  propre** (contrôle contextuel transitoire, même traitement que les
  hints « Activer le filtre » des effets), elle se documente dans cette
  section.
- **Auto-réduction** : la section `#gerer-les-modules` de
  `creation-atelier.md` existe déjà (prévue « sans badge » en U.3 pour
  réduire/agrandir/maximiser) — elle gagne maintenant **ce** badge.
  Compléter son squelette avec le fait de l'auto-réduction.
- Respecter la **règle modale** : en disposition compacte, Catégorie/
  Système/X-EDO/Tonique sont relogés dans une modale → pas de badge
  dans ce cas (le mode Info est gaté modale-ouverte), doc en prose de
  la section parente. Ne pose pas d'ancres dédiées dans la modale.

## Découpage en sous-commits

1. `fix(iter-U/phase-3.r1): retrait couverture Bibliothèque (registre +
   {#id} guide-bibliotheque)`
2. `feat(iter-U/phase-3.r2): badges Effets sur les boutons du switcher
   (ancres déplacées header, entrée designer-modulation retirée)`
3. `fix(iter-U/phase-3.r3): badges Info centrés sur le contrôle au repos
   (découplage position / sens d'ouverture du libellé)`
4. `feat(iter-U/phase-3.r4): couverture des 4 contrôles Création
   manquants (catégorie, tonique, degrés X-EDO, auto-réduction)`
5. `docs: CONTEXT.md — Iteration U phase 3.r (rectificatif couverture)`

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
- Atelier : badge sur **Auto-réduction** → `#gerer-les-modules`.
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
