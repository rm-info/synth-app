# L.0 Audit raccourcis — Iteration L (Documentation)

Recensement exhaustif des handlers clavier dans `src/`. Sources greppées :
`keydown`, `keyup`, `onKeyDown`, `onKeyUp`, `e.key`, `e.code`,
`addEventListener('keydown'|'keyup')`. Aucune modification de code.

Convention de catégorisation (cf. brief archi) :
- **bouton** : il existe un bouton (ou élément cliquable) dans l'UI qui
  exécute la même action.
- **objet** : le raccourci manipule directement un objet visible (clip
  sélectionné, touche piano, etc.) qui sert d'ancre.
- **dégénéré** : pas de référent visuel évident → à arbitrer par l'archi.

---

## Résumé exécutif

- **Nombre total de raccourcis d'action identifiés : 28** (en comptant
  les touches de note comme **1 raccourci composite par contexte** —
  Designer et Composer).
- **Répartition par contexte** : Global 3 / Designer 5 / Composer 16 /
  Bibliothèque 9. (Total > 28 car certains raccourcis se déclinent par
  onglet — Ctrl+Z/Y, par exemple, est compté 1 fois en "Global".)
- **Ancrages bouton : 20**.
- **Ancrages objet : 5**.
- **Orphelins (dégénérés) : 5** — Espace (sustain Designer), Ctrl+V
  Composer (clipboard de clips), Escape vider clipboard Bibliothèque,
  touche note "tenue pendant drag" (Composer), touche note "placement
  contigu au keyup" (Composer).
- **Points sensibles ou ambigus** :
  - `Octave : N` dans la Toolbar Composer (`Toolbar.jsx:219`) porte un
    `title` **obsolète** : "Shift seul = +1, Ctrl seul = −1" — cette
    logique a été remplacée par PageUp/PageDown en F.3.3. À signaler
    pour correction hors-scope de L.0.
  - `Rétablir (Ctrl+Y)` dans la toolbar Bibliothèque (`PatchBank.jsx:1165`)
    vs `Rétablir (Ctrl+Shift+Z)` dans la toolbar Composer et Designer.
    Les deux combos sont câblés (`App.jsx:172`), donc pas de bug, mais
    incohérence d'affichage.
  - Touches notes : **mapping dépendant du système actif**
    (`getKeyboardMap(sys, xEdoN)`) + variante Shift en mode SHIFT_ANCHOR
    (X-EDO N≥44 via `xEdoShiftedKeyboardMapForN`). À traiter en logique
    d'overlay dédiée (cf. brief : "raccourci composite").
  - `NOTE_GUARD_KEYS` (44 codes dans `src/lib/keyboardCandidates.js`) :
    posture "mode note possède le clavier alphanumérique" (F.7.5). Pas
    un raccourci en soi, mais explique pourquoi certaines touches non
    mappées sont quand même `preventDefault`-ées.
  - **Escape** apparaît dans énormément d'endroits (modales, menus
    contextuels, dropdowns, popovers, inputs en édition) — ces usages
    sont classés en "ergo standard" sauf "Escape vider clipboard
    Bibliothèque" qui est un raccourci métier.

---

## Raccourcis d'action

### Global (multi-onglet)

| # | Raccourci | Action | Fichier:ligne | Bouton équivalent | Ancrage | Notes |
|---|---|---|---|---|---|---|
| G1 | **Ctrl/Cmd+Z** (sans Shift) | Undo de l'onglet actif (library / designer / composer) | `src/App.jsx:163-190` | Oui : ⟲ dans Toolbar Composer (`Toolbar.jsx:200`), ⟲ dans Designer Actions panel ouvert ET collapsed (`WaveformEditor.jsx:1872, 1929`), ⟲ dans toolbar PatchBank (`PatchBank.jsx:1156-1160`) | **bouton** | Routing par `activeTab` (décision archi K.2). Skip form fields. |
| G2 | **Ctrl/Cmd+Shift+Z** ou **Ctrl/Cmd+Y** | Redo de l'onglet actif | `src/App.jsx:172` | Oui : ⟳ même emplacements (toolbar de chaque onglet) | **bouton** | Tooltips : "Ctrl+Shift+Z" dans Composer/Designer, "Ctrl+Y" dans Bibliothèque → incohérence d'affichage à signaler. |
| G3 | **PageUp / PageDown** | ±1 octave de `editor.testOctave` (clamp 0-10) | `src/App.jsx:346-368` | Oui dans **Designer** : `OctaveSelector` = 11 boutons d'octave cliquables (`PianoKeyboard.jsx:433-456`). En **Composer** : indicateur passif uniquement (`Toolbar.jsx:216-222`). | **bouton** (Designer) / **objet** (Composer indicateur) | Asymétrie Designer/Composer à signaler. `e.repeat` autorisé (maintenir traverse les octaves). |

### Designer

| # | Raccourci | Action | Fichier:ligne | Bouton équivalent | Ancrage | Notes |
|---|---|---|---|---|---|---|
| D1 | **Ctrl/Cmd+S** | Save patch (UPDATE si patch chargé, SAVE_AS_NEW sinon) | `src/App.jsx:204-208` + handler `WaveformEditor.jsx:1122-1126` | Oui : bouton "Mettre à jour" (`WaveformEditor.jsx:1853, 1909`) OU "Enregistrer comme nouveau" / "Sauvegarder le patch" (`WaveformEditor.jsx:1861, 1917`) selon contexte | **bouton** | Comportement contextuel. Custom event `designer:save-shortcut`. |
| D2 | **Ctrl/Cmd+Alt+S** | Save as new patch (force fork) | `src/App.jsx:209-213` | Oui : bouton "Enregistrer comme nouveau" (`WaveformEditor.jsx:1861, 1917`) | **bouton** | Custom event `designer:save-as-shortcut`. |
| D3 | **Ctrl/Cmd+Alt+N** | Nouveau patch (reset éditeur, avec confirm si dirty) | `src/App.jsx:214-217` | Oui : bouton "Nouveau" (`WaveformEditor.jsx:1845, 1901`) | **bouton** | Custom event `designer:new-shortcut`. |
| D4 | **Espace (maintenue)** | Pédale de sustain (release différé jusqu'au relâchement de Espace) | `WaveformEditor.jsx:928-931, 978-981` | Non. Indicateur visuel `SUSTAIN` (`WaveformEditor.jsx:1816-1818`) **visible uniquement pendant l'appui** | **dégénéré** | Pas d'élément permanent. `preventDefault` pour bloquer scroll. À arbitrer (cf. orphelins). |
| D5 | **`s`** (mode Libre uniquement, testTuningSystem === 'free') | Test note Libre (mousedown/mouseup pattern) | `WaveformEditor.jsx:942-946, 985-988` | Oui : bouton "Test" (`WaveformEditor.jsx:1758-1763`), `title` mentionne "(touche s)" | **bouton** | Le bouton est lui-même un mousedown/mouseup pattern, cohérent avec le raccourci. |
| D6 | **Touches notes du système actif** (mousedown/mouseup polyphonique) | Joue/relâche une note du clavier visuel | `WaveformEditor.jsx:960-973, 996-1005` | Oui : touches cliquables du clavier visuel (`PianoKeyboard.jsx` — layouts piano-12 / grid-24 / grid-5 / grid-7 / grid-31 / grid-22-* / grid-x-edo) | **objet** (composite) | Mapping varie : `getKeyboardMap(sys, xEdoN)`. Variante Shift en mode SHIFT_ANCHOR (X-EDO N≥44) via `xEdoShiftedKeyboardMapForN`. Source de vérité : `src/lib/tuningSystems.js` (registre) + `src/lib/xEdoLayouts.js` (X-EDO). |

### Composer

| # | Raccourci | Action | Fichier:ligne | Bouton équivalent | Ancrage | Notes |
|---|---|---|---|---|---|---|
| C1 | **Delete / Backspace** | Supprimer les clips sélectionnés | `src/App.jsx:225-236` | Oui : bouton "Supprimer la sélection" dans `PropertiesPanel` (multi). Clic droit clip → "Retirer le clip" en mono. | **objet** | Ancre = les clips sélectionnés. Skip si selection vide. Skip form fields. |
| C2 | **Escape** (avec selection non vide) | Désélectionner les clips | `src/App.jsx:226, 237` | Non explicite. Clic zone vide produit le même effet. | **objet** | Ancre = la sélection visible (outline cyan). Cas-limite : pourrait être ergo standard ("Escape annule"). Listé ici car action métier (clip selection). |
| C3 | **↑ / ↓** | ±1 demi-ton sur les clips sélectionnés (ignore clips Libre) | `src/App.jsx:274-305` | Oui : mini-clavier dans PropertiesPanel mono (`PropertiesPanel.jsx` champ Note). Pas de bouton "demi-ton+1/−1" explicite. | **objet** | Ancre = clip sélectionné (sa note s'ajuste sur la timeline). Groupe bloqué si membre le plus contraint borné. |
| C4 | **Shift+↑ / Shift+↓** | ±1 octave sur les clips sélectionnés | `src/App.jsx:280` | Idem C3 + OctaveSelector dans PropertiesPanel (mini). | **objet** | Idem C3. |
| C5 | **← / →** | ±0.125 beat (triple croche, snap) sur les clips sélectionnés | `src/App.jsx:309-310` | Pas de bouton "déplacer ±beat" explicite. Drag manuel du clip = équivalent. | **objet** | Ancre = clip sélectionné (sa position se déplace). |
| C6 | **Shift+← / Shift+→** | ±1 beat sur les clips sélectionnés | `src/App.jsx:310` | Idem C5. | **objet** | Idem C5. |
| C7 | **NumPad1..7** | Définir base de durée par défaut (1=carrée → 7=triple croche) | `src/App.jsx:525-554` | Oui : `DurationButtons` dans Toolbar Composer (`Toolbar.jsx:109`) — 7 boutons base + 3 boutons coef. | **bouton** | `decodeRank()` factorise. |
| C8 | **NumPad8 / NumPad9 / NumPad0** | Coefs de durée (8=×1.25, 9=pointé, 0=double-pointé) | `src/App.jsx:557-567` | Oui : `DurationButtons` (les 3 boutons coef). | **bouton** | Idem. Toggle si même coef. |
| C9 | **Shift+Digit1..7** | Base de durée (fallback laptop sans pavé) | `src/App.jsx:530-534` | Oui : `DurationButtons`. | **bouton** | Digits nus libérés pour notes 24-TET (F.3.4). |
| C10 | **Shift+Digit8 / Shift+Digit9 / Shift+Digit0** | Coefs de durée (fallback laptop) | `src/App.jsx:530-534` | Oui : `DurationButtons`. | **bouton** | Idem. |
| C11 | **Ctrl/Cmd+C** | Copier les clips sélectionnés | `src/App.jsx:1187-1189` | Oui : bouton "Copier" dans Toolbar Composer (`Toolbar.jsx:173-181`, title "Copier les clips sélectionnés (Ctrl+C)") | **bouton** | Skip si sélection vide. |
| C12 | **Ctrl/Cmd+X** | Couper les clips sélectionnés | `src/App.jsx:1190-1192` | Oui : bouton "Couper" (`Toolbar.jsx:182-190`, title "Couper les clips sélectionnés (Ctrl+X)") | **bouton** | Idem. |
| C13 | **Ctrl/Cmd+V** | Coller les clips à la position de la souris | `src/App.jsx:1193-1196` | **Non — aucun bouton de toolbar**. Hint texte "Ctrl+V ou clic droit pour coller" (`Toolbar.jsx:192`). Menu contextuel clic droit zone vide → "Coller ici" est l'alternative. | **dégénéré** | À arbitrer : ajouter un bouton "Coller" ? Promouvoir le hint en label permanent ? La position dépend de la souris, donc un bouton de toolbar serait sémantiquement inhabituel. |
| C14 | **Ctrl/Cmd+M** (≥2 clips sélectionnés) | Fusionner les clips sélectionnés (si `canMerge`) | `src/App.jsx:1197-1199` | Oui : bouton "Fusionner (Ctrl+M)" dans `PropertiesPanel` multi (`PropertiesPanel.jsx:498`) | **bouton** | Visible uniquement en multi-sélection. |
| C15 | **Ctrl/Cmd+D** | Split clips ÷2 | `src/App.jsx:1200-1204` | Oui : bouton "Diviser par 2 (Ctrl+D)" dans `PropertiesPanel` (`PropertiesPanel.jsx:291`) | **bouton** | Gated par `canSplit2`. |
| C16 | **Ctrl/Cmd+Shift+D** | Split clips ÷3 | `src/App.jsx:1200-1204` (test `e.shiftKey`) | Oui : bouton "Diviser par 3 (Ctrl+Shift+D)" (`PropertiesPanel.jsx:300`) | **bouton** | Gated par `canSplit3`. **Cas particulier** : ce raccourci déclenche parfois le bookmark navigateur malgré `preventDefault` (signalé dans CONTEXT.md "Backlog général"). |
| C17 | **Touches notes du système actif (maintenue + drop)** | Override de la note du clip déposé pendant un drag depuis la banque ou le PatchPicker | `src/App.jsx:382-411` + consommation `handleAddClip` `src/App.jsx:956-992` | Non. Pendant l'appui : badge `♪ XN` dans la Toolbar Composer (`Toolbar.jsx:224-227`) — invisible avant l'appui. | **dégénéré** | Geste totalement implicite sans la doc. Le badge n'apparaît que pendant l'appui. À arbitrer : promouvoir le badge en élément permanent qui passerait à l'état "actif" pendant l'appui, ou tutoriel uniquement ? |
| C18 | **Touches notes du système actif (keyup + anchor existante)** | Placement contigu d'un nouveau clip à la note pressée, après le dernier clip touché (`lastAnchorClipId`), même patch / même piste / même duration | `src/App.jsx:413-483` | Non. L'anchor est un state interne (`lastAnchorClipId`) jamais rendu visuellement. | **dégénéré** | Concept entièrement implicite. À arbitrer : rendre l'anchor visible (halo, badge sur le clip anchor) ? Documenter en tour ? Logique gated par bodyCursor, drag en cours, menu ouvert. |

### Bibliothèque (PatchBank, actif uniquement si focus dans l'aside library)

Tous les raccourcis Bibliothèque sont gatés par `isFocusedRef`
(focus dans l'aside library). Listener en phase **capture** pour
intercepter avant les listeners globaux d'App.jsx.

| # | Raccourci | Action | Fichier:ligne | Bouton équivalent | Ancrage | Notes |
|---|---|---|---|---|---|---|
| B1 | **Ctrl/Cmd+C** | Copier les items sélectionnés (patches + folders) | `PatchBank.jsx:538-540` | Oui : bouton "Copier (Ctrl+C)" dans toolbar PatchBank (`PatchBank.jsx:1193`) + entrée menu contextuel `BibContextMenu` (`BibContextMenu.jsx:48`, libellé "Copier" + shortcut affiché) | **bouton** | — |
| B2 | **Ctrl/Cmd+X** | Couper les items sélectionnés (mode 'cut' du clipboard) | `PatchBank.jsx:541-543` | Oui : bouton "Couper (Ctrl+X)" (`PatchBank.jsx:1200`) + entrée menu contextuel (`BibContextMenu.jsx:51`) | **bouton** | — |
| B3 | **Ctrl/Cmd+V** | Coller le contenu du clipboard (dans folder sélectionné ou courant) | `PatchBank.jsx:544-546` | Oui : bouton "Coller (Ctrl+V)" (`PatchBank.jsx:1207`) + entrée menu contextuel (`BibContextMenu.jsx:59, 100`) | **bouton** | Anti-cycle géré par `wouldCreateCycle`. |
| B4 | **F2** (sélection unique) | Renommer l'item sélectionné | `PatchBank.jsx:547-553` | Oui : bouton "Renommer (F2)" (`PatchBank.jsx:1179`). Double-clic sur l'item ouvre aussi le rename inline. | **bouton** | — |
| B5 | **Delete / Backspace** | Supprimer les items sélectionnés | `PatchBank.jsx:554-557` | Oui : bouton "Supprimer (Suppr)" (`PatchBank.jsx:1227`). Bouton corbeille au survol par item (`PatchBank.jsx:737-738, 841-842`) + entrée menu contextuel | **bouton** | Modal `DeleteUsageWarningDialog` si patches utilisés en Composer. |
| B6 | **Escape (avec clipboard non vide)** | Vider le clipboard | `PatchBank.jsx:557-560` | Non. Effet visuel : items "is-cut" perdent leur style ghost. | **dégénéré** | Pas de bouton "Vider le clipboard". À arbitrer. Cas-limite ergo-standard ? "Esc annule" n'est pas si standard pour "vider un clipboard" — usage métier. |
| B7 | **Escape (sans clipboard)** | Vider la sélection | `PatchBank.jsx:557-560` | Non explicite. Clic ailleurs produit le même effet. | **objet** | Ancre = sélection visible (.is-selected). Cas-limite ergo standard (cf. C2). |
| B8 | **Ctrl/Cmd+A** | Tout sélectionner (items visibles dans le mode actif) | `PatchBank.jsx:592-602` | Oui : bouton "Sélectionner tout (Ctrl+A)" (`PatchBank.jsx:1214`) + entrée menu contextuel (`BibContextMenu.jsx:93`) | **bouton** | f17. |
| B9 | **Enter** (sélection unique) | Ouvrir le patch (load Designer) ou folder (navigate en mode nav / toggle en mode tree) | `PatchBank.jsx:584-591` | Pas de bouton "Ouvrir". Double-clic sur l'item = équivalent. | **objet** | Ancre = l'item sélectionné lui-même. Pourrait être classé ergo standard ("Enter active la sélection"). Listé ici par prudence car action métier (load patch). |

---

## Orphelins identifiés (à arbitrer en session archi)

Liste des raccourcis classés **dégénéré**, sans recommandation —
seulement les options possibles.

### O1 — Espace (sustain pédale Designer) — D4

- **Contexte** : Designer uniquement. Maintenir Espace = release différé
  des notes jusqu'au relâchement (pédale de sustain classique).
- **Référent actuel** : badge `SUSTAIN` orange (`WaveformEditor.jsx:1816-1818`)
  affiché **uniquement pendant l'appui**.
- **Options envisageables** :
  - (a) Ajouter un bouton "Pédale" cliquable (mousedown/mouseup) à côté
    du clavier qui rend visible l'existence du sustain + permet l'usage
    sans raccourci.
  - (b) Promouvoir le badge `SUSTAIN` en élément permanent (toujours
    visible, change d'apparence quand actif) — découvrabilité via la
    présence de l'élément.
  - (c) Retirer le raccourci (peu probable — c'est l'ergonomie standard
    d'un instrument).
  - (d) Documenter uniquement en tour/overlay sans modifier l'UI.

### O2 — Ctrl+V Composer (coller des clips) — C13

- **Contexte** : Composer. Coller les clips du clipboard à la position
  de la souris.
- **Référent actuel** : hint texte "Ctrl+V ou clic droit pour coller"
  dans la Toolbar Composer (`Toolbar.jsx:192`), visible uniquement
  quand `hasClipboard === true`. Pas de bouton.
- **Options envisageables** :
  - (a) Ajouter un bouton "Coller" dans la toolbar à côté de
    "Copier"/"Couper" — colle à la position du dernier clic souris
    (ou au début de la sélection vide ?), sémantique à clarifier.
  - (b) Promouvoir le hint en bouton désactivé (visible toujours,
    actif si clipboard non vide).
  - (c) Documenter uniquement (le geste "coller à la souris" est par
    nature un raccourci, pas un bouton).

### O3 — Escape Bibliothèque "vider clipboard" — B6

- **Contexte** : Bibliothèque uniquement. Escape vide `bibClipboard`
  s'il est non vide, sinon vide la sélection (B7).
- **Référent actuel** : aucun. Effet visible (items "is-cut" repassent
  en état normal).
- **Options envisageables** :
  - (a) Ajouter un bouton "Vider le clipboard" dans la toolbar (visible
    quand clipboard non vide).
  - (b) Promouvoir un indicateur "1 patch dans le presse-papier"
    (déjà absent visuellement) qui pourrait porter un × cliquable.
  - (c) Retirer la branche "Esc vide clipboard" et garder uniquement
    "Esc vide sélection".
  - (d) Documenter uniquement (l'utilisateur découvre via essai).

### O4 — Touche note maintenue pendant un drag (Composer) — C17

- **Contexte** : Composer. Pendant un drag de patch depuis la banque /
  PatchPicker vers la timeline, maintenir une touche de note override
  la hauteur du clip déposé (au lieu de la hauteur par défaut de
  l'éditeur).
- **Référent actuel** : badge `♪ XN` dans la Toolbar Composer
  (`Toolbar.jsx:224-227`), affiché **uniquement pendant l'appui**.
  Pas d'indicateur permanent.
- **Options envisageables** :
  - (a) Rendre le badge permanent (slot vide "♪ —" quand pas d'appui,
    "♪ XN" pendant l'appui).
  - (b) Documenter uniquement en tour.
  - (c) Retirer le raccourci (peu probable — feature pédagogique
    "écrire au clavier").

### O5 — Touche note keyup → placement contigu (Composer) — C18

- **Contexte** : Composer. Au relâchement d'une touche de note (sans
  drag en cours), placer un nouveau clip après le dernier clip touché
  (`lastAnchorClipId`), à la note pressée.
- **Référent actuel** : aucun. `lastAnchorClipId` est un state interne
  non rendu visuellement (à vérifier — pas de classe CSS dédiée
  trouvée sur le clip anchor).
- **Options envisageables** :
  - (a) Rendre l'anchor visible (halo subtil, contour pointillé, badge
    sur le clip "ancre actuelle").
  - (b) Ajouter un indicateur dans la toolbar : "Ancre : clip-N
    piste-M" avec un lien pour révéler/désélectionner.
  - (c) Documenter uniquement en tour.
  - (d) Retirer le raccourci (peu probable — c'est la mécanique
    "écrire une mélodie au clavier" cœur de E.4).

---

## Ergo standard exclu (hors-scope overlay)

Liste compacte des usages clavier qui relèvent de l'ergonomie standard
des composants UI — **pas à documenter dans l'overlay des raccourcis**.

### Dialogs / Modales (Escape = fermer, Enter = confirmer)

- `Modal.jsx:19-24` — Escape ferme la modale.
- `ConfirmDialog.jsx:17-20` — Escape = onCancel, Enter = onConfirm.
- `DeleteUsageWarningDialog.jsx:12-15` — Escape ferme.
- `SavePatchDialog.jsx:75-82` — Escape ferme.
- `SavePatchDialog.jsx:157-158` — Enter dans input nom = confirmer.
- `SavePatchDialog.jsx:216-218` — Enter / Escape dans input "Nouveau dossier".
- `WaveformEditor.jsx:367-374` — Escape ferme la modale système musical (responsive).

### Menus contextuels (Escape = fermer)

- `Timeline.jsx:63-66` — Escape ferme `MeasureContextMenu`.
- `Timeline.jsx:185-194` — Escape ferme le menu contextuel timeline (capture phase).
- `Timeline.jsx:198-204` — Escape ferme le menu contextuel clip.
- `BibContextMenu.jsx:13-16` — Escape ferme le menu contextuel bibliothèque.
- `PatchPicker.jsx:67-73` — Escape ferme le menu contextuel PatchPicker.

### Popovers (Escape = fermer)

- `App.jsx:820-828` — Escape ferme le popover Bibliothèque Designer (sidebar collapsed).
- `App.jsx:844-851` — Escape ferme le popover Bibliothèque Composer (sidebar collapsed).

### Inputs en édition (Enter = commit, Escape = cancel/restore)

- `BpmInput.jsx:55-69` — Enter commit, Escape restore (skipBlurCommitRef).
- `A4Input.jsx:53-67` — idem.
- `XEdoInput.jsx:51-65` — idem.
- `FreqInput.jsx:75-79` — Enter commit, Escape restore.
- `NumberInput.jsx:55-58` — Enter commit, Escape restore (sliders ADSR).
- `PatchBank.jsx:698-700, 820-822, 896-898, 949-951, 978-982` — Enter / Escape dans 5
  contextes de rename inline (patch chip, folder, breadcrumb, etc.).
- `BibBreadcrumb.jsx:68-70` — Enter commit / Escape cancel pour l'édition du path.
- `Timeline.jsx:1154-1156` — Enter blur / Escape cancel pour le rename de track.

### Inputs numériques (↑/↓ steppent la valeur)

Pattern partagé "stepBy ±1 (ou ±5/10 avec Shift)" sur les inputs
numériques avec validation différée. **Ergo standard d'input numérique**
(équivalent fonctionnel des spinners HTML5 mais re-implémentés en
type=text pour la validation différée).

- `BpmInput.jsx:63-68` — ↑/↓ ±1, Shift ±10. Fourchette BPM.
- `A4Input.jsx:60-64` — ↑/↓ ±1, Shift ±5. Fourchette 380-480 Hz.
- `XEdoInput.jsx:58-62` — ↑/↓ ±1, Shift ±5. Fourchette `X_EDO_MIN..X_EDO_MAX`.

### Dropdown custom `ShortLabelSelect` (navigation type combobox)

- `ShortLabelSelect.jsx:85-129` — Pattern ARIA combobox standard :
  - ↑/↓/Enter/Space (fermé) → ouvrir.
  - ↑/↓ (ouvert) → naviguer highlightedIndex.
  - Home/End → premier/dernier.
  - Enter/Space → sélectionner highlightedIndex.
  - Escape → fermer.
  - Tab → fermer (focus sort naturellement).

### Liste/navigation Bibliothèque (↑/↓ navigation, Shift+↑/↓ extension)

Cas-limite : ressemble à un ergo standard de file explorer mais le
mapping `bibSelectedIds + bibSelectionAnchor` est métier.

- `PatchBank.jsx:561-583` — ↑/↓ déplace la sélection dans
  `getOrderedItemList`. **Listé ici (ergo standard)** sauf si l'archi
  juge l'ancrage "objet" (liste visible) suffisant pour documenter
  dans l'overlay.

### Cas-limites listés dans les deux sections

Conformément au brief ("si tu hésites, liste dans les deux") :

- **C2 (Escape Composer désélectionner)** — Listé en C2 (objet), mais
  pourrait être ergo standard ("Esc annule"). L'archi tranche.
- **B7 (Escape Bibliothèque vider sélection)** — Idem (objet ou ergo).
- **B9 (Enter Bibliothèque ouvrir)** — Listé en B9 (objet), mais
  pourrait être ergo standard ("Enter active item de liste"). L'archi
  tranche.
- **PatchBank ↑/↓** — Listé en ergo standard (ci-dessus), mais
  pourrait être un raccourci métier (sélection bib). L'archi tranche.
- **PatchBank Shift+↑/↓** — Idem.

---

## Cas particuliers et ambiguïtés

### CP1 — Tooltip obsolète sur l'indicateur Octave Composer

- **Fichier** : `src/components/Toolbar.jsx:219`.
- **Tooltip actuel** : `"Octave courante — Shift seul = +1, Ctrl seul = −1"`.
- **Comportement actuel** : Le raccourci Shift/Ctrl seul a été remplacé
  par PageUp/PageDown en F.3.3 (cf. CONTEXT.md TL;DR + historique
  itération E.3.3 : "Initialement Shift/Ctrl 'seuls' via flags
  shiftAloneRef/ctrlAloneRef invalidés par toute autre touche ou
  mousedown, remplacé car l'ordre de relâchement dans des combos créait
  des octaves intempestives").
- **Impact** : le tooltip annonce une fonctionnalité qui n'existe plus.
  À corriger (hors-scope L.0).

### CP2 — Incohérence d'affichage Ctrl+Y vs Ctrl+Shift+Z

- **Fichier** : `src/components/PatchBank.jsx:1165` (Bibliothèque) vs
  `src/components/Toolbar.jsx:211` (Composer) et
  `src/components/WaveformEditor.jsx:1882, 1937` (Designer).
- **Tooltips** :
  - Bibliothèque : `"Rétablir (Ctrl+Y)"`.
  - Composer + Designer : `"Rétablir (Ctrl+Shift+Z)"`.
- **Comportement** : les deux combos sont câblés (`src/App.jsx:172`),
  donc pas de bug fonctionnel. Inconsistance d'affichage uniquement.

### CP3 — Raccourcis Bibliothèque gatés par focus (capture phase)

- **Fichier** : `src/components/PatchBank.jsx:528-606`.
- **Mécanisme** : tous les raccourcis Bibliothèque ne déclenchent que
  si `isFocusedRef.current === true` (focus DOM dans l'aside library).
  Listener en **phase capture** pour intercepter avant les listeners
  globaux (App.jsx Delete/Escape/Arrow timeline).
- **Conséquence** : un utilisateur qui sélectionne des items à la
  souris mais reste avec le focus ailleurs (ex. timeline) ne pourra
  pas utiliser les raccourcis. Comportement intentionnel mais piège
  utilisateur potentiel.

### CP4 — Bug intermittent Ctrl+D

- **Source** : CONTEXT.md "Backlog général" — "Bug intermittent :
  Ctrl+D déclenche parfois le bookmark navigateur malgré
  preventDefault (mode opératoire à reproduire)".
- **Concerne** : C15 (Split ÷2).

### CP5 — Touches notes : mapping dépendant de l'état

- **Sources** :
  - Designer : `WaveformEditor.jsx:960-973` (keyboardMap depuis
    `getKeyboardMap(getTuningSystem(testTuningSystem), xEdoN)`).
  - Composer : `App.jsx:400-410` (idem).
  - Variante Shift en mode SHIFT_ANCHOR (X-EDO N≥44) : utilise
    `xEdoShiftedKeyboardMapForN(xEdoN)` au lieu du keyboardMap base.
- **Source de vérité** : `src/lib/tuningSystems.js` (registre des
  tempéraments, 13 entrées + 1 X-EDO paramétrique au 2026-05-26).
- **Source X-EDO** : `src/lib/xEdoLayouts.js`.
- **Source NOTE_GUARD_KEYS** : `src/lib/keyboardCandidates.js` —
  liste statique de 44 codes `preventDefault`-és systématiquement en
  mode note (posture F.7.5).
- **Conséquence pour l'overlay** : logique dédiée nécessaire
  (déjà mentionnée dans le brief). Le mapping ne peut pas être listé
  "en dur" — il est calculé à partir de `(testTuningSystem, xEdoN)`.

### CP6 — Raccourcis Designer : custom events comme indirection

- **Fichier** : `src/App.jsx:204-217` dispatch
  `CustomEvent('designer:save-shortcut'|'designer:save-as-shortcut'|'designer:new-shortcut')`.
  Handlers dans `src/components/WaveformEditor.jsx:1122-1137`.
- **Raison** : éviter d'expliciter le couplage App → WaveformEditor
  (qui a son own state local — patch courant, dirty check, etc.).
- **Conséquence pour l'overlay** : pas d'impact direct, juste à noter
  que les handlers vivent dans WaveformEditor même si le keydown est
  capté dans App.

### CP7 — `e.repeat` ignoré pour les notes, autorisé pour PageUp/Down

- **Notes** (`WaveformEditor.jsx:968`, `App.jsx:408`) : `if (e.repeat)
  return` → maintenir une touche ne relance pas la note en boucle.
- **PageUp/Down** (`App.jsx:357-363`, pas de guard `e.repeat`) :
  maintenir la touche traverse les octaves.
- **Sustain Espace** (`WaveformEditor.jsx:930`) : `if (!e.repeat)`
  → guard interne, activeSustain idempotent.
- **Décision intentionnelle** documentée dans le commentaire au-dessus
  du listener PageUp/Down.

### CP8 — `dragInProgressRef` pour gating keyup placement contigu

- **Fichier** : `src/App.jsx:485-486, 499-500` — capture phase pour
  dragstart/dragend (PatchBank stopPropagation empêcherait un listener
  bubble).
- **Raison** : keyup d'une touche note maintenue pendant un drop ne
  doit pas déclencher de placement contigu (le drop a déjà eu sa
  chance).
- **Conséquence** : C17 (drop avec touche maintenue) et C18 (keyup →
  placement contigu) sont mutuellement exclusifs dans le même geste,
  par design.

### CP9 — `NOTE_GUARD_KEYS` n'est pas un raccourci

- **Fichier** : `src/lib/keyboardCandidates.js`.
- **Rôle** : `preventDefault` systématique en mode note sur 44 codes
  (alphanumériques + ponctuations à risque navigateur — Slash, Quote,
  Backquote, BracketLeft/Right, Backslash, etc.).
- **Pas à documenter dans l'overlay** — c'est un guard transverse, pas
  une action utilisateur.

### CP10 — Raccourcis désactivés / context-dependent

Pour exhaustivité, les conditions de déclenchement les plus subtiles :

- **C1 (Delete)** — Skip si `selectedClipIds.length === 0`. Aucun
  feedback si touche pressée sans sélection.
- **C3-C6 (flèches Composer)** — Skip si menu contextuel timeline
  ouvert (`document.querySelector('.timeline-context-menu')`), skip si
  body cursor en drag (`'grabbing' | 'copy' | 'ew-resize'`).
- **C11-C16 (Ctrl+CXVMD)** — Skip si activeTab !== 'composer', skip
  form fields. Ctrl+C/X gatés par `selectedClipIds.length > 0`,
  Ctrl+V gaté par `clipboard != null`, Ctrl+M gaté par
  `selectedClipIds.length >= 2 && mergeStatus.canMerge`, Ctrl+D gaté
  par `canSplit2` / `canSplit3`.
- **D5 (`s` Libre)** — Gaté par `testTuningSystem === 'free'`.
- **D6 / C17 / C18 (touches notes)** — Gatés par le mapping du système
  actif (touche non mappée = no-op silencieux).
- **C18 (placement contigu)** — Gaté par `lastAnchorClipId != null`,
  `anchor.tuningSystem !== 'free'`, mapping de l'anchor (pas de
  l'éditeur), absence de drag.

---

## Annexe — Fichiers greppés

Recherche `keydown|keyup|onKeyDown|onKeyUp|e.key|e.code|event.key|event.code`
sur `src/` :

```
src/App.jsx                                  ✓ 11 useEffect keydown/keyup
src/components/Timeline.jsx                  ✓ 3 useEffect Escape menus + rename track
src/components/WaveformEditor.jsx            ✓ 2 useEffect (modal + notes)
src/components/PatchBank.jsx                 ✓ 1 useEffect raccourcis + 5 rename inline
src/components/PatchPicker.jsx               ✓ 1 useEffect Escape menu contextuel
src/components/BibContextMenu.jsx            ✓ 1 useEffect Escape
src/components/BibBreadcrumb.jsx             ✓ Enter/Escape input édit path
src/components/Modal.jsx                     ✓ Escape close
src/components/ConfirmDialog.jsx             ✓ Escape/Enter
src/components/DeleteUsageWarningDialog.jsx  ✓ Escape close
src/components/SavePatchDialog.jsx           ✓ Escape close + Enter inputs
src/components/NumberInput.jsx               ✓ Enter/Escape (sliders ADSR)
src/components/BpmInput.jsx                  ✓ Enter/Escape/Arrows
src/components/A4Input.jsx                   ✓ Enter/Escape/Arrows
src/components/XEdoInput.jsx                 ✓ Enter/Escape/Arrows
src/components/FreqInput.jsx                 ✓ Enter/Escape (pas de flèches — backlog)
src/components/ShortLabelSelect.jsx          ✓ ARIA combobox standard

src/lib/tuningSystems.js                     ✗ pas de handler (registre de mappings)
src/lib/xEdoLayouts.js                       ✗ pas de handler (générateur de mappings)
src/lib/keyboardCandidates.js                ✗ pas de handler (set statique NOTE_GUARD_KEYS)
src/hooks/usePlayback.js                     ✗ pas de handler
```

Composants confirmés **sans** handler clavier : `Tabs.jsx`, `MiniPlayer.jsx`,
`Toolbar.jsx`, `PropertiesPanel.jsx`, `TooSmallGate.jsx`, `SidebarResizer.jsx`,
`Spectrogram.jsx`, `PianoKeyboard.jsx` (le clavier traite seulement les
clicks ; les touches physiques sont captées au niveau App / WaveformEditor).
