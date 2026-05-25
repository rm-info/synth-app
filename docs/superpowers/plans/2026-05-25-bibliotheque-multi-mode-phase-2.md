# Bibliothèque multi-mode phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructurer l'app en 3 sous-applications autonomes (Bibliothèque, Designer, Composer) avec piles undo séparées, ajouter un onglet Bibliothèque dédié, downgrade les sidebars en PatchPicker simplifié, et introduire un popup explicite pour la sauvegarde de patches.

**Architecture:** Triple pile undo (`history.library/designer/composer`) avec routing trivial par `activeTab`. La Bibliothèque devient un onglet à part entière qui héberge le full `PatchBank`. Les sidebars Designer/Composer utilisent un nouveau composant `PatchPicker` lightweight (~150 lignes). Le `SavePatchDialog` modal pilote la création de patches avec folder picker et nouveau dossier inline. Le `DeleteUsageWarningDialog` gère le cas multi-delete avec patches utilisés dans le Composer.

**Tech Stack:** React 19 + Vite + Web APIs natifs. Lucide-react (déjà installé). Aucune nouvelle dépendance npm.

**Spec de référence:** `docs/superpowers/specs/2026-05-25-bibliotheque-multi-mode-phase-2.md`

**Convention commits:** `feat(iter-K/phase-2.N): description`.

---

## Préambule — Stratégie de test

Pas de framework de tests automatisés (CLAUDE.md : "tests manuels"). Pour chaque task :
1. `npm run lint` — 0 erreurs attendu
2. `npm run build` — pass attendu
3. Commit avec préfixe `feat(iter-K/phase-2.N): ...` (ou `docs:` pour CONTEXT.md)

Tests manuels (26 scénarios listés dans la spec §10) déférés à l'utilisateur après livraison.

---

## Task 1: Reducer — pile LIBRARY + skipUndo flag + migration actions

**Files:**
- Modify: `src/reducer.js` (history.library, LIBRARY_FIELDS, LIBRARY_UNDOABLE, UNDO_LIBRARY/REDO_LIBRARY, skipUndo flag, migration des actions)

- [ ] **Step 1: Ajouter `history.library` dans `buildInitialState`**

Repérer la section `history: { designer: ..., composer: ... }` dans `buildInitialState`. Ajouter la pile library :

```js
history: {
  designer: { past: [], future: [] },
  composer: { past: [], future: [] },
  library: { past: [], future: [] },
},
```

- [ ] **Step 2: Définir `LIBRARY_FIELDS` et `LIBRARY_UNDOABLE`**

Repérer la zone des constantes `COMPOSER_UNDOABLE` et `DESIGNER_UNDOABLE` (autour de la ligne 1630-1660). Ajouter avant :

```js
const LIBRARY_FIELDS = ['patches', 'soundFolders', 'patchCounter', 'folderCounter']

const LIBRARY_UNDOABLE = new Set([
  'CREATE_FOLDER',
  'RENAME_FOLDER',
  'DELETE_FOLDER',
  'RENAME_PATCH',
  'DELETE_PATCH',
  'DELETE_BIB_ITEMS',
  'MOVE_BIB_ITEMS',
  'PASTE_BIB_CLIPBOARD',
  'IMPORT_LIBRARY',
])
```

- [ ] **Step 3: Retirer ces actions de `DESIGNER_UNDOABLE`**

Modifier `DESIGNER_UNDOABLE` pour retirer toutes les actions qui sont maintenant dans `LIBRARY_UNDOABLE`. Lister son contenu actuel via grep si nécessaire :

```bash
grep -A 20 "const DESIGNER_UNDOABLE" src/reducer.js
```

Le résultat attendu après modification :

```js
const DESIGNER_UNDOABLE = new Set([
  'UPDATE_PATCH',
  // (autres actions Designer internes inchangées, sans CREATE_FOLDER/RENAME_FOLDER/etc.)
  // SAVE_PATCH retiré aussi (non-undoable)
])
```

**Important** : ne PAS retirer d'autres actions Designer non listées dans la migration (ex : actions internes à l'éditeur de patch comme les modifications de courbe ADSR).

- [ ] **Step 4: Ajouter UNDO_LIBRARY / REDO_LIBRARY**

Près des cases existants `UNDO_DESIGNER` / `REDO_DESIGNER`, ajouter :

```js
case 'UNDO_LIBRARY': {
  const { past, future } = state.history.library
  if (past.length === 0) return state
  const previous = past[past.length - 1]
  const current = pickFields(state, LIBRARY_FIELDS)
  return {
    ...state,
    ...previous,
    history: {
      ...state.history,
      library: { past: past.slice(0, -1), future: [current, ...future] },
    },
  }
}
case 'REDO_LIBRARY': {
  const { past, future } = state.history.library
  if (future.length === 0) return state
  const next = future[0]
  const current = pickFields(state, LIBRARY_FIELDS)
  return {
    ...state,
    ...next,
    history: {
      ...state.history,
      library: { past: [...past, current], future: future.slice(1) },
    },
  }
}
```

Le helper `pickFields(state, fields)` existe déjà (utilisé par les autres piles).

- [ ] **Step 5: Modifier la logique de snapshot pour gérer la pile library + skipUndo flag**

Repérer la section au bas du switch qui pousse les snapshots dans les piles undo (autour de la ligne 1890-1920). Le code actuel ressemble à :

```js
const isComposer = COMPOSER_UNDOABLE.has(action.type)
const isDesigner = DESIGNER_UNDOABLE.has(action.type)
// push snapshot accordingly...
```

Modifier pour ajouter library + le flag skipUndo :

```js
const skipUndo = action.meta?.skipUndo === true
const isComposer = !skipUndo && COMPOSER_UNDOABLE.has(action.type)
const isDesigner = !skipUndo && DESIGNER_UNDOABLE.has(action.type)
const isLibrary = !skipUndo && LIBRARY_UNDOABLE.has(action.type)
```

Et ajouter la branche pour pousser dans la pile library, en miroir de designer/composer. Le HISTORY_DEPTH (constante existante) est appliqué.

Exemple à ajouter après la branche designer :

```js
if (isLibrary) {
  const snap = pickFields(state, LIBRARY_FIELDS)
  return {
    ...newState,
    history: {
      ...newState.history,
      library: {
        past: [...state.history.library.past, snap].slice(-HISTORY_DEPTH),
        future: [],
      },
    },
  }
}
```

- [ ] **Step 6: Vérifier lint et build**

```bash
npm run lint && npm run build
```

Attendu : pas d'erreur. Quelques warnings pré-existants dans `WaveformEditor.jsx` (4 warnings react-hooks/exhaustive-deps) — ignorables.

- [ ] **Step 7: Commit**

```bash
git add src/reducer.js
git commit -m "feat(iter-K/phase-2.1): pile undo LIBRARY + skipUndo flag + migration actions"
```

Do NOT push.

---

## Task 2: Reducer — SAVE_PATCH avec folderId + validation activeTab 'library'

**Files:**
- Modify: `src/reducer.js`

- [ ] **Step 1: SAVE_PATCH accepte un folderId**

Repérer le case `'SAVE_PATCH':` (autour de la ligne 1097). Modifier pour destructurer `folderId` :

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
        amplitude: patchData.amplitude,
        preset: patchData.preset,
        attack: patchData.attack ?? DEFAULT_ADSR.attack,
        hold: patchData.hold ?? DEFAULT_ADSR.hold,
        decay: patchData.decay ?? DEFAULT_ADSR.decay,
        sustain: patchData.sustain ?? DEFAULT_ADSR.sustain,
        release: patchData.release ?? DEFAULT_ADSR.release,
        defaultTuningSystem: patchData.defaultTuningSystem ?? '12-TET',
        folderId,
      },
    ],
    currentPatchId: id,
  }
}
```

- [ ] **Step 2: Valider activeTab 'library' dans loadPersistedState**

Repérer dans `loadPersistedState` la ligne :

```js
activeTab: parsed.activeTab === 'composer' ? 'composer' : 'designer',
```

Modifier pour accepter 'library' :

```js
activeTab: ['library', 'composer', 'designer'].includes(parsed.activeTab)
  ? parsed.activeTab
  : 'designer',
```

- [ ] **Step 3: SET_ACTIVE_TAB — clear pendingDeleteWarning au switch**

Trouver le case `'SET_ACTIVE_TAB':` (cherche dans le reducer). Modifier pour également clear `pendingDeleteWarning` :

```js
case 'SET_ACTIVE_TAB': {
  return {
    ...state,
    activeTab: action.payload,
    pendingDeleteWarning: null,
  }
}
```

`pendingDeleteWarning` sera ajouté au state initial en Task 4. Pour cette task, le spread `null` est sans effet sur les states sans ce field.

- [ ] **Step 4: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/reducer.js
git commit -m "feat(iter-K/phase-2.2): SAVE_PATCH accepte folderId + activeTab 'library'"
```

---

## Task 3: Reducer — PASTE_BIB_CLIPBOARD cut→copy multi-paste

**Files:**
- Modify: `src/reducer.js`

- [ ] **Step 1: Modifier PASTE_BIB_CLIPBOARD pour basculer en copy après le premier paste**

Repérer le case `'PASTE_BIB_CLIPBOARD':` (autour de la ligne 1553). Modifier pour préserver le clipboard en mode 'copy' après un paste 'cut' :

```js
case 'PASTE_BIB_CLIPBOARD': {
  if (!state.bibClipboard) return state
  const { targetFolderId = null } = action.payload
  const { mode, items } = state.bibClipboard

  if (wouldCreateCycle(items, targetFolderId, state.soundFolders)) {
    return {
      ...state,
      notification: {
        message: 'Impossible : un dossier ne peut pas être collé dans lui-même ou un de ses sous-dossiers.',
        type: 'error',
        timestamp: Date.now(),
      },
    }
  }

  if (mode === 'cut') {
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
      // Bascule en copy : préserve le clipboard pour multi-paste
      bibClipboard: { mode: 'copy', items: [...items] },
    }
  }
  // mode === 'copy' : duplique, clipboard reste actif
  const result = duplicateItemsToFolder(items, targetFolderId, state)
  return {
    ...state,
    patches: [...state.patches, ...result.newPatches],
    soundFolders: [...state.soundFolders, ...result.newFolders],
    patchCounter: result.patchCounterAfter,
    folderCounter: result.folderCounterAfter,
    // Clipboard préservé (pas de bibClipboard: null)
  }
}
```

**Changement clé** : avant, le mode 'cut' settait `bibClipboard: null` après le move. Maintenant, il bascule à `{ mode: 'copy', items }`. Et le mode 'copy' ne touche plus du tout au clipboard (au lieu de `bibClipboard: null`).

- [ ] **Step 2: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/reducer.js
git commit -m "feat(iter-K/phase-2.3): PASTE clipboard cut→copy + préservation multi-paste"
```

---

## Task 4: Reducer — DELETE_BIB_ITEMS batch + pendingDeleteWarning

**Files:**
- Modify: `src/reducer.js`

- [ ] **Step 1: Ajouter pendingDeleteWarning dans buildInitialState**

Près des autres state fields initialisés, ajouter :

```js
pendingDeleteWarning: null,
```

PAS dans `loadPersistedState` (transient, non persisté).

- [ ] **Step 2: Imports nécessaires**

Vérifier que `countFolderContents` et `getDescendantFolderIds` sont exportés de `src/reducer.js` (ils le sont déjà depuis Task 3 phase 1). Sinon, les rendre exportables :

```js
export function countFolderContents(folderId, folders, patches) { ... }
export function getDescendantFolderIds(folderId, folders) { ... }
```

(Ils sont utilisés à l'intérieur du reducer ; pas besoin de modifier l'import.)

- [ ] **Step 3: Ajouter le case DELETE_BIB_ITEMS**

Près du case `MOVE_BIB_ITEMS` (autour de la ligne 1595), ajouter :

```js
case 'DELETE_BIB_ITEMS': {
  const { items } = action.payload
  if (!items || items.length === 0) return state

  const countUsage = (patchId) =>
    (state.clips || []).filter(c => c.patchId === patchId).length

  const blockedPatches = []
  const allowedPatchIds = new Set()
  const allowedFolderIds = new Set()

  for (const item of items) {
    if (item.type === 'patch') {
      const usage = countUsage(item.id)
      if (usage > 0) {
        const patch = state.patches.find(p => p.id === item.id)
        if (patch) blockedPatches.push({ id: item.id, name: patch.name, usageCount: usage })
      } else if (state.patches.find(p => p.id === item.id)) {
        allowedPatchIds.add(item.id)
      }
    } else if (item.type === 'folder') {
      const folder = state.soundFolders.find(f => f.id === item.id)
      if (!folder) continue
      // Tous les descendants doivent être libres
      const result = countFolderContents(item.id, state.soundFolders, state.patches)
      const blockedDescendants = result.patchIds.filter(pid => countUsage(pid) > 0)
      if (blockedDescendants.length > 0) {
        // Folder entier bloqué : tous les patches bloqués descendant remontent dans la liste
        for (const pid of blockedDescendants) {
          const p = state.patches.find(pp => pp.id === pid)
          if (p) blockedPatches.push({ id: pid, name: p.name, usageCount: countUsage(pid) })
        }
      } else {
        // Folder libre : on marque tout son sous-arbre comme supprimable
        allowedFolderIds.add(item.id)
        const descendantFolderIds = getDescendantFolderIds(item.id, state.soundFolders)
        for (const fid of descendantFolderIds) allowedFolderIds.add(fid)
        for (const pid of result.patchIds) allowedPatchIds.add(pid)
      }
    }
  }

  // freedCount = items directement demandés qui ont été effectivement supprimés
  const freedCount = items.filter(item => {
    if (item.type === 'patch') return allowedPatchIds.has(item.id)
    if (item.type === 'folder') return allowedFolderIds.has(item.id)
    return false
  }).length

  // currentPatchId : si supprimé, set à null
  const newCurrentPatchId = allowedPatchIds.has(state.currentPatchId)
    ? null
    : state.currentPatchId

  return {
    ...state,
    patches: state.patches.filter(p => !allowedPatchIds.has(p.id)),
    soundFolders: state.soundFolders.filter(f => !allowedFolderIds.has(f.id)),
    currentPatchId: newCurrentPatchId,
    bibSelectedIds: [],
    bibSelectionAnchor: null,
    pendingDeleteWarning: blockedPatches.length > 0
      ? { blockedPatches, freedCount }
      : null,
  }
}
case 'CLEAR_PENDING_DELETE_WARNING': {
  return { ...state, pendingDeleteWarning: null }
}
```

- [ ] **Step 4: Vérifier que DELETE_BIB_ITEMS est dans LIBRARY_UNDOABLE**

Confirmer que `LIBRARY_UNDOABLE` contient `'DELETE_BIB_ITEMS'` (ajouté en Task 1). Si manquant, l'ajouter.

- [ ] **Step 5: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/reducer.js
git commit -m "feat(iter-K/phase-2.4): DELETE_BIB_ITEMS batch atomique + pendingDeleteWarning"
```

---

## Task 5: Reducer — OPEN_IN_LIBRARY + GO_TO_COMPOSER_WITH_CLIPS

**Files:**
- Modify: `src/reducer.js`

- [ ] **Step 1: Ajouter OPEN_IN_LIBRARY case**

Près des cases de SELECT_BIB_ITEMS, ajouter :

```js
case 'OPEN_IN_LIBRARY': {
  const { type, id } = action.payload
  let parentFolderId = null
  if (type === 'patch') {
    const patch = state.patches.find(p => p.id === id)
    if (patch) parentFolderId = patch.folderId ?? null
  } else if (type === 'folder') {
    const folder = state.soundFolders.find(f => f.id === id)
    if (folder) parentFolderId = folder.parentId ?? null
  }
  return {
    ...state,
    activeTab: 'library',
    bibCurrentFolderId: parentFolderId,
    bibHierarchyMode: 'nav',
    bibSelectedIds: [{ type, id }],
    bibSelectionAnchor: { type, id },
    pendingDeleteWarning: null,
  }
}
```

- [ ] **Step 2: Ajouter GO_TO_COMPOSER_WITH_CLIPS case**

```js
case 'GO_TO_COMPOSER_WITH_CLIPS': {
  const { patchIds } = action.payload
  const clipIds = (state.clips || [])
    .filter(c => patchIds.includes(c.patchId))
    .map(c => c.id)
  return {
    ...state,
    activeTab: 'composer',
    selectedClipIds: clipIds,
    pendingDeleteWarning: null,
  }
}
```

**Note** : `selectedClipIds` est un field existant du Composer. Vérifier son nom exact via grep si différent (`grep -n "selectedClipIds" src/reducer.js`).

- [ ] **Step 3: Ces deux actions ne sont PAS undoable**

Ne pas les ajouter à `LIBRARY_UNDOABLE`/`DESIGNER_UNDOABLE`/`COMPOSER_UNDOABLE`. Ce sont des actions de navigation pure.

- [ ] **Step 4: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/reducer.js
git commit -m "feat(iter-K/phase-2.5): OPEN_IN_LIBRARY + GO_TO_COMPOSER_WITH_CLIPS atomiques"
```

---

## Task 6: PatchPicker.jsx + CSS — sidebar lightweight

**Files:**
- Create: `src/components/PatchPicker.jsx`
- Create: `src/components/PatchPicker.css`

- [ ] **Step 1: Créer `PatchPicker.jsx`**

```jsx
import { useState, useMemo, useEffect } from 'react'
import './PatchPicker.css'

// Composant lightweight pour les sidebars Designer/Composer.
// Mode Tree+List forcé. Pas de manipulation directe (rename, delete, multi-select).
// Click = load (Designer) / no-op (Composer). Drag = drop sur timeline.
// Right-click = menu unique "Ouvrir dans Bibliothèque".

function buildOrderedTree(soundFolders, patches, collapsedFolders) {
  function dfs(parentId, depth) {
    const result = []
    const subFolders = soundFolders.filter(f => f.parentId === parentId)
    for (const folder of subFolders) {
      result.push({ kind: 'folder', folder, depth })
      if (!collapsedFolders.has(folder.id)) {
        result.push(...dfs(folder.id, depth + 1))
      }
    }
    const subPatches = patches.filter(p => p.folderId === parentId)
    for (const patch of subPatches) {
      result.push({ kind: 'patch', patch, depth })
    }
    return result
  }
  return dfs(null, 0)
}

export default function PatchPicker({
  patches,
  soundFolders,
  currentPatchId,
  bibClipboard,
  bibSelectedIds = [],
  activeTab,
  onLoadPatch,
  onOpenInLibrary,
  onDragStart,
  headerExtra,
}) {
  const [collapsedFolders, setCollapsedFolders] = useState(new Set())
  const [contextMenu, setContextMenu] = useState(null)

  const orderedItems = useMemo(
    () => buildOrderedTree(soundFolders, patches, collapsedFolders),
    [soundFolders, patches, collapsedFolders]
  )

  const cutItemKeys = useMemo(() => {
    if (!bibClipboard || bibClipboard.mode !== 'cut') return new Set()
    return new Set(bibClipboard.items.map(i => `${i.type}:${i.id}`))
  }, [bibClipboard])

  const selectedKeys = useMemo(() => {
    return new Set(bibSelectedIds.map(s => `${s.type}:${s.id}`))
  }, [bibSelectedIds])

  // Esc ferme le menu contextuel
  useEffect(() => {
    if (!contextMenu) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); setContextMenu(null) }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [contextMenu])

  const toggleFolder = (folderId) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const handlePatchClick = (patch) => {
    if (activeTab === 'designer') {
      onLoadPatch?.(patch.id)
    }
    // En composer : no-op (drag = primary interaction)
  }

  const handlePatchDoubleClick = (patch) => {
    // Double-click charge + bascule en Designer (utile depuis le Composer)
    onLoadPatch?.(patch.id)
  }

  const handleContextMenu = (e, type, id) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ type, id, clientX: e.clientX, clientY: e.clientY })
  }

  const renderItem = (item) => {
    if (item.kind === 'folder') {
      const { folder, depth } = item
      const isExpanded = !collapsedFolders.has(folder.id)
      const isSelected = selectedKeys.has(`folder:${folder.id}`)
      const isCut = cutItemKeys.has(`folder:${folder.id}`)
      return (
        <li
          key={`folder:${folder.id}`}
          className="patch-picker-folder-item"
        >
          <div
            className={`patch-picker-folder-row ${isSelected ? 'is-selected' : ''} ${isCut ? 'is-cut' : ''}`}
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
            onClick={() => toggleFolder(folder.id)}
            onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
            data-bib-item-id={folder.id}
            data-bib-item-type="folder"
          >
            <span className={`patch-picker-chevron ${isExpanded ? 'is-expanded' : ''}`}>▶</span>
            <span className="patch-picker-folder-icon">📁</span>
            <span className="patch-picker-folder-name">{folder.name}</span>
          </div>
        </li>
      )
    }
    const { patch, depth } = item
    const isCurrent = patch.id === currentPatchId
    const isSelected = selectedKeys.has(`patch:${patch.id}`)
    const isCut = cutItemKeys.has(`patch:${patch.id}`)
    return (
      <li
        key={`patch:${patch.id}`}
        className={`patch-picker-chip ${isCurrent ? 'is-current' : ''} ${isSelected ? 'is-selected' : ''} ${isCut ? 'is-cut' : ''}`}
        style={{ '--chip-color': patch.color, paddingLeft: `${depth * 12 + 4}px` }}
        draggable
        onDragStart={(e) => onDragStart?.(e, 'patch', patch.id)}
        onClick={() => handlePatchClick(patch)}
        onDoubleClick={() => handlePatchDoubleClick(patch)}
        onContextMenu={(e) => handleContextMenu(e, 'patch', patch.id)}
        data-bib-item-id={patch.id}
        data-bib-item-type="patch"
        title={patch.name}
      >
        <span className="patch-picker-chip-dot" />
        <span className="patch-picker-chip-name">{patch.name}</span>
      </li>
    )
  }

  return (
    <aside className="patch-picker">
      <header className="patch-picker-header">
        <h3>Bibliothèque</h3>
        <span className="patch-picker-count">{patches.length}</span>
        {headerExtra && <div className="patch-picker-header-toggle">{headerExtra}</div>}
      </header>
      <ul className="patch-picker-list">
        {orderedItems.length === 0
          ? <li className="patch-picker-empty">Aucun patch</li>
          : orderedItems.map(renderItem)}
      </ul>
      {contextMenu && (
        <>
          <div
            className="patch-picker-context-backdrop"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
          />
          <div
            className="patch-picker-context-menu"
            style={{ left: contextMenu.clientX, top: contextMenu.clientY }}
          >
            <button
              className="patch-picker-ctx-item"
              onClick={() => {
                onOpenInLibrary?.({ type: contextMenu.type, id: contextMenu.id })
                setContextMenu(null)
              }}
            >
              Ouvrir dans la Bibliothèque
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
```

- [ ] **Step 2: Créer `PatchPicker.css`**

```css
.patch-picker {
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  padding: 10px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.patch-picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #3a3a5a;
  flex-shrink: 0;
}
.patch-picker-header h3 {
  margin: 0;
  font-size: 0.85rem;
  color: #a0a0c0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  flex: 1;
}
.patch-picker-count {
  font-family: monospace;
  font-size: 0.75rem;
  color: #5a5a7a;
}
.patch-picker-header-toggle {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.patch-picker-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.patch-picker-empty {
  list-style: none;
  color: #5a5a7a;
  font-style: italic;
  text-align: center;
  padding: 20px 8px;
  font-size: 11px;
}

.patch-picker-folder-item { list-style: none; }
.patch-picker-folder-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  border-radius: 4px;
  background: rgba(80, 80, 120, 0.12);
  border: 1px solid transparent;
  color: #c0c0d8;
  font-size: 0.78rem;
  cursor: pointer;
  user-select: none;
}
.patch-picker-folder-row:hover {
  background: rgba(80, 80, 120, 0.22);
  border-color: #3a3a5a;
}
.patch-picker-folder-row.is-selected {
  background: rgba(0, 212, 255, 0.18);
  border-color: rgba(0, 212, 255, 0.4);
}
.patch-picker-folder-row.is-cut {
  opacity: 0.4;
  font-style: italic;
}
.patch-picker-chevron {
  font-size: 0.55rem;
  color: #7a7a9a;
  transition: transform 0.15s;
  flex-shrink: 0;
  width: 10px;
  text-align: center;
}
.patch-picker-chevron.is-expanded {
  transform: rotate(90deg);
}
.patch-picker-folder-icon {
  font-size: 0.8rem;
  flex-shrink: 0;
}
.patch-picker-folder-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patch-picker-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--chip-color) 12%, #1a1a2e);
  border: 1px solid color-mix(in srgb, var(--chip-color) 30%, transparent);
  color: #d0d0e0;
  font-size: 0.78rem;
  cursor: grab;
  user-select: none;
  list-style: none;
}
.patch-picker-chip:hover {
  border-color: var(--chip-color);
}
.patch-picker-chip:active { cursor: grabbing; }
.patch-picker-chip.is-current {
  background: color-mix(in srgb, var(--chip-color) 22%, #1a1a2e);
  border-color: var(--chip-color);
  box-shadow: 0 0 0 1px var(--chip-color);
}
.patch-picker-chip.is-selected:not(.is-current) {
  background: rgba(0, 212, 255, 0.18);
  border-color: rgba(0, 212, 255, 0.4);
}
.patch-picker-chip.is-cut {
  opacity: 0.4;
  font-style: italic;
}
.patch-picker-chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--chip-color);
  flex-shrink: 0;
}
.patch-picker-chip-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patch-picker-context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}
.patch-picker-context-menu {
  position: fixed;
  z-index: 1000;
  background: #1a1a2e;
  border: 1px solid #3a3a5a;
  border-radius: 4px;
  padding: 4px 0;
  min-width: 180px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}
.patch-picker-ctx-item {
  width: 100%;
  background: transparent;
  border: none;
  text-align: left;
  padding: 6px 14px;
  color: #d0d4ec;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
}
.patch-picker-ctx-item:hover {
  background: #2a2a4a;
}
```

- [ ] **Step 3: Vérifier lint et build**

Pas encore branché depuis App.jsx → ESLint va flagger l'import inutilisé. Pour cette task, juste vérifier que le fichier compile.

```bash
npm run lint
```

Si "PatchPicker is defined but never used" apparaît, c'est OK pour cette task (sera connecté en Task 13). Sinon pas d'erreur attendue (PatchPicker n'est pas encore importé donc invisible à ESLint).

```bash
npm run build
```

Pass attendu.

- [ ] **Step 4: Commit**

```bash
git add src/components/PatchPicker.jsx src/components/PatchPicker.css
git commit -m "feat(iter-K/phase-2.6): PatchPicker composant lightweight pour sidebars"
```

---

## Task 7: SavePatchDialog.jsx + CSS — modal popup save

**Files:**
- Create: `src/components/SavePatchDialog.jsx`
- Create: `src/components/SavePatchDialog.css`

- [ ] **Step 1: Créer `SavePatchDialog.jsx`**

```jsx
import { useState, useMemo, useEffect } from 'react'
import { nextAvailableFolderName } from '../lib/folderNames.js'
import './SavePatchDialog.css'

function buildPathToRoot(folderId, soundFolders) {
  const byId = new Map(soundFolders.map(f => [f.id, f]))
  const trail = []
  let cur = folderId
  while (cur !== null && cur !== undefined && byId.has(cur)) {
    const f = byId.get(cur)
    trail.unshift({ id: f.id, name: f.name })
    cur = f.parentId
  }
  return trail
}

function buildFlatTree(soundFolders, openedSet) {
  function dfs(parentId, depth) {
    const result = []
    const children = soundFolders.filter(f => f.parentId === parentId)
    for (const f of children) {
      result.push({ ...f, depth })
      if (openedSet.has(f.id)) {
        result.push(...dfs(f.id, depth + 1))
      }
    }
    return result
  }
  return dfs(null, 0)
}

export default function SavePatchDialog({
  open,
  currentPatch,
  patches,
  soundFolders,
  bibCurrentFolderId,
  patchData,         // payload from WaveformEditor (points, ADSR, etc.)
  onConfirm,         // ({name, folderId, patchData}) => void
  onCancel,          // () => void
  onCreateFolder,    // (name, parentId) => void  // dispatched with skipUndo
}) {
  const initialFolderId = currentPatch?.folderId ?? bibCurrentFolderId ?? null
  const computeDefaultName = () => {
    if (currentPatch) {
      // "Bass1" + " (N)"
      return nextAvailableFolderName(currentPatch.name, patches.map(p => ({ name: p.name })))
    }
    return nextAvailableFolderName('Nouveau patch', patches.map(p => ({ name: p.name })))
  }

  const [name, setName] = useState('')
  const [folderId, setFolderId] = useState(initialFolderId)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [openedFolders, setOpenedFolders] = useState(() => {
    const set = new Set()
    // Pre-expand le chemin du folderId initial
    const path = buildPathToRoot(initialFolderId, soundFolders)
    for (const node of path) set.add(node.id)
    return set
  })
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Reset à chaque ouverture
  useEffect(() => {
    if (!open) return
    setName(computeDefaultName())
    setFolderId(initialFolderId)
    setDropdownOpen(false)
    setCreatingFolder(false)
    setNewFolderName('')
    setOpenedFolders(() => {
      const set = new Set()
      const path = buildPathToRoot(initialFolderId, soundFolders)
      for (const node of path) set.add(node.id)
      return set
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Esc cancel
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel?.() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onCancel])

  const trail = useMemo(() => buildPathToRoot(folderId, soundFolders), [folderId, soundFolders])
  const flatTree = useMemo(
    () => buildFlatTree(soundFolders, openedFolders),
    [soundFolders, openedFolders]
  )

  const conflicting = useMemo(() => {
    if (!name.trim()) return false
    return patches.some(p => p.folderId === folderId && p.name === name.trim())
  }, [name, folderId, patches])

  if (!open) return null

  const toggleFolderExpand = (fid) => {
    setOpenedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(fid)) next.delete(fid)
      else next.add(fid)
      return next
    })
  }

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm?.({
      name: trimmed,
      folderId,
      patchData,
    })
  }

  const handleCreateFolderConfirm = () => {
    const trimmed = newFolderName.trim()
    if (!trimmed) {
      setCreatingFolder(false)
      setNewFolderName('')
      return
    }
    const dedupedName = nextAvailableFolderName(
      trimmed,
      soundFolders.filter(f => f.parentId === folderId)
    )
    onCreateFolder?.(dedupedName, folderId)
    // Le folder est créé, mais on n'a pas son ID retour ici. On va laisser
    // le useEffect re-init quand soundFolders change, ou on peut le faire
    // optimistically. Stratégie : ne pas changer folderId, l'utilisateur
    // peut sélectionner le nouveau folder dans le dropdown après confirm.
    setCreatingFolder(false)
    setNewFolderName('')
    // S'assurer que folderId est expand pour voir le nouveau folder
    setOpenedFolders((prev) => new Set([...prev, folderId]))
  }

  return (
    <>
      <div className="save-dialog-backdrop" onClick={onCancel} />
      <div className="save-dialog">
        <h4>Sauvegarder le patch</h4>
        <div className="save-dialog-field">
          <label className="save-dialog-label">Nom</label>
          <input
            className="save-dialog-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleConfirm() }
            }}
            autoFocus
          />
          {conflicting && (
            <p className="save-dialog-warning">⚠ Un patch nommé "{name.trim()}" existe déjà dans ce dossier.</p>
          )}
        </div>
        <div className="save-dialog-field">
          <label className="save-dialog-label">Dossier</label>
          <div
            className="save-dialog-breadcrumb"
            onClick={() => setDropdownOpen(o => !o)}
          >
            <span className={`save-dialog-seg ${trail.length === 0 ? 'current' : ''}`}>root</span>
            {trail.map((node, i) => (
              <span key={node.id} className="save-dialog-seg-wrap">
                <span className="save-dialog-sep">/</span>
                <span className={`save-dialog-seg ${i === trail.length - 1 ? 'current' : ''}`}>
                  {node.name}
                </span>
              </span>
            ))}
            <span className="save-dialog-spacer" />
            <span className="save-dialog-caret">{dropdownOpen ? '▴' : '▾'}</span>
          </div>
          {dropdownOpen && (
            <div className="save-dialog-dropdown">
              <div
                className={`save-dialog-tree-item ${folderId === null ? 'selected' : ''}`}
                onClick={() => { setFolderId(null); setDropdownOpen(false) }}
              >
                📁 root
              </div>
              {flatTree.map((f) => (
                <div
                  key={f.id}
                  className={`save-dialog-tree-item ${folderId === f.id ? 'selected' : ''}`}
                  style={{ paddingLeft: `${16 + f.depth * 14}px` }}
                  onClick={() => { setFolderId(f.id); setDropdownOpen(false) }}
                >
                  <span
                    className={`save-dialog-chevron ${openedFolders.has(f.id) ? 'is-expanded' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleFolderExpand(f.id) }}
                  >▶</span>
                  📁 {f.name}
                </div>
              ))}
            </div>
          )}
        </div>
        {creatingFolder ? (
          <div className="save-dialog-new-folder">
            <input
              className="save-dialog-input"
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleCreateFolderConfirm() }
                else if (e.key === 'Escape') { e.preventDefault(); setCreatingFolder(false); setNewFolderName('') }
              }}
              placeholder="Nom du nouveau dossier"
              autoFocus
            />
          </div>
        ) : (
          <button
            type="button"
            className="save-dialog-new-folder-btn"
            onClick={() => setCreatingFolder(true)}
          >+ Nouveau dossier</button>
        )}
        <div className="save-dialog-actions">
          <button className="save-dialog-btn" onClick={onCancel}>Annuler</button>
          <button
            className="save-dialog-btn primary"
            disabled={!name.trim()}
            onClick={handleConfirm}
          >Sauvegarder</button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Créer `SavePatchDialog.css`**

```css
.save-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1500;
}
.save-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  background: #1a1a2e;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  padding: 20px;
  z-index: 1501;
  font-family: system-ui, sans-serif;
  color: #d0d4ec;
}
.save-dialog h4 {
  margin: 0 0 14px;
  color: #d0d4ec;
  font-size: 14px;
  font-weight: 600;
}
.save-dialog-field {
  margin-bottom: 12px;
}
.save-dialog-label {
  display: block;
  font-size: 11px;
  color: #8a8fa8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.save-dialog-input {
  width: 100%;
  background: #0e0e1e;
  border: 1px solid #2a2a4a;
  border-radius: 4px;
  color: #d0d4ec;
  padding: 6px 8px;
  font-size: 12px;
  font-family: inherit;
  box-sizing: border-box;
}
.save-dialog-input:focus {
  border-color: #00d4ff;
  outline: none;
}
.save-dialog-warning {
  margin: 4px 0 0;
  font-size: 11px;
  color: #f5c542;
}
.save-dialog-breadcrumb {
  background: #0e0e1e;
  border: 1px solid #2a2a4a;
  border-radius: 4px;
  padding: 6px 8px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #d0d4ec;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
.save-dialog-seg { color: #00d4ff; padding: 1px 4px; border-radius: 2px; }
.save-dialog-seg.current { color: #d0d4ec; }
.save-dialog-sep { color: #4a4a6a; }
.save-dialog-spacer { flex: 1; }
.save-dialog-caret { color: #8a8fa8; }

.save-dialog-dropdown {
  background: #0e0e1e;
  border: 1px solid #2a2a4a;
  border-radius: 4px;
  padding: 4px 0;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
}
.save-dialog-tree-item {
  padding: 4px 8px 4px 16px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.save-dialog-tree-item:hover { background: rgba(0, 212, 255, 0.1); }
.save-dialog-tree-item.selected {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
}
.save-dialog-chevron {
  font-size: 0.55rem;
  color: #7a7a9a;
  transition: transform 0.15s;
  width: 10px;
  text-align: center;
  cursor: pointer;
}
.save-dialog-chevron.is-expanded {
  transform: rotate(90deg);
}

.save-dialog-new-folder-btn {
  background: transparent;
  color: #8a8fa8;
  border: 1px dashed #3a3a5a;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  width: 100%;
  margin-bottom: 12px;
}
.save-dialog-new-folder-btn:hover {
  color: #d0d4ec;
  border-color: #00d4ff;
}
.save-dialog-new-folder {
  margin-bottom: 12px;
}

.save-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.save-dialog-btn {
  background: #1a1a2e;
  border: 1px solid #3a3a5a;
  color: #d0d4ec;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.save-dialog-btn:hover:not(:disabled) {
  background: #2a2a4a;
}
.save-dialog-btn:disabled {
  color: #4a4a6a;
  cursor: not-allowed;
}
.save-dialog-btn.primary {
  background: #003a4a;
  border-color: #00d4ff;
  color: #00d4ff;
}
.save-dialog-btn.primary:hover:not(:disabled) {
  background: #004a5a;
}
```

- [ ] **Step 3: Vérifier lint et build**

```bash
npm run lint && npm run build
```

Pass attendu.

- [ ] **Step 4: Commit**

```bash
git add src/components/SavePatchDialog.jsx src/components/SavePatchDialog.css
git commit -m "feat(iter-K/phase-2.7): SavePatchDialog modal popup avec folder picker + nouveau dossier"
```

---

## Task 8: DeleteUsageWarningDialog.jsx + CSS — modal warning

**Files:**
- Create: `src/components/DeleteUsageWarningDialog.jsx`
- Create: `src/components/DeleteUsageWarningDialog.css`

- [ ] **Step 1: Créer `DeleteUsageWarningDialog.jsx`**

```jsx
import { useEffect } from 'react'
import './DeleteUsageWarningDialog.css'

export default function DeleteUsageWarningDialog({
  warning,           // { blockedPatches: [{id, name, usageCount}], freedCount }
  onGoToComposer,    // ({patchIds}) => void  // dispatch GO_TO_COMPOSER_WITH_CLIPS
  onClose,           // () => void  // dispatch CLEAR_PENDING_DELETE_WARNING
}) {
  useEffect(() => {
    if (!warning) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [warning, onClose])

  if (!warning) return null

  const { blockedPatches, freedCount } = warning
  const allBlocked = freedCount === 0
  const header = allBlocked ? '⚠ Suppression refusée' : '⚠ Suppression partielle'

  return (
    <>
      <div className="delete-warning-backdrop" onClick={onClose} />
      <div className="delete-warning-dialog">
        <h4>{header}</h4>
        {freedCount > 0 && (
          <p className="delete-warning-success">
            {freedCount} élément{freedCount > 1 ? 's' : ''} supprimé{freedCount > 1 ? 's' : ''}.
          </p>
        )}
        <p className="delete-warning-blocked-intro">
          {blockedPatches.length} patch{blockedPatches.length > 1 ? 'es' : ''} non supprimé{blockedPatches.length > 1 ? 's' : ''} car utilisé{blockedPatches.length > 1 ? 's' : ''} dans le Composer :
        </p>
        <ul className="delete-warning-list">
          {blockedPatches.map(p => (
            <li key={p.id}>
              <span className="delete-warning-name">{p.name}</span>
              <span className="delete-warning-usage">
                ({p.usageCount} clip{p.usageCount > 1 ? 's' : ''})
              </span>
            </li>
          ))}
        </ul>
        <div className="delete-warning-actions">
          <button
            className="delete-warning-btn primary"
            onClick={() => onGoToComposer?.({ patchIds: blockedPatches.map(p => p.id) })}
          >Voir dans le Composer</button>
          <button className="delete-warning-btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Créer `DeleteUsageWarningDialog.css`**

```css
.delete-warning-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1500;
}
.delete-warning-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  background: #1a1a2e;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  padding: 20px;
  z-index: 1501;
  font-family: system-ui, sans-serif;
  color: #d0d4ec;
}
.delete-warning-dialog h4 {
  margin: 0 0 14px;
  color: #f5c542;
  font-size: 14px;
  font-weight: 600;
}
.delete-warning-success {
  margin: 0 0 10px;
  font-size: 12px;
  color: #4ade80;
}
.delete-warning-blocked-intro {
  margin: 0 0 8px;
  font-size: 12px;
  color: #d0d4ec;
}
.delete-warning-list {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
}
.delete-warning-list li {
  padding: 4px 8px;
  background: rgba(245, 197, 66, 0.06);
  border-left: 2px solid #f5c542;
  margin-bottom: 4px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.delete-warning-name { color: #d0d4ec; }
.delete-warning-usage { color: #8a8fa8; font-style: italic; }

.delete-warning-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.delete-warning-btn {
  background: #1a1a2e;
  border: 1px solid #3a3a5a;
  color: #d0d4ec;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.delete-warning-btn:hover {
  background: #2a2a4a;
}
.delete-warning-btn.primary {
  background: #003a4a;
  border-color: #00d4ff;
  color: #00d4ff;
}
.delete-warning-btn.primary:hover {
  background: #004a5a;
}
```

- [ ] **Step 3: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/DeleteUsageWarningDialog.jsx src/components/DeleteUsageWarningDialog.css
git commit -m "feat(iter-K/phase-2.8): DeleteUsageWarningDialog modal pour patches utilisés"
```

---

## Task 9: WaveformEditor — handleSaveAsNew ouvre popup

**Files:**
- Modify: `src/components/WaveformEditor.jsx`
- Modify: `src/App.jsx` (préparation — popup state ajouté plus tard en Task 10)

- [ ] **Step 1: Modifier `handleSaveAsNew` dans WaveformEditor**

Repérer `handleSaveAsNew` (autour de la ligne 1050). L'actuel dispatch directement. Modifier pour appeler une nouvelle prop `onRequestSavePopup` qui ouvre le popup côté App :

```jsx
// Props (ajouter onRequestSavePopup)
function WaveformEditor({
  ...
  onSavePatch,
  onRequestSavePopup,   // ← nouveau, appelé pour ouvrir le popup
  ...
}) {
  ...
  const handleSaveAsNew = () => {
    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      flashMessage('Canvas vide')
      return
    }
    // Si onRequestSavePopup est dispo : on délègue au popup côté App
    if (onRequestSavePopup) {
      onRequestSavePopup({
        patchData: buildPayload(''),  // name sera surchargé par le popup
        sourcePatch: currentPatch,    // null si canvas vierge
      })
      return
    }
    // Fallback : comportement actuel (sera retiré une fois le popup branché)
    const proposedName = currentPatch
      ? nextAvailableName(`Copie de ${currentPatch.name}`, patches ?? [])
      : defaultName
    const result = onSavePatch(buildPayload(proposedName))
    referenceRef.current = stateSnapshotRef.current
    if (result?.id) {
      referencedPatchIdRef.current = result.id
      onPatchCreated?.(result.id)
    }
    flashMessage(currentPatch ? 'Nouveau patch enregistré' : 'Patch enregistré')
  }
  ...
}
```

Note : on garde le fallback pour cette task (l'App ne passera `onRequestSavePopup` qu'en Task 10). Cela évite de casser temporairement le save.

- [ ] **Step 2: Vérifier lint et build**

```bash
npm run lint && npm run build
```

Pass attendu (la nouvelle prop est optionnelle).

- [ ] **Step 3: Commit**

```bash
git add src/components/WaveformEditor.jsx
git commit -m "feat(iter-K/phase-2.9): WaveformEditor délègue handleSaveAsNew à onRequestSavePopup"
```

---

## Task 10: App.jsx — 3 onglets + routing Ctrl+Z + popup mounts + library tab content

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Imports**

Ajouter en haut de `src/App.jsx` :

```jsx
import SavePatchDialog from './components/SavePatchDialog'
import DeleteUsageWarningDialog from './components/DeleteUsageWarningDialog'
```

- [ ] **Step 2: Destructure pendingDeleteWarning depuis state**

Près des autres destructurations :

```js
pendingDeleteWarning,
```

- [ ] **Step 3: State local pour le popup save**

Dans App.jsx (au niveau du composant), ajouter :

```jsx
const [savePopup, setSavePopup] = useState(null)
// savePopup: null | { patchData, sourcePatch }

const openSavePopup = useCallback(({ patchData, sourcePatch }) => {
  setSavePopup({ patchData, sourcePatch })
}, [])

const closeSavePopup = useCallback(() => {
  setSavePopup(null)
}, [])

const handleSavePopupConfirm = useCallback(({ name, folderId, patchData }) => {
  dispatch({
    type: 'SAVE_PATCH',
    payload: { patchData: { ...patchData, name }, folderId },
  })
  setSavePopup(null)
}, [])

const handleCreateFolderFromSavePopup = useCallback((name, parentId) => {
  dispatch({
    type: 'CREATE_FOLDER',
    payload: { name, parentId },
    meta: { skipUndo: true },
  })
}, [])
```

- [ ] **Step 4: Handlers pour delete warning**

```jsx
const handleGoToComposerWithClips = useCallback(({ patchIds }) => {
  dispatch({ type: 'GO_TO_COMPOSER_WITH_CLIPS', payload: { patchIds } })
}, [])

const handleCloseDeleteWarning = useCallback(() => {
  dispatch({ type: 'CLEAR_PENDING_DELETE_WARNING' })
}, [])
```

- [ ] **Step 5: Routing Ctrl+Z par activeTab**

Repérer le useEffect global keydown qui gère Ctrl+Z. Adapter pour router par activeTab :

```jsx
useEffect(() => {
  const onKey = (e) => {
    const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey
    const isRedo = (e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))
    if (!isUndo && !isRedo) return
    // Skip si typing dans un input ou contentEditable
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
    e.preventDefault()
    if (isUndo) {
      const action = {
        library: 'UNDO_LIBRARY',
        designer: 'UNDO_DESIGNER',
        composer: 'UNDO_COMPOSER',
      }[activeTab]
      if (action) dispatch({ type: action })
    } else if (isRedo) {
      const action = {
        library: 'REDO_LIBRARY',
        designer: 'REDO_DESIGNER',
        composer: 'REDO_COMPOSER',
      }[activeTab]
      if (action) dispatch({ type: action })
    }
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}, [activeTab])
```

**Important** : si un handler keydown global pour Designer ou Composer existe déjà, modifier celui-là plutôt que d'en ajouter un nouveau (éviter le double-dispatch).

- [ ] **Step 6: Header — ajouter onglet "Bibliothèque" en premier**

Repérer le header des onglets (probablement un `<header>` ou `<nav>` avec deux boutons Designer/Composer). Ajouter le bouton Bibliothèque AVANT Designer :

```jsx
<button
  type="button"
  className={`tab-btn ${activeTab === 'library' ? 'is-active' : ''}`}
  onClick={() => setActiveTab('library')}
>Bibliothèque</button>
<button
  type="button"
  className={`tab-btn ${activeTab === 'designer' ? 'is-active' : ''}`}
  onClick={() => setActiveTab('designer')}
>Designer</button>
<button
  type="button"
  className={`tab-btn ${activeTab === 'composer' ? 'is-active' : ''}`}
  onClick={() => setActiveTab('composer')}
>Composer</button>
```

Adapter les classNames au pattern existant.

- [ ] **Step 7: Rendu de l'onglet Bibliothèque (full PatchBank)**

Ajouter une branche dans le rendu principal pour `activeTab === 'library'`. Le contenu : `<PatchBank />` en plein écran avec props complètes (mêmes que les instances actuelles + bibSelectedIds, bibClipboard, etc.).

```jsx
{activeTab === 'library' && (
  <main className="library-tab-content">
    <PatchBank
      patches={patches}
      soundFolders={soundFolders}
      currentPatchId={currentPatchId}
      activeTab={activeTab}
      onLoadPatch={(id) => {
        // En library tab : load + switch designer
        handleLoadPatch(id)
        dispatch({ type: 'SET_ACTIVE_TAB', payload: 'designer' })
      }}
      onRenamePatch={handleRenamePatch}
      onDeletePatch={handleDeletePatch}
      onCreateFolder={handleCreateFolder}
      onRenameFolder={handleRenameFolder}
      onDeleteFolder={handleDeleteFolder}
      onMoveItems={onMoveBibItems}
      onExportFolder={handleExportFolder}
      onExportPatch={handleExportPatch}
      bibHierarchyMode={bibHierarchyMode}
      bibDisplayMode={bibDisplayMode}
      bibCurrentFolderId={bibCurrentFolderId}
      onSetHierarchyMode={setBibHierarchyMode}
      onSetDisplayMode={setBibDisplayMode}
      onSetCurrentFolder={setBibCurrentFolder}
      onNotify={notify}
      bibSelectedIds={bibSelectedIds}
      bibSelectionAnchor={bibSelectionAnchor}
      onSelectItems={onSelectBibItems}
      onClearSelection={onClearBibSelection}
      bibClipboard={bibClipboard}
      onCopy={onCopyBibItems}
      onCut={onCutBibItems}
      onClearClipboard={onClearBibClipboard}
      onPaste={onPasteBibClipboard}
      onDeleteItems={onDeleteBibItems}      // ← nouveau handler, voir Step 8
      isFullTab={true}                        // ← flag pour la toolbar enrichie (Task 11)
    />
  </main>
)}
```

CSS associé dans `src/index.css` ou un nouveau fichier `App.css` :

```css
.library-tab-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
}
.library-tab-content > .sound-bank-panel {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}
```

- [ ] **Step 8: Ajouter onDeleteBibItems handler**

Près des autres handlers biblio :

```jsx
const onDeleteBibItems = useCallback((items) => {
  dispatch({ type: 'DELETE_BIB_ITEMS', payload: { items } })
}, [])
```

- [ ] **Step 9: Mounter le SavePatchDialog en overlay**

À la fin du return d'App.jsx (avant la fermeture du fragment racine) :

```jsx
<SavePatchDialog
  open={savePopup !== null}
  currentPatch={savePopup?.sourcePatch ?? null}
  patches={patches}
  soundFolders={soundFolders}
  bibCurrentFolderId={bibCurrentFolderId}
  patchData={savePopup?.patchData ?? null}
  onConfirm={handleSavePopupConfirm}
  onCancel={closeSavePopup}
  onCreateFolder={handleCreateFolderFromSavePopup}
/>
<DeleteUsageWarningDialog
  warning={pendingDeleteWarning}
  onGoToComposer={handleGoToComposerWithClips}
  onClose={handleCloseDeleteWarning}
/>
```

- [ ] **Step 10: Passer `onRequestSavePopup={openSavePopup}` à `<WaveformEditor>`**

Repérer les rendus de `<WaveformEditor>` (probablement 1 instance). Ajouter la prop.

- [ ] **Step 11: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 12: Commit**

```bash
git add src/App.jsx src/index.css src/components/WaveformEditor.jsx
git commit -m "feat(iter-K/phase-2.10): 3 onglets + routing Ctrl+Z + popups mounts + library tab"
```

---

## Task 11: PatchBank — toolbar d'actions icônes

**Files:**
- Modify: `src/components/PatchBank.jsx`
- Modify: `src/components/PatchBank.css`

- [ ] **Step 1: Imports lucide-react**

En haut de `PatchBank.jsx`, ajouter les icônes manquantes à l'import existant :

```jsx
import {
  ListTree, Folder, List, LayoutList, LayoutGrid,
  FolderPlus, Edit3, Copy, Scissors, Clipboard, Trash2, Download, Upload,
} from 'lucide-react'
```

- [ ] **Step 2: Accepter une nouvelle prop `isFullTab`**

Ajouter à la signature :

```jsx
function PatchBank({
  // ...existing props,
  isFullTab = false,
  onDeleteItems,           // ← handler pour DELETE_BIB_ITEMS batch
  onImportLibrary,          // optionnel, sinon button disabled
  ...
}) {
```

- [ ] **Step 3: Rendu de la toolbar d'actions (conditionnel sur isFullTab)**

Après le `bib-toolbar` existant (toggles modes), ajouter une nouvelle row :

```jsx
{isFullTab && (
  <div className="bib-action-toolbar">
    <button
      type="button"
      className="bib-action-btn"
      title="Nouveau dossier"
      onClick={handleCreateFolder}
    ><FolderPlus size={14} /></button>
    <button
      type="button"
      className="bib-action-btn"
      title="Renommer (F2)"
      disabled={bibSelectedIds.length !== 1}
      onClick={() => {
        const item = bibSelectedIds[0]
        if (!item) return
        const name = item.type === 'patch'
          ? patches.find(p => p.id === item.id)?.name
          : soundFolders.find(f => f.id === item.id)?.name
        if (name) startEdit(item.id, name)
      }}
    ><Edit3 size={14} /></button>
    <button
      type="button"
      className="bib-action-btn"
      title="Copier (Ctrl+C)"
      disabled={bibSelectedIds.length === 0}
      onClick={handleCopy}
    ><Copy size={14} /></button>
    <button
      type="button"
      className="bib-action-btn"
      title="Couper (Ctrl+X)"
      disabled={bibSelectedIds.length === 0}
      onClick={handleCut}
    ><Scissors size={14} /></button>
    <button
      type="button"
      className="bib-action-btn"
      title="Coller (Ctrl+V)"
      disabled={!bibClipboard || bibClipboard.items.length === 0}
      onClick={() => handlePaste()}
    ><Clipboard size={14} /></button>
    <button
      type="button"
      className="bib-action-btn delete"
      title="Supprimer (Suppr)"
      disabled={bibSelectedIds.length === 0}
      onClick={() => onDeleteItems?.(bibSelectedIds)}
    ><Trash2 size={14} /></button>
    <div className="bib-action-separator" />
    {onImportLibrary && (
      <button
        type="button"
        className="bib-action-btn"
        title="Importer (.osa)"
        onClick={onImportLibrary}
      ><Upload size={14} /></button>
    )}
    <button
      type="button"
      className="bib-action-btn"
      title="Exporter (sélection unique)"
      disabled={bibSelectedIds.length !== 1}
      onClick={() => {
        const item = bibSelectedIds[0]
        if (!item) return
        if (item.type === 'patch') onExportPatch?.(item.id)
        else onExportFolder?.(item.id)
      }}
    ><Download size={14} /></button>
  </div>
)}
```

Important : ce bloc est rendu UNIQUEMENT si `isFullTab` (donc pas dans les sidebars — qui de toute façon n'utiliseront plus PatchBank après Task 13, mais cohérent).

- [ ] **Step 4: CSS pour la toolbar d'actions**

Ajouter à `PatchBank.css` :

```css
.bib-action-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px 8px;
  flex-wrap: wrap;
}
.bib-action-btn {
  background: transparent;
  color: #a8acc4;
  border: 1px solid transparent;
  padding: 5px 7px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bib-action-btn:hover:not(:disabled) {
  background: #2a2a4a;
  color: #d0d4ec;
  border-color: #3a3a5a;
}
.bib-action-btn:disabled {
  color: #4a4a6a;
  cursor: not-allowed;
}
.bib-action-btn.delete:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}
.bib-action-separator {
  width: 1px;
  height: 20px;
  background: #3a3a5a;
  margin: 0 4px;
}
```

- [ ] **Step 5: Brancher `onDeleteItems` dans App.jsx (ajusté en Task 10 Step 8)**

Vérifier que la prop est passée à `<PatchBank>` dans le rendu library tab. Déjà fait en Task 10 Step 7 ; vérifier.

- [ ] **Step 6: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/components/PatchBank.jsx src/components/PatchBank.css
git commit -m "feat(iter-K/phase-2.11): PatchBank toolbar d'actions icônes (isFullTab)"
```

---

## Task 12: PatchBank — right-click sync sélection + retrait Ctrl+Z keydown

**Files:**
- Modify: `src/components/PatchBank.jsx`

- [ ] **Step 1: Right-click sync sélection sur tous les items**

Dans `renderPatchChip`, `renderFolder`, `renderPatchTile`, `renderFolderTile`, modifier le handler `onContextMenu` :

Avant (exemple sur renderPatchChip) :
```jsx
onContextMenu={(e) => {
  e.preventDefault()
  e.stopPropagation()
  setContextMenu({ type: 'patch', id: patch.id, clientX: e.clientX, clientY: e.clientY })
}}
```

Après :
```jsx
onContextMenu={(e) => {
  e.preventDefault()
  e.stopPropagation()
  const itemKey = { type: 'patch', id: patch.id }
  const isInSelection = bibSelectedIds.some(s => s.type === 'patch' && s.id === patch.id)
  if (!isInSelection) {
    onSelectItems?.([itemKey], 'set')
  }
  setContextMenu({ type: 'patch', id: patch.id, clientX: e.clientX, clientY: e.clientY })
}}
```

Adapter pour `renderFolder`, `renderPatchTile`, `renderFolderTile` (changer `'patch'` en `'folder'` selon le cas).

- [ ] **Step 2: Right-click vide → clear selection**

Repérer l'`onContextMenu` du wrapper `sound-bank-body` (ajouté en Task 10 phase 1). Modifier :

```jsx
onContextMenu={(e) => {
  if (e.target.closest('[data-bib-item-id]')) return
  e.preventDefault()
  onClearSelection?.()  // ← nouveau
  setContextMenu({ type: 'empty', clientX: e.clientX, clientY: e.clientY })
}}
```

- [ ] **Step 3: Simplifier handleCopy/Cut/handleDeleteSelected**

Maintenant que `bibSelectedIds` reflète toujours la cible du menu, le fallback contextMenu.id devient inutile pour les opérations multi-items.

```jsx
// Helper inchangé : applique filterOutDescendants si selection multi
const itemsForClipboardOp = () => {
  return bibSelectedIds.length > 0
    ? filterOutDescendants(bibSelectedIds, soundFolders, patches)
    : []
}
const handleCopy = () => {
  const items = itemsForClipboardOp()
  if (items.length === 0) return
  onCopy?.(items)
}
const handleCut = () => {
  const items = itemsForClipboardOp()
  if (items.length === 0) return
  onCut?.(items)
}
```

Pour `handleDeleteSelected`, utiliser le batch `onDeleteItems` (prop) ou rester sur la boucle existante si `onDeleteItems` n'est pas fournie :

```jsx
const handleDeleteSelected = () => {
  if (bibSelectedIds.length === 0) return
  if (onDeleteItems) {
    // Mode batch (préféré quand isFullTab)
    onDeleteItems(bibSelectedIds)
  } else {
    // Mode legacy : boucle individuelle
    for (const item of bibSelectedIds) {
      if (item.type === 'patch') onDeletePatch(item.id)
      else if (item.type === 'folder') onDeleteFolder(item.id)
    }
  }
  onClearSelection?.()
}
```

- [ ] **Step 4: Retirer Ctrl+Z du useEffect keydown de PatchBank**

Repérer le useEffect keydown (autour de la ligne 430 dans PatchBank.jsx post-phase 1). Retirer les branches qui interceptaient `Ctrl+Z` / `Ctrl+Y`. Le routing global d'App.jsx s'en occupe désormais.

Garder : F2, Suppr/Backspace, ↑↓, Enter, Esc, Ctrl+C/X/V (ces derniers restent locaux à PatchBank pour gérer la sélection biblio).

- [ ] **Step 5: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/PatchBank.jsx
git commit -m "feat(iter-K/phase-2.12): right-click sync sélection + retrait Ctrl+Z (routing App.jsx)"
```

---

## Task 13: Sidebars — remplacer PatchBank par PatchPicker

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Import PatchPicker**

```jsx
import PatchPicker from './components/PatchPicker'
```

- [ ] **Step 2: Handler `handleDragStartFromPicker`**

Pour reproduire le format `dataTransfer` attendu par la timeline Composer (cohérent avec PatchBank actuel) :

```jsx
const handleDragStartFromPicker = useCallback((e, type, id) => {
  e.stopPropagation()
  // Format compatible avec le drop handler timeline (cf phase 1 Task 9)
  const dragItems = [{ type, id }]
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('application/x-patchbank-drag', JSON.stringify(dragItems))
  if (type === 'patch') {
    e.dataTransfer.setData('text/plain', id)
  }
}, [])
```

- [ ] **Step 3: Handler `handleOpenInLibrary`**

```jsx
const handleOpenInLibrary = useCallback(({ type, id }) => {
  dispatch({ type: 'OPEN_IN_LIBRARY', payload: { type, id } })
}, [])
```

- [ ] **Step 4: Remplacer les instances `<PatchBank>` dans les sidebars par `<PatchPicker>`**

Repérer les rendus de `<PatchBank>` dans App.jsx **autres que la library tab** (Task 10 Step 7). Il y a typiquement 2 ou 3 instances : popover Designer (sidebar collapsed), sidebar Designer inline, sidebar Composer. Pour chacune, remplacer :

```jsx
<PatchBank
  patches={patches}
  soundFolders={soundFolders}
  currentPatchId={currentPatchId}
  activeTab={activeTab}
  onLoadPatch={handleLoadPatch}
  // ... toutes les autres props
/>
```

Par :

```jsx
<PatchPicker
  patches={patches}
  soundFolders={soundFolders}
  currentPatchId={currentPatchId}
  bibClipboard={bibClipboard}
  bibSelectedIds={bibSelectedIds}
  activeTab={activeTab}
  onLoadPatch={activeTab === 'designer' ? handleLoadPatch : undefined}
  onOpenInLibrary={handleOpenInLibrary}
  onDragStart={handleDragStartFromPicker}
  headerExtra={headerExtra}   // si applicable au context
/>
```

**Important** : conserver `headerExtra` (bouton de réduction sidebar) si la sidebar en a un — le passer en prop.

**Note sur le PopupResizer** : la sidebar Designer collapsed avait un PopupResizer autour de PatchBank (phase 1 Task 12). Le maintenir autour de PatchPicker à la place. Wrapper :

```jsx
<div
  className="designer-library-popover"
  style={{ width: `${bibPopupWidth}px`, position: 'relative' }}
>
  <PatchPicker {...props} />
  <PopupResizer currentWidth={bibPopupWidth} onResize={setBibPopupWidth} />
</div>
```

- [ ] **Step 5: Vérifier lint et build**

```bash
npm run lint && npm run build
```

Pass attendu.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat(iter-K/phase-2.13): sidebars Designer/Composer = PatchPicker simplifié"
```

---

## Task 14: CONTEXT.md update

**Files:**
- Modify: `CONTEXT.md`

- [ ] **Step 1: TL;DR — ajouter paragraphe Itération K phase 2**

Ajouter après le paragraphe phase 1 et avant les releases v1.x :

```markdown
**Itération K phase 2 (Bibliothèque dédiée + 3 sous-apps)** **clôturée le 2026-05-25**.
Restructuration en 3 sous-applications autonomes (Bibliothèque, Designer,
Composer) avec piles undo séparées routées par activeTab. Ajout d'un
3e onglet "Bibliothèque" en premier dans le header, qui héberge le full
PatchBank avec toolbar d'actions icônes. Les sidebars Designer/Composer
sont downgrade en `PatchPicker` lightweight (Tree+List, click=load,
drag-out, menu "Ouvrir dans Bibliothèque"). Popup `SavePatchDialog`
remplace l'auto-save : breadcrumb+dropdown picker, bouton "Nouveau
dossier" inline non-undoable. `DELETE_BIB_ITEMS` batch atomique (1 undo
= 1 batch) + `DeleteUsageWarningDialog` modal pour patches utilisés en
Composer (lien "Voir dans le Composer" sélectionne les clips concernés).
Clipboard cut→copy après premier paste (multi-paste). `OPEN_IN_LIBRARY`
action atomique. SAVE_PATCH non-undoable. skipUndo flag dans
action.meta pour les opérations non-undoable contextuelles.
```

- [ ] **Step 2: Arborescence — ajouter nouveaux fichiers**

Dans la section Arborescence, sous `src/components/` :

```
├── PatchPicker.jsx + .css            # sidebar lightweight (K.2.6)
├── SavePatchDialog.jsx + .css        # modal popup save patch (K.2.7)
├── DeleteUsageWarningDialog.jsx + .css # modal warning patches utilisés (K.2.8)
```

- [ ] **Step 3: Décisions architecturales — 9 nouvelles entrées**

Ajouter à la fin de la section `## Décisions architecturales` (les 9 décisions de la spec §9) :

```markdown
- **3 sous-applications autonomes** (Bibliothèque, Designer, Composer)
  avec piles undo séparées (`history.library`, `history.designer`,
  `history.composer`). Chaque onglet a son cycle de vie, son raccourci
  Ctrl+Z. Co-dépendances : delete patch utilisé bloqué avec modal +
  lien Composer ; suppression du currentPatch vide le Designer.

- **Routing Ctrl+Z par activeTab** (`UNDO_LIBRARY` si `activeTab ===
  'library'`, etc.). Trivial et prédictible. Remplace le focus tracking
  introduit en phase 1 Task 11. Le keydown PatchBank ne traite plus
  Ctrl+Z (délégué à App.jsx).

- **`SAVE_PATCH` non-undoable** — action explicite via `SavePatchDialog`
  popup (location + nom validés par l'utilisateur). Suppression manuelle
  assumée. Évite le cross-cut entre piles Designer et Library.

- **Clipboard cut→copy après premier paste** — `bibClipboard.mode`
  bascule de `'cut'` à `'copy'` au premier paste. Items préservés pour
  multi-paste. Ghost `is-cut` disparaît naturellement.

- **`DELETE_BIB_ITEMS` batch atomique undoable** — multi-delete = 1
  action = 1 entrée undo. Détecte les patches utilisés en Composer,
  supprime les libres, retourne `pendingDeleteWarning` pour modal récap.

- **`skipUndo` flag dans `action.meta`** — extension générique pour
  bypasser le snapshot undo sur certaines actions contextuelles
  (ex : `CREATE_FOLDER` depuis le popup Save). Pattern réutilisable.

- **Sidebar Designer/Composer = `PatchPicker` lightweight** — composant
  ~150 lignes (Tree+List forcé, click=load Designer / drag-out Composer,
  aucune manipulation directe). Menu contextuel unique : "Ouvrir dans
  Bibliothèque" (dispatch `OPEN_IN_LIBRARY`). Réduit la complexité
  runtime des sidebars et clarifie le paradigme.

- **Onglet Bibliothèque en premier dans l'ordre visuel du header** —
  Bibliothèque, Designer, Composer. Cohérent avec flow logique
  ressources → édition → composition. `activeTab` default reste
  `'designer'` au premier load.

- **Right-click sur item non sélectionné met à jour la sélection** à cet
  item avant d'ouvrir le menu. Invariant garanti : "menu = sélection
  courante". Simplifie `handleCopy/Cut/Delete` (plus de fallback
  `contextMenu.id` ajouté en phase 1).
```

- [ ] **Step 4: État actuel — ajouter une entrée Terminé**

```markdown
- Bibliothèque dédiée + 3 sous-apps autonomes (itér K phase 2) : onglet
  Bibliothèque dédié avec full PatchBank + toolbar d'actions icônes,
  sidebars en PatchPicker simplifié, popup SavePatchDialog avec folder
  picker, modal DeleteUsageWarningDialog, piles undo séparées routées
  par activeTab, clipboard multi-paste, batch delete atomique.
```

- [ ] **Step 5: Roadmap & Backlog — ajouter section K phase 2**

```markdown
### Itération K phase 2 (Bibliothèque dédiée + 3 sous-apps) — clôturée 2026-05-25

- ✅ **Phase 2** (2026-05-25) — Restructure en 3 sous-applications
  autonomes. Sous-commits 2.1-2.14 : reducer foundation (LIBRARY_UNDOABLE
  + skipUndo + migration actions), SAVE_PATCH avec folderId, PASTE
  cut→copy, DELETE_BIB_ITEMS batch + pendingDeleteWarning,
  OPEN_IN_LIBRARY + GO_TO_COMPOSER_WITH_CLIPS, PatchPicker composant,
  SavePatchDialog, DeleteUsageWarningDialog, WaveformEditor delegate
  popup, App.jsx 3 onglets + routing Ctrl+Z + popup mounts + library
  tab, PatchBank toolbar d'actions, right-click sync + retrait Ctrl+Z
  keydown, sidebars → PatchPicker, CONTEXT.md.
  Spec + plan dans `docs/superpowers/{specs,plans}/2026-05-25-bibliotheque-multi-mode-phase-2.md`.
```

- [ ] **Step 6: Historique — entrée datée**

Prepend au début de `## Historique (chronologie inverse)` :

```markdown
- **2026-05-25 — Itération K phase 2 : Bibliothèque dédiée + 3 sous-apps autonomes**
  Restructure de l'app en 3 sous-applications avec piles undo séparées.
  Onglet Bibliothèque dédié (en premier dans le header) hébergeant le
  full PatchBank avec toolbar d'actions icônes. Sidebars downgrade en
  PatchPicker simplifié. Popup SavePatchDialog avec folder picker
  breadcrumb+dropdown + "Nouveau dossier" inline non-undoable.
  DELETE_BIB_ITEMS batch + DeleteUsageWarningDialog modal pour patches
  utilisés en Composer. Clipboard cut→copy multi-paste.

  **Décisions UX clés** :
  - Routing Ctrl+Z par activeTab (trivial, remplace le focus tracking
    phase 1).
  - SAVE_PATCH non-undoable (popup explicite = commit).
  - Sidebars = pickers, pas éditeurs.
  - Right-click invariant : menu = sélection courante.

  Spec + plan archivés : `docs/superpowers/specs/2026-05-25-bibliotheque-multi-mode-phase-2.md`,
  `docs/superpowers/plans/2026-05-25-bibliotheque-multi-mode-phase-2.md`.

  Tests manuels (26 scénarios listés dans la spec §10) attendus de
  l'utilisateur : 3 piles undo séparées, save patch popup, clipboard
  multi-paste, multi-delete avec warning Composer, right-click semantics,
  sidebar PatchPicker, onglet Bibliothèque dédié, co-dépendances cross-tabs.
```

- [ ] **Step 7: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: CONTEXT.md — Itération K phase 2 (bibliothèque dédiée + 3 sous-apps)"
```

---

## Auto-vérification du plan

**Couverture de la spec :**

- §1 Objectif → architecture déployée à travers les 14 tasks.
- §2 Scope in/out → respecté. Hors scope préservé (export multi-sélection, dédup nom, etc.).
- §3 Modèle de données & state → Tasks 1 (LIBRARY_UNDOABLE/FIELDS), 2 (SAVE_PATCH folderId, activeTab), 4 (pendingDeleteWarning, DELETE_BIB_ITEMS), 5 (OPEN_IN_LIBRARY, GO_TO_COMPOSER_WITH_CLIPS).
- §4 Routing Ctrl+Z → Task 10 Step 5.
- §5 Architecture composants → Tasks 6 (PatchPicker), 7 (SavePatchDialog), 8 (DeleteUsageWarningDialog), 9 (WaveformEditor delegate), 10 (App tabs/popups/library), 11 (PatchBank toolbar).
- §6 Data flow → Tasks 1 (snapshot + skipUndo), 3 (PASTE cut→copy), 4 (DELETE_BIB_ITEMS), 5 (OPEN_IN_LIBRARY), 12 (right-click sync).
- §7 Edge cases → couvertes par les guards reducer (Tasks 4, 5), state transient `pendingDeleteWarning` cleared dans SET_ACTIVE_TAB (Task 2 Step 3), Esc dans popups (Tasks 7, 8).
- §8 Risk register → addressé : PatchBank.jsx reste grand (acceptable), Ctrl+Z conflit résolu (Task 12 Step 4), skipUndo documenté.
- §9 Décisions archi → Task 14 (CONTEXT.md).
- §10 Tests manuels → déférés à l'utilisateur.
- §11 Hors scope → respecté.

**Pas de placeholder** : chaque task contient son code complet et ses commandes exactes.

**Type consistency** :
- Actions : `UNDO_LIBRARY`, `REDO_LIBRARY`, `DELETE_BIB_ITEMS`, `OPEN_IN_LIBRARY`, `GO_TO_COMPOSER_WITH_CLIPS`, `CLEAR_PENDING_DELETE_WARNING` — utilisées de façon cohérente.
- State fields : `history.library`, `pendingDeleteWarning`, `activeTab` extended, `bibClipboard.mode` toggled `'cut'`/`'copy'`.
- Helpers : `pickFields`, `countFolderContents`, `getDescendantFolderIds`, `nextAvailableFolderName`, `wouldCreateCycle`, `duplicateItemsToFolder`, `filterOutDescendants`, `buildPathToRoot`, `buildFlatTree`, `buildOrderedTree` (3 derniers dans les nouveaux composants).
- Composants : `PatchPicker`, `SavePatchDialog`, `DeleteUsageWarningDialog`, `PatchBank` (modifié), `WaveformEditor` (modifié).
- Tous référencés avec les mêmes noms partout.

**Note** : la Task 9 (WaveformEditor) garde temporairement un fallback au cas où `onRequestSavePopup` n'est pas branché. Le fallback devient unreachable après la Task 10 (App branche systématiquement la prop). Il peut être retiré dans un sous-commit fix ultérieur si on veut nettoyer, mais c'est cosmétique.
