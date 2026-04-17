import { useState, useCallback, useRef } from 'react'
import { getDescendantFolderIds } from '../reducer'
import './SoundBank.css'

function nextAvailableFolderName(base, existingFolders) {
  const taken = new Set(existingFolders.map((f) => f.name))
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base} (${i})`)) i++
  return `${base} (${i})`
}

function SoundBank({
  savedSounds,
  soundFolders,
  currentSoundId,
  activeTab,
  onLoadSound,
  onRenameSound,
  onDeleteSound,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveSoundToFolder,
  onMoveFolder,
}) {
  const loadOnSingleClick = activeTab === 'designer'
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  // All folders expanded by default; track which are collapsed
  const [collapsedFolders, setCollapsedFolders] = useState(new Set())

  // Drag state
  const [dragItem, setDragItem] = useState(null) // { type: 'sound'|'folder', id }
  const [dragOverTarget, setDragOverTarget] = useState(null) // folderId or 'root'
  const dragRef = useRef(null)

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
      else onRenameSound(editingId, trimmed)
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
    e.dataTransfer.effectAllowed = type === 'sound' ? 'copyMove' : 'move'
    e.dataTransfer.setData('application/x-soundbank-drag', JSON.stringify({ type, id }))
    if (type === 'sound') {
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
    if (data.type === 'sound') {
      onMoveSoundToFolder(data.id, folderId)
    } else if (data.type === 'folder') {
      onMoveFolder(data.id, folderId)
    }
    setDragItem(null)
    setDragOverTarget(null)
    dragRef.current = null
  }, [onMoveSoundToFolder, onMoveFolder])

  const handleDropOnRoot = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const data = dragRef.current
    if (!data) return
    if (data.type === 'sound') {
      onMoveSoundToFolder(data.id, null)
    } else if (data.type === 'folder') {
      onMoveFolder(data.id, null)
    }
    setDragItem(null)
    setDragOverTarget(null)
    dragRef.current = null
  }, [onMoveSoundToFolder, onMoveFolder])

  const handleDragEnd = useCallback(() => {
    setDragItem(null)
    setDragOverTarget(null)
    dragRef.current = null
  }, [])

  // --- Build tree ---

  const rootFolders = soundFolders
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.name.localeCompare(b.name))
  const rootSounds = savedSounds
    .filter((s) => !s.folderId)
    .sort((a, b) => a.name.localeCompare(b.name))

  const getFolderChildren = (parentId) => {
    const folders = soundFolders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
    const sounds = savedSounds
      .filter((s) => s.folderId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
    return { folders, sounds }
  }

  const renderSoundChip = (sound, depth) => {
    const isEditing = editingId === sound.id
    const isCurrent = loadOnSingleClick && currentSoundId === sound.id
    const isDragging = dragItem?.type === 'sound' && dragItem?.id === sound.id

    const handleDelete = (e) => {
      e.stopPropagation()
      onDeleteSound(sound.id)
    }
    const handleLoad = () => {
      if (isEditing) return
      onLoadSound?.(sound.id)
    }
    const handleSingleClick = () => {
      if (isEditing) return
      if (loadOnSingleClick) handleLoad()
    }
    const handleDoubleClick = () => {
      if (isEditing) return
      startEdit(sound.id, sound.name)
    }
    const titleText = loadOnSingleClick
      ? 'Clic pour éditer, double-clic pour renommer'
      : 'Double-clic pour renommer, glisser pour placer sur la timeline'

    const handleChipDragOver = depth > 0
      ? (e) => { e.stopPropagation() }
      : undefined

    return (
      <li
        key={sound.id}
        className={`sound-chip ${isCurrent ? 'is-current' : ''} ${isDragging ? 'is-dragging' : ''}`}
        style={{ '--chip-color': sound.color, marginLeft: `${depth * 16}px` }}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStartInternal(e, 'sound', sound.id)}
        onDragEnd={handleDragEnd}
        onDragOver={handleChipDragOver}
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
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
            <span className="chip-name">{sound.name}</span>
            <span className="chip-info">{sound.frequency.toFixed(0)} Hz</span>
            {!loadOnSingleClick && (
              <button
                type="button"
                className="chip-rename"
                onClick={(e) => { e.stopPropagation(); handleLoad() }}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                title="Éditer le son"
                aria-label={`Éditer ${sound.name}`}
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
              title={`Supprimer ${sound.name}`}
              aria-label={`Supprimer ${sound.name}`}
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
    const { folders: childFolders, sounds: childSounds } = getFolderChildren(folder.id)
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
              <span className="folder-badge">{childSounds.length + childFolders.length}</span>
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
        {isExpanded && (childFolders.length > 0 || childSounds.length > 0) && (
          <ul className="folder-children" onDragOver={(e) => e.stopPropagation()}>
            {childFolders.map((f) => renderFolder(f, depth + 1))}
            {childSounds.map((s) => renderSoundChip(s, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  const totalCount = savedSounds.length

  if (totalCount === 0 && soundFolders.length === 0) {
    return (
      <aside className="sound-bank-panel">
        <header className="sound-bank-header">
          <h3>Banque</h3>
          <button type="button" className="folder-add-btn" onClick={handleCreateFolder} title="Nouveau dossier">
            + Dossier
          </button>
        </header>
        <p className="sound-bank-empty">
          Aucun son. Dessinez-en un dans l'onglet Designer.
        </p>
      </aside>
    )
  }

  return (
    <aside className="sound-bank-panel">
      <header className="sound-bank-header">
        <h3>Banque</h3>
        <div className="sound-bank-header-right">
          <span className="sound-bank-count">{totalCount}</span>
          <button type="button" className="folder-add-btn" onClick={handleCreateFolder} title="Nouveau dossier">
            + Dossier
          </button>
        </div>
      </header>
      <ul
        className="sound-bank-list"
        onDragOver={handleDragOverRoot}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnRoot}
      >
        {rootFolders.map((f) => renderFolder(f, 0))}
        {rootSounds.map((s) => renderSoundChip(s, 0))}
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
    </aside>
  )
}

export default SoundBank
