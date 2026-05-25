import { nextAvailableFolderName } from './folderNames.js'

// Local helper : tous les folders descendants de rootId (inclus rootId).
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

// Détecte un cycle : true si targetFolderId est l'item lui-même ou dans son sous-arbre.
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

  // Récursif : clone un folder dans newParentId, descend dans son sous-arbre.
  function cloneFolder(folderOldId, newParentId) {
    const original = soundFolders.find(f => f.id === folderOldId)
    if (!original) return
    const newId = `folder-${++fCounter}`
    const allExisting = [...soundFolders, ...newFolders]
    const dedupedName = nextAvailableFolderName(original.name, allExisting)
    newFolders.push({
      id: newId,
      name: dedupedName,
      parentId: newParentId,
    })
    // Récursion sub-folders
    for (const child of soundFolders.filter(f => f.parentId === folderOldId)) {
      cloneFolder(child.id, newId)
    }
    // Patches dans ce folder : dupliqués avec nouveau ID et nom dédupliqué
    for (const patch of patches.filter(p => p.folderId === folderOldId)) {
      const newPatchId = `patch-${++pCounter}`
      const allExistingPatchNames = [...patches, ...newPatches]
      const dedupedPatchName = nextAvailableFolderName(patch.name, allExistingPatchNames)
      newPatches.push({
        ...patch,
        id: newPatchId,
        name: dedupedPatchName,
        folderId: newId,
      })
    }
  }

  for (const item of items) {
    if (item.type === 'folder') {
      cloneFolder(item.id, targetFolderId)
    } else if (item.type === 'patch') {
      const original = patches.find(p => p.id === item.id)
      if (!original) continue
      const newPatchId = `patch-${++pCounter}`
      const allExistingPatchNames = [...patches, ...newPatches]
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
