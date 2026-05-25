import { useState, useEffect, useCallback, useRef } from 'react'
import { ListTree, Folder, List, LayoutList, LayoutGrid } from 'lucide-react'
import { getDescendantFolderIds, countFolderContents } from '../reducer'
import { nextAvailableFolderName } from '../lib/folderNames.js'
import BibBreadcrumb from './BibBreadcrumb'
import './PatchBank.css'

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
  onMovePatchToFolder,
  onMoveFolder,
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
    setDragItem({ type, id })
    dragRef.current = { type, id }
    e.dataTransfer.effectAllowed = type === 'patch' ? 'copyMove' : 'move'
    e.dataTransfer.setData('application/x-patchbank-drag', JSON.stringify({ type, id }))
    if (type === 'patch') {
      e.dataTransfer.setData('text/plain', id)
    }
  }, [])

  const handleDragOverFolder = useCallback((e, folderId) => {
    const data = dragRef.current
    if (!data) return
    if (data.type === 'folder' && data.id === folderId) return
    if (data.type === 'folder') {
      const descendants = getDescendantFolderIds(data.id, soundFolders)
      if (descendants.includes(folderId)) return
    }
    e.preventDefault()
    e.stopPropagation()
    setDragOverTarget(folderId)
  }, [soundFolders])

  const handleDragOverRoot = useCallback((e) => {
    if (!dragRef.current) return
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
    if (!data) return
    if (data.type === 'patch') {
      onMovePatchToFolder(data.id, folderId)
    } else if (data.type === 'folder') {
      onMoveFolder(data.id, folderId)
    }
    setDragItem(null)
    setDragOverTarget(null)
    dragRef.current = null
  }, [onMovePatchToFolder, onMoveFolder])

  const handleDropOnRoot = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const data = dragRef.current
    if (!data) return
    if (data.type === 'patch') {
      onMovePatchToFolder(data.id, null)
    } else if (data.type === 'folder') {
      onMoveFolder(data.id, null)
    }
    setDragItem(null)
    setDragOverTarget(null)
    dragRef.current = null
  }, [onMovePatchToFolder, onMoveFolder])

  const handleDragEnd = useCallback(() => {
    setDragItem(null)
    setDragOverTarget(null)
    dragRef.current = null
  }, [])

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
    const isDetails = bibDisplayMode === 'details'

    const handleDelete = (e) => {
      e.stopPropagation()
      onDeletePatch(patch.id)
    }
    const handleLoad = () => {
      if (isEditing) return
      onLoadPatch?.(patch.id)
    }
    const handleSingleClick = () => {
      if (isEditing) return
      if (loadOnSingleClick) handleLoad()
    }
    const handleDoubleClick = () => {
      if (isEditing) return
      startEdit(patch.id, patch.name)
    }
    const titleText = loadOnSingleClick
      ? 'Clic pour éditer, double-clic pour renommer'
      : 'Double-clic pour renommer, glisser pour placer sur la timeline'

    const handleChipDragOver = depth > 0
      ? (e) => { e.stopPropagation() }
      : undefined

    return (
      <li
        key={patch.id}
        className={`sound-chip ${isCurrent ? 'is-current' : ''} ${isDragging ? 'is-dragging' : ''} ${isDetails ? 'is-details' : ''}`}
        style={{ '--chip-color': patch.color, marginLeft: `${depth * 16}px` }}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStartInternal(e, 'patch', patch.id)}
        onDragEnd={handleDragEnd}
        onDragOver={handleChipDragOver}
        onClick={handleSingleClick}
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
    const isDetails = bibDisplayMode === 'details'
    const descendantCount = isDetails
      ? countFolderContents(folder.id, soundFolders, patches).patchCount
      : null

    return (
      <li key={folder.id} className={`folder-item ${isDragging ? 'is-dragging' : ''}`}>
        <div
          className={`folder-row ${isDetails ? 'is-details' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
          style={{ marginLeft: `${depth * 16}px` }}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStartInternal(e, 'folder', folder.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOverFolder(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropOnFolder(e, folder.id)}
          onClick={() => {
            if (isEditing) return
            if (!isNavMode) toggleFolder(folder.id)
            // nav mode : single click = noop (sélection en Task 5)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            if (isEditing) return
            if (isNavMode) {
              // Nav mode : double-clic entre dans le dossier
              onSetCurrentFolder?.(folder.id)
            } else {
              // Tree mode : double-clic renomme (comportement existant)
              startEdit(folder.id, folder.name)
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
          <span className={`folder-chevron ${isExpanded ? 'is-expanded' : ''}`}>▶</span>
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

  const renderBody = () => {
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
              onDragOver={(e) => { e.preventDefault() }}
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
      {renderBody()}
      {dragItem && (
        <div
          className={`drop-root-zone ${dragOverTarget === 'root' ? 'is-active' : ''}`}
          onDragOver={handleDragOverRoot}
          onDrop={handleDropOnRoot}
        >
          Déposer ici → racine
        </div>
      )}
      {contextMenu && (
        <>
          <div
            className="patchbank-context-backdrop"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
          />
          <div
            className="patchbank-context-menu"
            style={{ left: `${contextMenu.clientX}px`, top: `${contextMenu.clientY}px` }}
          >
            {contextMenu.type === 'folder' && (() => {
              const descendantIds = getDescendantFolderIds(contextMenu.id, soundFolders)
              const folderIds = new Set([contextMenu.id, ...descendantIds])
              const isEmpty = !patches.some((p) => folderIds.has(p.folderId))
              return (
                <button
                  type="button"
                  className="patchbank-context-item"
                  disabled={isEmpty}
                  onClick={() => {
                    const id = contextMenu.id
                    setContextMenu(null)
                    onExportFolder?.(id)
                  }}
                >Exporter ce dossier</button>
              )
            })()}
            {contextMenu.type === 'patch' && (
              <button
                type="button"
                className="patchbank-context-item"
                onClick={() => {
                  const id = contextMenu.id
                  setContextMenu(null)
                  onExportPatch?.(id)
                }}
              >Exporter ce patch</button>
            )}
          </div>
        </>
      )}
    </aside>
  )
}

export default PatchBank
