# Spec — Bibliothèque multi-mode phase 2 (3 sous-applications autonomes)

> Date : 2026-05-25
> Statut : spec validée — en attente de plan d'implémentation
> Suite de : `docs/superpowers/specs/2026-05-25-bibliotheque-multi-mode-design.md` (phase 1)

## 1. Objectif

Restructurer l'app en **3 sous-applications autonomes** — Bibliothèque,
Designer, Composer — chacune avec son cycle de vie et sa pile undo
propre. La Bibliothèque devient un onglet dédié à part entière (en
plus des onglets Designer et Composer existants), et les sidebars
Designer/Composer se simplifient en `PatchPicker` minimalistes
read-only + load + drag-out.

Cette phase 2 résout aussi deux bugs UX identifiés en phase 1 :
- Clipboard cleared après chaque paste (empêche le multi-paste après
  copy).
- Multi-delete produit N entrées undo distinctes (devrait être atomique).

Et ajoute un workflow explicite pour la sauvegarde de patches : popup
avec sélecteur d'emplacement et de nom (remplace l'auto-naming actuel).

## 2. Scope

### In scope

- **3 onglets** : Bibliothèque (premier), Designer, Composer
- **3 piles undo** distinctes : `library`, `designer`, `composer`
- **Routing Ctrl+Z par activeTab** (remplace le focus tracking complexe
  de phase 1 Task 11)
- **PatchPicker** lightweight pour les sidebars Designer/Composer
- **Onglet Bibliothèque dédié** : full PatchBank + toolbar d'actions
  icônes (équivalent menu contextuel)
- **Layout adaptatif full-screen** dans l'onglet biblio (tiles
  auto-fill, list/details avec espacement pour lasso)
- **SavePatchDialog** modal popup pour `handleSaveAsNew` :
  - Breadcrumb cliquable + dropdown arborescent pour folder picker
  - Input nom avec default intelligent
  - Bouton "Nouveau dossier" inline non-undoable
- **DeleteUsageWarningDialog** modal de warning quand patch utilisé en
  Composer (remplace le transport immédiat actuel)
- **`DELETE_BIB_ITEMS`** action batch atomique (1 undo = 1 batch)
- **Clipboard cut→copy après premier paste** (préserve pour multi-paste)
- **`SAVE_PATCH` non-undoable**
- **Right-click sur item non sélectionné** → set selection à cet item
  puis menu
- **Right-click dans le vide** → désélectionne + menu empty
- **`OPEN_IN_LIBRARY` action atomique** depuis sidebar PatchPicker
- **`skipUndo` flag** dans `action.meta` (extension générique)
- **Migration des actions undoable** : `CREATE_FOLDER`,
  `RENAME_FOLDER`, `DELETE_FOLDER`, `RENAME_PATCH`, `DELETE_PATCH`,
  `MOVE_BIB_ITEMS`, `PASTE_BIB_CLIPBOARD`, `IMPORT_LIBRARY`
  → LIBRARY_UNDOABLE (au lieu de DESIGNER_UNDOABLE)

### Hors scope

- Re-évaluation déduplication automatique des noms (patches/folders
  peuvent désormais avoir le même nom dans le même dossier — message
  d'alerte mais pas de bloc ni rename forcé)
- Export multi-sélection avec arbo relative (reste sur scopes actuels
  `'all'` / `'folder'` / `'patch'`)
- Cross-tab drag-and-drop
- Split de `PatchBank` en sub-views
- Preview audio au hover
- Sorting / search / favoris
- Persistance du clipboard biblio au reload

## 3. Modèle de données & state

### State slices

```js
state.history = {
  designer: { past: [], future: [] },
  composer: { past: [], future: [] },
  library:  { past: [], future: [] }     // ← nouveau
}

// Fields snapshotted par chaque pile
const DESIGNER_FIELDS = ['editor', /* state interne au Designer, inchangé */]
const COMPOSER_FIELDS = ['clips', 'tracks', /* etc., inchangé */]
const LIBRARY_FIELDS  = ['patches', 'soundFolders', 'patchCounter', 'folderCounter']
```

**Note** : `currentPatchId` n'est dans **aucune** pile.
- Undo Designer (UPDATE_PATCH) restaure le patch en place, pas
  `currentPatchId`.
- Undo Library (DELETE_BIB_ITEMS d'un patch courant) restaure le patch
  mais `currentPatchId` reste `null` (mis à `null` au moment du delete).
  L'utilisateur recharge manuellement.

### Actions classification

```js
const DESIGNER_UNDOABLE = new Set([
  'UPDATE_PATCH',
  /* + autres actions internes au Designer (inchangées) */
])

const COMPOSER_UNDOABLE = new Set([
  /* inchangé */
])

const LIBRARY_UNDOABLE = new Set([
  'CREATE_FOLDER',         // depuis biblio menu uniquement (popup utilise skipUndo)
  'RENAME_FOLDER',
  'DELETE_FOLDER',
  'RENAME_PATCH',
  'DELETE_PATCH',          // pour single delete via fallback contextMenu
  'DELETE_BIB_ITEMS',      // nouveau, batch delete (multi-select)
  'MOVE_BIB_ITEMS',
  'PASTE_BIB_CLIPBOARD',
  'IMPORT_LIBRARY',
])
```

### Actions non-undoable (UI / metadata / explicit save)

- `SAVE_PATCH` (action utilisateur explicite avec popup)
- `SELECT_BIB_ITEMS`, `CLEAR_BIB_SELECTION`
- `COPY_BIB_ITEMS`, `CUT_BIB_ITEMS`, `CLEAR_BIB_CLIPBOARD`
- `SET_BIB_*` (UI prefs)
- `SET_ACTIVE_TAB`, `SET_BIB_CURRENT_FOLDER`
- `OPEN_IN_LIBRARY` (composition de SET_ACTIVE_TAB + SET_BIB_CURRENT_FOLDER + SELECT_BIB_ITEMS)
- `CLEAR_PENDING_DELETE_WARNING` (consume de l'UI state)
- Toute action avec `meta.skipUndo === true`

### State fields ajoutés

```js
state.pendingDeleteWarning: null
// Ou : { blockedPatches: [{id, name, usageCount}], freedCount: number }
// Consumed par DeleteUsageWarningDialog, cleared par CLEAR_PENDING_DELETE_WARNING
// (et automatiquement par SET_ACTIVE_TAB)
```

### State field activeTab — extension

```js
state.activeTab: 'library' | 'designer' | 'composer'
// Default 'designer' au premier load (préserve l'existant — l'utilisateur arrive sur l'éditeur).
// Library est PREMIER dans l'ordre visuel du header mais pas le landing par défaut.
// Persisté localStorage.
```

## 4. Routing & Ctrl+Z

```js
// App.jsx global keydown handler
useEffect(() => {
  const onKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      const action = {
        library: 'UNDO_LIBRARY',
        designer: 'UNDO_DESIGNER',
        composer: 'UNDO_COMPOSER',
      }[activeTab]
      dispatch({ type: action })
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      const action = {
        library: 'REDO_LIBRARY',
        designer: 'REDO_DESIGNER',
        composer: 'REDO_COMPOSER',
      }[activeTab]
      dispatch({ type: action })
    }
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}, [activeTab])
```

Le `useEffect` keydown de `PatchBank` introduit en phase 1 Task 11
**ne traite plus `Ctrl+Z`/`Ctrl+Y`** (laisse App.jsx s'en occuper).
Conserve F2, Suppr/Backspace, ↑↓ (Shift), Enter, Esc, Ctrl+C/X/V.

## 5. Architecture composants

### Structure des fichiers

```
src/components/
  ├── PatchBank.jsx              MODIFY (toolbar d'actions icônes, retrait Ctrl+Z du keydown)
  ├── PatchPicker.jsx + .css     CREATE (~150 lignes, sidebar lightweight)
  ├── SavePatchDialog.jsx + .css CREATE (~120 lignes, modal popup save)
  ├── DeleteUsageWarningDialog.jsx + .css CREATE (~80 lignes, modal warning)
  ├── (autres composants phase 1 inchangés)

src/reducer.js                   MODIFY (LIBRARY_UNDOABLE, LIBRARY_FIELDS,
                                  DELETE_BIB_ITEMS, OPEN_IN_LIBRARY, skipUndo flag,
                                  pendingDeleteWarning, UNDO_LIBRARY/REDO_LIBRARY)
src/App.jsx                      MODIFY (3 tabs, Ctrl+Z routing global, popup wiring)
src/components/WaveformEditor.jsx MODIFY (handleSaveAsNew ouvre popup au lieu de dispatch direct)
```

### PatchPicker.jsx (~150 lignes)

```jsx
// Props
{
  patches,
  soundFolders,
  currentPatchId,
  bibClipboard,   // pour visuel is-cut (cohérence cross-tab)
  bibSelectedIds, // pour visuel is-selected (synchro avec biblio)
  activeTab,      // 'designer' | 'composer' (pour pattern click)
  onLoadPatch,    // (patchId) → load dans Designer (sur click en mode 'designer')
  onOpenInLibrary,// ({type, id}) → dispatch OPEN_IN_LIBRARY
  onDragStart,    // (e, type, id) → HTML5 drag pour le drop sur timeline (Composer)
}
```

Rendu :
- Mode Tree+List forcé (pas de toggle)
- Pas de toolbar
- Pas de breadcrumb
- Pas de useState pour clipboard/lasso/contextMenu/editing
- Chevron toggle expand pour folders
- `draggable` sur chaque patch (drag native)
- `data-bib-item-id` + `data-bib-item-type` préservés (pas de lasso ici
  mais cohérent avec PatchBank pour le futur)
- `is-current` highlight sur `currentPatchId`
- `is-selected` highlight sur items dans `bibSelectedIds` (sync visuelle
  cross-tab)
- `is-cut` highlight sur items dans `bibClipboard.items` mode 'cut'
- Menu contextuel inline ultra-simplifié : 1 entrée "Ouvrir dans Bibliothèque"

Interactions :
- Click sur patch (Designer) → `onLoadPatch(patch.id)`
- Click sur patch (Composer) → no-op (drag est la primary interaction)
- Click sur folder-row → toggleExpand (chevron + name cliquable)
- Double-click sur patch (n'importe quel onglet) → équivalent click
  Designer (charge + bascule onglet)
- Drag → HTML5 native, `onDragStart` propagé
- Right-click → menu inline "Ouvrir dans Bibliothèque"
- Pas de Ctrl/Shift/lasso, pas de keyboard shortcut autre que ce qui
  remonte au document level via App.jsx

### SavePatchDialog.jsx (~120 lignes)

Pattern modal classique : backdrop fixed inset 0, dialog centré.

```jsx
// Props
{
  currentPatch,     // null si canvas vierge, sinon patch source
  patches,          // pour computation default name (dédup)
  soundFolders,     // pour le picker
  bibCurrentFolderId,
  initialPatchData, // données du Designer à enregistrer
  onConfirm,        // ({ name, folderId, patchData }) → dispatch SAVE_PATCH
  onCancel,         // () → ferme sans dispatch
  onCreateFolder,   // (name, parentId) → dispatch CREATE_FOLDER avec meta.skipUndo=true
}
```

État local :
- `name` (string) : default `currentPatch ? \`\${currentPatch.name} (\${N})\` : 'Nouveau patch'`
- `folderId` (string|null) : default `currentPatch?.folderId ?? null`
- `creatingFolder` (boolean) : pour le sous-flow inline "Nouveau dossier"
- `newFolderName` (string) : input du sous-flow

UI :
- Header "Sauvegarder le patch"
- Champ nom (`autoFocus`, validation `trim() !== ''`)
- Picker dossier = breadcrumb cliquable du folder courant + dropdown
  arborescent (rendu indenté par profondeur)
- Bouton "+ Nouveau dossier" → ouvre sous-flow inline (input apparaît
  sous le breadcrumb, Entrée crée le folder au current `folderId` et
  bascule `folderId` sur le nouveau, Esc annule)
- Validation visuelle : si nom déjà pris dans le folder, warning
  inline "⚠ Un patch nommé X existe déjà" mais pas de bloc.
- Actions : "Annuler" (close) | "Sauvegarder" (confirm)

### DeleteUsageWarningDialog.jsx (~80 lignes)

```jsx
// Props
{
  warning,         // { blockedPatches: [{id, name, usageCount}], freedCount }
  onGoToComposer,  // ({patchIds}) → dispatch composé : SET_ACTIVE_TAB('composer') + SELECT_CLIPS_USING_PATCHES
  onClose,         // () → dispatch CLEAR_PENDING_DELETE_WARNING
}
```

UI :
- Modal centré, header "⚠ Suppression partielle" ou "⚠ Suppression refusée"
- Texte récap :
  ```
  {freedCount > 0 ? "{freedCount} patches supprimés." : ""}
  {blockedPatches.length} patches non supprimés car utilisés dans le Composer :
    • {name} ({usageCount} clip{s})
    ...
  ```
- Actions : "Voir dans le Composer" | "OK"
- Esc / click backdrop = "OK"

### Toolbar d'actions dans PatchBank (onglet biblio)

Nouvelle rangée d'icônes après les toggles Tree/Nav | List/Details/Tiles :

```jsx
<div className="bib-action-toolbar">
  <button title="Nouveau dossier"><FolderPlus size={14}/></button>
  <button title="Renommer (F2)" disabled={selection.length !== 1}><Edit3 size={14}/></button>
  <button title="Copier (Ctrl+C)" disabled={!selection.length}><Copy size={14}/></button>
  <button title="Couper (Ctrl+X)" disabled={!selection.length}><Scissors size={14}/></button>
  <button title="Coller (Ctrl+V)" disabled={!clipboard.length}><Clipboard size={14}/></button>
  <button title="Supprimer (Suppr)" disabled={!selection.length}><Trash2 size={14}/></button>
  <div className="separator" />
  <button title="Importer (.osa)"><Upload size={14}/></button>
  <button title="Exporter" disabled={selection.length !== 1}><Download size={14}/></button>
</div>
```

Icônes seules, texte en tooltip avec raccourci entre parenthèses.
Handlers identiques aux entrées du menu contextuel (réutilise
`handleCopy`, `handleCut`, etc.).

## 6. Data flow

### PASTE_BIB_CLIPBOARD modifié (cut→copy après premier paste)

```js
case 'PASTE_BIB_CLIPBOARD': {
  if (!state.bibClipboard) return state
  const { targetFolderId = null } = action.payload
  const { mode, items } = state.bibClipboard

  if (wouldCreateCycle(items, targetFolderId, state.soundFolders)) {
    return { ...state, notification: { ... } }
  }

  if (mode === 'cut') {
    // Premier paste : move + bascule en mode 'copy'
    const patchIds = new Set(items.filter(i => i.type === 'patch').map(i => i.id))
    const folderIds = new Set(items.filter(i => i.type === 'folder').map(i => i.id))
    return {
      ...state,
      patches: state.patches.map(p =>
        patchIds.has(p.id) ? { ...p, folderId: targetFolderId } : p
      ),
      soundFolders: state.soundFolders.map(f =>
        folderIds.has(f.id) ? { ...f, parentId: targetFolderId } : f
      ),
      bibClipboard: { mode: 'copy', items: [...items] },  // ← clipboard préservé en copy
    }
  }
  // mode === 'copy' : duplique, clipboard reste
  const result = duplicateItemsToFolder(items, targetFolderId, state)
  return {
    ...state,
    patches: [...state.patches, ...result.newPatches],
    soundFolders: [...state.soundFolders, ...result.newFolders],
    patchCounter: result.patchCounterAfter,
    folderCounter: result.folderCounterAfter,
    bibClipboard: state.bibClipboard,  // ← préservé
  }
}
```

### DELETE_BIB_ITEMS (batch atomique, undoable)

```js
case 'DELETE_BIB_ITEMS': {
  const { items } = action.payload
  if (items.length === 0) return state

  const blockedPatches = []
  const allowedPatchIds = new Set()
  const allowedFolderIds = new Set()

  // Helper : compte les clips utilisant ce patch (cross-state read)
  const countUsage = (patchId) =>
    state.clips.filter(c => c.patchId === patchId).length

  for (const item of items) {
    if (item.type === 'patch') {
      const usage = countUsage(item.id)
      if (usage > 0) {
        const patch = state.patches.find(p => p.id === item.id)
        blockedPatches.push({ id: item.id, name: patch?.name ?? '?', usageCount: usage })
      } else {
        allowedPatchIds.add(item.id)
      }
    } else if (item.type === 'folder') {
      // Tous les patches descendants doivent être libres
      const descendantPatchIds = getDescendantPatches(item.id, state)
      const blockedDescendants = descendantPatchIds.filter(id => countUsage(id) > 0)
      if (blockedDescendants.length > 0) {
        // Folder entier bloqué (atomicity)
        for (const pid of blockedDescendants) {
          const patch = state.patches.find(p => p.id === pid)
          blockedPatches.push({ id: pid, name: patch?.name ?? '?', usageCount: countUsage(pid) })
        }
      } else {
        // Folder libre : on supprime folder + tous descendants (folders et patches)
        allowedFolderIds.add(item.id)
        const descendantFolderIds = getDescendantFolderIds(item.id, state.soundFolders)
        for (const fid of descendantFolderIds) allowedFolderIds.add(fid)
        for (const pid of descendantPatchIds) allowedPatchIds.add(pid)
      }
    }
  }

  // Calculer le freedCount (items demandés effectivement supprimés)
  const freedCount = items.filter(item => {
    if (item.type === 'patch') return allowedPatchIds.has(item.id)
    if (item.type === 'folder') return allowedFolderIds.has(item.id)
    return false
  }).length

  // Si currentPatchId supprimé → null
  const newCurrentPatchId = allowedPatchIds.has(state.currentPatchId)
    ? null
    : state.currentPatchId

  return {
    ...state,
    patches: state.patches.filter(p => !allowedPatchIds.has(p.id)),
    soundFolders: state.soundFolders.filter(f => !allowedFolderIds.has(f.id)),
    currentPatchId: newCurrentPatchId,
    bibSelectedIds: [],  // reset selection
    bibSelectionAnchor: null,
    pendingDeleteWarning: blockedPatches.length > 0
      ? { blockedPatches, freedCount }
      : null,
  }
}
```

### OPEN_IN_LIBRARY (atomique)

```js
case 'OPEN_IN_LIBRARY': {
  const { type, id } = action.payload
  let parentFolderId
  if (type === 'patch') {
    parentFolderId = state.patches.find(p => p.id === id)?.folderId ?? null
  } else {
    parentFolderId = state.soundFolders.find(f => f.id === id)?.parentId ?? null
  }
  return {
    ...state,
    activeTab: 'library',
    bibCurrentFolderId: parentFolderId,
    bibHierarchyMode: 'nav',  // force nav pour visibilité du breadcrumb
    bibSelectedIds: [{ type, id }],
    bibSelectionAnchor: { type, id },
  }
}
```

### skipUndo flag

```js
// Au top du reducer, avant le switch principal :
function shouldSnapshot(action, set) {
  return set.has(action.type) && !action.meta?.skipUndo
}

const isLibrary = shouldSnapshot(action, LIBRARY_UNDOABLE)
const isDesigner = shouldSnapshot(action, DESIGNER_UNDOABLE)
const isComposer = shouldSnapshot(action, COMPOSER_UNDOABLE)

// Push snapshot avant d'appliquer l'action
let newHist = state.history
if (isLibrary) {
  const snap = pickFields(state, LIBRARY_FIELDS)
  newHist = {
    ...state.history,
    library: {
      past: [...state.history.library.past, snap].slice(-HISTORY_DEPTH),
      future: [],
    },
  }
}
// Idem designer / composer (logique existante)

// Appliquer le reducer normalement
const newState = mainReducer(state, action)
return { ...newState, history: newHist }
```

### Right-click selection sync

Dans `renderPatchChip`, `renderFolder`, `renderXxxTile` :

```jsx
onContextMenu={(e) => {
  e.preventDefault()
  e.stopPropagation()
  const isInSelection = bibSelectedIds.some(s => s.id === item.id && s.type === item.type)
  if (!isInSelection) {
    onSelectItems([{ type: item.type, id: item.id }], 'set')
  }
  setContextMenu({ type: item.type, id: item.id, clientX: e.clientX, clientY: e.clientY })
}}
```

Le `handleCopy/Cut/Delete` peut alors compter sur `bibSelectedIds` pour
toujours refléter la cible du menu — plus besoin du fallback
`contextMenu.id` ajouté en phase 1 Task 10. Le code se simplifie.

Et pour le **right-click dans le vide** :

```jsx
onContextMenu={(e) => {
  if (e.target.closest('[data-bib-item-id]')) return
  e.preventDefault()
  onClearSelection?.()  // ← nouveau
  setContextMenu({ type: 'empty', clientX: e.clientX, clientY: e.clientY })
}}
```

### SAVE_PATCH avec popup (non-undoable)

Le reducer `SAVE_PATCH` est modifié pour accepter un `folderId` optionnel :

```js
case 'SAVE_PATCH': {
  const { patchData, folderId = null } = action.payload
  const newCounter = state.patchCounter + 1
  const id = `patch-${newCounter}`
  const colorIndex = (newCounter - 1) % SOUND_COLORS.length
  return {
    ...state,
    patchCounter: newCounter,
    patches: [
      ...state.patches,
      {
        id,
        name: patchData.name,
        color: SOUND_COLORS[colorIndex],
        points: Array.from(patchData.points),
        // ... (ADSR, defaultTuningSystem, etc., inchangés)
        folderId,  // ← nouveau, default null
      },
    ],
    currentPatchId: id,
  }
}
```

Retiré de `DESIGNER_UNDOABLE`. Pas ajouté à `LIBRARY_UNDOABLE`.

`WaveformEditor.handleSaveAsNew` ouvre désormais le `SavePatchDialog`
au lieu de dispatcher directement. Le dialog dispatch `SAVE_PATCH` avec
`{ patchData: builtPayload, folderId: pickedFolderId }`.

### "Voir dans le Composer" (depuis DeleteUsageWarningDialog)

Action composée ou single :

```js
case 'GO_TO_COMPOSER_WITH_CLIPS': {
  const { patchIds } = action.payload
  const clipIdsUsingPatches = state.clips
    .filter(c => patchIds.includes(c.patchId))
    .map(c => c.id)
  return {
    ...state,
    activeTab: 'composer',
    selectedClipIds: clipIdsUsingPatches,
    pendingDeleteWarning: null,
  }
}
```

Non-undoable.

## 7. Edge cases

| Cas | Comportement |
|-----|--------------|
| `currentPatchId` supprimé via biblio (DELETE_BIB_ITEMS) | Set à `null`. Designer affiche état vide. |
| Undo LIBRARY restore le patch supprimé | Patch réapparaît. `currentPatchId` reste `null` (pas dans LIBRARY_FIELDS). Utilisateur recharge manuellement. |
| `RENAME_PATCH` du `currentPatch` via biblio | Header Designer reflète automatiquement (state partagé). |
| Cut puis switch tab → retour → paste | Clipboard préservé. Multi-paste OK. |
| Clipboard items supprimés entre cut et paste | Ignorés par filter dans le reducer. |
| Folder cut, target descendant ou lui-même | Anti-cycle reducer, notification, clipboard préservé. |
| Popup save : folder picker pointe vers folder supprimé entre ouverture et confirm | Fallback `null` (root). Improbable. |
| Esc dans popup save | Ferme sans dispatch, état Designer inchangé. |
| Nouveau dossier dans popup, puis Annuler | Folder créé reste dans la biblio (non-undoable). Suppression manuelle possible. |
| Multi-delete tous bloqués (0 patches libres) | Modal "Suppression refusée" sans message succès. |
| Multi-delete contient folders dont seuls certains patches sont bloqués | Folder atomique : si un patch descendant est bloqué, le folder entier n'est pas supprimé. |
| Click sur patch en sidebar Composer | `onLoadPatch` prop est `undefined`/noop côté Composer (drag = primary interaction). |
| Drag patch depuis sidebar Designer (onglet courant) | Pas de drop zone. Drag cosmétique sans effet. |
| Ctrl+Z dans biblio sans pile | No-op silencieux (cohérent Designer/Composer). |
| `OPEN_IN_LIBRARY` sur item supprimé | Parent folder = null. Sélection finit vide ou sur item absent (UI gère). |
| `pendingDeleteWarning` lors d'un switch tab | Cleared via SET_ACTIVE_TAB (sécurité). |
| Popup save : nom déjà pris dans folder choisi | Warning visuel inline, save permis (le user assume). |
| Sauvegarde patch identique à un patch existant | OK, le user assume. Multiple patches peuvent avoir le même nom. |

## 8. Risk register

| Risque | Mitigation |
|--------|------------|
| PatchBank.jsx reste à ~1100 lignes | Acceptable pour container orchestrateur full features. Split éventuel ultérieur en backlog. |
| Conflit clavier Ctrl+Z (PatchBank keydown vs App.jsx routing) | Retirer le case `'z'` du keydown PatchBank (Task 11 phase 1). Conserver F2, Suppr, etc. |
| Migration localStorage : ajout `history.library` | Transient (non-persisté). Aucun breaking change. |
| Migration localStorage : `activeTab` default change ('designer' → 'library') | `loadPersistedState` valide la valeur ; ajouter `'library'` aux valeurs acceptées. Pas de migration nécessaire pour les utilisateurs existants (leur `activeTab` persisté reste valide). |
| `DELETE_BIB_ITEMS` atomic snapshot | Une seule entrée undo restaure tous les items supprimés + currentPatchId (snap des fields LIBRARY). |
| `pendingDeleteWarning` non-persisté mais transient cross-action | Cleared explicitement dans `SET_ACTIVE_TAB` + dans le case `CLEAR_PENDING_DELETE_WARNING`. |
| `skipUndo` flag mal utilisé | Convention : réservé à des cas explicites documentés (popup save Nouveau dossier). Document dans le commentaire de l'action concernée. |
| Drag-and-drop sidebar PatchPicker → timeline Composer | Pattern HTML5 native. `dataTransfer` setData identique à PatchBank actuel. À vérifier que le drop receiver Composer continue de fonctionner. |
| Cross-pile undo incohérence | Délibérément accepté : un undo LIBRARY restore aussi le name affiché dans Designer si le `currentPatch` a été renommé. State unique → render synchro. |
| Mode tiles avec popup save | Le popup est rendu en overlay, indépendant du mode biblio. Pas d'interférence. |

## 9. Décisions architecturales à inscrire dans CONTEXT.md

1. **3 sous-applications autonomes** (Bibliothèque, Designer, Composer)
   avec piles undo séparées. Chaque sous-app a son raccourci Ctrl+Z,
   son cycle de vie propre. Co-dépendances gérées avec messages
   explicites (delete patch utilisé, currentPatchId vidé).

2. **Routing Ctrl+Z par `activeTab`** — trivial et prédictible.
   Remplace le focus tracking introduit en phase 1 Task 11. Le
   keydown PatchBank ne traite plus le Ctrl+Z (laissé à App.jsx).

3. **`SAVE_PATCH` non-undoable** — action explicite via popup (location
   + nom). Suppression d'un patch créé par erreur = action manuelle
   assumée. Évite le cross-cut entre piles Designer et Library.

4. **Clipboard cut→copy après premier paste** — `bibClipboard.mode`
   bascule automatiquement de `'cut'` à `'copy'` au premier paste.
   Items préservés pour multi-paste. Ghost `is-cut` disparaît
   naturellement.

5. **`DELETE_BIB_ITEMS` batch atomique undoable** — multi-delete = 1
   action = 1 entrée undo. Détecte les patches utilisés en Composer,
   supprime les libres, retourne `pendingDeleteWarning` pour modal.

6. **`skipUndo` flag dans `action.meta`** — extension générique pour
   bypasser le snapshot undo sur certaines actions contextuelles
   (popup save "Nouveau dossier"). Pattern réutilisable.

7. **Sidebar Designer/Composer = `PatchPicker` lightweight** —
   composant ~150 lignes, Tree+List forcé, click/drag uniquement,
   aucune manipulation directe. Menu contextuel unique : "Ouvrir dans
   Bibliothèque". Réduit la complexité runtime des sidebars et
   clarifie le paradigme (sidebars = pickers, pas éditeurs).

8. **Onglet Bibliothèque en premier dans l'ordre visuel du header** —
   Bibliothèque, Designer, Composer. Cohérent avec flow logique
   ressources → édition → composition. `activeTab` default reste
   `'designer'` au premier load (l'utilisateur arrive sur l'éditeur,
   pas la biblio vide).

9. **Right-click sur item non sélectionné** met à jour la sélection à
   cet item avant d'ouvrir le menu. Invariant : "menu = sélection
   courante". Simplifie `handleCopy/Cut/Delete` (plus de fallback).

10. **Right-click dans le vide** désélectionne explicitement avant
    d'ouvrir le menu empty. Cohérent avec le clic-sans-drag du lasso
    (déjà fait en phase 1).

## 10. Tests manuels (déférés après livraison)

**3 piles undo :**
1. Op biblio (rename folder) → switch Designer → modifs (dessiner) →
   Ctrl+Z Designer annule le dessin. Switch biblio → Ctrl+Z annule le
   rename. Piles indépendantes.
2. Op Composer (déplacer clip) → switch biblio → Ctrl+Z biblio no-op.
   Pas de pollution cross-pile.

**Save patch popup :**
3. Canvas vierge → Sauvegarder → popup default "Nouveau patch" + root.
4. Patch chargé → Save As New → popup default "{src.name} (N)" + folder
   du src.
5. Breadcrumb dropdown : naviguer, sélectionner folder, saisir nom,
   confirmer.
6. Bouton "+ Nouveau dossier" → inline input → Entrée → folder créé.
   Ctrl+Z biblio ne défait PAS ce folder (skipUndo).
7. Esc dans popup ferme sans save.

**Clipboard multi-paste :**
8. Cut 2 patches, paste in /X → move, mode bascule copy.
9. Paste in /Y → duplique. Plusieurs Ctrl+V successifs OK.
10. Esc clear clipboard. Nouveau cut/copy écrase.

**Multi-delete :**
11. Sélection 5 patches dont 2 utilisés → 3 supprimés, modal liste 2
    bloqués avec usageCount.
12. Click "Voir dans le Composer" → switch tab + clips sélectionnés.
13. Multi-delete tous bloqués → modal "Suppression refusée" sans
    message succès.
14. Multi-delete avec folder dont 1 patch descendant utilisé → folder
    entier non-supprimé.

**Right-click :**
15. Sélection 3 items → right-click sur 1 des 3 → menu opère sur les
    3.
16. Sélection 3 items → right-click sur 4ème non-sélectionné → sélection
    devient 4ème seul, menu opère sur lui.
17. Right-click zone vide → désélectionne, menu empty (Nouveau dossier,
    Coller).

**Sidebar PatchPicker :**
18. Designer sidebar : click patch → load. Drag cosmétique. Right-click
    → "Ouvrir dans Bibliothèque" → switch tab + sélection.
19. Composer sidebar : drag patch → drop timeline crée clip.
    Right-click → "Ouvrir dans Bibliothèque".

**Onglet Bibliothèque dédié :**
20. Layout full-screen. Toolbar icônes avec tooltips + raccourcis.
21. Tiles auto-fill, espace pour lasso.
22. List/Details : marges latérales pour lasso et confort de lecture.
23. Toolbar disabled state cohérent avec sélection / clipboard.

**Co-dépendances :**
24. Patch courant renommé via biblio → header Designer reflète.
25. Delete patch en biblio → si currentPatchId, Designer se vide.
26. Undo delete LIBRARY → patch revient, mais Designer reste vide
    (recharge manuelle).

## 11. Hors scope explicite

- Re-évaluation déduplication automatique des noms (patches/folders
  peuvent désormais avoir le même nom dans le même dossier ; alerte
  visuelle au save mais pas de blocage ni rename forcé).
- Export multi-sélection avec arbo relative — `buildExportPayload`
  reste sur scopes `'all'` / `'folder'` / `'patch'`. La toolbar
  "Exporter" est disabled si `selection.length !== 1`.
- Cross-tab drag-and-drop.
- Split de `PatchBank.jsx` en sub-views (`BibTreeView`/`BibNavView`/
  `BibTilesView`).
- Preview audio au hover.
- Sorting / search / favoris.
- Persistance du clipboard biblio au reload (reste transient).
- Confirmation modal pour single delete (un clic sur Suppr d'un patch
  unique non-utilisé supprime directement, comme aujourd'hui).
