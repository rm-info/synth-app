# Bibliothèque multi-mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer `PatchBank` en bibliothèque multi-mode style file explorer : 5 combinaisons Tree/Nav × List/Details/Tiles, breadcrumb cliquable+éditable, multi-sélection (Ctrl/Shift/lasso), clipboard Copier/Couper/Coller avec anti-cycle, raccourcis clavier, popup redimensionnable, état partagé Designer + Composer.

**Architecture:** Refonte de `PatchBank.jsx` autour d'un toolbar à 2 toggles + body conditionnel selon mode × display. Extraction de 4 nouveaux composants (`BibBreadcrumb`, `BibContextMenu`, `PatchThumbnail`, `PopupResizer`) + 1 helper lib (`bibTransfer.js`). State global dans le reducer (préférences persistées + sélection/clipboard runtime). Deux instances PatchBank (Designer + Composer) partagent l'état.

**Tech Stack:** React 19 + Vite + Web APIs natifs (drag-and-drop, getBoundingClientRect, SVG). Lucide-react (déjà installé pour les icônes). Zéro dépendance npm ajoutée.

**Spec de référence:** `docs/superpowers/specs/2026-05-25-bibliotheque-multi-mode-design.md`

**Convention commits:** `feat(iter-K/phase-1.N): description`.

---

## Préambule — Stratégie de test

Le projet n'a pas de framework de tests automatisés (CLAUDE.md : "tests manuels"). Pour chaque task :
1. `npm run lint` — pass attendu
2. `npm run build` — pass attendu
3. Commit avec préfixe `feat(iter-K/phase-1.N): ...` (ou `docs:` pour CONTEXT.md)

Vérifications UI manuelles (5 modes, multi-sélection, clipboard, drag-and-drop, keyboard nav, popup resize, state sync Designer/Composer) déférées à l'utilisateur en fin de plan.

---

## Task 1: Reducer + App.jsx — state UI prefs persistés

**Files:**
- Modify: `src/reducer.js` (4 nouveaux fields + 4 nouvelles actions)
- Modify: `src/App.jsx` (persistance + 4 handlers + destructure)

- [ ] **Step 1: Ajouter les 4 fields dans `loadPersistedState`**

Dans `src/reducer.js`, repérer `loadPersistedState()` (autour de la ligne 169). Ajouter à proximité des autres UI prefs (`spectrogramVisible`, etc.) :

```js
bibHierarchyMode: parsed.bibHierarchyMode === 'tree' ? 'tree' : 'nav',
bibDisplayMode: ['list', 'details', 'tiles'].includes(parsed.bibDisplayMode) ? parsed.bibDisplayMode : 'list',
bibCurrentFolderId: typeof parsed.bibCurrentFolderId === 'string' ? parsed.bibCurrentFolderId : null,
bibPopupWidth: typeof parsed.bibPopupWidth === 'number' && parsed.bibPopupWidth >= 320 ? parsed.bibPopupWidth : 480,
```

- [ ] **Step 2: Ajouter les 4 fields dans l'état initial**

Dans `buildInitialState` (autour de la ligne 315-355), ajouter :

```js
bibHierarchyMode: persisted?.bibHierarchyMode ?? 'nav',
bibDisplayMode: persisted?.bibDisplayMode ?? 'list',
bibCurrentFolderId: persisted?.bibCurrentFolderId ?? null,
bibPopupWidth: persisted?.bibPopupWidth ?? 480,
```

**Important** : après load des `soundFolders`, valider que `bibCurrentFolderId` pointe sur un folder existant ; sinon fallback à `null`. À ajouter après les initialisations qui dépendent de `soundFolders` :

```js
const validFolderIds = new Set(soundFolders.map(f => f.id))
if (state.bibCurrentFolderId !== null && !validFolderIds.has(state.bibCurrentFolderId)) {
  state.bibCurrentFolderId = null
}
```

- [ ] **Step 3: Ajouter les 4 cases dans le reducer switch**

Près du case `SET_SPECTROGRAM_VISIBLE` :

```js
case 'SET_BIB_HIERARCHY_MODE': {
  const mode = action.payload === 'tree' ? 'tree' : 'nav'
  return { ...state, bibHierarchyMode: mode }
}
case 'SET_BIB_DISPLAY_MODE': {
  const mode = ['list', 'details', 'tiles'].includes(action.payload) ? action.payload : 'list'
  return { ...state, bibDisplayMode: mode }
}
case 'SET_BIB_CURRENT_FOLDER': {
  // Vide aussi la sélection (per spec : cleared sur change de folder)
  return { ...state, bibCurrentFolderId: action.payload, bibSelectedIds: [], bibSelectionAnchor: null }
}
case 'SET_BIB_POPUP_WIDTH': {
  const w = Math.max(320, Math.min(action.payload, 1200))
  return { ...state, bibPopupWidth: w }
}
```

Aucune de ces actions n'est ajoutée à `DESIGNER_UNDOABLE` ni `COMPOSER_UNDOABLE` — ce sont des UI prefs.

- [ ] **Step 4: Persistance localStorage dans App.jsx**

Dans `src/App.jsx`, le `useEffect` de persistance (autour des lignes 497-534). Ajouter aux clés serialisées :

```js
bibHierarchyMode,
bibDisplayMode,
bibCurrentFolderId,
bibPopupWidth,
```

Aussi les ajouter à la destructure de `state` au début du composant.

- [ ] **Step 5: Ajouter les handlers dans App.jsx**

Près des autres handlers UI (par exemple `setSpectrogramVisible`) :

```js
const setBibHierarchyMode = useCallback((mode) => {
  dispatch({ type: 'SET_BIB_HIERARCHY_MODE', payload: mode })
}, [])
const setBibDisplayMode = useCallback((mode) => {
  dispatch({ type: 'SET_BIB_DISPLAY_MODE', payload: mode })
}, [])
const setBibCurrentFolder = useCallback((folderId) => {
  dispatch({ type: 'SET_BIB_CURRENT_FOLDER', payload: folderId })
}, [])
const setBibPopupWidth = useCallback((w) => {
  dispatch({ type: 'SET_BIB_POPUP_WIDTH', payload: w })
}, [])
```

- [ ] **Step 6: Vérifier lint et build**

```bash
npm run lint && npm run build
```

Attendu : pas d'erreur.

- [ ] **Step 7: Commit**

```bash
git add src/reducer.js src/App.jsx
git commit -m "feat(iter-K/phase-1.1): state UI prefs bibliothèque multi-mode"
```

Do NOT push.

---

## Task 2: PatchBank — header avec toggles icônes + BibBreadcrumb + nav-list rendering

**Files:**
- Create: `src/components/BibBreadcrumb.jsx`
- Create: `src/components/BibBreadcrumb.css`
- Modify: `src/components/PatchBank.jsx`
- Modify: `src/components/PatchBank.css`
- Modify: `src/App.jsx` (pass new props aux instances PatchBank)

- [ ] **Step 1: Créer `BibBreadcrumb.jsx`**

```jsx
import { useState, useMemo } from 'react'
import './BibBreadcrumb.css'

// Reconstruit la chaîne de parents jusqu'à currentFolderId.
// Retourne [{id, name}, ...] de la racine vers le current (exclu racine, vu qu'on l'affiche en dur).
function buildTrail(currentFolderId, soundFolders) {
  const trail = []
  let cur = currentFolderId
  const byId = new Map(soundFolders.map(f => [f.id, f]))
  while (cur !== null && byId.has(cur)) {
    const f = byId.get(cur)
    trail.unshift({ id: f.id, name: f.name })
    cur = f.parentId
  }
  return trail
}

function pathFromTrail(trail) {
  if (trail.length === 0) return '/'
  return '/' + trail.map(n => n.name).join('/')
}

// Parse '/Basses/Sub' → cherche le folderId final. Insensible à la casse.
// Retourne le folderId ou un objet { error: '...' } si invalide.
function parsePath(pathStr, soundFolders) {
  const cleaned = pathStr.trim().replace(/^\/+|\/+$/g, '')
  if (cleaned === '' || cleaned.toLowerCase() === 'root') return null
  const segments = cleaned.split('/')
  let parentId = null
  for (const seg of segments) {
    const match = soundFolders.find(f =>
      f.parentId === parentId && f.name.toLowerCase() === seg.toLowerCase()
    )
    if (!match) return { error: `Chemin invalide : "${seg}" introuvable.` }
    parentId = match.id
  }
  return parentId
}

export default function BibBreadcrumb({ currentFolderId, soundFolders, onNavigate, onNotify }) {
  const [editing, setEditing] = useState(false)
  const [pathInput, setPathInput] = useState('')
  const trail = useMemo(() => buildTrail(currentFolderId, soundFolders), [currentFolderId, soundFolders])

  const startEdit = () => {
    setPathInput(pathFromTrail(trail))
    setEditing(true)
  }

  const commitEdit = () => {
    const parsed = parsePath(pathInput, soundFolders)
    if (parsed && typeof parsed === 'object' && parsed.error) {
      onNotify?.(parsed.error, 'error')
      return
    }
    onNavigate(parsed)  // null pour racine, ou folderId
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bib-breadcrumb editing">
        <input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
            else if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
          }}
          onBlur={() => setEditing(false)}
          autoFocus
        />
      </div>
    )
  }

  const handleEmptyZoneClick = (e) => {
    // Clic uniquement sur le container ou la zone vide, pas sur un segment
    if (e.target.classList.contains('bib-breadcrumb') ||
        e.target.classList.contains('empty-zone')) {
      startEdit()
    }
  }

  return (
    <div className="bib-breadcrumb" onClick={handleEmptyZoneClick}>
      <span
        className={`seg ${currentFolderId === null ? 'current' : ''}`}
        onClick={currentFolderId === null ? undefined : () => onNavigate(null)}
      >
        root
      </span>
      {trail.map((node, i) => (
        <span key={node.id} className="seg-wrap">
          <span className="sep">/</span>
          <span
            className={`seg ${i === trail.length - 1 ? 'current' : ''}`}
            onClick={i === trail.length - 1 ? undefined : () => onNavigate(node.id)}
          >
            {node.name}
          </span>
        </span>
      ))}
      <span className="empty-zone" />
    </div>
  )
}
```

- [ ] **Step 2: Créer `BibBreadcrumb.css`**

```css
.bib-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #d0d4ec;
  background: #0e0e1e;
  border: 1px solid #2a2a4a;
  border-radius: 3px;
  padding: 4px 8px;
  margin: 0 8px 8px 8px;
  font-family: ui-monospace, monospace;
  cursor: text;
  flex-wrap: wrap;
}
.bib-breadcrumb .seg {
  color: #00d4ff;
  cursor: pointer;
  padding: 1px 4px;
  border-radius: 2px;
}
.bib-breadcrumb .seg:hover {
  background: rgba(0, 212, 255, 0.1);
}
.bib-breadcrumb .seg.current {
  color: #d0d4ec;
  cursor: default;
}
.bib-breadcrumb .seg.current:hover {
  background: none;
}
.bib-breadcrumb .sep {
  color: #4a4a6a;
}
.bib-breadcrumb .empty-zone {
  flex: 1;
  min-width: 16px;
  min-height: 16px;
}
.bib-breadcrumb.editing {
  background: #0e0e1e;
  border: 1px solid #00d4ff;
  border-radius: 3px;
  padding: 4px 8px;
  margin: 0 8px 8px 8px;
}
.bib-breadcrumb.editing input {
  background: transparent;
  border: none;
  color: #d0d4ec;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  width: 100%;
  outline: none;
  padding: 0;
}
```

- [ ] **Step 3: Ajouter le toolbar avec toggles dans `PatchBank.jsx`**

Importer les icônes lucide en haut du fichier :

```jsx
import { ListTree, Folder, List, LayoutList, LayoutGrid } from 'lucide-react'
import BibBreadcrumb from './BibBreadcrumb'
```

Modifier la signature pour accepter les nouvelles props (depuis App.jsx) :

```jsx
function PatchBank({
  // ...existing props,
  bibHierarchyMode, bibDisplayMode, bibCurrentFolderId,
  onSetHierarchyMode, onSetDisplayMode, onSetCurrentFolder, onNotify,
}) {
```

Dans le JSX du return, le `<header>` est actuellement :

```jsx
<header className="sound-bank-header">
  <div className="sound-bank-header-main">
    <h3>Bibliothèque</h3>
    <div className="sound-bank-header-right">
      <span className="sound-bank-count">{totalCount}</span>
      <button onClick={handleCreateFolder}>+ Dossier</button>
    </div>
  </div>
  {headerExtra && <div className="sound-bank-header-toggle">{headerExtra}</div>}
</header>
```

Étendre avec les toggles. Le résultat attendu :

```jsx
<header className="sound-bank-header">
  <div className="sound-bank-header-main">
    <h3>Bibliothèque</h3>
    <div className="sound-bank-header-right">
      <span className="sound-bank-count">{totalCount}</span>
    </div>
  </div>
  <div className="bib-toolbar">
    {/* Toggle Hiérarchie : Tree / Nav */}
    <div className="bib-toggle-group">
      <button
        type="button"
        className={`bib-toggle-btn ${bibHierarchyMode === 'tree' ? 'is-active' : ''}`}
        onClick={() => onSetHierarchyMode('tree')}
        title="Arborescence"
      ><ListTree size={14} /></button>
      <button
        type="button"
        className={`bib-toggle-btn ${bibHierarchyMode === 'nav' ? 'is-active' : ''}`}
        onClick={() => onSetHierarchyMode('nav')}
        title="Navigation (un dossier à la fois)"
      ><Folder size={14} /></button>
    </div>
    {/* Toggle Affichage : List / Details / (Tiles seulement en Nav) */}
    <div className="bib-toggle-group">
      <button
        type="button"
        className={`bib-toggle-btn ${bibDisplayMode === 'list' ? 'is-active' : ''}`}
        onClick={() => onSetDisplayMode('list')}
        title="Liste compacte"
      ><List size={14} /></button>
      <button
        type="button"
        className={`bib-toggle-btn ${bibDisplayMode === 'details' ? 'is-active' : ''}`}
        onClick={() => onSetDisplayMode('details')}
        title="Détails"
      ><LayoutList size={14} /></button>
      {bibHierarchyMode === 'nav' && (
        <button
          type="button"
          className={`bib-toggle-btn ${bibDisplayMode === 'tiles' ? 'is-active' : ''}`}
          onClick={() => onSetDisplayMode('tiles')}
          title="Tuiles avec aperçu"
        ><LayoutGrid size={14} /></button>
      )}
    </div>
    <div className="bib-toolbar-spacer" />
    <button
      type="button"
      className="bib-new-folder-btn"
      onClick={handleCreateFolder}
      title="Nouveau dossier"
    >+ Dossier</button>
  </div>
  {bibHierarchyMode === 'nav' && (
    <BibBreadcrumb
      currentFolderId={bibCurrentFolderId}
      soundFolders={soundFolders}
      onNavigate={onSetCurrentFolder}
      onNotify={onNotify}
    />
  )}
  {headerExtra && <div className="sound-bank-header-toggle">{headerExtra}</div>}
</header>
```

- [ ] **Step 4: CSS pour le toolbar dans `PatchBank.css`**

Ajouter à la fin :

```css
.bib-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px 8px;
}
.bib-toggle-group {
  display: flex;
  background: #1a1a2e;
  border: 1px solid #3a3a5a;
  border-radius: 4px;
  padding: 1px;
}
.bib-toggle-btn {
  background: transparent;
  color: #a8acc4;
  border: none;
  padding: 4px 7px;
  cursor: pointer;
  border-radius: 3px;
  line-height: 1;
  display: flex;
  align-items: center;
}
.bib-toggle-btn:hover {
  background: #2a2a4a;
  color: #d0d4ec;
}
.bib-toggle-btn.is-active {
  background: #003a4a;
  color: #00d4ff;
}
.bib-toolbar-spacer {
  flex: 1;
}
.bib-new-folder-btn {
  background: #1a1a2e;
  color: #a8acc4;
  border: 1px solid #3a3a5a;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
}
.bib-new-folder-btn:hover {
  background: #2a2a4a;
  color: #d0d4ec;
}
```

- [ ] **Step 5: Modifier le rendering body pour gérer nav mode (list)**

Dans `PatchBank.jsx`, le rendering actuel du body itère via `getFolderChildren` et appelle récursivement `renderFolder` / `renderPatch`. Ajouter une branche pour nav mode :

```jsx
// Dans le composant, avant le return
const isNavMode = bibHierarchyMode === 'nav'

const renderBody = () => {
  if (isNavMode) {
    // Nav mode : affiche les items du folder courant seulement
    const { folders, patches } = getFolderChildren(bibCurrentFolderId)
    return (
      <ul className="sound-bank-list">
        {bibCurrentFolderId !== null && (
          <li
            className="bib-updir"
            onClick={() => {
              const cur = soundFolders.find(f => f.id === bibCurrentFolderId)
              onSetCurrentFolder(cur ? cur.parentId : null)
            }}
            onDoubleClick={() => {
              const cur = soundFolders.find(f => f.id === bibCurrentFolderId)
              onSetCurrentFolder(cur ? cur.parentId : null)
            }}
            onDragOver={(e) => { e.preventDefault(); /* drop on .. handled later */ }}
            title="Remonter au dossier parent"
          >
            <span className="folder-icon">📁</span>
            <span>..</span>
          </li>
        )}
        {folders.map(f => renderFolder(f, 0))}
        {patches.map(p => renderPatch(p, 0))}
      </ul>
    )
  }
  // Tree mode : rendering récursif actuel inchangé
  const { folders: rootFolders, patches: rootPatches } = getFolderChildren(null)
  return (
    <ul className="sound-bank-list">
      {rootFolders.map(f => renderFolder(f, 0))}
      {rootPatches.map(p => renderPatch(p, 0))}
    </ul>
  )
}
```

Dans le JSX du return, remplacer le `<ul className="sound-bank-list">` direct par `{renderBody()}`.

**Important** : en nav mode, `renderFolder` ne doit pas afficher récursivement ses enfants. Adapter `renderFolder` :

```jsx
const renderFolder = (folder, depth) => {
  const isExpanded = !isNavMode && !collapsedFolders.has(folder.id)
  // ...existing setup...
  return (
    <li key={folder.id} className={`folder-item ${isDragging ? 'is-dragging' : ''}`}>
      <div
        className={`folder-row ${isDropTarget ? 'is-drop-target' : ''}`}
        // ...existing handlers...
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (isEditing) return
          if (isNavMode) {
            // En nav, double-clic entre dans le folder
            onSetCurrentFolder(folder.id)
          } else {
            // En tree, double-clic toggle expand (sauf si edit)
            // ou ouvre l'édit du nom — current behavior: open edit
            startEdit(folder.id, folder.name)
          }
        }}
        onClick={() => {
          if (isEditing) return
          if (!isNavMode) toggleFolder(folder.id)  // tree : toggle expand
          // nav : single click = select (sera géré en Task 5)
        }}
      >
        {/* chevron + icon + name (inchangés) */}
      </div>
      {/* En tree mode uniquement, render des enfants si expanded */}
      {!isNavMode && isExpanded && (
        <ul className="folder-children">
          {childFolders.map(f => renderFolder(f, depth + 1))}
          {childPatches.map(p => renderPatch(p, depth + 1))}
        </ul>
      )}
    </li>
  )
}
```

- [ ] **Step 6: CSS pour la ligne ".." dans `PatchBank.css`**

```css
.bib-updir {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin: 0 8px;
  color: #8a8fa8;
  cursor: pointer;
  font-style: italic;
  border-radius: 3px;
}
.bib-updir:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #d0d4ec;
}
.bib-updir .folder-icon {
  font-size: 14px;
}
```

- [ ] **Step 7: Passer les nouvelles props depuis App.jsx**

Dans `src/App.jsx`, repérer toutes les instances `<PatchBank ... />` (il y en a 3 selon le grep précédent — Designer mobile accordion, Designer desktop, Composer). Pour chacune, ajouter les props :

```jsx
<PatchBank
  // ...existing props,
  bibHierarchyMode={bibHierarchyMode}
  bibDisplayMode={bibDisplayMode}
  bibCurrentFolderId={bibCurrentFolderId}
  onSetHierarchyMode={setBibHierarchyMode}
  onSetDisplayMode={setBibDisplayMode}
  onSetCurrentFolder={setBibCurrentFolder}
  onNotify={(message, type) => dispatch({
    type: 'SET_NOTIFICATION',
    payload: { message, type, timestamp: Date.now() }
  })}
/>
```

- [ ] **Step 8: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 9: Commit**

```bash
git add src/reducer.js src/App.jsx src/components/PatchBank.jsx src/components/PatchBank.css src/components/BibBreadcrumb.jsx src/components/BibBreadcrumb.css
git commit -m "feat(iter-K/phase-1.2): PatchBank toolbar toggles + BibBreadcrumb + nav mode (list)"
```

---

## Task 3: Mode Details — rendering avec colonnes méta

**Files:**
- Modify: `src/components/PatchBank.jsx`
- Modify: `src/components/PatchBank.css`

- [ ] **Step 1: Ajouter le rendering details dans `renderPatch`**

Le rendering patch actuel est une simple chip. Adapter pour gérer le mode details. Dans `renderPatch(patch, depth)`, on a un `<li className="sound-chip" ...>`. Modifier :

```jsx
const renderPatch = (patch, depth) => {
  // ...existing setup (isCurrent, isEditing, etc.)...
  const isDetails = bibDisplayMode === 'details'

  return (
    <li
      key={patch.id}
      className={`sound-chip ${isCurrent ? 'is-current' : ''} ${isDragging ? 'is-dragging' : ''} ${isDetails ? 'is-details' : ''}`}
      style={{ '--chip-color': patch.color, marginLeft: `${depth * 16}px` }}
      // ...existing handlers (draggable, onDragStart, etc.)...
      data-bib-item-id={patch.id}
      data-bib-item-type="patch"
    >
      <span className="chip-dot" />
      {isEditing ? (
        // ...existing input rendering...
      ) : (
        <>
          <span className="chip-name">{patch.name}</span>
          {isDetails && (
            <>
              <span className="chip-meta-tuning">{patch.defaultTuningSystem ?? '—'}</span>
              <span className="chip-meta-color" style={{ background: patch.color }} title={patch.color} />
            </>
          )}
          {/* boutons ✎ et × existants */}
          {!loadOnSingleClick && (
            <button type="button" className="chip-rename" /* ... */>✎</button>
          )}
          <button type="button" className="chip-delete" /* ... */>×</button>
        </>
      )}
    </li>
  )
}
```

- [ ] **Step 2: CSS pour les colonnes details**

Ajouter à `PatchBank.css` :

```css
.sound-chip.is-details {
  display: grid;
  grid-template-columns: 12px 1fr 60px 16px auto auto;
  gap: 6px;
  align-items: center;
  padding: 4px 8px;
}
.sound-chip.is-details .chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sound-chip.is-details .chip-meta-tuning {
  font-size: 10px;
  color: #8a8fa8;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sound-chip.is-details .chip-meta-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(255,255,255,0.1);
}
```

- [ ] **Step 3: Adapter `renderFolder` pour mode details si nécessaire**

Le folder en mode details : afficher le compte de patches dans le sous-arbre comme méta :

```jsx
const renderFolder = (folder, depth) => {
  // ...existing setup...
  const isDetails = bibDisplayMode === 'details'
  const descendantCount = isDetails
    ? countDescendants(folder.id, soundFolders, patches)
    : null
  return (
    <li /* ... */>
      <div className={`folder-row ${isDetails ? 'is-details' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}>
        <span className={`folder-chevron ${isExpanded ? 'is-expanded' : ''}`}>▶</span>
        <span className="folder-icon">📁</span>
        <span className="folder-name">{folder.name}</span>
        {isDetails && descendantCount !== null && (
          <span className="folder-meta-count">{descendantCount}</span>
        )}
        {/* boutons existants */}
      </div>
      {/* enfants si expanded en tree */}
    </li>
  )
}
```

Helper `countDescendants` :

```js
function countDescendants(folderId, soundFolders, patches) {
  const ids = new Set([folderId])
  let changed = true
  while (changed) {
    changed = false
    for (const f of soundFolders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id); changed = true
      }
    }
  }
  return patches.filter(p => ids.has(p.folderId)).length
}
```

CSS :

```css
.folder-row.is-details {
  display: grid;
  grid-template-columns: 16px 16px 1fr auto auto auto;
  gap: 6px;
  align-items: center;
}
.folder-row .folder-meta-count {
  font-size: 10px;
  color: #8a8fa8;
  background: rgba(255,255,255,0.06);
  padding: 1px 6px;
  border-radius: 8px;
}
```

- [ ] **Step 4: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/PatchBank.jsx src/components/PatchBank.css
git commit -m "feat(iter-K/phase-1.3): mode Details (colonnes méta tuning + couleur + count)"
```

---

## Task 4: PatchThumbnail + Tiles mode

**Files:**
- Create: `src/components/PatchThumbnail.jsx`
- Modify: `src/components/PatchBank.jsx`
- Modify: `src/components/PatchBank.css`

- [ ] **Step 1: Créer `PatchThumbnail.jsx`**

```jsx
import { useMemo } from 'react'

// Mini-SVG d'une waveform (sample 60 points sur les 600 du buffer).
// Pure : même input → même output. Memoizé sur points + dims.
export default function PatchThumbnail({ points, color = '#00d4ff', width = 60, height = 30 }) {
  const pathData = useMemo(() => {
    if (!points || points.length === 0) return ''
    const step = points.length / width
    const ymid = height / 2
    let d = `M 0 ${ymid - points[0] * ymid * 0.9}`
    for (let x = 1; x < width; x++) {
      const idx = Math.min(Math.floor(x * step), points.length - 1)
      const y = ymid - points[idx] * ymid * 0.9
      d += ` L ${x} ${y}`
    }
    return d
  }, [points, width, height])

  return (
    <svg
      className="patch-thumbnail"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width={width}
      height={height}
    >
      <path d={pathData} stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  )
}
```

- [ ] **Step 2: Ajouter rendering tiles dans PatchBank**

Dans `PatchBank.jsx`, importer :

```jsx
import PatchThumbnail from './PatchThumbnail'
```

Modifier `renderBody()` pour tiles mode :

```jsx
const renderBody = () => {
  const isTiles = bibDisplayMode === 'tiles'
  if (isNavMode && isTiles) {
    const { folders, patches } = getFolderChildren(bibCurrentFolderId)
    return (
      <div className="sound-bank-tiles">
        {bibCurrentFolderId !== null && (
          <div
            className="tile is-updir"
            onClick={() => {
              const cur = soundFolders.find(f => f.id === bibCurrentFolderId)
              onSetCurrentFolder(cur ? cur.parentId : null)
            }}
            onDoubleClick={() => {
              const cur = soundFolders.find(f => f.id === bibCurrentFolderId)
              onSetCurrentFolder(cur ? cur.parentId : null)
            }}
            title="Remonter"
          >
            <div className="tile-preview">📁 ..</div>
          </div>
        )}
        {folders.map(f => renderFolderTile(f))}
        {patches.map(p => renderPatchTile(p))}
      </div>
    )
  }
  if (isNavMode) {
    // ...nav list/details (Task 2+3)
  }
  // ...tree list/details (existing)
}
```

- [ ] **Step 3: Ajouter `renderFolderTile` et `renderPatchTile`**

```jsx
const renderFolderTile = (folder) => {
  const isDropTarget = dragOverTarget === folder.id
  const isDragging = dragItem?.type === 'folder' && dragItem?.id === folder.id
  return (
    <div
      key={folder.id}
      className={`tile is-folder ${isDropTarget ? 'is-drop-target' : ''} ${isDragging ? 'is-dragging' : ''}`}
      draggable
      onDragStart={(e) => handleDragStartInternal(e, 'folder', folder.id)}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => handleDragOverFolder(e, folder.id)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDropOnFolder(e, folder.id)}
      onDoubleClick={() => onSetCurrentFolder(folder.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({ type: 'folder', id: folder.id, clientX: e.clientX, clientY: e.clientY })
      }}
      data-bib-item-id={folder.id}
      data-bib-item-type="folder"
    >
      <div className="tile-preview folder-preview">📁</div>
      <div className="tile-name">{folder.name}</div>
    </div>
  )
}

const renderPatchTile = (patch) => {
  const isCurrent = patch.id === currentPatchId
  const isDragging = dragItem?.type === 'patch' && dragItem?.id === patch.id
  return (
    <div
      key={patch.id}
      className={`tile is-patch ${isCurrent ? 'is-current' : ''} ${isDragging ? 'is-dragging' : ''}`}
      draggable
      onDragStart={(e) => handleDragStartInternal(e, 'patch', patch.id)}
      onDragEnd={handleDragEnd}
      onDoubleClick={() => onLoadPatch?.(patch.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({ type: 'patch', id: patch.id, clientX: e.clientX, clientY: e.clientY })
      }}
      data-bib-item-id={patch.id}
      data-bib-item-type="patch"
    >
      <div className="tile-preview">
        <PatchThumbnail points={patch.points} color={patch.color} />
      </div>
      <div className="tile-name">{patch.name}</div>
    </div>
  )
}
```

- [ ] **Step 4: CSS pour tiles**

```css
.sound-bank-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  padding: 0 8px;
}
.tile {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #2a2a4a;
  border-radius: 4px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  text-align: center;
}
.tile:hover {
  background: rgba(255, 255, 255, 0.08);
}
.tile.is-current {
  border-color: #00d4ff;
  background: rgba(0, 212, 255, 0.1);
}
.tile.is-dragging {
  opacity: 0.4;
}
.tile.is-drop-target {
  border-color: #00d4ff;
  background: rgba(0, 212, 255, 0.15);
}
.tile-preview {
  width: 60px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}
.tile.is-folder .tile-preview,
.tile.is-updir .tile-preview {
  background: rgba(255, 255, 255, 0.05);
  font-size: 18px;
  color: #d0d4ec;
}
.tile.is-updir {
  color: #8a8fa8;
  font-style: italic;
}
.tile-name {
  font-size: 11px;
  color: #d0d4ec;
  word-break: break-word;
  line-height: 1.2;
}
.patch-thumbnail {
  display: block;
}
```

- [ ] **Step 5: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/PatchThumbnail.jsx src/components/PatchBank.jsx src/components/PatchBank.css
git commit -m "feat(iter-K/phase-1.4): PatchThumbnail + Tiles mode rendering"
```

---

## Task 5: Reducer — selection state + actions + handlers

**Files:**
- Modify: `src/reducer.js`
- Modify: `src/components/PatchBank.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Ajouter le state selection dans le reducer**

Dans `buildInitialState` :

```js
bibSelectedIds: [],
bibSelectionAnchor: null,
```

Pas dans `loadPersistedState` (transient).

- [ ] **Step 2: Ajouter les cases reducer pour la sélection**

```js
case 'SELECT_BIB_ITEMS': {
  const { items, mode } = action.payload
  const existing = state.bibSelectedIds
  const keyOf = (i) => `${i.type}:${i.id}`
  const existingKeys = new Set(existing.map(keyOf))
  const newItemKeys = items.map(keyOf)
  let result
  if (mode === 'set') {
    result = items
  } else if (mode === 'add') {
    const dedup = new Set(existingKeys)
    const merged = [...existing]
    for (const item of items) {
      if (!dedup.has(keyOf(item))) { merged.push(item); dedup.add(keyOf(item)) }
    }
    result = merged
  } else if (mode === 'toggle') {
    const toRemove = new Set(newItemKeys)
    result = existing.filter(i => !toRemove.has(keyOf(i)))
  } else if (mode === 'range') {
    result = items
  } else {
    result = existing
  }
  // Anchor : mis à jour sauf en mode 'range' (qui le conserve)
  const newAnchor = mode === 'range' ? state.bibSelectionAnchor :
                    items.length > 0 ? items[items.length - 1] : null
  return { ...state, bibSelectedIds: result, bibSelectionAnchor: newAnchor }
}
case 'CLEAR_BIB_SELECTION': {
  return { ...state, bibSelectedIds: [], bibSelectionAnchor: null }
}
```

Non ajoutées à `DESIGNER_UNDOABLE`.

- [ ] **Step 3: Helper `getOrderedItemList` dans PatchBank**

Près du top de PatchBank.jsx (avant le composant) :

```js
function getOrderedItemList({ hierarchyMode, currentFolderId, soundFolders, patches, collapsedFolders }) {
  if (hierarchyMode === 'nav') {
    const folders = soundFolders.filter(f => f.parentId === currentFolderId)
    const folderPatches = patches.filter(p => p.folderId === currentFolderId)
    return [
      ...folders.map(f => ({ type: 'folder', id: f.id })),
      ...folderPatches.map(p => ({ type: 'patch', id: p.id })),
    ]
  }
  function dfs(parentId) {
    const result = []
    const subFolders = soundFolders.filter(f => f.parentId === parentId)
    for (const folder of subFolders) {
      result.push({ type: 'folder', id: folder.id })
      if (!collapsedFolders.has(folder.id)) {
        result.push(...dfs(folder.id))
      }
    }
    const subPatches = patches.filter(p => p.folderId === parentId)
    for (const patch of subPatches) {
      result.push({ type: 'patch', id: patch.id })
    }
    return result
  }
  return dfs(null)
}

function computeRange(anchor, target, orderedList) {
  const keyOf = (i) => `${i.type}:${i.id}`
  const anchorKey = anchor ? keyOf(anchor) : null
  const targetKey = keyOf(target)
  const anchorIdx = orderedList.findIndex(i => keyOf(i) === anchorKey)
  const targetIdx = orderedList.findIndex(i => keyOf(i) === targetKey)
  if (anchorIdx === -1 || targetIdx === -1) return [target]
  const [from, to] = anchorIdx <= targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx]
  return orderedList.slice(from, to + 1)
}
```

- [ ] **Step 4: Handler `handleItemClick` dans PatchBank**

Ajouter les props `bibSelectedIds, bibSelectionAnchor, onSelectItems, onClearSelection`. Implémenter le handler :

```jsx
const handleItemClick = (item, e) => {
  const itemKey = { type: item.type, id: item.id }
  if (e.shiftKey && bibSelectionAnchor) {
    const orderedList = getOrderedItemList({
      hierarchyMode: bibHierarchyMode,
      currentFolderId: bibCurrentFolderId,
      soundFolders, patches, collapsedFolders,
    })
    const range = computeRange(bibSelectionAnchor, itemKey, orderedList)
    onSelectItems(range, 'range')
  } else if (e.ctrlKey || e.metaKey) {
    const alreadySelected = bibSelectedIds.some(s => s.id === item.id && s.type === item.type)
    onSelectItems([itemKey], alreadySelected ? 'toggle' : 'add')
  } else {
    onSelectItems([itemKey], 'set')
  }
}
```

Le `handleItemClick` est appelé sur le `onClick` de chaque item (patch chip, folder row, tile). À brancher partout.

- [ ] **Step 5: Visuel de sélection — classe `is-selected`**

Dans `renderPatch` et `renderFolder` (et `renderPatchTile`, `renderFolderTile`) :

```jsx
const isSelected = bibSelectedIds.some(s => s.id === item.id && s.type === 'patch') // ou 'folder'
// className: ajouter is-selected ${isSelected ? 'is-selected' : ''}
```

CSS dans `PatchBank.css` :

```css
.sound-chip.is-selected,
.folder-row.is-selected,
.tile.is-selected {
  background: rgba(0, 212, 255, 0.2);
  border: 1px solid rgba(0, 212, 255, 0.5);
}
.tile.is-selected {
  background: rgba(0, 212, 255, 0.15);
}
```

- [ ] **Step 6: Brancher onClick sur les items pour appeler `handleItemClick`**

Modifier les `onClick` existants sur les chips, folder rows, tiles. Exemple sur sound-chip :

```jsx
onClick={(e) => {
  if (isEditing) return
  handleItemClick({ type: 'patch', id: patch.id }, e)
  // Note : le click "load" est désormais sur double-click uniquement.
  // Plus de loadOnSingleClick (le single click sélectionne).
}}
```

Le `loadOnSingleClick` historique disparaît — c'est toujours double-clic maintenant.

- [ ] **Step 7: Pass props depuis App.jsx**

Dans App.jsx, ajouter à la destructure de state :

```js
bibSelectedIds, bibSelectionAnchor,
```

Handlers :

```js
const onSelectBibItems = useCallback((items, mode) => {
  dispatch({ type: 'SELECT_BIB_ITEMS', payload: { items, mode } })
}, [])
const onClearBibSelection = useCallback(() => {
  dispatch({ type: 'CLEAR_BIB_SELECTION' })
}, [])
```

Pass à chaque `<PatchBank>` :

```jsx
bibSelectedIds={bibSelectedIds}
bibSelectionAnchor={bibSelectionAnchor}
onSelectItems={onSelectBibItems}
onClearSelection={onClearBibSelection}
```

- [ ] **Step 8: Vérifier lint et build**

- [ ] **Step 9: Commit**

```bash
git add src/reducer.js src/App.jsx src/components/PatchBank.jsx src/components/PatchBank.css
git commit -m "feat(iter-K/phase-1.5): multi-sélection (Ctrl/Shift) + state + visuel"
```

---

## Task 6: Lasso selection (drag rectangle)

**Files:**
- Modify: `src/components/PatchBank.jsx`
- Modify: `src/components/PatchBank.css`

- [ ] **Step 1: Ajouter le state local lasso**

Dans le composant PatchBank :

```jsx
const [lasso, setLasso] = useState(null)
const bodyRef = useRef(null)
```

- [ ] **Step 2: Handler mousedown sur le body**

```jsx
const handleBodyMouseDown = (e) => {
  if (e.button !== 0) return  // gauche uniquement
  // Seulement si clic dans zone vide (pas sur un item)
  // On vérifie via target.closest('[data-bib-item-id]')
  if (e.target.closest('[data-bib-item-id]')) return
  if (e.target.closest('.bib-toolbar')) return
  if (e.target.closest('.bib-breadcrumb')) return
  const rect = bodyRef.current.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  setLasso({ x0: x, y0: y, x1: x, y1: y })
}

const handleBodyMouseMove = (e) => {
  if (!lasso) return
  const rect = bodyRef.current.getBoundingClientRect()
  setLasso(prev => ({ ...prev, x1: e.clientX - rect.left, y1: e.clientY - rect.top }))
}

const handleBodyMouseUp = (e) => {
  if (!lasso) return
  // Iter sur DOM nodes, intersect leur bbox avec le lasso
  const lassoRect = {
    left: Math.min(lasso.x0, lasso.x1),
    top: Math.min(lasso.y0, lasso.y1),
    right: Math.max(lasso.x0, lasso.x1),
    bottom: Math.max(lasso.y0, lasso.y1),
  }
  // Si le rect est minuscule (clic sans drag), traiter comme clic dans zone vide → clear selection
  if (Math.abs(lasso.x1 - lasso.x0) < 3 && Math.abs(lasso.y1 - lasso.y0) < 3) {
    onClearSelection()
    setLasso(null)
    return
  }
  const containerRect = bodyRef.current.getBoundingClientRect()
  const selected = []
  for (const el of bodyRef.current.querySelectorAll('[data-bib-item-id]')) {
    const r = el.getBoundingClientRect()
    const x0 = r.left - containerRect.left
    const x1 = r.right - containerRect.left
    const y0 = r.top - containerRect.top
    const y1 = r.bottom - containerRect.top
    if (x1 >= lassoRect.left && x0 <= lassoRect.right &&
        y1 >= lassoRect.top && y0 <= lassoRect.bottom) {
      selected.push({
        type: el.dataset.bibItemType,
        id: el.dataset.bibItemId,
      })
    }
  }
  onSelectItems(selected, 'set')
  setLasso(null)
}
```

- [ ] **Step 3: Wrapper `<div className="sound-bank-body">` avec ces handlers**

Restructurer le rendering pour qu'il y ait un wrapper `bodyRef` :

```jsx
<div
  ref={bodyRef}
  className="sound-bank-body"
  onMouseDown={handleBodyMouseDown}
  onMouseMove={handleBodyMouseMove}
  onMouseUp={handleBodyMouseUp}
  style={{ position: 'relative' }}
>
  {renderBody()}
  {lasso && (
    <div
      className="bib-lasso"
      style={{
        position: 'absolute',
        left: Math.min(lasso.x0, lasso.x1),
        top: Math.min(lasso.y0, lasso.y1),
        width: Math.abs(lasso.x1 - lasso.x0),
        height: Math.abs(lasso.y1 - lasso.y0),
      }}
    />
  )}
</div>
```

- [ ] **Step 4: CSS pour le lasso**

```css
.sound-bank-body {
  flex: 1;
  overflow-y: auto;
  position: relative;
}
.bib-lasso {
  border: 1px dashed #00d4ff;
  background: rgba(0, 212, 255, 0.08);
  pointer-events: none;
  z-index: 10;
}
```

- [ ] **Step 5: Vérifier lint et build**

- [ ] **Step 6: Commit**

```bash
git add src/components/PatchBank.jsx src/components/PatchBank.css
git commit -m "feat(iter-K/phase-1.6): lasso selection (drag rectangle zone vide)"
```

---

## Task 7: Reducer — clipboard state + actions + bibTransfer helper + PASTE/MOVE

**Files:**
- Create: `src/lib/bibTransfer.js`
- Modify: `src/reducer.js`

- [ ] **Step 1: Créer `src/lib/bibTransfer.js`**

```js
import { nextAvailableFolderName } from './folderNames.js'

// getDescendantFolderIds : déjà export par reducer.js, ré-import ici si besoin
// Mais pour rester self-contained, on duplique la logique ici en helper local
function descendantsOf(rootId, soundFolders) {
  const ids = new Set([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const f of soundFolders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id); changed = true
      }
    }
  }
  return ids
}

// Détecte un cycle : true si targetFolderId est dans le sous-arbre d'un des items folders.
export function wouldCreateCycle(items, targetFolderId, soundFolders) {
  for (const item of items) {
    if (item.type !== 'folder') continue
    if (item.id === targetFolderId) return true
    const desc = descendantsOf(item.id, soundFolders)
    if (desc.has(targetFolderId)) return true
  }
  return false
}

// Duplique récursivement les items dans targetFolderId. Retourne le delta à appliquer.
// items : [{ type: 'patch' | 'folder', id }]
// state : { patches, soundFolders, patchCounter, folderCounter }
export function duplicateItemsToFolder(items, targetFolderId, state) {
  const { patches, soundFolders, patchCounter, folderCounter } = state
  let pCounter = patchCounter
  let fCounter = folderCounter
  const newPatches = []
  const newFolders = []
  const folderIdMap = new Map()  // oldId → newId pour les folders dupliqués

  // Phase 1 : pour chaque folder à dupliquer, allouer un nouvel ID et collecter
  //           tout son sous-arbre.
  function cloneFolder(folderOldId, newParentId) {
    const original = soundFolders.find(f => f.id === folderOldId)
    if (!original) return
    const newId = `folder-${++fCounter}`
    folderIdMap.set(folderOldId, newId)
    // Dédup du nom : compte toutes les folders existantes + celles déjà dupliquées
    const allExisting = [...soundFolders, ...newFolders]
    const dedupedName = nextAvailableFolderName(original.name, allExisting)
    newFolders.push({
      id: newId,
      name: dedupedName,
      parentId: newParentId,
    })
    // Récursion sur les sous-folders
    for (const child of soundFolders.filter(f => f.parentId === folderOldId)) {
      cloneFolder(child.id, newId)
    }
    // Récursion sur les patches dans ce folder
    for (const patch of patches.filter(p => p.folderId === folderOldId)) {
      const newPatchId = `patch-${++pCounter}`
      const allExistingPatchNames = [...patches, ...newPatches].map(p => ({ name: p.name }))
      const dedupedPatchName = nextAvailableFolderName(patch.name, allExistingPatchNames)
      newPatches.push({
        ...patch,
        id: newPatchId,
        name: dedupedPatchName,
        folderId: newId,
      })
    }
  }

  // Phase 2 : pour les items demandés directement
  for (const item of items) {
    if (item.type === 'folder') {
      cloneFolder(item.id, targetFolderId)
    } else if (item.type === 'patch') {
      const original = patches.find(p => p.id === item.id)
      if (!original) continue
      const newPatchId = `patch-${++pCounter}`
      const allExistingPatchNames = [...patches, ...newPatches].map(p => ({ name: p.name }))
      const dedupedPatchName = nextAvailableFolderName(original.name, allExistingPatchNames)
      newPatches.push({
        ...original,
        id: newPatchId,
        name: dedupedPatchName,
        folderId: targetFolderId,
      })
    }
  }

  return {
    newPatches, newFolders,
    patchCounterAfter: pCounter,
    folderCounterAfter: fCounter,
  }
}
```

- [ ] **Step 2: Ajouter le state clipboard dans le reducer**

Dans `buildInitialState` :

```js
bibClipboard: null,
```

- [ ] **Step 3: Ajouter les cases reducer pour clipboard et paste/move**

```js
case 'COPY_BIB_ITEMS': {
  const { items } = action.payload
  if (items.length === 0) return state
  return { ...state, bibClipboard: { mode: 'copy', items: [...items] } }
}
case 'CUT_BIB_ITEMS': {
  const { items } = action.payload
  if (items.length === 0) return state
  return { ...state, bibClipboard: { mode: 'cut', items: [...items] } }
}
case 'CLEAR_BIB_CLIPBOARD': {
  return { ...state, bibClipboard: null }
}
case 'PASTE_BIB_CLIPBOARD': {
  if (!state.bibClipboard) return state
  const { targetFolderId } = action.payload
  const { mode, items } = state.bibClipboard

  // Import dynamique du helper pour éviter circular imports
  // (en pratique, importer en haut du fichier)
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
      bibClipboard: null,
    }
  } else {
    // mode === 'copy'
    const result = duplicateItemsToFolder(items, targetFolderId, state)
    return {
      ...state,
      patches: [...state.patches, ...result.newPatches],
      soundFolders: [...state.soundFolders, ...result.newFolders],
      patchCounter: result.patchCounterAfter,
      folderCounter: result.folderCounterAfter,
      bibClipboard: null,
    }
  }
}
case 'MOVE_BIB_ITEMS': {
  const { items, targetFolderId } = action.payload
  if (items.length === 0) return state
  if (wouldCreateCycle(items, targetFolderId, state.soundFolders)) {
    return {
      ...state,
      notification: {
        message: 'Impossible : un dossier ne peut pas être déplacé dans lui-même ou un de ses sous-dossiers.',
        type: 'error',
        timestamp: Date.now(),
      },
    }
  }
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
  }
}
```

Imports en haut de `reducer.js` :

```js
import { wouldCreateCycle, duplicateItemsToFolder } from './lib/bibTransfer.js'
```

- [ ] **Step 4: Ajouter PASTE et MOVE à `DESIGNER_UNDOABLE`**

```js
const DESIGNER_UNDOABLE = new Set([
  // ...existing entries,
  'PASTE_BIB_CLIPBOARD',
  'MOVE_BIB_ITEMS',
])
```

- [ ] **Step 5: Vérifier lint et build**

- [ ] **Step 6: Commit**

```bash
git add src/reducer.js src/lib/bibTransfer.js
git commit -m "feat(iter-K/phase-1.7): clipboard state + PASTE_BIB_CLIPBOARD/MOVE_BIB_ITEMS + bibTransfer helper"
```

---

## Task 8: PatchBank — clipboard handlers (copy/cut/paste UI + ghost visual)

**Files:**
- Modify: `src/components/PatchBank.jsx`
- Modify: `src/components/PatchBank.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Pass props clipboard depuis App.jsx**

Destructure :

```js
bibClipboard,
```

Handlers :

```js
const onCopyBibItems = useCallback((items) => {
  dispatch({ type: 'COPY_BIB_ITEMS', payload: { items } })
}, [])
const onCutBibItems = useCallback((items) => {
  dispatch({ type: 'CUT_BIB_ITEMS', payload: { items } })
}, [])
const onClearBibClipboard = useCallback(() => {
  dispatch({ type: 'CLEAR_BIB_CLIPBOARD' })
}, [])
const onPasteBibClipboard = useCallback((targetFolderId) => {
  dispatch({ type: 'PASTE_BIB_CLIPBOARD', payload: { targetFolderId } })
}, [])
```

Pass aux `<PatchBank>` :

```jsx
bibClipboard={bibClipboard}
onCopy={onCopyBibItems}
onCut={onCutBibItems}
onClearClipboard={onClearBibClipboard}
onPaste={onPasteBibClipboard}
```

- [ ] **Step 2: Handlers dans PatchBank**

```jsx
const handleCopy = () => {
  if (bibSelectedIds.length === 0) return
  onCopy(bibSelectedIds)
}
const handleCut = () => {
  if (bibSelectedIds.length === 0) return
  onCut(bibSelectedIds)
}
const handlePaste = (targetFolderId = bibCurrentFolderId) => {
  if (!bibClipboard) return
  onPaste(targetFolderId)
}
```

- [ ] **Step 3: Visuel ghost pour items dans le clipboard cut**

Computer un Set des items "cut" :

```jsx
const cutItemKeys = useMemo(() => {
  if (!bibClipboard || bibClipboard.mode !== 'cut') return new Set()
  return new Set(bibClipboard.items.map(i => `${i.type}:${i.id}`))
}, [bibClipboard])
```

Dans `renderPatch` / `renderFolder` / `renderPatchTile` / `renderFolderTile`, ajouter la classe :

```jsx
const isCut = cutItemKeys.has(`${item.type}:${item.id}`)
// className += isCut ? ' is-cut' : ''
```

CSS :

```css
.sound-chip.is-cut,
.folder-row.is-cut,
.tile.is-cut {
  opacity: 0.4;
  font-style: italic;
}
```

- [ ] **Step 4: Vérifier lint et build**

- [ ] **Step 5: Commit**

```bash
git add src/components/PatchBank.jsx src/components/PatchBank.css src/App.jsx
git commit -m "feat(iter-K/phase-1.8): clipboard handlers + ghost visual cut"
```

---

## Task 9: Drag-and-drop refactor avec multi-sélection + MOVE_BIB_ITEMS

**Files:**
- Modify: `src/components/PatchBank.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Pass handler onMoveItems depuis App.jsx**

```js
const onMoveBibItems = useCallback((items, targetFolderId) => {
  dispatch({ type: 'MOVE_BIB_ITEMS', payload: { items, targetFolderId } })
}, [])
```

Pass aux instances :

```jsx
onMoveItems={onMoveBibItems}
```

- [ ] **Step 2: Refactor handleDragStart pour utiliser la sélection**

```jsx
const handleDragStartInternal = (e, type, id) => {
  const itemKey = { type, id }
  const isSelected = bibSelectedIds.some(s => s.id === id && s.type === type)
  const dragItems = isSelected && bibSelectedIds.length > 1 ? bibSelectedIds : [itemKey]
  if (!isSelected) {
    onSelectItems([itemKey], 'set')
  }
  setDragItem({ type, id, count: dragItems.length })
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('application/x-patchbank-drag', JSON.stringify(dragItems))
  dragRef.current = dragItems
}
```

- [ ] **Step 3: Refactor handleDropOnFolder**

```jsx
const handleDropOnFolder = (e, targetFolderId) => {
  e.preventDefault()
  e.stopPropagation()
  const data = dragRef.current
  setDragOverTarget(null)
  setDragItem(null)
  dragRef.current = null
  if (!data || data.length === 0) return
  // L'anti-cycle est vérifié côté reducer ; on dispatch.
  onMoveItems(data, targetFolderId)
}
```

- [ ] **Step 4: Drop sur ".."**

Dans `renderBody()` nav mode, le `<li className="bib-updir">` doit accepter le drop :

```jsx
<li
  className="bib-updir"
  onClick={...}
  onDoubleClick={...}
  onDragOver={(e) => {
    if (dragRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }}
  onDrop={(e) => {
    const cur = soundFolders.find(f => f.id === bibCurrentFolderId)
    const parentId = cur ? cur.parentId : null
    handleDropOnFolder(e, parentId)
  }}
  title="Remonter au dossier parent"
>
```

Idem pour la tile `is-updir`.

- [ ] **Step 5: Vérifier lint et build**

- [ ] **Step 6: Commit**

```bash
git add src/components/PatchBank.jsx src/App.jsx
git commit -m "feat(iter-K/phase-1.9): drag-and-drop multi-sélection + MOVE_BIB_ITEMS"
```

---

## Task 10: BibContextMenu — extraction + nouvelles entrées

**Files:**
- Create: `src/components/BibContextMenu.jsx`
- Modify: `src/components/PatchBank.jsx`
- Modify: `src/components/PatchBank.css`

- [ ] **Step 1: Créer `BibContextMenu.jsx`**

```jsx
import { useEffect } from 'react'

export default function BibContextMenu({
  menu, onClose,
  onRename, onCopy, onCut, onPaste, onDelete,
  onExportFolder, onExportPatch, onNewFolder,
  clipboardHasItems,
  folderHasAnyPatch,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  if (!menu) return null

  const isItem = menu.type === 'patch' || menu.type === 'folder'
  const isFolder = menu.type === 'folder'
  const isPatch = menu.type === 'patch'
  const isEmpty = menu.type === 'empty'

  return (
    <>
      <div
        className="bib-context-backdrop"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose() }}
      />
      <div
        className="bib-context-menu"
        style={{ left: menu.clientX, top: menu.clientY }}
      >
        {isItem && (
          <>
            <button className="bib-ctx-item" onClick={() => { onRename(menu.id, menu.type); onClose() }}>
              Renommer <span className="shortcut">F2</span>
            </button>
            <div className="bib-ctx-sep" />
            <button className="bib-ctx-item" onClick={() => { onCopy(); onClose() }}>
              Copier <span className="shortcut">Ctrl+C</span>
            </button>
            <button className="bib-ctx-item" onClick={() => { onCut(); onClose() }}>
              Couper <span className="shortcut">Ctrl+X</span>
            </button>
            {isFolder && (
              <button
                className="bib-ctx-item"
                onClick={() => { onPaste(menu.id); onClose() }}
                disabled={!clipboardHasItems}
              >
                Coller dans <span className="shortcut">Ctrl+V</span>
              </button>
            )}
            <div className="bib-ctx-sep" />
            {isFolder && (
              <button
                className="bib-ctx-item"
                onClick={() => { onExportFolder(menu.id); onClose() }}
                disabled={!folderHasAnyPatch(menu.id)}
              >
                Exporter ce dossier
              </button>
            )}
            {isPatch && (
              <button className="bib-ctx-item" onClick={() => { onExportPatch(menu.id); onClose() }}>
                Exporter ce patch
              </button>
            )}
            <div className="bib-ctx-sep" />
            <button className="bib-ctx-item delete" onClick={() => { onDelete(); onClose() }}>
              Supprimer <span className="shortcut">Suppr</span>
            </button>
          </>
        )}
        {isEmpty && (
          <>
            <button className="bib-ctx-item" onClick={() => { onNewFolder(); onClose() }}>
              Nouveau dossier
            </button>
            <button
              className="bib-ctx-item"
              onClick={() => { onPaste(null); onClose() }}
              disabled={!clipboardHasItems}
            >
              Coller <span className="shortcut">Ctrl+V</span>
            </button>
          </>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: CSS pour BibContextMenu**

Remplacer le CSS du `.patchbank-context-*` existant par :

```css
.bib-context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}
.bib-context-menu {
  position: fixed;
  z-index: 1000;
  background: #1a1a2e;
  border: 1px solid #3a3a5a;
  border-radius: 4px;
  padding: 4px 0;
  min-width: 200px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}
.bib-ctx-item {
  width: 100%;
  background: transparent;
  border: none;
  text-align: left;
  padding: 6px 14px;
  color: #d0d4ec;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.bib-ctx-item:hover:not(:disabled) {
  background: #2a2a4a;
}
.bib-ctx-item:disabled {
  color: #4a4a6a;
  cursor: not-allowed;
}
.bib-ctx-item.delete {
  color: #f87171;
}
.bib-ctx-item.delete:hover {
  background: rgba(248, 113, 113, 0.1);
}
.bib-ctx-item .shortcut {
  font-size: 10px;
  color: #8a8fa8;
}
.bib-ctx-sep {
  height: 1px;
  background: #2a2a4a;
  margin: 4px 0;
}
```

- [ ] **Step 3: Utiliser `BibContextMenu` dans PatchBank, retirer l'inline**

Importer :

```jsx
import BibContextMenu from './BibContextMenu'
```

Remplacer le menu inline existant (les ~30 lignes du JSX rendu conditionnel `contextMenu &&`) par :

```jsx
<BibContextMenu
  menu={contextMenu}
  onClose={() => setContextMenu(null)}
  onRename={(id, type) => startEdit(id, /* name lookup */)}
  onCopy={handleCopy}
  onCut={handleCut}
  onPaste={(folderId) => handlePaste(folderId)}
  onDelete={handleDeleteSelected}
  onExportFolder={onExportFolder}
  onExportPatch={onExportPatch}
  onNewFolder={handleCreateFolder}
  clipboardHasItems={!!bibClipboard && bibClipboard.items.length > 0}
  folderHasAnyPatch={(id) => {
    const desc = getDescendantFolderIds(id, soundFolders)
    const ids = new Set([id, ...desc])
    return patches.some(p => ids.has(p.folderId))
  }}
/>
```

- [ ] **Step 4: Ajouter le clic droit "zone vide" sur le body**

Dans le `<div className="sound-bank-body">` :

```jsx
onContextMenu={(e) => {
  // Si clic droit sur un item, le item gère lui-même
  if (e.target.closest('[data-bib-item-id]')) return
  e.preventDefault()
  setContextMenu({ type: 'empty', clientX: e.clientX, clientY: e.clientY })
}}
```

- [ ] **Step 5: Handler `handleDeleteSelected`**

```jsx
const handleDeleteSelected = () => {
  if (bibSelectedIds.length === 0) return
  // Pour chaque item, dispatch l'action DELETE existante
  for (const item of bibSelectedIds) {
    if (item.type === 'patch') onDeletePatch(item.id)
    else if (item.type === 'folder') onDeleteFolder(item.id)
  }
  onClearSelection()
}
```

- [ ] **Step 6: Vérifier lint et build**

- [ ] **Step 7: Commit**

```bash
git add src/components/BibContextMenu.jsx src/components/PatchBank.jsx src/components/PatchBank.css
git commit -m "feat(iter-K/phase-1.10): BibContextMenu extrait + entrées Copy/Cut/Paste/Delete/Rename"
```

---

## Task 11: Raccourcis clavier avec focus tracking

**Files:**
- Modify: `src/components/PatchBank.jsx`

- [ ] **Step 1: Focus tracking sur `<aside>`**

```jsx
const asideRef = useRef(null)
const isFocusedRef = useRef(false)

const handleFocusIn = () => { isFocusedRef.current = true }
const handleFocusOut = (e) => {
  if (!asideRef.current?.contains(e.relatedTarget)) isFocusedRef.current = false
}
```

Ajouter `tabIndex={-1}` sur `<aside ref={asideRef} onFocusIn={handleFocusIn} onFocusOut={handleFocusOut}>`.

- [ ] **Step 2: useEffect global pour les raccourcis**

```jsx
useEffect(() => {
  const onKey = (e) => {
    if (!isFocusedRef.current) return
    if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return

    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault()
      handleCopy()
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      e.preventDefault()
      handleCut()
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault()
      handlePaste()
    } else if (e.key === 'F2' && bibSelectedIds.length === 1) {
      e.preventDefault()
      const item = bibSelectedIds[0]
      const name = item.type === 'patch'
        ? patches.find(p => p.id === item.id)?.name
        : soundFolders.find(f => f.id === item.id)?.name
      if (name) startEdit(item.id, name)
    } else if (e.key === 'Delete') {
      e.preventDefault()
      handleDeleteSelected()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (bibClipboard) onClearClipboard()
      else onClearSelection()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const orderedList = getOrderedItemList({
        hierarchyMode: bibHierarchyMode,
        currentFolderId: bibCurrentFolderId,
        soundFolders, patches, collapsedFolders,
      })
      if (orderedList.length === 0) return
      const currentAnchor = bibSelectionAnchor || (bibSelectedIds.length > 0 ? bibSelectedIds[bibSelectedIds.length - 1] : null)
      const currentIdx = currentAnchor
        ? orderedList.findIndex(i => i.id === currentAnchor.id && i.type === currentAnchor.type)
        : -1
      const nextIdx = e.key === 'ArrowDown'
        ? Math.min(currentIdx + 1, orderedList.length - 1)
        : Math.max(currentIdx - 1, 0)
      const next = orderedList[nextIdx]
      if (e.shiftKey && currentAnchor) {
        const range = computeRange(currentAnchor, next, orderedList)
        onSelectItems(range, 'range')
      } else {
        onSelectItems([next], 'set')
      }
    } else if (e.key === 'Enter' && bibSelectedIds.length === 1) {
      e.preventDefault()
      const item = bibSelectedIds[0]
      if (item.type === 'patch') onLoadPatch?.(item.id)
      else if (item.type === 'folder') {
        if (bibHierarchyMode === 'nav') onSetCurrentFolder(item.id)
        else toggleFolder(item.id)
      }
    }
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}, [bibSelectedIds, bibSelectionAnchor, bibClipboard, bibCurrentFolderId,
    bibHierarchyMode, soundFolders, patches, collapsedFolders])
```

- [ ] **Step 3: Vérifier lint et build**

- [ ] **Step 4: Commit**

```bash
git add src/components/PatchBank.jsx
git commit -m "feat(iter-K/phase-1.11): raccourcis clavier (Ctrl+C/X/V, F2, Suppr, ↑↓, Enter, Esc)"
```

---

## Task 12: PopupResizer + intégration

**Files:**
- Create: `src/components/PopupResizer.jsx`
- Create: `src/components/PopupResizer.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Créer `PopupResizer.jsx`**

Calqué sur `SidebarResizer.jsx` existant (lecture obligatoire avant de coder pour matcher le pattern). Le drag handle est sur le bord droit du popup.

```jsx
import { useEffect, useRef } from 'react'
import './PopupResizer.css'

const MIN_WIDTH = 320

export default function PopupResizer({ currentWidth, onResize }) {
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(currentWidth)

  const onMouseDown = (e) => {
    e.preventDefault()
    draggingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = currentWidth
    document.body.style.cursor = 'ew-resize'
  }

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!draggingRef.current) return
      const delta = e.clientX - startXRef.current
      const newW = startWidthRef.current + delta
      const max = Math.min(window.innerWidth * 0.8, 1200)
      const clamped = Math.max(MIN_WIDTH, Math.min(newW, max))
      onResize(clamped)
    }
    const onMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false
        document.body.style.cursor = ''
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onResize])

  return (
    <div
      className="popup-resizer"
      onMouseDown={onMouseDown}
      title="Redimensionner"
    />
  )
}
```

- [ ] **Step 2: CSS pour PopupResizer**

```css
.popup-resizer {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  z-index: 100;
}
.popup-resizer:hover {
  background: rgba(0, 212, 255, 0.3);
}
.popup-resizer:active {
  background: rgba(0, 212, 255, 0.6);
}
```

- [ ] **Step 3: Intégrer PopupResizer dans App.jsx**

Repérer le rendu du popup Bibliothèque (sidebar Designer collapsed). Adapter la structure pour ajouter le resizer.

Le popup est rendu via une condition `if (sidebarCollapsed)` et utilise généralement un wrapper `<div className="bibliotheque-popover">` ou similaire. Modifier le wrapper pour avoir `position: relative` + width égale à `bibPopupWidth`.

```jsx
<div
  className="bibliotheque-popover"
  style={{ width: `${bibPopupWidth}px`, position: 'relative' }}
>
  <PatchBank ...props />
  <PopupResizer currentWidth={bibPopupWidth} onResize={setBibPopupWidth} />
</div>
```

(Le sélecteur CSS exact dépend de la structure existante — adapter au besoin.)

- [ ] **Step 4: Vérifier lint et build**

- [ ] **Step 5: Commit**

```bash
git add src/components/PopupResizer.jsx src/components/PopupResizer.css src/App.jsx
git commit -m "feat(iter-K/phase-1.12): PopupResizer pour popup Bibliothèque sidebar collapsed"
```

---

## Task 13: CONTEXT.md update

**Files:**
- Modify: `CONTEXT.md`

- [ ] **Step 1: TL;DR — ajouter un paragraphe Itération K**

Trouver le bloc des Itérations dans la TL;DR. Ajouter après Iteration J et avant les releases v1.x :

```markdown
**Itération K (Bibliothèque multi-mode)** **clôturée le 2026-05-25**.
Phase 1 : transformation de `PatchBank` en bibliothèque type file
explorer. 5 combinaisons d'affichage (Tree × List/Details + Nav ×
List/Details/Tiles ; Tiles caché en Tree). Mode Navigation avec
breadcrumb cliquable+éditable et ligne ".." pour remonter. Multi-
sélection (Ctrl+clic toggle, Shift+clic range, drag rectangle lasso).
Clipboard Copier/Couper/Coller avec anti-cycle (refus de coller un
folder dans son sous-arbre, notification utilisateur). Menu contextuel
enrichi : Renommer (F2), Copier (Ctrl+C), Couper (Ctrl+X), Coller
(Ctrl+V), Exporter, Supprimer (Suppr). Raccourcis clavier complets
quand focus dans la bibliothèque. Mode Tiles affiche un mini-SVG de
la waveform de chaque patch. Popup Bibliothèque (Designer sidebar
collapsed) redimensionnable via drag handle bord droit, largeur
persistée. **Sélection comme concept UX distinct de `currentPatchId`** :
simple clic = sélection visuelle, double-clic = ouvrir/charger. État
partagé entre instances Designer et Composer (un seul jeu de
préférences globales). Default Navigation mode au load (au lieu de
Tree historique).
```

- [ ] **Step 2: Arborescence — ajouter nouveaux fichiers**

Dans la section Arborescence, ajouter sous `src/components/` :

```
├── BibBreadcrumb.jsx + .css     # breadcrumb cliquable + éditable (K.1.2)
├── BibContextMenu.jsx           # menu contextuel enrichi (K.1.10)
├── PatchThumbnail.jsx           # mini-SVG waveform pour Tiles (K.1.4)
├── PopupResizer.jsx + .css      # poignée resize du popup (K.1.12)
```

Sous `src/lib/` :

```
├── bibTransfer.js               # wouldCreateCycle + duplicateItemsToFolder (K.1.7)
```

- [ ] **Step 3: Décisions architecturales — 6 nouvelles entrées**

Ajouter à la fin de la section `## Décisions architecturales` :

```markdown
- **Bibliothèque multi-mode (5 combinaisons valides)** — Tree × List/Details
  + Nav × List/Details/Tiles. Tiles caché en mode Tree (incohérent
  visuellement). État `bibHierarchyMode` et `bibDisplayMode` persistés
  partagés entre instances Designer et Composer (un seul jeu de
  préférences globales). Default `'nav'` + `'list'` au load.

- **Sélection comme concept UX distinct de `currentPatchId`** —
  `bibSelectedIds` est la sélection visuelle multi-items dans la
  bibliothèque ; `currentPatchId` reste le patch chargé dans le
  Designer. Simple clic sélectionne, double-clic ouvre/charge.
  Cohérent avec les file explorers modernes.

- **Anti-cycle paste/drag via `wouldCreateCycle`** — toute opération
  qui prend un folder pour cible doit refuser le folder lui-même ou
  tout descendant. Helper centralisé dans `src/lib/bibTransfer.js`,
  appelé par `PASTE_BIB_CLIPBOARD` et `MOVE_BIB_ITEMS`. Notification
  utilisateur en cas de refus (`SET_NOTIFICATION` dispatch).

- **Clipboard transient, PASTE/MOVE undoable** — `bibClipboard`,
  `bibSelectedIds`, `bibSelectionAnchor` non persistés, non undoable
  (UI state). `PASTE_BIB_CLIPBOARD` et `MOVE_BIB_ITEMS` dans
  `DESIGNER_UNDOABLE` (mutent patches/folders).

- **Lasso selection via `data-bib-item-id`** — chaque DOM node d'item
  (chip, folder row, tile) porte des attributs `data-bib-item-id` et
  `data-bib-item-type`. Le hit-test du lasso itère `querySelectorAll`
  + `getBoundingClientRect()`. Robuste aux indentations variables
  (tree mode) et aux changements de display mode.

- **Composants extraits pour la croissance de PatchBank** — quatre
  nouveaux composants (`BibBreadcrumb`, `BibContextMenu`,
  `PatchThumbnail`, `PopupResizer`) extraits pour maintenir
  `PatchBank.jsx` à une taille gérable (~700 lignes après refonte).
  Convention : un sous-élément qui dépasse ~80 lignes mérite son
  fichier.
```

- [ ] **Step 4: État actuel — ajouter une entrée Terminé**

Dans le bloc `✅ Terminé`, ajouter :

```markdown
- Bibliothèque multi-mode style file explorer (itér K phase 1) :
  5 combinaisons Tree/Nav × List/Details/Tiles, breadcrumb, multi-
  sélection (Ctrl/Shift/lasso), clipboard Copier/Couper/Coller avec
  anti-cycle, raccourcis clavier, popup redimensionnable, état partagé
  Designer + Composer.
```

- [ ] **Step 5: Roadmap & Backlog — fermer items + ajouter section K**

Retirer du backlog général :

```markdown
- Bouton "Vider la banque" (avec undo)
```

(s'il existe — peut être conservé selon l'évolution, à vérifier au grep)

Ajouter une nouvelle section après l'iter J :

```markdown
### Itération K (Bibliothèque multi-mode) — clôturée 2026-05-25

- ✅ **Phase 1** (2026-05-25) — Bibliothèque type file explorer.
  13 sous-commits (1.1-1.13) couvrant : state UI prefs (modes, current
  folder, popup width), toolbar toggles + BibBreadcrumb + nav mode
  rendering, mode Details avec colonnes méta, mode Tiles avec
  PatchThumbnail SVG, multi-sélection (Ctrl/Shift), lasso rectangle,
  clipboard state + PASTE/MOVE actions + bibTransfer helper, ghost
  visual cut, drag-and-drop refactor multi-sélection, BibContextMenu
  extrait avec entrées enrichies, raccourcis clavier (Ctrl+C/X/V,
  F2, Suppr, ↑↓, Enter, Esc), PopupResizer pour le popup sidebar
  collapsed, CONTEXT.md.
  Spec + plan dans `docs/superpowers/{specs,plans}/2026-05-25-bibliotheque-multi-mode*.md`.
```

- [ ] **Step 6: Historique — ajouter une nouvelle entrée datée**

Prepend au début de `## Historique (chronologie inverse)` :

```markdown
- **2026-05-25 — Itération K phase 1 : Bibliothèque multi-mode**
  Refonte de `PatchBank` en bibliothèque type file explorer.
  Treize sous-commits :
  - 1.1 : state UI prefs (bibHierarchyMode, bibDisplayMode,
    bibCurrentFolderId, bibPopupWidth) + actions reducer + persistance
    + handlers App.
  - 1.2 : toolbar avec 2 toggles icônes (Tree/Nav, List/Details/Tiles
    avec Tiles caché en Tree) + composant `BibBreadcrumb` (segments
    cliquables, édition au clic dans zone vide, parse path insensible
    casse) + rendering nav mode (single folder + ligne ".." +
    navigation).
  - 1.3 : mode Details — colonnes méta (tuning system, swatch couleur)
    pour patches ; count descendants pour folders.
  - 1.4 : composant `PatchThumbnail` (mini-SVG d'une waveform, 60
    samples sur 600 points, memoizé) + mode Tiles avec grille 2D.
  - 1.5 : state selection (bibSelectedIds, bibSelectionAnchor) + actions
    SELECT_BIB_ITEMS (modes set/add/toggle/range) + handlers
    Ctrl+clic / Shift+clic / simple click + visuel `.is-selected`.
  - 1.6 : lasso selection — drag rectangle dans zone vide, hit-test
    via querySelectorAll + getBoundingClientRect.
  - 1.7 : state clipboard (bibClipboard) + actions COPY/CUT/CLEAR +
    PASTE_BIB_CLIPBOARD + MOVE_BIB_ITEMS dans DESIGNER_UNDOABLE +
    `src/lib/bibTransfer.js` avec `wouldCreateCycle` et
    `duplicateItemsToFolder` (récursion sur folders, dédup noms via
    `nextAvailableFolderName`).
  - 1.8 : handlers clipboard côté PatchBank + visuel `.is-cut` (ghost
    opacity 0.4 + italic).
  - 1.9 : drag-and-drop refactor — utilise bibSelectedIds si l'item
    draggé y est, dispatch MOVE_BIB_ITEMS au drop. Anti-cycle géré
    reducer-side.
  - 1.10 : composant `BibContextMenu` extrait + entrées Renommer (F2),
    Copier, Couper, Coller dans (folder), Exporter, Supprimer (Suppr) ;
    zone vide → Nouveau dossier + Coller.
  - 1.11 : raccourcis clavier globaux avec focus tracking sur
    `<aside tabIndex={-1}>` — Ctrl+C/X/V, F2, Suppr, ↑↓ (avec Shift
    pour range), Enter (ouvre selected), Esc (clear clipboard puis
    selection).
  - 1.12 : composant `PopupResizer` + intégration dans le wrapper du
    popup Bibliothèque (sidebar Designer collapsed). Drag handle bord
    droit, largeur clampée [320, viewport×0.8], persistée.
  - 1.13 : CONTEXT.md.

  **Décisions UX clés** :
  - Sélection visuelle distincte du `currentPatchId` (simple clic
    sélectionne, double-clic ouvre/charge).
  - État de la bibliothèque partagé entre Designer et Composer (un
    seul jeu de préférences, sélection synchronisée).
  - Default navigation mode au load (vs tree historique).
  - Tiles mode caché en Tree (incohérent visuellement).
  - Anti-cycle paste/drag systématique via `wouldCreateCycle`.

  Spec + plan archivés : `docs/superpowers/specs/2026-05-25-bibliotheque-multi-mode-design.md`,
  `docs/superpowers/plans/2026-05-25-bibliotheque-multi-mode.md`.

  Tests manuels attendus de l'utilisateur (33 scénarios listés dans
  la spec §8) : modes & navigation, sélection, clipboard, multi-
  sélection avec ops, keyboard nav, Tiles, popup resize, sync
  Designer/Composer.
```

- [ ] **Step 7: Vérifier cohérence**

Pas de TBD / TODO / placeholder. L'entrée Itération K dans TL;DR est entre Itération J et v1.2.0. Les nouveaux fichiers sont dans l'Arborescence.

- [ ] **Step 8: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: CONTEXT.md — Itération K phase 1 (bibliothèque multi-mode)"
```

---

## Auto-vérification du plan

**Couverture de la spec :**

- §1 Objectif → architecture déployée à travers les 12 tasks de code.
- §2 Scope in/out → respectée. Hors scope préservé (pas de sort, pas de search, etc.).
- §3 Modèle de données & state → Task 1 (UI prefs) + Task 5 (selection) + Task 7 (clipboard).
- §4 Architecture UI → Tasks 2-4 (composants + rendering), 10 (BibContextMenu), 12 (PopupResizer).
- §5 Data flow & handlers → Tasks 5 (selection), 6 (lasso), 8 (clipboard handlers), 9 (drag-and-drop), 11 (keyboard).
- §6 Edge cases → couvertes par les guards dans le reducer (anti-cycle, currentFolderId fallback, etc.) répartis dans Tasks 1, 7.
- §7 Risk register → addressé par les patterns choisis (focus guard, `data-bib-item-id`, helper centralisé).
- §8 Tests manuels → déférés à l'utilisateur après livraison.
- §9 Décisions archi → Task 13 (CONTEXT.md).
- §10 Hors scope → respecté.

**Pas de placeholder** : chaque task a son code, ses commandes, ses critères d'acceptation.

**Type consistency** :
- `bibHierarchyMode`, `bibDisplayMode`, `bibCurrentFolderId`, `bibPopupWidth` — partout pareil.
- `bibSelectedIds`, `bibSelectionAnchor`, `bibClipboard` — idem.
- Actions : `SET_BIB_*`, `SELECT_BIB_ITEMS`, `COPY_BIB_ITEMS`, `CUT_BIB_ITEMS`, `CLEAR_BIB_CLIPBOARD`, `PASTE_BIB_CLIPBOARD`, `MOVE_BIB_ITEMS`.
- Helpers : `wouldCreateCycle`, `duplicateItemsToFolder`, `getOrderedItemList`, `computeRange`, `buildTrail`, `parsePath`, `countDescendants`.
- Composants : `BibBreadcrumb`, `BibContextMenu`, `PatchThumbnail`, `PopupResizer`.
- Tous référencés avec les mêmes noms partout.
