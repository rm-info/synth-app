# Prompt U.5 — Mise à jour du Tour de découverte (Création)

## Contexte

2ᵉ gros morceau de l'itération U. La doc interactive (mode Info, Ctrl+I)
est livrée et peuplée. Le **Tour guidé** (Ctrl+J) de l'onglet Création
(`src/lib/tours/designer.js`) date de l'itération L (**9 étapes**) et
ignore tout ce qui est arrivé en M→T — surtout le **module Effets**
(9 effets), qu'un nouvel utilisateur ne peut donc pas découvrir.

**Rôle du Tour, acté** : maintenant que l'Info couvre tout à la demande,
le Tour reste une **rampe d'accueil narrative resserrée** (~10-14 étapes)
— le parcours d'un débutant : *faire un son → le sculpter → l'écouter →
découvrir qu'il y a des effets → enregistrer*. Chaque étape **pointe vers
son article `creation-*`** pour le détail ; le tour **se termine en
renvoyant vers Ctrl+I**. Le Tour oriente, l'Info détaille — pas de redite
de la couverture exhaustive.

Le moteur `Tour.jsx` est sain et partage `getAnchoredPosition` avec
l'Info. Schéma d'étape actuel : `{ anchor, title, body, article?,
sidebar? }`. Le `snapshot` (capturé à START_TOUR, restauré à END_TOUR)
sauvegarde `activeTab` + 4 sidebars, **mais pas l'état de repli des
modules ni la sélection mobile** — d'où l'impossibilité actuelle de
révéler un module replié (le champ `prepare` du schéma n'est pas
branché).

## Spec fonctionnelle

### 1. Moteur — révélation de module (`revealModule`)

Pour pointer un module qui peut être replié (Effets, Harmoniques,
Spectro, AHDSR sous auto-réduction), le tour doit pouvoir le **déplier
avant de pointer**, puis **restaurer** l'état initial en fin de tour.

- **Nouveau champ d'étape** `revealModule?: <moduleId>` (∈ `canvas`,
  `harmonics`, `spectrogram`, `params`, `adsr`, `modulation`). À
  l'activation de l'étape, le moteur garantit la visibilité du module :
  - **Desktop** : si `designerCollapsed[id]` est vrai → le déplier
    (collapsed = false). (En bande auto-réduction 924-1100, un dépli
    manuel doit tenir — vérifier qu'il n'est pas immédiatement
    contremandé.)
  - **Mobile** (switcher) : poser `designerMobileModule = id` pour
    amener le module en plein cadre.
- **Étendre le `snapshot`** du tour à `designerCollapsed` (les 6
  booléens), `maximized` et `designerMobileModule`, **restaurés à
  END_TOUR** (pas à END_TOUR_NO_RESTORE — cohérent avec l'existant). La
  révélation est progressive (chaque étape déplie ce qu'elle cible) ;
  tout est remis à l'état initial à la fermeture.
- Implémentation au choix : brancher le champ `prepare` générique, ou un
  `revealModule` dédié — le plus simple et lisible. Réutilise les
  actions de repli existantes (`TOGGLE_DESIGNER_MODULE_COLLAPSED` /
  l'action `designerMobileModule`) ou une action de révélation dédiée.
- Étape dont l'ancre reste introuvable après révélation (cas résiduels
  responsive) : **sautée proprement**, comportement actuel inchangé.

### 2. Moteur — « En savoir plus » vers une section précise

Le champ `article?` ouvre aujourd'hui un article entier. La doc U.1
fournit `navigateToDoc(articleId, fragment)` (liens profonds + scroll +
flash). **Étendre `article` à `'article-id#fragment'`** : le bouton « En
savoir plus » route via `navigateToDoc`, atterrissant sur **la section
exacte**. Sans fragment : comportement actuel. (END_TOUR_NO_RESTORE +
navigation, inchangé par ailleurs.)

### 3. Données — réécriture de `designer.js`

Nouvelle séquence resserrée (~12 étapes), arc narratif d'un débutant.
Chaque étape : `anchor` vivante, `title` court, `body` 1-2 phrases au
**tutoiement** (registre des tours existant), `article` vers la bonne
section `creation-*#fragment`, `revealModule`/`sidebar` au besoin.

Trame proposée (ajuste les libellés ; garde l'esprit) :

| # | anchor | sujet | article# | reveal |
|---|--------|-------|----------|--------|
| 1 | `designer-waveform` | dessiner le timbre | `creation-forme-onde#dessiner` | canvas |
| 2 | `designer-lens-toggle` | deux façons d'éditer (Libre/Ancres) | `creation-forme-onde#libre-ancres` | canvas |
| 3 | `designer-harmonics` | le même son vu par ses harmoniques | `creation-harmoniques#barres-harmoniques` | harmonics |
| 4 | `designer-spectrogram` | visualiser les fréquences jouées | `creation-spectrogramme#lire-le-spectrogramme` | spectrogram |
| 5 | `designer-system-selector` | choisir l'accordage | `creation-instrument#systeme-musical` | params |
| 6 | `designer-keyboard` | jouer pour écouter | `creation-instrument#clavier` | params |
| 7 | `designer-adsr` | sculpter le volume dans le temps | `creation-enveloppe#enveloppe-ahdsr` | adsr |
| 8 | `designer-modulation` | **9 effets sans mémoire** (vibrato, filtre, disto…) | `creation-effets#choisir-un-effet` | **modulation** |
| 9 | `designer-presets-button` | partir d'un timbre tout fait | `creation-atelier#timbres-presets` | — |
| 10 | `designer-miniplayer` | écouter la composition | `creation-atelier#ecouter` | — |
| 11 | `designer-save-as-button` | enregistrer dans la Bibliothèque | `creation-atelier#enregistrer-sous` | (sidebar designer) |
| 12 | `header-info-button` | **« Pour le détail de n'importe quel contrôle, ouvre la doc interactive (Ctrl+I) »** | — | — |

- L'**étape 8 (Effets)** est le cœur de la mise à jour : elle pointe le
  module via `revealModule: 'modulation'`, le présente en une phrase
  (famille d'effets, « sans mémoire »), et renvoie à l'article. **Pas**
  de plongée dans un effet précis (décision : étape unique).
- L'**étape 12** est le pont Tour → Info : ancre `header-info-button`,
  body invitant à Ctrl+I. (Pas d'`article`.)
- Tu peux fondre octave dans l'étape clavier (body) plutôt qu'une étape
  dédiée, pour rester resserré ; idem si une étape te paraît de trop.
  Reste dans ~10-14.

### 4. Vérifications transverses

- Les tours **library / composer / documentation** ne sont pas touchés.
- L'article généré **Raccourcis** liste déjà Ctrl+I (via `SHORTCUTS`) ;
  vérifier qu'aucun texte « Tour » n'y est périmé.
- `CONTEXT.md` : mettre à jour la description du tour Création + le
  champ `revealModule` + l'extension du snapshot.

## Découpage en sous-commits

1. `feat(iter-U/phase-5.1): moteur Tour — révélation de module
   (revealModule) + snapshot étendu (designerCollapsed/maximized/mobile)`
2. `feat(iter-U/phase-5.2): Tour — « En savoir plus » vers article#fragment
   (via navigateToDoc)`
3. `feat(iter-U/phase-5.3): réécriture du tour Création (~12 étapes,
   rampe d'accueil + étape Effets + pont Ctrl+I)`
4. `docs: CONTEXT.md — Iteration U phase 5 (Tour Création à jour)`
   (+ CONTEXT-ARCHIVE si tu y closes l'itération U).

## Comportement attendu

- Ctrl+J sur la Création (desktop large) : ~12 étapes fluides, spotlight
  + bulle corrects, chaque « En savoir plus » ouvrant la **bonne section**
  de l'article (scroll + flash).
- **Étape Effets** : si le module Effets était replié, il se **déplie**
  pour l'étape ; le spotlight le cible ; en fin de tour il **retrouve**
  son état initial (déplié/replié comme avant le tour).
- Idem pour Harmoniques / Spectro / AHDSR si repliés (auto-réduction
  < 1100px) : révélés à leur étape, restaurés en fin.
- **Étape finale** : spotlight sur le bouton Info, invite à Ctrl+I.
- Fin du tour (Échap ou dernière étape) : **état des modules, du switcher
  mobile et des sidebars restauré** à l'identique d'avant le lancement.
  « En savoir plus » (END_TOUR_NO_RESTORE) : pas de restauration (comme
  aujourd'hui), on quitte vers la doc.
- Mobile (switcher) : `revealModule` amène le bon module en plein cadre ;
  étapes dont l'ancre reste introuvable, sautées proprement.
- Aucune régression des tours library / composer / documentation.
- `npx tsc --noEmit` + lint propres.

## Hors scope

- Mini-séquence par effet / sélection d'un effet précis dans le tour
  (décision : étape unique sur le module).
- Refonte du moteur de positionnement (spotlight/bulle) — il fonctionne.
- Couverture exhaustive des contrôles dans le tour (c'est le rôle de
  l'Info ; le tour reste une rampe).
- Tours des autres onglets (mise à jour séparée si besoin un jour).
- Prose longue : les `body` sont de la microcopie courte (≤ 2 phrases).
  Une passe writer de polish reste possible en suivi si tu le souhaites.

## Validation manuelle suggérée

Desktop large (les 12 étapes, chaque « En savoir plus » → bonne section) ;
desktop 924-1100 (modules auto-repliés : révélation + restauration) ;
mobile < 924 (switcher : révélation plein cadre, sauts propres) ; lancer
le tour avec le module Effets replié PUIS maximisé (restauration correcte
dans les deux cas) ; Échap en milieu de tour (restauration) ; « En savoir
plus » (pas de restauration, arrivée sur la section) ; les deux thèmes.
