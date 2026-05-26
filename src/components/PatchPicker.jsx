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
  bibCollapsedFolders,
  activeTab,
  onLoadPatch,
  onOpenInLibrary,
  onDragStart,
  onToggleBibFolderCollapsed,
  headerExtra,
}) {
  // bibCollapsedFolders : array persisté depuis le reducer global (fix 4).
  // Fallback sur un Set local pour la rétrocompatiblité (PatchPicker utilisé
  // sans la prop — ex. tests ou embeddings futurs).
  const [localCollapsed, setLocalCollapsed] = useState(new Set())
  const collapsedFolders = useMemo(
    () => bibCollapsedFolders ? new Set(bibCollapsedFolders) : localCollapsed,
    [bibCollapsedFolders, localCollapsed]
  )
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
    if (onToggleBibFolderCollapsed) {
      onToggleBibFolderCollapsed(folderId)
    } else {
      // Fallback local (pas de prop reducer disponible)
      setLocalCollapsed((prev) => {
        const next = new Set(prev)
        if (next.has(folderId)) next.delete(folderId)
        else next.add(folderId)
        return next
      })
    }
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
      <div className="patch-picker-header">
        <div className="designer-actions-header">Bibliothèque</div>
        <span className="patch-picker-count">{patches.length}</span>
        {headerExtra && <div className="patch-picker-header-toggle">{headerExtra}</div>}
      </div>
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
