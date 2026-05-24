# Spec — Bibliothèque multi-mode (file explorer style)

> Date : 2026-05-25
> Statut : spec validée — en attente de plan d'implémentation
> Hérité du backlog G : "proposer plusieurs modes d'affichage (approchant de ce qu'on trouve dans un file explorer classique)"

## 1. Objectif

Transformer la `PatchBank` actuelle (liste verticale arborescente unique)
en une vraie bibliothèque type file explorer avec **plusieurs modes
d'affichage**, **navigation par dossier**, **multi-sélection** et
**clipboard** (Copier / Couper / Coller).

Le composant `PatchBank` reste partagé entre Designer (sidebar gauche)
et Composer (sidebar droite) ; les modes et l'état de navigation sont
**partagés** entre les deux instances.

## 2. Scope

### In scope

- **5 combinaisons d'affichage** :
  - Tree + List (équivalent vue actuelle)
  - Tree + Details (liste arborescente avec colonnes méta)
  - Nav + List (un dossier à la fois, vue compacte)
  - Nav + Details (un dossier à la fois, colonnes méta)
  - Nav + Tiles (un dossier à la fois, grille 2D avec miniatures de
    waveform)
- **Mode Tiles caché en mode Tree** — le bouton Tiles disparaît du
  toolbar quand on est en mode Tree (incohérent visuellement
  d'imbriquer une grille dans une arborescence).
- **Breadcrumb cliquable + éditable** en mode Nav. Clic dans la zone
  vide du breadcrumb → mode édition (input texte du chemin).
- **Ligne ".."** en mode Nav quand on n'est pas à la racine.
- **Multi-sélection** avec Ctrl+clic (toggle), Shift+clic (range),
  drag rectangle (lasso) dans la zone vide.
- **Clipboard** : Copier (Ctrl+C, copie + suffixe nom dédupliqué),
  Couper (Ctrl+X, visuel ghost), Coller (Ctrl+V dans dossier courant ;
  clic droit zone vide / dossier → "Coller [dans]"). État cut effacé
  par Esc / nouveau cut|copy / paste.
- **Anti-cycle** : refus de coller ou déplacer un folder dans son
  propre sous-arbre, avec notification utilisateur.
- **Menu contextuel enrichi** : Renommer (F2), Copier, Couper,
  Coller (folder seulement), Exporter, Supprimer (Suppr). Menu sur
  zone vide : Nouveau dossier, Coller.
- **Raccourcis clavier** quand focus dans la bibliothèque : Ctrl+C,
  Ctrl+X, Ctrl+V, F2, Suppr, Esc (annule clipboard ou sélection),
  ↑↓ (navigation sélection), Shift+↑↓ (étendre), Enter (ouvrir
  selected).
- **Sélection distincte de currentPatchId** : clic simple sélectionne
  visuellement, double-clic ouvre/charge. Le patch chargé dans le
  Designer reste chargé jusqu'à remplacement explicite ou suppression
  (auquel cas le Designer se vide).
- **Default Navigation mode** au load (vs Tree actuellement).
- **Popup Bibliothèque redimensionnable** (Designer sidebar
  collapsed). Drag handle sur le bord droit du popup. Largeur
  persistée.
- **Mêmes modes / état entre Designer et Composer** (un seul jeu de
  préférences globales, sélection synchronisée).

### Hors scope

- Tri par nom / date / système — items affichés dans l'ordre
  d'insertion (existing behavior).
- Recherche / filtrage par texte.
- Favoris / pinning.
- Custom thumbnails (image perso pour un patch).
- Tiles size ajustable (zoom).
- Per-instance preferences (Designer vs Composer séparés) — explicite
  rejeté en faveur du shared state.
- Preview audio au survol.
- Bulk rename (F2 sur 1 item à la fois).
- Drag-and-drop de réordonnancement libre.
- Pinning du patch courant en haut.

## 3. Modèle de données & state

### Préférences UI (persistées, non-undoable)

| Champ | Type | Default | Usage |
|-------|------|---------|-------|
| `bibHierarchyMode` | `'tree' \| 'nav'` | `'nav'` | Mode hiérarchie, partagé Designer + Composer |
| `bibDisplayMode` | `'list' \| 'details' \| 'tiles'` | `'list'` | Mode d'affichage |
| `bibCurrentFolderId` | `string \| null` | `null` (racine) | Folder courant en Nav. Fallback `null` au load si ID invalide |
| `bibPopupWidth` | `number` (px) | `480` | Largeur du popup en sidebar collapsed |

### State runtime (non persisté, transient)

| Champ | Type | Default | Usage |
|-------|------|---------|-------|
| `bibSelectedIds` | `Array<{ type, id }>` | `[]` | Multi-sélection. Cleared sur change de `bibCurrentFolderId` |
| `bibSelectionAnchor` | `{ type, id } \| null` | `null` | Ancre Shift+clic. Set au premier clic |
| `bibClipboard` | `{ mode: 'copy'\|'cut', items } \| null` | `null` | État Copy/Cut |

### Actions reducer

```
// UI prefs (non-undoable, comme spectrogramVisible)
SET_BIB_HIERARCHY_MODE       payload: 'tree' | 'nav'
SET_BIB_DISPLAY_MODE         payload: 'list' | 'details' | 'tiles'
SET_BIB_CURRENT_FOLDER       payload: folderId | null
SET_BIB_POPUP_WIDTH          payload: number

// Sélection runtime (non-undoable)
SELECT_BIB_ITEMS             payload: { items, mode: 'set'|'add'|'toggle'|'range' }
CLEAR_BIB_SELECTION

// Clipboard runtime (non-undoable)
COPY_BIB_ITEMS               payload: { items }
CUT_BIB_ITEMS                payload: { items }
CLEAR_BIB_CLIPBOARD

// Opérations DESIGNER_UNDOABLE
PASTE_BIB_CLIPBOARD          payload: { targetFolderId }
MOVE_BIB_ITEMS               payload: { items, targetFolderId }
```

`PASTE_BIB_CLIPBOARD` :
- Mode `copy` : duplique récursivement (folders → sous-arbres,
  patches → nouveau ID, dédup nom via `nextAvailableFolderName`).
- Mode `cut` : déplace (`parentId` / `folderId` mis à jour).
- Anti-cycle : si target dans le sous-arbre d'un folder cut/copié →
  abort + `SET_NOTIFICATION` d'erreur.
- Vide le clipboard après exécution.

`MOVE_BIB_ITEMS` : version atomique du drag-and-drop multi-items.
Anti-cycle identique.

### Persistance localStorage

Ajouter au `useEffect` de persistance dans `App.jsx` :

```
bibHierarchyMode,
bibDisplayMode,
bibCurrentFolderId,
bibPopupWidth,
```

## 4. Architecture UI

### Structure des fichiers

```
src/components/
  ├── PatchBank.jsx              MODIFY (refonte importante)
  ├── PatchBank.css              MODIFY (styles nouveaux modes)
  ├── BibBreadcrumb.jsx + .css   CREATE (~80 lignes)
  ├── BibContextMenu.jsx         CREATE (extraction + ajout des entrées)
  ├── PatchThumbnail.jsx         CREATE (~30 lignes, SVG d'une waveform)
  └── PopupResizer.jsx + .css    CREATE (poignée resize calquée sur SidebarResizer)

src/reducer.js                   MODIFY (nouveaux fields, actions, anti-cycle)
src/App.jsx                      MODIFY (persistance + handlers + branchements)

src/lib/
  └── bibTransfer.js             CREATE (duplicateItemsToFolder, helper paste/copy)
```

### Composants

**`PatchBank.jsx`** (container orchestrateur, ~600-700 lignes après
refonte) :
- Header : titre + count + 2 toggles icônes (Tree/Nav et
  List/Details/Tiles, Tiles caché en Tree).
- BibBreadcrumb (mode Nav uniquement).
- Body : conditionnellement rendu selon `hierarchyMode × displayMode`.
  - tree+list / tree+details : récursif DFS (folders + patches imbriqués).
  - nav+list / nav+details : flat (folder courant uniquement) avec
    ligne ".." si pas racine.
  - nav+tiles : grid 2D avec `<PatchThumbnail />`.
- Handlers de sélection, clipboard, drag-and-drop, lasso.
- `<BibContextMenu />` rendu conditionnel (clic droit).
- Lasso rectangle : state local, overlay `<div>` dashed cyan.

**`BibBreadcrumb.jsx`** :
- Affiche la chaîne de folders parents (cliquables) jusqu'au current.
- Click dans la zone vide (au bout, après les segments) → mode
  édition. Input texte. Enter valide ; Esc cancel.
- Parsing du chemin : descend la hiérarchie en matching par nom
  (insensible casse).
- Erreur de parsing → notification + reste en édition, focus
  préservé.

**`BibContextMenu.jsx`** :
- Calqué sur le menu inline actuel (pattern Timeline.jsx).
- Variantes selon `menu.type` : `'patch'`, `'folder'`, `'empty'`.
- Entries patch : Renommer, Copier, Couper, Exporter ce patch,
  Supprimer.
- Entries folder : Renommer, Copier, Couper, Coller dans (disabled
  si clipboard vide), Exporter ce dossier, Supprimer.
- Entries empty area : Nouveau dossier, Coller (disabled si vide).
- Fermeture sur clic backdrop, Esc, ou clic sur une entry.

**`PatchThumbnail.jsx`** :
- Pure : prend `points` (Array de 600 floats) + couleur + dims.
- Génère un path SVG en samplant ~60 points pour réduire la
  complexité (vise les 60 pixels de largeur).
- `useMemo` sur le path pour éviter recalcul à chaque render.
- Stroke uniquement (pas de fill), 1.5px.

**`PopupResizer.jsx`** :
- Drag handle sur le bord droit du popup Bibliothèque (mode sidebar
  Designer collapsed).
- Pattern calqué sur `SidebarResizer.jsx` existant.
- Min width 320, max width = `min(viewport.width * 0.8, 800)`.
- Commit final via `SET_BIB_POPUP_WIDTH` au mouseup.

**`bibTransfer.js`** :
- `duplicateItemsToFolder(state, items, targetFolderId)` →
  `{ newPatches, newFolders, patchCounterAfter, folderCounterAfter }`.
- Logique récursive pour folders (descend tout le sous-arbre).
- Dédup des noms via `nextAvailableFolderName`.
- Pure ; le reducer applique le delta.

### Diagramme

```
                  PatchBank.jsx
       ┌──────────┬────────────┬──────────┐
       │          │            │          │
   <Header>   <BibBreadcrumb>  <body>     <BibContextMenu> (conditionnel)
   + toggles  (nav only)       (5 layouts)
                                │
                          ┌─────┴──────────┐
                          │ tiles only:    │
                          │ <PatchThumbnail/>
                          └────────────────┘

   <PopupResizer> (rendu par App, dans le wrapper du popup)
```

## 5. Data flow & handlers

### Sélection

`handleItemClick(item, event)` centralisé :

- `e.shiftKey && anchor` → range selection (items entre anchor et
  cliqué, en ordre visuel via `getOrderedItemList`).
- `e.ctrlKey || e.metaKey` → toggle ou add (selon que l'item est
  déjà sélectionné ou non).
- Sinon → set (remplace sélection par cet item, met à jour l'anchor).

`getOrderedItemList({ hierarchyMode, currentFolderId, soundFolders,
patches, collapsedFolders })` retourne la liste flat en ordre visuel :
- Tree : DFS récursif, sauf descendants de folders collapsed.
- Nav : items du current folder (folders puis patches, ordre
  d'insertion).

Utilisé par range selection ET keyboard nav ↑↓.

### Lasso

State local `lasso = { x0, y0, x1, y1 } | null`.

`mousedown` dans zone vide (target === bodyRef) → init lasso.
`mousemove` → update x1, y1.
`mouseup` → iter sur DOM nodes avec `data-bib-item-id`,
intersect leur `getBoundingClientRect()` avec le rect, dispatch
`SELECT_BIB_ITEMS` mode `'set'` avec les items intersectés.

### Clipboard

```js
handleCopy() → COPY_BIB_ITEMS({ items: bibSelectedIds })
handleCut()  → CUT_BIB_ITEMS({ items: bibSelectedIds })
handlePaste(targetFolderId = bibCurrentFolderId) → PASTE_BIB_CLIPBOARD({ targetFolderId })
```

`PASTE_BIB_CLIPBOARD` côté reducer :
1. Anti-cycle check : pour chaque folder item du clipboard, refuser
   si `targetFolderId === item.id` ou si target dans
   `getDescendantFolderIds(item.id, soundFolders)`.
2. Si refus → `notification` set, no state change.
3. Si cut : remap parentId/folderId vers target. Clipboard cleared.
4. Si copy : appel `duplicateItemsToFolder(state, items, target)`,
   append au state, increment counters.

### Drag-and-drop avec multi-sélection

```js
handleDragStart(e, item) {
  const isSelected = bibSelectedIds.some(s => s.id === item.id && s.type === item.type)
  const dragItems = isSelected ? bibSelectedIds : [item]
  if (!isSelected) dispatch SELECT_BIB_ITEMS({ items: dragItems, mode: 'set' })
  e.dataTransfer.setData('application/x-patchbank-drag', JSON.stringify(dragItems))
}

handleDropOnFolder(e, targetFolderId) {
  const items = JSON.parse(...)
  // Anti-cycle identique à paste
  if (cycle détecté) → notify, abort
  dispatch MOVE_BIB_ITEMS({ items, targetFolderId })
}
```

Drop sur ".." en Nav mode = drop sur `parentOf(currentFolderId)`.

### Raccourcis clavier

`useEffect` global avec garde "focus is in bibliothèque" :

```
Ctrl+C → handleCopy()
Ctrl+X → handleCut()
Ctrl+V → handlePaste()
F2     → startRename (single selection seulement)
Suppr  → handleDeleteSelected
Esc    → clear clipboard si non-vide, sinon clear selection
↑/↓    → nav selection via getOrderedItemList + dispatch SELECT mode 'set'
Shift+↑/↓ → idem mais mode 'set' avec range depuis anchor
Enter  → ouvre selected (folder = navigate/expand, patch = load)
```

Focus tracking via `onFocusIn`/`onFocusOut` sur le `<aside
tabIndex={-1}>` racine.

### Drag selection lasso vs drag-and-drop

Conflit potentiel : drag dans zone vide = lasso, drag sur item =
drag-and-drop. Distingués par `e.target` :
- `e.target === bodyRef.current` → lasso.
- `e.target` est un item ou descendant d'item → drag-and-drop.

## 6. Edge cases

| Cas | Comportement |
|-----|--------------|
| Bibliothèque vide | Empty state par mode, breadcrumb "root" en Nav |
| `bibCurrentFolderId` pointe vers folder supprimé entre sessions | Fallback `null` au `loadPersistedState` |
| Suppression d'items dans la sélection courante | Items retirés de `bibSelectedIds`. `bibSelectionAnchor` reset à `null` si supprimé |
| Suppression du patch courant | Designer.editor vidé (path `DELETE_PATCH` existant set `currentPatchId: null`) |
| Cut puis navigation vers un autre dossier | Items cut restent ghostés dans leur dossier d'origine (visibles si on y retourne). Paste fonctionnel depuis n'importe quel dossier |
| Cut puis Esc | Clipboard cleared, ghost retiré |
| Cut puis nouveau Cut/Copy | Le précédent remplacé |
| Paste avec clipboard vide | "Coller" disabled, Ctrl+V no-op |
| Range selection en tree avec items à indentation variable | Ordre suit DFS — traverse les niveaux |
| Drag d'un patch chargé dans Designer | currentPatchId reste valide (référence par ID) |
| Path édité invalide | Toast d'erreur précis, focus préservé en édition |
| Path édité ambigu (sensibilité casse) | Match insensible casse, exact prioritaire, premier trouvé |
| Drop sur ".." à la racine | ".." pas affiché à la racine, donc impossible |
| Drop sur soi (folder.id === targetFolderId) | Anti-cycle bloque |
| Tiles + Tree (état impossible par UI) | Fallback silencieux : rendre en List |

## 7. Risk register

| Risque | Mitigation |
|--------|------------|
| PatchBank.jsx >~700 lignes | Extraction sous-composants (Breadcrumb, ContextMenu, Thumbnail, Resizer). Pattern à suivre pour futures extensions |
| Anti-cycle oublié quelque part | Helper `wouldCreateCycle(items, target, soundFolders)` centralisé, appelé par PASTE et MOVE |
| Sélection edge cases (anchor disparu, ordering avec collapsed) | `getOrderedItemList` pure, testable. Fallback : si anchor null, premier clic devient anchor |
| Lasso hit-test inexact en tree | DOM-based avec `getBoundingClientRect` (chaque item retourne son rect réel) |
| Multi-instance sync | Tout le state dans reducer global → re-render auto. Pas de miroir local |
| Keyboard conflict navigateur | `preventDefault()` sur shortcuts capturés. Focus guard évite capture hors bibliothèque |
| Focus management fragile | `tabIndex={-1}` sur `<aside>`, focus programmatique après opération |
| Popup resize chevauchement | Min 320, max viewport×0.8. Clamp dynamique sur resize fenêtre |

## 8. Tests manuels (déférés utilisateur après livraison)

**Modes & navigation** :
1. Toggle Tree↔Nav, persiste au reload.
2. Toggle List↔Details↔Tiles ; Tiles caché en Tree.
3. Création folders imbriqués, navigation par clic.
4. Breadcrumb : clic segments, root, saisie path (valide + invalide).
5. Drop sur ".." = move au parent.

**Sélection** :
6. Clic simple sélectionne.
7. Ctrl+clic toggle.
8. Shift+clic range.
9. Lasso sélectionne items intersectés.
10. Sélection cleared au change folder en Nav, préservée sur autres
    changements.

**Clipboard** :
11. Ctrl+C, naviguer, Ctrl+V → duplique avec dédup nom.
12. Ctrl+X, naviguer, Ctrl+V → déplace.
13. Cut state ghost visible.
14. Cut + Esc → cleared.
15. Cut folder + paste dans son sous-arbre → bloqué + notif.
16. Drag folder dans son sous-arbre → bloqué.
17. Copy folder → toute l'arborescence dupliquée.

**Multi-sélection + ops** :
18. Sélection 3 items + Ctrl+C+V → 3 duplications.
19. Sélection 3 items + Suppr → confirm puis suppression.
20. Sélection 3 items + drag → tous suivent.

**Keyboard nav** :
21. ↑↓ déplace la sélection (focus dans la bibliothèque).
22. Shift+↑↓ étend range.
23. Enter sur folder = entre (Nav) ou toggle (Tree).
24. Enter sur patch = charge Designer.
25. F2 = rename inline.

**Tiles** :
26. Chaque tuile patch a un mini-SVG de la waveform, change quand
    on modifie le dessin.
27. Tuiles folder = icône 📁 + nom.
28. Double-clic tuile folder = entre.

**Popup resize** :
29. Sidebar collapsed, popup ouvert.
30. Drag bord droit = resize fluide.
31. Persisté au reload.

**Designer + Composer** :
32. Modif mode en Designer → Composer reflète.
33. Sélection en Designer → highlight aussi en Composer.

## 9. Décisions architecturales à inscrire dans CONTEXT.md

1. **Bibliothèque multi-mode (5 combinaisons valides)** — Tree × List/Details + Nav × List/Details/Tiles. Tiles caché en Tree (incohérent). State partagé entre Designer et Composer via reducer global (un seul jeu de préférences).

2. **Sélection comme concept UX distinct de `currentPatchId`** — `bibSelectedIds` = sélection visuelle multi-items ; `currentPatchId` = patch chargé dans le Designer. Clic simple sélectionne, double-clic ouvre/charge. Suppression du current → Designer vidé.

3. **Anti-cycle paste/drag via `getDescendantFolderIds`** — toute opération qui prend un folder pour cible doit refuser le folder lui-même ou tout descendant. Helper centralisé, appelé par `PASTE_BIB_CLIPBOARD` et `MOVE_BIB_ITEMS`. Notification utilisateur en cas de refus.

4. **Clipboard transient, PASTE/MOVE undoable** — `bibClipboard`, `bibSelectedIds`, `bibSelectionAnchor` non persistés, non undoable (UI state). `PASTE_BIB_CLIPBOARD` et `MOVE_BIB_ITEMS` dans `DESIGNER_UNDOABLE` (mutent patches/folders).

5. **Lasso selection via `data-bib-item-id`** — chaque DOM node d'item porte des attributs `data-bib-item-id` et `data-bib-item-type`. Hit-test via `querySelectorAll` + `getBoundingClientRect`. Robuste aux indentations variables (tree mode).

6. **Composants extraits pour gérer la croissance** — `BibBreadcrumb.jsx`, `BibContextMenu.jsx`, `PatchThumbnail.jsx`, `PopupResizer.jsx`. Convention : un sous-élément qui dépasse ~80 lignes mérite son fichier.

## 10. Hors scope explicite (résumé)

- Pas de tri (par nom, date, etc.) — ordre d'insertion.
- Pas de recherche / filtrage.
- Pas de favoris / pinning.
- Pas de custom thumbnails.
- Pas de Tiles size ajustable.
- Pas de per-instance preferences (shared state confirmé).
- Pas de preview audio au survol.
- Pas de bulk rename.
- Pas de réordonnancement libre par drag.
