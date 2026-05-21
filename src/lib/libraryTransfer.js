// src/lib/libraryTransfer.js
//
// Transformations état ↔ payload .osa.
// - buildExportPayload : extrait un sous-ensemble du state selon un scope.
// - applyImport (Task 6) : applique un payload .osa au state avec remap IDs.
//
// Pures, sans React, sans DOM. Testables isolément.

import { OSA_VERSION } from './osaFormat.js'

export class EmptyExportError extends Error {
  constructor() { super('Rien à exporter'); this.name = 'EmptyExportError' }
}

function getDescendantFolderIds(rootId, soundFolders) {
  const ids = new Set([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const f of soundFolders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id)
        changed = true
      }
    }
  }
  return ids
}

export function buildExportPayload({ patches, soundFolders, scope }) {
  const exportedAt = new Date().toISOString()
  let exportedPatches, exportedFolders

  if (scope.type === 'all') {
    exportedPatches = patches.slice()
    exportedFolders = soundFolders.slice()
  } else if (scope.type === 'folder') {
    const folderIds = getDescendantFolderIds(scope.id, soundFolders)
    exportedFolders = soundFolders
      .filter((f) => folderIds.has(f.id))
      .map((f) => f.id === scope.id ? { ...f, parentId: null } : f)
    exportedPatches = patches.filter((p) => folderIds.has(p.folderId))
  } else if (scope.type === 'patch') {
    const patch = patches.find((p) => p.id === scope.id)
    if (!patch) throw new EmptyExportError()
    exportedPatches = [{ ...patch, folderId: null }]
    exportedFolders = []
  } else {
    throw new Error(`Scope inconnu: ${scope.type}`)
  }

  if (exportedPatches.length === 0) throw new EmptyExportError()

  return {
    version: OSA_VERSION,
    exportedAt,
    patches: exportedPatches,
    soundFolders: exportedFolders,
  }
}
