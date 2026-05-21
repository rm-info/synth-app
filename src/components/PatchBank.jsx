import { useState, useEffect, useCallback, useRef } from 'react'
import { getDescendantFolderIds } from '../reducer'
import { nextAvailableFolderName } from '../lib/folderNames.js'
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
    onCreateFolder(name)
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

  const rootFolders = soundFolders
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.name.localeCompare(b.name))
  const rootPatches = patches
    .filter((p) => !p.folderId)
    .sort((a, b) => a.name.localeCompare(b.name))

  const getFolderChildren = (parentId) => {
    const folders = soundFolders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
    const childPatches = patches
      .filter((p) => p.folderId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
    return { folders, patches: childPatches }
  }

  const renderPatchChip = (patch, depth) => {
    const isEditing = editingId === patch.id
    const isCurrent = loadOnSingleClick && currentPatchId === patch.id
    const isDragging = dragItem?.type === 'patch' && dragItem?.id === patch.id

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
        className={`sound-chip ${isCurrent ? 'is-current' : ''} ${isDragging ? 'is-dragging' : ''}`}
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
    const isExpanded = !collapsedFolders.has(folder.id)
    const isEditing = editingId === folder.id
    const { folders: childFolders, patches: childPatches } = getFolderChildren(folder.id)
    const isDropTarget = dragOverTarget === folder.id
    const isDragging = dragItem?.type === 'folder' && dragItem?.id === folder.id

    return (
      <li key={folder.id} className={`folder-item ${isDragging ? 'is-dragging' : ''}`}>
        <div
          className={`folder-row ${isDropTarget ? 'is-drop-target' : ''}`}
          style={{ marginLeft: `${depth * 16}px` }}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStartInternal(e, 'folder', folder.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOverFolder(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropOnFolder(e, folder.id)}
          onClick={() => { if (!isEditing) toggleFolder(folder.id) }}
          onDoubleClick={(e) => { e.stopPropagation(); if (!isEditing) startEdit(folder.id, folder.name) }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setContextMenu({ type: 'folder', id: folder.id, clientX: e.clientX, clientY: e.clientY })
          }}
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
        {isExpanded && (childFolders.length > 0 || childPatches.length > 0) && (
          <ul className="folder-children" onDragOver={(e) => e.stopPropagation()}>
            {childFolders.map((f) => renderFolder(f, depth + 1))}
            {childPatches.map((p) => renderPatchChip(p, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  const totalCount = patches.length

  if (totalCount === 0 && soundFolders.length === 0) {
    return (
      <aside className="sound-bank-panel">
        <header className="sound-bank-header">
          <div className="sound-bank-header-main">
            <h3>Bibliothèque</h3>
            <div className="sound-bank-header-right">
              <button type="button" className="folder-add-btn" onClick={handleCreateFolder} title="Nouveau dossier">
                + Dossier
              </button>
            </div>
          </div>
          {headerExtra && <div className="sound-bank-header-toggle">{headerExtra}</div>}
        </header>
        <p className="sound-bank-empty">
          Aucun patch. Dessinez-en un dans l'onglet Designer.
        </p>
      </aside>
    )
  }

  return (
    <aside className="sound-bank-panel">
      <header className="sound-bank-header">
        <div className="sound-bank-header-main">
          <h3>Bibliothèque</h3>
          <div className="sound-bank-header-right">
            <span className="sound-bank-count">{totalCount}</span>
            <button type="button" className="folder-add-btn" onClick={handleCreateFolder} title="Nouveau dossier">
              + Dossier
            </button>
          </div>
        </div>
        {headerExtra && <div className="sound-bank-header-toggle">{headerExtra}</div>}
      </header>
      <ul
        className="sound-bank-list"
        onDragOver={handleDragOverRoot}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnRoot}
      >
        {rootFolders.map((f) => renderFolder(f, 0))}
        {rootPatches.map((p) => renderPatchChip(p, 0))}
      </ul>
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
