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
