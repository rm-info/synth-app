import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  ListTree, Folder, List, LayoutList, LayoutGrid,
  FolderPlus, Edit3, Copy, Scissors, Clipboard, Trash2, Download, Upload, Undo2, Redo2,
  CheckSquare, Eraser,
} from 'lucide-react'
import { getDescendantFolderIds, countFolderContents } from '../reducer'
import { matchesShortcut } from '../lib/shortcuts'
import { nextAvailableFolderName } from '../lib/folderNames.js'
import BibBreadcrumb from './BibBreadcrumb'
import BibContextMenu from './BibContextMenu'
import ConfirmDialog from './ConfirmDialog'
import PatchThumbnail from './PatchThumbnail'
import './PatchBank.css'

// Retourne la liste ordonnée des items visibles (pour le calcul de range Shift+clic).
// Doit matcher exactement le sort de getFolderChildren pour que Shift+clic soit cohérent.
function getOrderedItemList({ hierarchyMode, currentFolderId, soundFolders, patches, collapsedFolders }) {
  if (hierarchyMode === 'nav') {
    const folders = soundFolders
      .filter(f => f.parentId === currentFolderId)
      .sort((a, b) => a.name.localeCompare(b.name))
    const folderPatches = patches
      .filter(p => p.folderId === currentFolderId)
      .sort((a, b) => a.name.localeCompare(b.name))
    return [
      ...folders.map(f => ({ type: 'folder', id: f.id })),
      ...folderPatches.map(p => ({ type: 'patch', id: p.id })),
    ]
  }
  function dfs(parentId) {
    const result = []
    const subFolders = soundFolders
      .filter(f => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
    for (const folder of subFolders) {
      result.push({ type: 'folder', id: folder.id })
      if (!collapsedFolders.has(folder.id)) {
        result.push(...dfs(folder.id))
      }
    }
    const subPatches = patches
      .filter(p => p.folderId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
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

function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
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
  onExportAll,
  headerExtra,
  bibHierarchyMode,
  bibDisplayMode,
  bibCurrentFolderId,
  bibCollapsedFolders,
  onSetHierarchyMode,
  onSetDisplayMode,
  onSetCurrentFolder,
  onToggleBibFolderCollapsed,
  onNotify,
  bibSelectedIds = [],
  bibSelectionAnchor = null,
  onSelectItems,
  onClearSelection,
  bibClipboard,
  onCopy,
  onCut,
  onClearClipboard,
  onPaste,
  isFullTab = false,
  onDeleteItems,
  onImportLibrary,
  onUndoLibrary,
  onRedoLibrary,
  canUndoLibrary = false,
  canRedoLibrary = false,
  clips,
}) {
  const asideRef = useRef(null)
  const isFocusedRef = useRef(false)

  const loadOnSingleClick = activeTab === 'designer'
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  // Fix 4 : collapsedFolders vient du reducer global (persisté) via bibCollapsedFolders.
  const collapsedFolders = useMemo(() => new Set(bibCollapsedFolders || []), [bibCollapsedFolders])

  const [dragItem, setDragItem] = useState(null) // { type: 'patch'|'folder', id }
  const [dragOverTarget, setDragOverTarget] = useState(null) // folderId or 'root'
  const dragRef = useRef(null)

  const [contextMenu, setContextMenu] = useState(null)
  // contextMenu: null | { type: 'folder'|'patch', id: string, clientX, clientY }

  const [confirmingClearLibrary, setConfirmingClearLibrary] = useState(false)

  const [lasso, setLasso] = useState(null)
  const lassoRef = useRef(null)
  const bodyRef = useRef(null)

  // Fix 1 : input inline pour créer un nouveau dossier (null = fermé, string = en cours de saisie)
  const [creatingFolderName, setCreatingFolderName] = useState(null)

  const cutItemKeys = useMemo(() => {
    if (!bibClipboard || bibClipboard.mode !== 'cut') return new Set()
    return new Set(bibClipboard.items.map(i => `${i.type}:${i.id}`))
  }, [bibClipboard])

  const patchUsageCount = useMemo(() => {
    const map = new Map()
    for (const c of (clips || [])) {
      map.set(c.patchId, (map.get(c.patchId) ?? 0) + 1)
    }
    return map
  }, [clips])

  // Fix 1 : parent pour la création inline de dossier.
  const folderCreateParentId = useMemo(() => {
    if (bibHierarchyMode === 'nav') return bibCurrentFolderId ?? null
    // Tree mode : folder sélectionné si exactement 1, sinon racine
    if (bibSelectedIds.length === 1 && bibSelectedIds[0].type === 'folder') {
      return bibSelectedIds[0].id
    }
    return null
  }, [bibHierarchyMode, bibCurrentFolderId, bibSelectedIds])

  const folderCreateParentName = useMemo(() => {
    if (folderCreateParentId === null) return 'racine'
    // Reconstitue le chemin complet
    const parts = []
    let cur = folderCreateParentId
    while (cur) {
      const folder = soundFolders.find(f => f.id === cur)
      if (!folder) break
      parts.unshift(folder.name)
      cur = folder.parentId
    }
    return parts.length > 0 ? `/${parts.join('/')}` : 'racine'
  }, [folderCreateParentId, soundFolders])

  const confirmCreateFolder = () => {
    const trimmed = creatingFolderName?.trim() ?? ''
    if (!trimmed) {
      setCreatingFolderName(null)
      return
    }
    const siblings = soundFolders.filter(f => f.parentId === folderCreateParentId)
    const dedupedName = nextAvailableFolderName(trimmed, siblings)
    onCreateFolder(dedupedName, folderCreateParentId)
    setCreatingFolderName(null)
  }

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
  const handlePaste = (targetFolderId = undefined) => {
    if (!bibClipboard) return
    let target = targetFolderId
    if (target === undefined) {
      if (bibHierarchyMode === 'nav') {
        target = bibCurrentFolderId ?? null
      } else {
        // Tree mode : utilise la sélection si exactement 1 folder
        if (bibSelectedIds.length === 1 && bibSelectedIds[0].type === 'folder') {
          target = bibSelectedIds[0].id
        } else if (bibSelectedIds.length === 1 && bibSelectedIds[0].type === 'patch') {
          // patch sélectionné → coller dans son parent
          const patch = patches.find(p => p.id === bibSelectedIds[0].id)
          target = patch?.folderId ?? null
        } else {
          target = null  // root
        }
      }
    }
    onPaste?.(target)
  }

  const handleDeleteSelected = () => {
    if (bibSelectedIds.length === 0) return
    if (onDeleteItems) {
      onDeleteItems(bibSelectedIds)
    } else {
      for (const item of bibSelectedIds) {
        if (item.type === 'patch') onDeletePatch(item.id)
        else if (item.type === 'folder') onDeleteFolder(item.id)
      }
    }
    onClearSelection?.()
  }

  const toggleFolder = (folderId) => {
    onToggleBibFolderCollapsed?.(folderId)
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
    setCreatingFolderName('')  // ouvre l'input inline (Fix 1)
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
      // phase-2.f6 : clamp >= 0 pour que le lasso initié depuis la padding du panel
      // (au-dessus ou à gauche du body) commence à la bordure du body, pas en coordonnée
      // négative hors de l'overlay rendu dans le body.
      x: Math.max(0, clientX - rect.left + body.scrollLeft),
      y: Math.max(0, clientY - rect.top + body.scrollTop),
    }
  }

  const handleBodyMouseDown = (e) => {
    if (e.button !== 0) return
    if (e.target.closest('[data-bib-item-id]')) return
    if (e.target.closest('.bib-toolbar')) return
    if (e.target.closest('.bib-action-toolbar')) return
    if (e.target.closest('.bib-breadcrumb')) return
    if (e.target.closest('.sound-bank-header')) return
    // Évite de démarrer un lasso quand on clique dans le menu contextuel (Fix rename).
    if (e.target.closest('.bib-context-menu') || e.target.closest('.bib-context-backdrop')) return
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
    // Bloque la sélection texte du navigateur pendant un drag de lasso.
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
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
    const onUp = (e) => {
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
      // Respecter les modifiers pour étendre la sélection existante
      const mode = (e.ctrlKey || e.metaKey || e.shiftKey) ? 'add' : 'set'
      onSelectItems?.(selected, mode)
      lassoRef.current = null
      setLasso(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      // Restaure la sélection texte.
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }
    // Listeners re-bind si lasso passe null↔non-null. Pas de dépendance sur
    // lasso lui-même pendant un drag (les deltas viennent du ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lasso === null, onClearSelection, onSelectItems])

  // --- Focus tracking ---

  useEffect(() => {
    const el = asideRef.current
    if (!el) return
    const onFocusIn = () => { isFocusedRef.current = true }
    const onFocusOut = (e) => {
      if (!el.contains(e.relatedTarget)) isFocusedRef.current = false
    }
    el.addEventListener('focusin', onFocusIn)
    el.addEventListener('focusout', onFocusOut)
    return () => {
      el.removeEventListener('focusin', onFocusIn)
      el.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  // --- Raccourcis clavier (actifs quand le focus est dans l'aside) ---

  useEffect(() => {
    const onKey = (e) => {
      if (!isFocusedRef.current) return
      // Skip si typing dans un input ou contentEditable
      if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return

      // Helper : preventDefault + stopPropagation pour isoler des listeners globaux
      // (App.jsx écoute aussi Delete/Escape/Arrow pour la timeline).
      const consume = () => { e.preventDefault(); e.stopPropagation() }

      if (matchesShortcut(e, 'library-copy')) {
        consume()
        handleCopy()
      } else if (matchesShortcut(e, 'library-cut')) {
        consume()
        handleCut()
      } else if (matchesShortcut(e, 'library-paste')) {
        consume()
        handlePaste()
      } else if (matchesShortcut(e, 'library-rename') && bibSelectedIds.length === 1) {
        consume()
        const item = bibSelectedIds[0]
        const name = item.type === 'patch'
          ? patches.find(p => p.id === item.id)?.name
          : soundFolders.find(f => f.id === item.id)?.name
        if (name) startEdit(item.id, name)
      } else if (matchesShortcut(e, 'library-delete')) {
        consume()
        handleDeleteSelected()
      } else if (e.key === 'Escape') {
        // B6 (vider clipboard) ∈ SHORTCUTS ; B7 (vider sélection) ergo
        // standard. Mêmes touche, branchement par état du clipboard.
        consume()
        if (bibClipboard) onClearClipboard?.()
        else onClearSelection?.()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        consume()
        const orderedList = getOrderedItemList({
          hierarchyMode: bibHierarchyMode,
          currentFolderId: bibCurrentFolderId,
          soundFolders, patches, collapsedFolders,
        })
        if (orderedList.length === 0) return
        const currentAnchor = bibSelectionAnchor ||
          (bibSelectedIds.length > 0 ? bibSelectedIds[bibSelectedIds.length - 1] : null)
        const currentIdx = currentAnchor
          ? orderedList.findIndex(i => i.id === currentAnchor.id && i.type === currentAnchor.type)
          : -1
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, orderedList.length - 1)
          : Math.max(currentIdx - 1, 0)
        const next = orderedList[nextIdx]
        if (e.shiftKey && currentAnchor) {
          const range = computeRange(currentAnchor, next, orderedList)
          onSelectItems?.(range, 'range')
        } else {
          onSelectItems?.([next], 'set')
        }
      } else if (e.key === 'Enter' && bibSelectedIds.length === 1) {
        consume()
        const item = bibSelectedIds[0]
        if (item.type === 'patch') onLoadPatch?.(item.id)
        else if (item.type === 'folder') {
          if (bibHierarchyMode === 'nav') onSetCurrentFolder?.(item.id)
          else toggleFolder(item.id)
        }
      } else if (matchesShortcut(e, 'library-select-all')) {
        consume()
        const orderedList = getOrderedItemList({
          hierarchyMode: bibHierarchyMode,
          currentFolderId: bibCurrentFolderId,
          soundFolders, patches, collapsedFolders,
        })
        if (orderedList.length > 0) {
          onSelectItems?.(orderedList, 'set')
        }
      }
    }
    // Capture phase pour intercepter avant les listeners globaux d'App.jsx.
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  // handleCopy/Cut/Paste/DeleteSelected sont des fonctions inline recréées à chaque render.
  // Leurs captures réelles (bibSelectedIds, bibClipboard, onCopy, onCut, onPaste,
  // onDeletePatch, onDeleteFolder, onClearSelection, soundFolders, patches) sont toutes listées.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bibSelectedIds, bibSelectionAnchor, bibClipboard, bibCurrentFolderId,
      bibHierarchyMode, soundFolders, patches, collapsedFolders,
      onSelectItems, onClearSelection, onClearClipboard, onLoadPatch, onSetCurrentFolder,
      onCopy, onCut, onPaste, onDeletePatch, onDeleteFolder, onDeleteItems])

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
    const handleClick = (e) => {
      if (isEditing) return
      handleItemClick({ type: 'patch', id: patch.id }, e)
    }
    const handleDoubleClick = () => {
      if (isEditing) return
      // Double-clic = charger le patch (pattern file explorer).
      // Le rename est accessible via F2 ou le menu contextuel.
      onLoadPatch?.(patch.id)
    }
    const titleText = 'Clic pour sélectionner, double-clic pour charger, glisser pour placer'

    // Fix 5 : drop sur un patch → déplace vers le dossier de ce patch.
    // Stoppe la propagation pour éviter le conflit avec le drop-root-zone.
    const handleChipDragOver = (e) => {
      handleDragOverFolder(e, patch.folderId)
    }
    const handleChipDrop = (e) => {
      handleDropOnFolder(e, patch.folderId)
    }

    return (
      <li
        key={patch.id}
        className={`sound-chip ${isCurrent ? 'is-current' : ''} ${isDragging ? 'is-dragging' : ''} ${isDetails ? 'is-details' : ''} ${isSelected ? 'is-selected' : ''} ${isCut ? 'is-cut' : ''}`}
        style={{ '--chip-color': patch.color, marginLeft: `${depth * 16}px` }}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStartInternal(e, 'patch', patch.id)}
        onDragEnd={handleDragEnd}
        onDragOver={handleChipDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleChipDrop}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
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
                <PatchThumbnail
                  points={patch.points}
                  color={patch.color}
                  width={42}
                  height={16}
                />
                <span className="chip-meta-tuning" title="Système d'accordage">
                  {patch.defaultTuningSystem ?? '—'}
                </span>
                <span className="chip-meta-updatedAt" title="Dernière modification">
                  {patch.updatedAt ? formatDate(patch.updatedAt) : '—'}
                </span>
                <span
                  className="chip-meta-usage"
                  title={`Utilisé dans ${patchUsageCount.get(patch.id) ?? 0} clip(s) du Composer`}
                >
                  {patchUsageCount.get(patch.id) ?? 0}×
                </span>
              </>
            )}
            <button
              type="button"
              className="chip-delete"
              onClick={handleDelete}
              onMouseDown={(e) => e.stopPropagation()}
              draggable={false}
              title={`Supprimer ${patch.name}`}
              aria-label={`Supprimer ${patch.name}`}
            ><Trash2 size={12} /></button>
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
    // badge = patches directs uniquement (pas les sous-dossiers)
    const directPatchCount = childPatches.length
    // meta-count = patches dans les descendants uniquement (exclut les patches directs)
    const descendantOnlyPatches = isDetails
      ? countFolderContents(folder.id, soundFolders, patches).patchCount - directPatchCount
      : null
    const isCut = cutItemKeys.has(`folder:${folder.id}`)

    return (
      <li key={folder.id} className={`folder-item ${isDragging ? 'is-dragging' : ''}`}>
        <div
          className={`folder-row ${isDetails ? 'is-details' : ''} ${isNavMode ? 'is-nav' : ''} ${isDropTarget ? 'is-drop-target' : ''} ${isSelected ? 'is-selected' : ''} ${isCut ? 'is-cut' : ''}`}
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
            const itemKey = { type: 'folder', id: folder.id }
            const isInSelection = bibSelectedIds.some(s => s.type === 'folder' && s.id === folder.id)
            if (!isInSelection) {
              onSelectItems?.([itemKey], 'set')
            }
            setContextMenu({ type: 'folder', id: folder.id, clientX: e.clientX, clientY: e.clientY })
          }}
          data-bib-item-id={folder.id}
          data-bib-item-type="folder"
        >
          {/* En tree mode, le chevron est un bouton séparé pour le toggle expand.
              Clic sur le chevron ne propage pas à la row (sélection).
              En nav mode, on entre dans le folder via double-clic → chevron inutile. */}
          {!isNavMode && (
            <span
              className={`folder-chevron ${isExpanded ? 'is-expanded' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id) }}
            >▶</span>
          )}
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
              <span className="folder-badge" title="Patches dans ce dossier">{directPatchCount}</span>
              {isDetails && descendantOnlyPatches !== null && (
                <span className="folder-meta-count" title="Patches dans les sous-dossiers">{descendantOnlyPatches}</span>
              )}
              <button
                type="button"
                className="chip-delete"
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder) }}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                title={`Supprimer ${folder.name}`}
                aria-label={`Supprimer ${folder.name}`}
              ><Trash2 size={12} /></button>
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
    const isEditing = editingId === folder.id
    return (
      <div
        key={folder.id}
        className={`tile is-folder ${isDropTarget ? 'is-drop-target' : ''} ${isDragging ? 'is-dragging' : ''} ${isSelected ? 'is-selected' : ''} ${isCut ? 'is-cut' : ''}`}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStartInternal(e, 'folder', folder.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOverFolder(e, folder.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDropOnFolder(e, folder.id)}
        onClick={(e) => { if (!isEditing) handleItemClick({ type: 'folder', id: folder.id }, e) }}
        onDoubleClick={() => { if (!isEditing) onSetCurrentFolder?.(folder.id) }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const itemKey = { type: 'folder', id: folder.id }
          const isInSelection = bibSelectedIds.some(s => s.type === 'folder' && s.id === folder.id)
          if (!isInSelection) {
            onSelectItems?.([itemKey], 'set')
          }
          setContextMenu({ type: 'folder', id: folder.id, clientX: e.clientX, clientY: e.clientY })
        }}
        data-bib-item-id={folder.id}
        data-bib-item-type="folder"
      >
        <div className="tile-preview folder-preview">📁</div>
        {isEditing ? (
          <input
            autoFocus
            className="tile-rename-input"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(true) }
              else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
            }}
            onBlur={() => commitEdit(true)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            draggable={false}
          />
        ) : (
          <div className="tile-name">{folder.name}</div>
        )}
      </div>
    )
  }

  const renderPatchTile = (patch) => {
    const isCurrent = loadOnSingleClick && currentPatchId === patch.id
    const isDragging = dragItem?.type === 'patch' && dragItem?.id === patch.id
    const isSelected = bibSelectedIds.some(s => s.type === 'patch' && s.id === patch.id)
    const isCut = cutItemKeys.has(`patch:${patch.id}`)
    const isEditing = editingId === patch.id
    return (
      <div
        key={patch.id}
        className={`tile is-patch ${isCurrent ? 'is-current' : ''} ${isDragging ? 'is-dragging' : ''} ${isSelected ? 'is-selected' : ''} ${isCut ? 'is-cut' : ''}`}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStartInternal(e, 'patch', patch.id)}
        onDragEnd={handleDragEnd}
        onClick={(e) => { if (!isEditing) handleItemClick({ type: 'patch', id: patch.id }, e) }}
        onDoubleClick={() => { if (!isEditing) onLoadPatch?.(patch.id) }}
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
        data-bib-item-id={patch.id}
        data-bib-item-type="patch"
      >
        <div className="tile-preview">
          <PatchThumbnail points={patch.points} color={patch.color} />
        </div>
        {isEditing ? (
          <input
            autoFocus
            className="tile-rename-input"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(false) }
              else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
            }}
            onBlur={() => commitEdit(false)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            draggable={false}
          />
        ) : (
          <div className="tile-name">{patch.name}</div>
        )}
      </div>
    )
  }

  // Fix 1 : input inline de création de dossier
  const renderInlineCreateFolder = () => {
    if (creatingFolderName === null) return null
    return (
      <div className="bib-inline-create-folder">
        <span className="bib-inline-create-label">
          Nouveau dossier dans {folderCreateParentName} :
        </span>
        <input
          autoFocus
          type="text"
          value={creatingFolderName}
          onChange={(e) => setCreatingFolderName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              confirmCreateFolder()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setCreatingFolderName(null)
            }
          }}
          onBlur={() => setCreatingFolderName(null)}
          placeholder="Nom du dossier"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
    )
  }

  const renderBody = () => {
    const isTiles = bibDisplayMode === 'tiles'
    // Tiles mode : seulement valide en Nav. Fallback silencieux en Tree.
    if (isNavMode && isTiles) {
      const { folders, patches: navPatches } = getFolderChildren(bibCurrentFolderId ?? null)
      return (
        <>
          {renderInlineCreateFolder()}
          <div
            className="sound-bank-tiles"
            onDragOver={handleDragOverRoot}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnRoot}
            data-anchor="library-item-list"
          >
          {bibCurrentFolderId !== null && (
            <div
              className="tile is-updir"
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
        </>
      )
    }
    if (isNavMode) {
      const { folders, patches: navPatches } = getFolderChildren(bibCurrentFolderId ?? null)
      return (
        <>
          {renderInlineCreateFolder()}
          <ul
            className="sound-bank-list"
            onDragOver={handleDragOverRoot}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnRoot}
            data-anchor="library-item-list"
          >
            {bibCurrentFolderId !== null && (
              <li
                className="bib-updir"
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
        </>
      )
    }
    const { folders: rootFolders, patches: rootPatches } = getFolderChildren(null)
    return (
      <>
        {renderInlineCreateFolder()}
        <ul
          className="sound-bank-list"
          onDragOver={handleDragOverRoot}
          onDragLeave={handleDragLeave}
          onDrop={handleDropOnRoot}
        >
          {rootFolders.map((f) => renderFolder(f, 0))}
          {rootPatches.map((p) => renderPatchChip(p, 0))}
        </ul>
      </>
    )
  }

  const totalCount = patches.length

  // Header partagé entre la branche vide et la branche normale
  const renderHeader = () => (
    <header className="sound-bank-header">
      <div className="sound-bank-header-main">
        <h3>Bibliothèque</h3>
        <div className="sound-bank-header-right">
          {totalCount > 0 && <span className="sound-bank-count" title="Nombre total de patches">{totalCount}</span>}
        </div>
      </div>
      <div className="bib-toolbar">
        <div className="bib-toggle-group" data-anchor="library-hierarchy-mode">
          <button
            type="button"
            className={`bib-toggle-btn ${bibHierarchyMode === 'tree' ? 'is-active' : ''}`}
            onClick={() => {
              onSetHierarchyMode?.('tree')
              // Fix 3 : tiles n'existe pas en tree mode → repasse à list pour éviter
              // un état sans bouton actif dans le groupe display.
              if (bibDisplayMode === 'tiles') onSetDisplayMode?.('list')
            }}
            title="Arborescence"
          ><ListTree size={14} /></button>
          <button
            type="button"
            className={`bib-toggle-btn ${bibHierarchyMode === 'nav' ? 'is-active' : ''}`}
            onClick={() => onSetHierarchyMode?.('nav')}
            title="Navigation (un dossier à la fois)"
          ><Folder size={14} /></button>
        </div>
        <div className="bib-toggle-group" data-anchor="library-display-mode">
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
      </div>
      {isFullTab && (
        <div className="bib-action-toolbar">
          <button
            type="button"
            className="bib-action-btn"
            title="Annuler (Ctrl+Z)"
            disabled={!canUndoLibrary}
            onClick={onUndoLibrary}
            data-anchor="global-undo-button-library"
          ><Undo2 size={14} /></button>
          <button
            type="button"
            className="bib-action-btn"
            title="Rétablir (Ctrl+Shift+Z)"
            disabled={!canRedoLibrary}
            onClick={onRedoLibrary}
            data-anchor="global-redo-button-library"
          ><Redo2 size={14} /></button>
          <div className="bib-action-separator" />
          <button
            type="button"
            className="bib-action-btn"
            title="Nouveau dossier"
            onClick={handleCreateFolder}
            data-anchor="library-new-folder-button"
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
            data-anchor="library-rename-button"
          ><Edit3 size={14} /></button>
          <button
            type="button"
            className="bib-action-btn"
            title="Copier (Ctrl+C)"
            disabled={bibSelectedIds.length === 0}
            onClick={handleCopy}
            data-anchor="library-copy-button"
          ><Copy size={14} /></button>
          <button
            type="button"
            className="bib-action-btn"
            title="Couper (Ctrl+X)"
            disabled={bibSelectedIds.length === 0}
            onClick={handleCut}
            data-anchor="library-cut-button"
          ><Scissors size={14} /></button>
          <button
            type="button"
            className="bib-action-btn"
            title="Coller (Ctrl+V)"
            disabled={!bibClipboard || bibClipboard.items.length === 0}
            onClick={handlePaste}
            data-anchor="library-paste-button"
          ><Clipboard size={14} /></button>
          <button
            type="button"
            className="bib-action-btn"
            title="Sélectionner tout (Ctrl+A)"
            onClick={() => {
              const orderedList = getOrderedItemList({
                hierarchyMode: bibHierarchyMode,
                currentFolderId: bibCurrentFolderId,
                soundFolders, patches, collapsedFolders,
              })
              if (orderedList.length > 0) onSelectItems?.(orderedList, 'set')
            }}
            data-anchor="library-select-all-button"
          ><CheckSquare size={14} /></button>
          <button
            type="button"
            className="bib-action-btn delete"
            title="Supprimer (Suppr)"
            disabled={bibSelectedIds.length === 0}
            onClick={handleDeleteSelected}
            data-anchor="library-delete-button"
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
            title="Exporter (dossier courant si rien sélectionné)"
            disabled={bibSelectedIds.length > 1}
            onClick={() => {
              if (bibSelectedIds.length === 1) {
                const item = bibSelectedIds[0]
                if (item.type === 'patch') onExportPatch?.(item.id)
                else onExportFolder?.(item.id)
              } else if (bibSelectedIds.length === 0) {
                // Fallback : dossier courant en nav, sinon all
                if (bibHierarchyMode === 'nav' && bibCurrentFolderId) {
                  onExportFolder?.(bibCurrentFolderId)
                } else {
                  onExportAll?.()
                }
              }
            }}
          ><Download size={14} /></button>
          <div className="bib-action-separator" />
          <button
            type="button"
            className="bib-action-btn delete"
            title="Vider la bibliothèque"
            onClick={() => setConfirmingClearLibrary(true)}
          ><Eraser size={14} /></button>
          {/* iter-L phase-1.4.c : chip clipboard. Visible quand le
              presse-papier bibliothèque n'est pas vide. × vide le clipboard
              (équivalent comportemental d'Esc tant que clipboard non vide). */}
          {bibClipboard?.items?.length > 0 && (
            <span
              className="bib-clipboard-chip"
              role="status"
              title={`${bibClipboard.items.length} élément${bibClipboard.items.length > 1 ? 's' : ''} dans le presse-papier (Esc pour vider)`}
              data-anchor="library-clipboard-chip"
            >
              <span className="bib-clipboard-chip-icon" aria-hidden="true">📋</span>
              <span className="bib-clipboard-chip-count">
                {bibClipboard.items.length} élément{bibClipboard.items.length > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="bib-clipboard-chip-clear"
                onClick={() => onClearClipboard?.()}
                title="Vider le presse-papier"
                aria-label="Vider le presse-papier"
              >×</button>
            </span>
          )}
        </div>
      )}
      {headerExtra && <div className="sound-bank-header-toggle">{headerExtra}</div>}
    </header>
  )

  const renderBreadcrumb = () => bibHierarchyMode === 'nav' ? (
    <BibBreadcrumb
      currentFolderId={bibCurrentFolderId ?? null}
      soundFolders={soundFolders}
      onNavigate={(folderId) => onSetCurrentFolder?.(folderId)}
      onNotify={onNotify}
    />
  ) : null

  if (totalCount === 0 && soundFolders.length === 0) {
    return (
      <aside ref={asideRef} tabIndex={-1} className="sound-bank-panel" onMouseDown={handleBodyMouseDown}>
        {renderHeader()}
        {renderBreadcrumb()}
        {renderInlineCreateFolder()}
        <p className="sound-bank-empty">
          Aucun patch. Dessinez-en un dans l&apos;onglet Designer.
        </p>
        <ConfirmDialog
          open={confirmingClearLibrary}
          title="Vider la bibliothèque ?"
          message="Tous les patches et dossiers seront supprimés. Les patches utilisés dans le Composer seront conservés. Cette action peut être annulée via Ctrl+Z."
          confirmLabel="Vider"
          cancelLabel="Annuler"
          variant="danger"
          onConfirm={() => {
            const allTopLevelItems = [
              ...soundFolders.filter(f => f.parentId === null).map(f => ({ type: 'folder', id: f.id })),
              ...patches.filter(p => p.folderId === null).map(p => ({ type: 'patch', id: p.id })),
            ]
            onDeleteItems?.(allTopLevelItems)
            setConfirmingClearLibrary(false)
          }}
          onCancel={() => setConfirmingClearLibrary(false)}
        />
      </aside>
    )
  }

  return (
    <aside ref={asideRef} tabIndex={-1} className="sound-bank-panel" onMouseDown={handleBodyMouseDown}>
      {renderHeader()}
      {renderBreadcrumb()}
      <div
        ref={bodyRef}
        className="sound-bank-body"
        onContextMenu={(e) => {
          if (e.target.closest('[data-bib-item-id]')) return  // gère l'item lui-même
          e.preventDefault()
          onClearSelection?.()
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
        onSelectAll={() => {
          const orderedList = getOrderedItemList({
            hierarchyMode: bibHierarchyMode,
            currentFolderId: bibCurrentFolderId,
            soundFolders, patches, collapsedFolders,
          })
          if (orderedList.length > 0) onSelectItems?.(orderedList, 'set')
        }}
        clipboardHasItems={!!bibClipboard && bibClipboard.items.length > 0}
        folderHasAnyPatch={(id) => {
          const desc = getDescendantFolderIds(id, soundFolders)
          const ids = new Set([id, ...desc])
          return patches.some(p => ids.has(p.folderId))
        }}
        selectionSize={bibSelectedIds.length}
      />
      <ConfirmDialog
        open={confirmingClearLibrary}
        title="Vider la bibliothèque ?"
        message="Tous les patches et dossiers seront supprimés. Les patches utilisés dans le Composer seront conservés. Cette action peut être annulée via Ctrl+Z."
        confirmLabel="Vider"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={() => {
          const allTopLevelItems = [
            ...soundFolders.filter(f => f.parentId === null).map(f => ({ type: 'folder', id: f.id })),
            ...patches.filter(p => p.folderId === null).map(p => ({ type: 'patch', id: p.id })),
          ]
          onDeleteItems?.(allTopLevelItems)
          setConfirmingClearLibrary(false)
        }}
        onCancel={() => setConfirmingClearLibrary(false)}
      />
    </aside>
  )
}

export default PatchBank
