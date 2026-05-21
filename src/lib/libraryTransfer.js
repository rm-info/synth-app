// src/lib/libraryTransfer.js
//
// Transformations état ↔ payload .osa.
// - buildExportPayload : extrait un sous-ensemble du state selon un scope.
// - applyImport (Task 6) : applique un payload .osa au state avec remap IDs.
//
// Pures, sans React, sans DOM. Testables isolément.

import { OSA_VERSION } from './osaFormat.js'
import { nextAvailableFolderName } from './folderNames.js'

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

// Applique un payload .osa au state.
// Renvoie les nouveaux patches/folders à concaténer + les compteurs après.
// Ne mute rien.
//
// mode = 'subset' : un wrapper folder est créé, contenu importé dedans.
// mode = 'root'   : les racines du payload deviennent racines de la biblio.
//
// IDs régénérés systématiquement → aucun risque de collision avec les
// clips de la timeline qui référencent des patchIds existants.
// `patches` n'est pas utilisé ici (les IDs sont régénérés, donc pas de dédup
// nécessaire côté patches), mais reste dans la signature pour documenter la
// forme du state attendu côté caller.
// eslint-disable-next-line no-unused-vars
export function applyImport(payload, mode, wrapperName, { patches, soundFolders, folderCounter, patchCounter }) {
  const folderIdMap = new Map()
  const patchIdMap = new Map()

  let folderCounterAfter = folderCounter
  let patchCounterAfter = patchCounter

  // 1. Allouer les nouveaux IDs (mais pas encore les noms dédupés ; on dédupe
  //    après-coup pour avoir le contexte final).
  for (const f of payload.soundFolders) {
    const newId = `folder-${++folderCounterAfter}`
    folderIdMap.set(f.id, newId)
  }
  for (const p of payload.patches) {
    const newId = `patch-${++patchCounterAfter}`
    patchIdMap.set(p.id, newId)
  }

  // 2. Construire les nouveaux folders avec parentId remappé.
  let newFolders = payload.soundFolders.map((f) => ({
    id: folderIdMap.get(f.id),
    name: f.name,
    parentId: f.parentId === null ? null : folderIdMap.get(f.parentId),
  }))

  // 3. Construire les nouveaux patches avec folderId remappé.
  const newPatches = payload.patches.map((p) => ({
    ...p,
    id: patchIdMap.get(p.id),
    folderId: p.folderId === null ? null : folderIdMap.get(p.folderId),
  }))

  // 4. Mode subset : créer un wrapper folder, reparenter les racines dessus.
  if (mode === 'subset') {
    const allFoldersForDedup = [...soundFolders, ...newFolders]
    const dedupedWrapperName = nextAvailableFolderName(wrapperName, allFoldersForDedup)
    const wrapperId = `folder-${++folderCounterAfter}`
    const wrapper = { id: wrapperId, name: dedupedWrapperName, parentId: null }
    newFolders = newFolders.map((f) =>
      f.parentId === null ? { ...f, parentId: wrapperId } : f
    )
    newFolders.unshift(wrapper)
    for (const p of newPatches) {
      if (p.folderId === null) p.folderId = wrapperId
    }
  }

  // 5. Dédupliquer les noms des autres folders importés (un par un, en
  //    progressant avec le contexte qui s'enrichit à chaque étape).
  const existingNames = new Set([
    ...soundFolders.map((f) => f.name),
    ...(mode === 'subset' ? [newFolders[0].name] : []),
  ])
  const startIdx = mode === 'subset' ? 1 : 0
  for (let i = startIdx; i < newFolders.length; i++) {
    const f = newFolders[i]
    if (existingNames.has(f.name)) {
      f.name = nextAvailableFolderName(f.name, [...soundFolders, ...newFolders.slice(0, i)])
    }
    existingNames.add(f.name)
  }

  return { newPatches, newFolders, patchCounterAfter, folderCounterAfter }
}
