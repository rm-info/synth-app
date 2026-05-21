// src/lib/folderNames.js
//
// Utilitaires partagés pour la résolution de noms de dossiers.
// Convention : si "Basses" existe, le prochain devient "Basses (2)" puis
// "Basses (3)", etc. Utilisé à la création manuelle (PatchBank) et à
// l'import (libraryTransfer).

export function nextAvailableFolderName(base, existingFolders) {
  const taken = new Set(existingFolders.map((f) => f.name))
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base} (${i})`)) i++
  return `${base} (${i})`
}
