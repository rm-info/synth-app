import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ListTree, Folder, List, LayoutList, LayoutGrid } from 'lucide-react'
import { getDescendantFolderIds, countFolderContents } from '../reducer'
import { nextAvailableFolderName } from '../lib/folderNames.js'
import BibBreadcrumb from './BibBreadcrumb'
import BibContextMenu from './BibContextMenu'
import PatchThumbnail from './PatchThumbnail'
import './PatchBank.css'

// Retourne la liste ordonnée des items visibles (pour le calcul de range Shift+clic).
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

// Calcule la plage d'items entre anchor et target dans la liste ordonnée.
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

// Retire les items dont un ancêtre folder est aussi dans la liste.
// Évite de déplacer un patch ou folder PUIS son parent : on garde uniquement le parent.
function filterOutDescendants(items, soundFolders, patches) {
  const selectedFolderIds = new Set(items.filter(i => i.type === 'folder').map(i => i.id))
  if (selectedFolderIds.size === 0) return items
  const parentOf = new Map(soundFolders.map(f => [f.id, f.parentId]))
  const isFolderInSelectedSubtree = (folderId) => {
    let cur = folderId
    let depth = 0
    while (cur !== null && cur !== undefined && depth < 1000) {
      if (selectedFolderIds.has(cur)) return true
      cur = parentOf.get(cur)
      depth++
    }
    return false
  }
  const patchById = new Map(patches.map(p => [p.id, p]))
  return items.filter(item => {
    if (item.type === 'folder') {
      const parent = parentOf.get(item.id)
      return !(parent !== null && parent !== undefined && isFolderInSelectedSubtree(parent))
    } else {
      const patch = patchById.get(item.id)
      if (!patch) return true
      // Si le folderId du patch ou un de ses ancêtres est sélectionné, on filtre le patch
      return !isFolderInSelectedSubtree(patch.folderId)
    }
  })
}

function PatchBank({
  patches,
  soundFolders,
  currentPatchId,
  activeTab,
  onLoadPatch,
  onRenamePatch,
  onDeletePatch,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveItems,
  onExportFolder,
  onExportPatch,
  headerExtra,
  bibHierarchyMode,
  bibDisplayMode,
  bibCurrentFolderId,
  onSetHierarchyMode,
  onSetDisplayMode,
  onSetCurrentFolder,
  onNotify,
  bibSelectedIds = [],
  bibSelectionAnchor = null,
  onSelectItems,
  onClearSelection,
  bibClipboard,
  onCopy,
  onCut,
  // eslint-disable-next-line no-unused-vars
  onClearClipboard,
  onPaste,
}) {
  const loadOnSingleClick = activeTab === 'designer'
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [collapsedFolders, setCollapsedFolders] = useState(new Set())

  const [dragItem, setDragItem] = useState(null) // { type: 'patch'|'folder', id }
  const [dragOverTarget, setDragOverTarget] = useState(null) // folderId or 'root'
  const dragRef = useRef(null)

  const [contextMenu, setContextMenu] = useState(null)
  // contextMenu: null | { type: 'folder'|'patch', id: string, clientX, clientY }

  const [lasso, setLasso] = useState(null)
  const lassoRef = useRef(null)
  const bodyRef = useRef(null)

  const cutItemKeys = useMemo(() => {
    if (!bibClipboard || bibClipboard.mode !== 'cut') return new Set()
    return new Set(bibClipboard.items.map(i => `${i.type}:${i.id}`))
  }, [bibClipboard])

  // Si rien sélectionné, fallback sur l'item du contextMenu (right-click sur item non sélectionné).
  const itemsForClipboardOp = () => {
    if (bibSelectedIds.length > 0) {
      return filterOutDescendants(bibSelectedIds, soundFolders, patches)
    }
    if (contextMenu && (contextMenu.type === 'patch' || contextMenu.type === 'folder')) {
      return [{ type: contextMenu.type, id: contextMenu.id }]
    }
    return []
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
  const handlePaste = (targetFolderId = bibCurrentFolderId ?? null) => {
    if (!bibClipboard) return
    onPaste?.(targetFolderId)
  }

  const handleDeleteSelected = () => {
    if (bibSelectedIds.length === 0) {
      // Si rien sélectionné, fallback : supprimer l'item du contextMenu
      if (contextMenu && (contextMenu.type === 'patch' || contextMenu.type === 'folder')) {
        if (contextMenu.type === 'patch') onDeletePatch(contextMenu.id)
        else onDeleteFolder(contextMenu.id)
      }
      return
    }
    for (const item of bibSelectedIds) {
      if (item.type === 'patch') onDeletePatch(item.id)
      else if (item.type === 'folder') onDeleteFolder(item.id)
    }
    onClearSelection?.()
  }

  const toggleFolder = (folderId) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const handleItemClick = (item, e) => {
    if (!onSelectItems) return
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

  const startEdit = (id, currentName) => {
    setEditingId(id)
    setEditingValue(currentName)
  }
  const commitEdit = (isFolder) => {
    if (!editingId) return
    const trimmed = editingValue.trim()
    if (trimmed) {
      if (isFolder) onRenameFolder(editingId, trimmed)
      else onRenamePatch(editingId, trimmed)
    }
    setEditingId(null)
    setEditingValue('')
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditingValue('')
  }

  const handleCreateFolder = () => {
    const name = nextAvailableFolderName('Nouveau dossier', soundFolders)
    const parentId = bibHierarchyMode === 'nav' ? (bibCurrentFolderId ?? null) : null
    onCreateFolder(name, parentId)
  }

  const handleDeleteFolder = (folder) => {
    onDeleteFolder(folder.id)
  }

  // --- Drag & drop (internal bank reorg) ---

  const handleDragStartInternal = useCallback((e, type, id) => {
    e.stopPropagation()
    const itemKey = { type, id }
    const isSelected = bibSelectedIds.some(s => s.id === id && s.type === type)
    // Si l'item draggé est déjà dans la sélection (avec >1 items), drag la sélection entière.
    // Sinon, drag UNIQUEMENT cet item ET set la sélection à cet item.
    let dragItems
    if (isSelected && bibSelectedIds.length > 1) {
      dragItems = filterOutDescendants(bibSelectedIds, soundFolders, patches)
    } else {
      dragItems = [itemKey]
      if (!isSelected) {
        onSelectItems?.([itemKey], 'set')
      }
    }
    setDragItem({ type, id, count: dragItems.length })
    dragRef.current = dragItems
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-patchbank-drag', JSON.stringify(dragItems))
    if (type === 'patch' && dragItems.length === 1) {
      e.dataTransfer.setData('text/plain', id)
    }
  }, [bibSelectedIds, soundFolders, patches, onSelectItems])

  const handleDragOverFolder = useCallback((e, folderId) => {
    const data = dragRef.current
    if (!data || data.length === 0) return
    // Pour chaque folder draggé, check cycle
    for (const item of data) {
      if (item.type === 'folder') {
        if (item.id === folderId) return  // drop sur soi-même
        const descendants = getDescendantFolderIds(item.id, soundFolders)
        if (descendants.includes(folderId)) return  // target dans le sous-arbre
      }
    }
    e.preventDefault()
    e.stopPropagation()
    setDragOverTarget(folderId)
  }, [soundFolders])

  const handleDragOverRoot = useCallback((e) => {
    if (!dragRef.current || dragRef.current.length === 0) return
    e.preventDefault()
    e.stopPropagation()
    setDragOverTarget('root')
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget)) return
    setDragOverTarget(null)
  }, [])

  const handleDropOnFolder = useCallback((e, folderId) => {
    e.preventDefault()
    e.stopPropagation()
    const data = dragRef.current
    if (!data || data.length === 0) return
    setDragOverTarget(null)
    setDragItem(null)
    dragRef.current = null
    // L'anti-cycle est géré côté handleDragOverFolder (le highlight est bloqué si cycle).
    onMoveItems?.(data, folderId)
  }, [onMoveItems])

  const handleDropOnRoot = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const data = dragRef.current
    if (!data || data.length === 0) return
    setDragOverTarget(null)
    setDragItem(null)
    dragRef.current = null
    onMoveItems?.(data, null)
  }, [onMoveItems])

  const handleDragEnd = useCallback(() => {
    setDragItem(null)
    setDragOverTarget(null)
    dragRef.current = null
  }, [])

  // --- Lasso selection ---
  // Coords stockées en content-space (container-relative + scrollTop) pour
  // que la rect reste alignée si l'utilisateur scrolle pendant le drag.

  const pointToContentSpace = (clientX, clientY) => {
    const body = bodyRef.current
    const rect = body.getBoundingClientRect()
    return {
      x: clientX - rect.left + body.scrollLeft,
      y: clientY - rect.top + body.scrollTop,
    }
  }

  const handleBodyMouseDown = (e) => {
    if (e.button !== 0) return
    if (e.target.closest('[data-bib-item-id]')) return
    if (e.target.closest('.bib-toolbar')) return
    if (e.target.closest('.bib-breadcrumb')) return
    if (!bodyRef.current) return
    const { x, y } = pointToContentSpace(e.clientX, e.clientY)
    const newLasso = { x0: x, y0: y, x1: x, y1: y }
    lassoRef.current = newLasso
    setLasso(newLasso)
  }

  // Listeners window-level pendant un lasso actif :
  // - mousemove pour suivre la souris même hors du body
  // - mouseup pour finaliser même si le relâche est hors window
  useEffect(() => {
    if (!lasso) return
    const onMove = (e) => {
      if (!bodyRef.current) return
      const { x, y } = pointToContentSpace(e.clientX, e.clientY)
      setLasso(prev => {
        if (!prev) return null
        const next = { ...prev, x1: x, y1: y }
        lassoRef.current = next
        return next
      })
    }
    const onUp = () => {
      const current = lassoRef.current
      if (!current) { setLasso(null); return }
      if (Math.abs(current.x1 - current.x0) < 3 && Math.abs(current.y1 - current.y0) < 3) {
        onClearSelection?.()
        lassoRef.current = null
        setLasso(null)
        return
      }
      const lassoRect = {
        left: Math.min(current.x0, current.x1),
        top: Math.min(current.y0, current.y1),
        right: Math.max(current.x0, current.x1),
        bottom: Math.max(current.y0, current.y1),
      }
      if (!bodyRef.current) {
        setLasso(null)
        return
      }
      const containerRect = bodyRef.current.getBoundingClientRect()
      const scrollLeft = bodyRef.current.scrollLeft
      const scrollTop = bodyRef.current.scrollTop
      const selected = []
      for (const el of bodyRef.current.querySelectorAll('[data-bib-item-id]')) {
        const r = el.getBoundingClientRect()
        const x0 = r.left - containerRect.left + scrollLeft
        const x1 = r.right - containerRect.left + scrollLeft
        const y0 = r.top - containerRect.top + scrollTop
        const y1 = r.bottom - containerRect.top + scrollTop
        if (x1 >= lassoRect.left && x0 <= lassoRect.right &&
            y1 >= lassoRect.top && y0 <= lassoRect.bottom) {
          selected.push({
            type: el.dataset.bibItemType,
            id: el.dataset.bibItemId,
          })
        }
      }
      onSelectItems?.(selected, 'set')
      lassoRef.current = null
      setLasso(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // Listeners re-bind si lasso passe null↔non-null. Pas de dépendance sur
    // lasso lui-même pendant un drag (les deltas viennent du ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lasso === null, onClearSelection, onSelectItems])

  // --- Build tree ---

  const getFolderChildren = (parentId) => {
    const folders = soundFolders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
    const childPatches = patches
      .filter((p) => p.folderId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
    return { folders, patches: childPatches }
  }

  const isNavMode = bibHierarchyMode === 'nav'

  const renderPatchChip = (patch, depth) => {
    const isEditing = editingId === patch.id
    const isCurrent = loadOnSingleClick && currentPatchId === patch.id
    const isDragging = dragItem?.type === 'patch' && dragItem?.id === patch.id
    const isSelected = bibSelectedIds.some(s => s.type === 'patch' && s.id === patch.id)
    const isDetails = bibDisplayMode === 'details'
    const isCut = cutItemKeys.has(`patch:${patch.id}`)

    const handleDelete = (e) => {
      e.stopPropagation()
      onDeletePatch(patch.id)
    }
    const handleLoad = () => {
      if (isEditing) return
      onLoadPatch?.(patch.id)
    }
    const handleClick = (e) => {
      if (isEditing) return
      handleItemClick({ type: 'patch', id: patch.id }, e)
    }
    const handleDoubleClick = () => {
      if (isEditing) return
      // Double-clic = charger le patch (pattern file explorer).
      // Le rename est accessible via le bouton ✎ ou F2 (Task 11).
      onLoadPatch?.(patch.id)
    }
    const titleText = 'Clic pour sélectionner, double-clic pour charger, glisser pour placer'

    const handleChipDragOver = depth > 0
      ? (e) => { e.stopPropagation() }
      : undefined

    return (
      <li
        key={patch.id}
        className={`sound-chip ${isCurrent ? 'is-current' : ''} ${isDragging ? 'is-dragging' : ''} ${isDetails ? 'is-details' : ''} ${isSelected ? 'is-selected' : ''} ${isCut ? 'is-cut' : ''}`}
        style={{ '--chip-color': patch.color, marginLeft: `${depth * 16}px` }}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStartInternal(e, 'patch', patch.id)}
        onDragEnd={handleDragEnd}
        onDragOver={handleChipDragOver}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setContextMenu({ type: 'patch', id: patch.id, clientX: e.clientX, clientY: e.clientY })
        }}
        title={isEditing ? undefined : titleText}
        data-bib-item-id={patch.id}
        data-bib-item-type="patch"
      >
        <span className="chip-dot" />
        {isEditing ? (
          <input
            autoFocus
            className="chip-rename-input"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => commitEdit(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(false)
              else if (e.key === 'Escape') cancelEdit()
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            draggable={false}
          />
        ) : (
          <>
            <span className="chip-name">{patch.name}</span>
            {isDetails && (
              <>
                <span className="chip-meta-tuning">{patch.defaultTuningSystem ?? '—'}</span>
                <span className="chip-meta-color" style={{ background: patch.color }} title={patch.color} />
              </>
            )}
            {!loadOnSingleClick && (
              <button
                type="button"
                className="chip-rename"
                onClick={(e) => { e.stopPropagation(); handleLoad() }}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                title="Éditer le patch"
                aria-label={`Éditer ${patch.name}`}
              >
                ✎
              </button>
            )}
            <button
              type="button"
              className="chip-delete"
              onClick={handleDelete}
              onMouseDown={(e) => e.stopPropagation()}
              draggable={false}
              title={`Supprimer ${patch.name}`}
              aria-label={`Supprimer ${patch.name}`}
            >
              ×
            </button>
          </>
        )}
      </li>
    )
  }

  const renderFolder = (folder, depth) => {
    // En nav mode, le chevron/expand n'est pas utilisé (on entre via double-clic)
    const isExpanded = !isNavMode && !collapsedFolders.has(folder.id)
    const isEditing = editingId === folder.id
    const { folders: childFolders, patches: childPatches } = getFolderChildren(folder.id)
    const isDropTarget = dragOverTarget === folder.id
    const isDragging = dragItem?.type === 'folder' && dragItem?.id === folder.id
    const isSelected = bibSelectedIds.some(s => s.type === 'folder' && s.id === folder.id)
    const isDetails = bibDisplayMode === 'details'
    const descendantCount = isDetails
      ? countFolderContents(folder.id, soundFolders, patches).patchCount
      : null
    const isCut = cutItemKeys.has(`folder:${folder.id}`)

    return (
      <li key={folder.id} className={`folder-item ${isDragging ? 'is-dragging' : ''}`}>
        <div
          className={`folder-row ${isDetails ? 'is-details' : ''} ${isDropTarget ? 'is-drop-target' : ''} ${isSelected ? 'is-selected' : ''} ${isCut ? 'is-cut' : ''}`}
          style={{ marginLeft: `${depth * 16}px` }}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStartInternal(e, 'folder', folder.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOverFolder(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropOnFolder(e, folder.id)}
          onClick={(e) => {
            if (isEditing) return
            handleItemClick({ type: 'folder', id: folder.id }, e)
            // tree mode : chevron click reste séparé (toggleFolder)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            if (isEditing) return
            if (isNavMode) {
              // Nav mode : double-clic entre dans le dossier
              onSetCurrentFolder?.(folder.id)
            } else {
              // Tree mode : double-clic toggle expand
              toggleFolder(folder.id)
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setContextMenu({ type: 'folder', id: folder.id, clientX: e.clientX, clientY: e.clientY })
          }}
          data-bib-item-id={folder.id}
          data-bib-item-type="folder"
        >
          {/* En tree mode, le chevron est un bouton séparé pour le toggle expand.
              Clic sur le chevron ne propage pas à la row (sélection). */}
          <span
            className={`folder-chevron ${isExpanded ? 'is-expanded' : ''}`}
            onClick={!isNavMode ? (e) => { e.stopPropagation(); toggleFolder(folder.id) } : undefined}
          >▶</span>
          <span className="folder-icon">📁</span>
          {isEditing ? (
            <input
              autoFocus
              className="chip-rename-input folder-rename-input"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => commitEdit(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(true)
                else if (e.key === 'Escape') cancelEdit()
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              draggable={false}
            />
          ) : (
            <>
              <span className="folder-name">{folder.name}</span>
              <span className="folder-badge">{childPatches.length + childFolders.length}</span>
              {isDetails && descendantCount !== null && (
                <span className="folder-meta-count">{descendantCount}</span>
              )}
              <button
                type="button"
                className="chip-delete"
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder) }}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                title={`Supprimer ${folder.name}`}
                aria-label={`Supprimer ${folder.name}`}
              >
                ×
              </button>
            </>
          )}
        </div>
        {/* En tree mode uniquement, render des enfants si expanded */}
        {!isNavMode && isExpanded && (childFolders.length > 0 || childPatches.length > 0) && (
          <ul className="folder-children" onDragOver={(e) => e.stopPropagation()}>
            {childFolders.map((f) => renderFolder(f, depth + 1))}
            {childPatches.map((p) => renderPatchChip(p, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  const renderFolderTile = (folder) => {
    const isDropTarget = dragOverTarget === folder.id
    const isDragging = dragItem?.type === 'folder' && dragItem?.id === folder.id
    const isSelected = bibSelectedIds.some(s => s.type === 'folder' && s.id === folder.id)
    const isCut = cutItemKeys.has(`folder:${folder.id}`)
    return (
      <div
        key={folder.id}
        className={`tile is-folder ${isDropTarget ? 'is-drop-target' : ''} ${isDragging ? 'is-dragging' : ''} ${isSelected ? 'is-selected' : ''} ${isCut ? 'is-cut' : ''}`}
        draggable
        onDragStart={(e) => handleDragStartInternal(e, 'folder', folder.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOverFolder(e, folder.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDropOnFolder(e, folder.id)}
        onClick={(e) => handleItemClick({ type: 'folder', id: folder.id }, e)}
        onDoubleClick={() => onSetCurrentFolder?.(folder.id)}
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
    const isCurrent = loadOnSingleClick && currentPatchId === patch.id
    const isDragging = dragItem?.type === 'patch' && dragItem?.id === patch.id
    const isSelected = bibSelectedIds.some(s => s.type === 'patch' && s.id === patch.id)
    const isCut = cutItemKeys.has(`patch:${patch.id}`)
    return (
      <div
        key={patch.id}
        className={`tile is-patch ${isCurrent ? 'is-current' : ''} ${isDragging ? 'is-dragging' : ''} ${isSelected ? 'is-selected' : ''} ${isCut ? 'is-cut' : ''}`}
        draggable
        onDragStart={(e) => handleDragStartInternal(e, 'patch', patch.id)}
        onDragEnd={handleDragEnd}
        onClick={(e) => handleItemClick({ type: 'patch', id: patch.id }, e)}
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

  const renderBody = () => {
    const isTiles = bibDisplayMode === 'tiles'
    // Tiles mode : seulement valide en Nav. Fallback silencieux en Tree.
    if (isNavMode && isTiles) {
      const { folders, patches: navPatches } = getFolderChildren(bibCurrentFolderId ?? null)
      return (
        <div
          className="sound-bank-tiles"
          onDragOver={handleDragOverRoot}
          onDragLeave={handleDragLeave}
          onDrop={handleDropOnRoot}
        >
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
              onDragOver={(e) => {
                if (dragRef.current) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
              onDrop={(e) => {
                const cur = soundFolders.find(f => f.id === bibCurrentFolderId)
                const parentId = cur ? (cur.parentId ?? null) : null
                handleDropOnFolder(e, parentId)
              }}
              title="Remonter"
            >
              <div className="tile-preview folder-preview">📁</div>
              <div className="tile-name">..</div>
            </div>
          )}
          {folders.map(f => renderFolderTile(f))}
          {navPatches.map(p => renderPatchTile(p))}
        </div>
      )
    }
    if (isNavMode) {
      const { folders, patches: navPatches } = getFolderChildren(bibCurrentFolderId ?? null)
      return (
        <ul
          className="sound-bank-list"
          onDragOver={handleDragOverRoot}
          onDragLeave={handleDragLeave}
          onDrop={handleDropOnRoot}
        >
          {bibCurrentFolderId !== null && (
            <li
              className="bib-updir"
              onClick={() => {
                const cur = soundFolders.find(f => f.id === bibCurrentFolderId)
                onSetCurrentFolder?.(cur ? cur.parentId : null)
              }}
              onDoubleClick={() => {
                const cur = soundFolders.find(f => f.id === bibCurrentFolderId)
                onSetCurrentFolder?.(cur ? cur.parentId : null)
              }}
              onDragOver={(e) => {
                if (dragRef.current) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
              onDrop={(e) => {
                const cur = soundFolders.find(f => f.id === bibCurrentFolderId)
                const parentId = cur ? (cur.parentId ?? null) : null
                handleDropOnFolder(e, parentId)
              }}
              title="Remonter au dossier parent"
            >
              <span className="folder-icon">📁</span>
              <span>..</span>
            </li>
          )}
          {folders.map(f => renderFolder(f, 0))}
          {navPatches.map(p => renderPatchChip(p, 0))}
        </ul>
      )
    }
    const { folders: rootFolders, patches: rootPatches } = getFolderChildren(null)
    return (
      <ul
        className="sound-bank-list"
        onDragOver={handleDragOverRoot}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnRoot}
      >
        {rootFolders.map((f) => renderFolder(f, 0))}
        {rootPatches.map((p) => renderPatchChip(p, 0))}
      </ul>
    )
  }

  const totalCount = patches.length

  // Header partagé entre la branche vide et la branche normale
  const renderHeader = () => (
    <header className="sound-bank-header">
      <div className="sound-bank-header-main">
        <h3>Bibliothèque</h3>
        <div className="sound-bank-header-right">
          {totalCount > 0 && <span className="sound-bank-count">{totalCount}</span>}
        </div>
      </div>
      <div className="bib-toolbar">
        <div className="bib-toggle-group">
          <button
            type="button"
            className={`bib-toggle-btn ${bibHierarchyMode === 'tree' ? 'is-active' : ''}`}
            onClick={() => onSetHierarchyMode?.('tree')}
            title="Arborescence"
          ><ListTree size={14} /></button>
          <button
            type="button"
            className={`bib-toggle-btn ${bibHierarchyMode === 'nav' ? 'is-active' : ''}`}
            onClick={() => onSetHierarchyMode?.('nav')}
            title="Navigation (un dossier à la fois)"
          ><Folder size={14} /></button>
        </div>
        <div className="bib-toggle-group">
          <button
            type="button"
            className={`bib-toggle-btn ${bibDisplayMode === 'list' ? 'is-active' : ''}`}
            onClick={() => onSetDisplayMode?.('list')}
            title="Liste compacte"
          ><List size={14} /></button>
          <button
            type="button"
            className={`bib-toggle-btn ${bibDisplayMode === 'details' ? 'is-active' : ''}`}
            onClick={() => onSetDisplayMode?.('details')}
            title="Détails"
          ><LayoutList size={14} /></button>
          {bibHierarchyMode === 'nav' && (
            <button
              type="button"
              className={`bib-toggle-btn ${bibDisplayMode === 'tiles' ? 'is-active' : ''}`}
              onClick={() => onSetDisplayMode?.('tiles')}
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
          currentFolderId={bibCurrentFolderId ?? null}
          soundFolders={soundFolders}
          onNavigate={(folderId) => onSetCurrentFolder?.(folderId)}
          onNotify={onNotify}
        />
      )}
      {headerExtra && <div className="sound-bank-header-toggle">{headerExtra}</div>}
    </header>
  )

  if (totalCount === 0 && soundFolders.length === 0) {
    return (
      <aside className="sound-bank-panel">
        {renderHeader()}
        <p className="sound-bank-empty">
          Aucun patch. Dessinez-en un dans l&apos;onglet Designer.
        </p>
      </aside>
    )
  }

  return (
    <aside className="sound-bank-panel">
      {renderHeader()}
      <div
        ref={bodyRef}
        className="sound-bank-body"
        onMouseDown={handleBodyMouseDown}
        onContextMenu={(e) => {
          if (e.target.closest('[data-bib-item-id]')) return  // gère l'item lui-même
          e.preventDefault()
          setContextMenu({ type: 'empty', clientX: e.clientX, clientY: e.clientY })
        }}
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
      {dragItem && (
        <div
          className={`drop-root-zone ${dragOverTarget === 'root' ? 'is-active' : ''}`}
          onDragOver={handleDragOverRoot}
          onDrop={handleDropOnRoot}
        >
          Déposer ici → racine
        </div>
      )}
      <BibContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onRename={(id, type) => {
          const name = type === 'patch'
            ? patches.find(p => p.id === id)?.name
            : soundFolders.find(f => f.id === id)?.name
          if (name) startEdit(id, name)
        }}
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
    </aside>
  )
}

export default PatchBank
