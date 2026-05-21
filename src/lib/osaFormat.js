// src/lib/osaFormat.js
//
// Format binaire portable pour les exports de bibliothèque .osa
// Structure : [4 octets magic "OSA1"] [N octets gzip(JSON)]
// Décision archi (spec §7.1) : zéro dépendance, CompressionStream natif.

export const OSA_MAGIC = new Uint8Array([0x4F, 0x53, 0x41, 0x31]) // "OSA1"
export const OSA_VERSION = 1

export async function encodeOsa(payload) {
  const json = JSON.stringify(payload)
  const jsonBlob = new Blob([json], { type: 'application/json' })
  const compressedStream = jsonBlob.stream().pipeThrough(new CompressionStream('gzip'))
  const compressedBuffer = await new Response(compressedStream).arrayBuffer()
  return new Blob([OSA_MAGIC, compressedBuffer], { type: 'application/octet-stream' })
}

export class OsaMagicError extends Error {
  constructor() { super('Magic header invalide (.osa attendu)'); this.name = 'OsaMagicError' }
}
export class OsaCorruptError extends Error {
  constructor() { super('Décompression échouée'); this.name = 'OsaCorruptError' }
}
export class OsaParseError extends Error {
  constructor() { super('JSON malformé'); this.name = 'OsaParseError' }
}

// Lit un ArrayBuffer .osa → renvoie le payload JSON parsé (non validé schéma).
// Throws OsaMagicError | OsaCorruptError | OsaParseError selon l'étape qui échoue.
export async function decodeOsa(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  if (bytes.length < 4) throw new OsaMagicError()
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== OSA_MAGIC[i]) throw new OsaMagicError()
  }
  const compressedSlice = bytes.subarray(4)
  let jsonText
  try {
    const stream = new Blob([compressedSlice]).stream().pipeThrough(new DecompressionStream('gzip'))
    jsonText = await new Response(stream).text()
  } catch {
    throw new OsaCorruptError()
  }
  try {
    return JSON.parse(jsonText)
  } catch {
    throw new OsaParseError()
  }
}
