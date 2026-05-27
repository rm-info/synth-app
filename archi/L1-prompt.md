# Prompt L.1 — Iteration L (Documentation)

## Contexte

L.0 (audit raccourcis) livré en commit `a70c714`. Session archi
d'arbitrage des orphelins tenue le 2026-05-27. Décisions consignées
dans `archi/BACKLOG.md` section **"Spécifications L.1 (arbitrées
2026-05-27)"** (à lire en premier).

**Objectif L.1** : poser la fondation technique de l'Iteration L
(documentation utilisateur). Refacto des raccourcis vers une table
déclarative source de vérité, convention `data-anchor` sur les
éléments d'UI, composant overlay "lever le voile" toggleable avec
Ctrl+K, et corrections UI ciblées issues de l'audit (pastille
Sustain promue, bouton Coller Composer, chip clipboard Bibliothèque,
halo anchor clip Composer, notion "piste sélectionnée", tooltips
incohérents).

**Sortie de L.1 attendue** : l'overlay et le bouton header sont
fonctionnels (Ctrl+K affiche les étiquettes ancrées sur les éléments
de l'onglet actif, ESC ou croix referme). L'app continue de
fonctionner exactement comme avant en dehors du toggle overlay.
Aucune modification de comportement métier — uniquement de la
refacto, des ajouts d'éléments visuels, et du nouveau code overlay.

## Pré-lecture obligatoire

1. `CONTEXT.md` (racine) — état de référence du projet
2. `archi/BACKLOG.md` section "Iteration L" + "Spécifications L.1"
3. `archi/L0-audit-raccourcis.md` — inventaire de référence

## Découpage en sous-commits

L.1 est gros — découpe en 6 sous-commits indépendants, dans l'ordre.
Chaque sous-commit doit être fonctionnellement neutre ou observable
isolément (pour bisect en cas de régression).

### L.1.1 — Table déclarative `src/lib/shortcuts.js` (source de vérité)

`refactor(iter-L/phase-1.1): table déclarative shortcuts.js`

Créer `src/lib/shortcuts.js` avec une constante `SHORTCUTS` (array
d'objets) déclarant **tous les raccourcis listés dans l'audit L.0**
sauf ceux explicitement exclus (cf. ci-dessous).

**Champs par entrée** (proposition, à adapter si besoin) :

```js
{
  id: 'composer-paste',          // identifiant stable
  contexts: ['composer'],        // 'library' | 'designer' | 'composer' | 'global'
  label: 'Coller',               // libellé court pour l'overlay
  description: '...',            // 1 phrase pour future page A.1 (générée)
  keys: {
    primary: 'Ctrl/Cmd+V',       // combo principale
    alternative: null,           // combo alternative (ex: Ctrl+Y pour Rétablir)
    display: 'Ctrl+V',           // affichage canonique dans l'UI
  },
  anchor: 'composer-paste-button', // valeur de `data-anchor` cible
  condition: null,                 // optionnel : predicate (state) => boolean
                                   // pour filtrer dans l'overlay (ex: ne pas
                                   // montrer Ctrl+M si selection < 2 clips)
}
```

**Inclus** : tous les raccourcis listés dans les tableaux Global /
Designer / Composer / Bibliothèque de L.0, **sauf** :
- C17 (touche note maintenue pendant drag) — reporté au sujet UX
- Cas-limites C2, B7, B9, PatchBank ↑↓, PatchBank Shift+↑↓ — ergo
  standard, exclus
- Touches notes Designer / Composer — **inclus sous une forme
  composite spécifique** (cf. ci-dessous)

**Forme composite pour les touches notes** : impossible de lister
les touches en dur (mapping dépendant de `testTuningSystem` et
`xEdoN`). Deux entrées dédiées :

```js
{
  id: 'designer-notes',
  contexts: ['designer'],
  label: 'Touches notes',
  description: 'Joue/relâche les notes du système actif',
  keys: { primary: '(touches du clavier)', display: '— mapping live —' },
  anchor: 'designer-keyboard',  // ancre sur le clavier visuel entier
  composite: true,              // flag pour rendu spécial (cf. L.1.5)
}
{
  id: 'composer-notes-contiguous',
  contexts: ['composer'],
  label: 'Placement contigu',
  description: 'Place un clip après l\'ancre à la note pressée',
  keys: { primary: '(touches du clavier au relâchement)', display: '— mapping live —' },
  anchor: 'composer-anchor-clip',
  composite: true,
}
```

Le rendu overlay des entrées `composite: true` est traité en L.1.5
(étiquettes spéciales sur les touches du clavier visuel pour le
Designer, et label flottant explicatif sur le halo anchor pour le
Composer).

**Helper de matching** (dans le même fichier) :

```js
export function matchesShortcut(e, shortcutId) { ... }
```

Doit gérer Ctrl/Cmd interchangeables (`'Ctrl/Cmd+V'`), Shift, Alt,
les codes physiques (`NumPad1..7`, `Digit1..7`), et la combinaison
`alternative` quand présente (ex: Ctrl+Y matche aussi
`global-redo`). Tests minimaux : ajouter un fichier
`src/lib/shortcuts.test.js` (Vitest) couvrant matching et listing,
si le projet a déjà du test runner, sinon documenter en commentaire
les cas testés mentalement.

**Important** : cette table doit refléter l'**affichage canonique
post-corrections**, donc :
- `global-redo` : `keys.display = 'Ctrl+Shift+Z'` (uniforme cross-onglet)
- `editor-octave` : `keys.display = 'PageUp/PageDown'`

À ce stade, **personne ne consomme la table** — c'est l'étape
suivante. Commit fonctionnellement neutre.

---

### L.1.2 — Refacto handlers pour consommer la table

`refactor(iter-L/phase-1.2): handlers consomment shortcuts.js`

Remplacer les conditions imperative dans les handlers existants par
des appels à `matchesShortcut(e, id)`.

**Fichiers concernés** :
- `src/App.jsx` (handlers globaux : Ctrl+Z, Ctrl+Shift+Z/Ctrl+Y,
  PageUp/Down, Delete/Backspace, ↑↓/←→ Composer, NumPad/Shift+Digit,
  Ctrl+CXVMD Composer)
- `src/components/WaveformEditor.jsx` (Espace sustain, `s` test
  Libre, touches notes — note : les touches notes restent matched
  par le mapping system-dependent, pas par `matchesShortcut`, mais
  le **guard `NOTE_GUARD_KEYS`** doit rester en place)
- `src/components/PatchBank.jsx` (raccourcis Bibliothèque gatés par
  `isFocusedRef`)

**À ne pas casser** :
- L'ordre d'évaluation et les guards (skip form fields, skip
  `activeTab` mismatch, capture phase Bibliothèque)
- Le comportement `e.repeat` différent par raccourci (notes :
  ignore ; PageUp/Down : autorisé ; Espace sustain : guard interne)
- Le routing par `activeTab` pour Undo/Redo (G1/G2)
- `preventDefault()` sur les raccourcis interceptés (Ctrl+S, Ctrl+D,
  PageUp/Down, etc.)

**Critère de succès** : tous les raccourcis fonctionnent **exactement
comme avant**. Faire un test manuel rapide de chaque raccourci dans
chaque onglet avant de commit.

---

### L.1.3 — Convention `data-anchor` posée sur les éléments d'UI

`refactor(iter-L/phase-1.3): data-anchor sur éléments d'UI`

Ajouter un attribut `data-anchor="<id>"` sur chaque élément d'UI
référencé par une entrée `SHORTCUTS[].anchor`. Pas d'autre
modification.

**Convention** : `data-anchor` value = même string que le champ
`anchor` dans la table. Posé sur l'élément **physique** que
l'utilisateur voit (le `<button>`, le `<div>` indicateur, le
`<input>`, etc.).

**Liste des ancres à poser** (issue de L.0 + arbitrages O1-O5) :

| Anchor id | Élément | Fichier |
|---|---|---|
| `global-undo-button-{lib\|designer\|composer}` | bouton ⟲ de chaque onglet (3 boutons distincts) | `PatchBank.jsx`, `WaveformEditor.jsx`, `Toolbar.jsx` |
| `global-redo-button-{lib\|designer\|composer}` | bouton ⟳ idem | idem |
| `composer-octave-indicator` | indicateur "Octave : N" Composer | `Toolbar.jsx` |
| `designer-octave-selector` | OctaveSelector 11 boutons Designer | `PianoKeyboard.jsx` |
| `designer-save-button` | bouton "Mettre à jour" / "Sauvegarder" | `WaveformEditor.jsx` |
| `designer-save-as-button` | bouton "Enregistrer comme nouveau" | `WaveformEditor.jsx` |
| `designer-new-button` | bouton "Nouveau" | `WaveformEditor.jsx` |
| `designer-sustain-pastille` | pastille Sustain (nouvelle, cf. L.1.4) | `WaveformEditor.jsx` |
| `designer-test-free-button` | bouton "Test" mode Libre | `WaveformEditor.jsx` |
| `designer-keyboard` | conteneur du clavier visuel | `PianoKeyboard.jsx` |
| `composer-delete-button` | bouton "Supprimer la sélection" PropertiesPanel | `PropertiesPanel.jsx` |
| `composer-anchor-clip` | clip identifié par `lastAnchorClipId` (cf. L.1.4 halo) | `Timeline.jsx` (clip rendu dynamiquement) |
| `composer-paste-button` | nouveau bouton "Coller" (cf. L.1.4) | `Toolbar.jsx` |
| `composer-duration-buttons` | conteneur `DurationButtons` | `Toolbar.jsx` |
| `composer-copy-button` | bouton "Copier" | `Toolbar.jsx` |
| `composer-cut-button` | bouton "Couper" | `Toolbar.jsx` |
| `composer-merge-button` | bouton "Fusionner" PropertiesPanel multi | `PropertiesPanel.jsx` |
| `composer-split2-button` | bouton "Diviser par 2" PropertiesPanel | `PropertiesPanel.jsx` |
| `composer-split3-button` | bouton "Diviser par 3" PropertiesPanel | `PropertiesPanel.jsx` |
| `library-copy-button` | bouton Copier PatchBank | `PatchBank.jsx` |
| `library-cut-button` | bouton Couper PatchBank | `PatchBank.jsx` |
| `library-paste-button` | bouton Coller PatchBank | `PatchBank.jsx` |
| `library-rename-button` | bouton Renommer PatchBank | `PatchBank.jsx` |
| `library-delete-button` | bouton Supprimer PatchBank | `PatchBank.jsx` |
| `library-select-all-button` | bouton Sélectionner tout PatchBank | `PatchBank.jsx` |
| `library-clipboard-chip` | nouveau chip "📋 N éléments" (cf. L.1.4) | `PatchBank.jsx` |
| `library-item-list` | conteneur des items biblio (pour Enter ouvrir) | `PatchBank.jsx` |

Pour les boutons ⟲/⟳ qui existent en 3 exemplaires (un par onglet),
l'ancre porte une suffixe `-library`, `-designer`, `-composer`.
La table `SHORTCUTS` entry `global-undo` doit pouvoir matcher
**l'ancre du contexte actif** — soit en exprimant `anchor` comme
une fonction `(ctx) => string`, soit en stockant 3 ancres
contextuelles. Au choix du dev.

Commit fonctionnellement neutre (les attributs `data-anchor` n'ont
aucun effet visuel ou comportemental tant que rien ne les lit).

---

### L.1.4 — Corrections UI dérivées de l'audit

`feat(iter-L/phase-1.4): corrections UI (Sustain, Coller, Clipboard, Anchor, piste sélectionnée)`

Cinq corrections groupées (à découper en sous-commits internes si
le découpage te paraît plus clair — argumente dans le commit
message).

#### 4.a — Pastille Sustain Designer (O1)

Ajouter une **pastille visible en permanence** dans la zone
d'indicateurs Designer (à droite du clavier ou en dessous, choisir
l'emplacement le plus naturel — proche du bouton Test Libre / du
clavier).

- **Label** : `"Sustain"` (texte + icône pédale optionnelle).
- **État** :
  - inactif (par défaut) : style neutre/gris
  - actif via Espace maintenue : highlight orange (style actuel du
    badge SUSTAIN)
  - **verrouillé via clic** : highlight orange + indicateur de
    verrou (cadenas ou bordure persistante). Clic suivant déverrouille.
- **Comportement** :
  - Maintenir Espace = sustain temporaire (release au keyup) — INCHANGÉ
  - Clic sur la pastille = toggle sustain verrouillé. Toutes les
    notes jouées tiennent jusqu'à un nouveau clic (ou Escape ? — à
    décider : non, garde clic seulement pour cohérence "le bouton
    fait l'action").
  - Si sustain verrouillé ET utilisateur appuie Espace : maintenir
    le verrou (pas d'effet).
- **Suppression** du badge SUSTAIN temporaire actuel (lignes
  `WaveformEditor.jsx:1816-1818`) — remplacé par la pastille.
- **Persistance** : sustain verrouillé ne survit pas au refresh
  (state runtime uniquement, pas de localStorage).
- **Ancre** : `data-anchor="designer-sustain-pastille"`.

#### 4.b — Bouton "Coller" Composer (O2) + notion "piste sélectionnée"

**Nouveau bouton "Coller (Ctrl+V)"** dans la toolbar Composer, à
côté de Copier/Couper :

- Style cohérent avec Copier/Couper.
- **Désactivé visuellement** (gris, `disabled={clipboard === null}`)
  si rien à coller.
- `title="Coller (Ctrl+V) — à la souris (Ctrl+V) ou ancre/piste sélectionnée (clic)"`.
- **Comportement du clic** (différent de Ctrl+V qui colle à la souris) :
  1. Si `lastAnchorClipId !== null` (halo anchor présent) :
     coller juste après le clip anchor (sur sa piste, position =
     `anchor.start + anchor.duration`).
  2. Sinon, si `selectedTrackId !== null` : coller au début de la
     piste sélectionnée (position 0 sur cette piste).
  3. Sinon, fallback ultime : coller au début de la piste 0 (la
     première piste existante).
- L'ancre `composer-paste-button` est posée dessus (cf. L.1.3).
- **Supprimer** le hint texte actuel `"Ctrl+V ou clic droit pour coller"`
  (`Toolbar.jsx:192`) — devenu redondant avec le bouton.

**Nouveau concept "piste sélectionnée"** :

- État ajouté dans le reducer global : `composer.selectedTrackId`
  (string | null).
- Initialisé à `null` au boot ; persisté en localStorage avec le
  reste de l'état.
- Mis à jour au **dernier clic utilisateur** dans la zone Composer
  parmi ces gestes :
  - clic sur un clip → `selectedTrackId = clip.trackId`
  - clic sur le header d'une piste → `selectedTrackId = track.id`
  - clic sur la zone vide d'une piste → `selectedTrackId = track.id`
  - clic sur la zone vide hors piste → ne pas changer (garde la
    dernière valeur)
- **Signifiant visuel** : outline subtil (border-left coloré, 2-3px,
  couleur cohérente avec la palette UI — accent ou cyan léger) sur
  le header de la piste active. Sobre. Doit cohabiter avec le focus
  ring lors du rename track sans collision visuelle.
- **Cas-limite** : si la piste active est supprimée, `selectedTrackId`
  retombe à `null` (à gérer dans le reducer DELETE_TRACK).

Ce concept est utilisé par O2 fallback, et probablement par d'autres
features futures (cf. sujet "UX ajout de clips Composer" en
BACKLOG).

#### 4.c — Chip clipboard Bibliothèque (O3)

**Nouveau chip** dans la toolbar PatchBank (emplacement : à droite
des boutons Copier/Couper/Coller, ou en bas de toolbar — à toi
de juger l'esthétique), visible uniquement si
`bibClipboard.items.length > 0`.

- **Forme** : pastille compacte `"📋 N éléments"` (où N = nombre
  d'items dans le clipboard, en comptant patches et folders
  ensemble, comme le compteur déjà utilisé en interne).
- **Style** : cohérent avec les autres chips/indicateurs de
  l'app (pas d'introduction d'un nouveau pattern visuel — réutiliser
  une classe existante si possible).
- **Clic sur `×`** (petit bouton à droite du label dans la pastille) :
  vide explicitement `bibClipboard` (équivalent comportemental d'Esc
  quand clipboard non vide).
- **Comportement Esc inchangé** : Esc continue à vider le clipboard
  d'abord, puis la sélection au second Esc. Le chip rend visible le
  séquencement.
- **Ancre** : `data-anchor="library-clipboard-chip"` (label `Esc`
  s'ancrera dessus).

#### 4.d — Halo anchor clip Composer (O5)

Rendre visible le clip identifié par `lastAnchorClipId` via un
**signifiant visuel sobre** sur la timeline.

- **Style** : ton-sur-ton subtil. Suggestion : un liseré fin
  (1-2px) sur le bord droit du clip anchor, dans la couleur de
  l'accent UI mais avec une opacité réduite (40-60%). À toi de
  choisir la nuance qui ne crie pas mais qui se repère.
- **Visible** quand `lastAnchorClipId !== null`. Disparaît si
  l'anchor est supprimé (gérer dans reducer : si DELETE_CLIPS
  inclut l'anchor, reset `lastAnchorClipId` à `null`).
- **Pas de signifiant** quand l'utilisateur survole simplement un
  autre clip — le halo est porté **uniquement** par le clip ancre.
- L'**ancre `composer-anchor-clip`** est posée dynamiquement sur
  le DOM element du clip anchor (data-anchor changeant selon
  `lastAnchorClipId`).
- Si pas d'anchor (`lastAnchorClipId === null`), l'overlay L.1.5
  rendra l'étiquette `composer-notes-contiguous` ancrée sur le
  **conteneur Timeline parent** avec un label adapté ("touches
  notes = placement contigu après une 1ère interaction").

#### 4.e — Tooltips obsolètes / incohérents

- **CP1** : remplacer le `title` du composant "Octave : N" Composer
  (`Toolbar.jsx:219`) :
  - Avant : `"Octave courante — Shift seul = +1, Ctrl seul = −1"`
  - Après : `"Octave courante — PageUp/PageDown ±1"`
- **CP2** : uniformiser tous les tooltips Rétablir sur
  `Ctrl+Shift+Z` :
  - `PatchBank.jsx:1165` : `"Rétablir (Ctrl+Y)"` → `"Rétablir (Ctrl+Shift+Z)"`
  - Composer et Designer affichent déjà `Ctrl+Shift+Z` — RAS.
- Les deux combos `Ctrl+Y` et `Ctrl+Shift+Z` restent **fonctionnels**
  (handler `App.jsx:172` inchangé).

---

### L.1.5 — Utilitaire `getAnchoredPosition` + composant `ShortcutsOverlay`

`feat(iter-L/phase-1.5): ShortcutsOverlay + getAnchoredPosition`

#### Utilitaire `src/lib/getAnchoredPosition.js`

Fonction qui, donné un `anchorId` (string), trouve l'élément
`[data-anchor="<id>"]` dans le DOM et retourne ses coordonnées
viewport (`{ top, left, width, height, found: boolean }`).

- Si plusieurs éléments matchent (cas du `global-undo-button-*`
  contextualisé), prend celui visible dans l'onglet actif (utiliser
  `getBoundingClientRect()` et filtrer par viewport ou par parent
  `[data-tab="active"]`).
- Si aucun élément trouvé, `found: false` (l'overlay affichera
  l'étiquette en position fallback, ex. centre haut de la zone).

Cette fonction sera réutilisée par L.3 (`<DocLink>` highlight) et
L.4 (Tour positioning) — design en conséquence (export propre,
pas d'état caché).

#### Composant `src/components/ShortcutsOverlay.jsx`

Couche transparente plein-écran rendue conditionnellement (selon
prop `isOpen`) au-dessus de tout le reste de l'UI.

- **Backdrop** : semi-opaque (style `rgba(0,0,0,0.4)` ou similaire,
  ajuster pour ne pas trop noyer les éléments dessous — l'idée
  c'est "lever le voile pour voir les raccourcis", pas "masquer
  l'UI"). Couvre tout sauf la barre `Tabs` ? À voir si plus lisible.
  Suggestion : couvre tout, navigation onglet bloquée pendant
  l'overlay.
- **Étiquettes flottantes** : pour chaque raccourci du contexte
  actif (filtré par `activeTab` et par `condition` si présente,
  appelée avec le state), une étiquette positionnée près de son
  ancre via `getAnchoredPosition`.
- **Forme étiquette** :
  - Petit badge avec fond contrasté (lisible sur tout fond),
    contenant `keys.display`.
  - Optionnellement le `label` sous la combinaison (à voir si trop
    chargé).
  - Positionnement : au-dessus de l'élément si possible, sinon en
    dessous ou à côté (anti-overflow viewport). Pas besoin d'algo
    sophistiqué de collision detection — viser le naturel sur des
    cas simples.
- **Raccourcis multi-combos sur même ancre** (ex. ↑↓ + Shift+↑↓ sur
  l'indicateur Octave) : étiquette compacte combinée
  (`↑↓ ±1 / Shift+↑↓ ±10`). Cf. décision archi "Multi-raccourcis
  sur même ancre" en BACKLOG.
- **Raccourcis composite** :
  - `designer-notes` : générer une étiquette par touche QWERTY
    mappée (via `getKeyboardMap(testTuningSystem, xEdoN)`) ancrée
    sur la touche visuelle correspondante du clavier piano. Le
    rendu doit gérer les 7 layouts (piano-12, grid-24, grid-5,
    grid-7, grid-22-*, grid-x-edo). Le clavier piano expose déjà
    une grille DOM par touche — ajouter un `data-anchor-key="<code>"`
    sur chaque touche (`Z`, `X`, ..., `0`) à utiliser pour le
    positionnement des étiquettes composite.
  - `composer-notes-contiguous` : un seul label "touches notes =
    placement contigu" ancré sur `composer-anchor-clip` (halo).
    Si pas d'anchor, ancré sur `composer-timeline` (conteneur
    parent) avec libellé adapté.
- **Comportement** :
  - Open via prop `isOpen={true}` (parent contrôle).
  - ESC ferme (callback `onClose`).
  - Croix close en évidence en haut à droite (≥ 32px, contrastée).
  - Clic sur le backdrop ferme aussi.
  - Navigation onglet bloquée tant que l'overlay est ouvert :
    intercepter les clics sur la barre `Tabs` (ou la masquer ?).
    Suggestion : laisser visible mais désactivée (pointer-events:
    none ou click prevent + style "muted").

À ce stade, le composant existe mais **n'est pas branché** —
prop `isOpen` reste à `false` partout.

---

### L.1.6 — Bouton header `Keyboard` + Ctrl+K toggle + ESC

`feat(iter-L/phase-1.6): bouton Keyboard + Ctrl+K toggle`

**Bouton dans le header** (à droite près du numéro de version,
ordre proposé `[Soleil/Lune] [Keyboard] v1.x.x` — le bouton
`Compass` viendra en L.4 entre Keyboard et la version) :

- Icône Lucide `Keyboard`.
- `title="Raccourcis (Ctrl+K)"`.
- `aria-label="Afficher les raccourcis"`.
- Clic = toggle l'overlay.
- État visuel actif quand overlay ouvert (highlight ou pressed).
- `data-anchor="header-shortcuts-button"` — l'overlay lui-même
  ancrera son propre raccourci Ctrl+K dessus (récursion contrôlée).
  Étiquette "Ctrl+K = Fermer" pendant ouverture.

**Raccourci global Ctrl+K** :

- Handler dans `App.jsx` (avec les autres globaux).
- Toggle l'overlay (true ↔ false).
- `preventDefault()` impératif (Ctrl+K = focus barre d'adresse
  Firefox par défaut). Posture identique à Ctrl+S, Ctrl+D déjà
  interceptés.
- Skip si focus dans form field (cohérent avec les autres
  globaux).
- Skip si modale ouverte (le focus est ailleurs, ne pas surcharger).

**State overlay** : ajouter `ui.shortcutsOverlayOpen` (boolean) au
reducer global. Initial false. Pas persisté (toujours fermé au
boot).

**Comportement attendu en sortie** :

- L'utilisateur clique le bouton Keyboard ou presse Ctrl+K dans
  n'importe quel onglet → overlay ouvre, étiquettes apparaissent
  ancrées sur les éléments visibles.
- Changement d'onglet pendant overlay : navigation onglet bloquée
  par construction (cf. L.1.5).
- ESC, croix close, ou backdrop click → overlay ferme.
- Re-Ctrl+K pendant ouverture → ferme (toggle).

---

## Hors scope L.1 explicite

- 4e onglet Documentation (L.2)
- `<DocLink>` et highlight (L.3)
- Bouton Tour, Ctrl+J, tours déclarés (L.4)
- Rédaction des contenus de doc (L.5)
- **Sujet "UX ajout de clips Composer"** (cf. BACKLOG). Le raccourci
  C17 (touche maintenue pendant drag, badge `♪ XN`) reste **non
  modifié** : pas de promotion en élément permanent, pas d'entrée
  dans la table SHORTCUTS, pas d'ancre. Statu quo.
- Revue cohérence textuelle globale des tooltips. Ne corrige que
  CP1 et CP2 explicitement identifiés en L.0. Si tu repères au
  passage d'autres incohérences, **note-les en commentaire de
  commit** ou en backlog mais ne les corrige pas.
- Mémoïsation `PeriodicWave`, autres optimisations Designer
  (Itération G).

## Spec comportement attendu (résumé)

À la fin de L.1, voici ce que l'utilisateur perçoit :

1. **App identique** à avant en utilisation normale, sauf :
   - Pastille `Sustain` permanente dans le Designer (cliquable
     pour verrouiller le sustain).
   - Bouton `Coller (Ctrl+V)` dans la toolbar Composer.
   - Chip `📋 N éléments` dans la toolbar Bibliothèque quand
     clipboard non vide (× pour vider).
   - Halo subtil sur le clip anchor Composer quand existant.
   - Outline subtil sur le header de la piste sélectionnée
     Composer.
   - Tooltip Octave Composer corrigé.
   - Tooltip Rétablir PatchBank uniformisé sur Ctrl+Shift+Z.
   - Nouveau bouton header `Keyboard` à droite près du numéro de
     version.

2. **Nouvelle fonction** : Ctrl+K (ou clic bouton Keyboard) ouvre
   l'overlay raccourcis avec étiquettes flottantes ancrées sur
   les éléments d'UI de l'onglet actif. ESC / croix / backdrop
   click ferme.

3. **Sous le capot** :
   - Tous les handlers consomment `src/lib/shortcuts.js`.
   - Tous les éléments d'UI référencés portent `data-anchor`.
   - Le state global a deux nouveaux champs : `composer.selectedTrackId`
     (persisté) et `ui.shortcutsOverlayOpen` (non persisté).

## Mise à jour `CONTEXT.md` en fin de phase

Section **"État actuel"** : mentionner l'onglet active de
documentation comme infrastructure (table, ancres, overlay), avec
les promotions UI (Sustain, Coller, Clipboard chip, anchor halo,
piste sélectionnée, header `Keyboard`).

Section **"Roadmap & Backlog"** : cocher L.1 livré, mentionner
prochaine étape L.2.

Section **"Historique"** : entrée pour Iteration L Phase 1 résumant
les ajouts.

Section **"Modèle de données"** : ajouter `composer.selectedTrackId`,
`ui.shortcutsOverlayOpen`, mention du localStorage key inchangé
(juste un champ de plus dans l'objet root).

Section **"Décisions architecturales"** : ajouter référence à
`shortcuts.js` comme source de vérité, et à `data-anchor` comme
convention overlay/tour/DocLink.

Commit séparé `docs: CONTEXT.md — Iteration L phase 1`.

## Workflow

1. Lire `CONTEXT.md`, `archi/BACKLOG.md` (sections Iteration L),
   `archi/L0-audit-raccourcis.md`.
2. Implémenter L.1.1 → L.1.6 dans l'ordre, un sous-commit par étape.
3. Tester manuellement chaque sous-commit avant le suivant
   (raccourcis fonctionnels, UI correcte, overlay opérationnel).
4. Push après chaque sous-commit (ou batch en fin si tu préfères,
   mais ne pas trop accumuler).
5. Commit `docs: CONTEXT.md` séparé en fin de phase.
6. Push final.

**Interpelle** si :
- Une décision archi te paraît bancale à l'implé (mieux vaut une
  question maintenant qu'un revert).
- Un cas d'edge non couvert (ex. comportement `selectedTrackId`
  après import compo, après undo de DELETE_TRACK, etc.).
- Tu remarques une incohérence avec `CONTEXT.md` ou avec une
  décision archi citée.

Bon vent.
