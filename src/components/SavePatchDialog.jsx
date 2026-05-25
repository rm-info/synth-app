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
  patchData,
  onConfirm,
  onCancel,
  onCreateFolder,
}) {
  const initialFolderId = currentPatch?.folderId ?? bibCurrentFolderId ?? null

  const [name, setName] = useState('')
  const [folderId, setFolderId] = useState(initialFolderId)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [openedFolders, setOpenedFolders] = useState(() => {
    const set = new Set()
    const path = buildPathToRoot(initialFolderId, soundFolders)
    for (const node of path) set.add(node.id)
    return set
  })
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Reset à chaque ouverture
  useEffect(() => {
    if (!open) return
    const baseName = currentPatch
      ? nextAvailableFolderName(currentPatch.name, patches.map(p => ({ name: p.name })))
      : nextAvailableFolderName('Nouveau patch', patches.map(p => ({ name: p.name })))
    setName(baseName)
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
    setCreatingFolder(false)
    setNewFolderName('')
    setOpenedFolders((prev) => new Set([...prev, folderId].filter(v => v !== null)))
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
