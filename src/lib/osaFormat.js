// src/lib/osaFormat.js
//
// Format binaire portable pour les exports de bibliothèque .osa
// Structure : [4 octets magic "OSA1"] [N octets gzip(JSON)]
// Décision archi (spec §7.1) : zéro dépendance, CompressionStream natif.

import { TUNING_SYSTEMS } from './tuningSystems.js'

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

export class OsaSchemaError extends Error {
  constructor(field) {
    super(field)
    this.name = 'OsaSchemaError'
    this.field = field
  }
}

const PRESETS = new Set(['sine', 'square', 'sawtooth', 'triangle', null])
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/

function assert(cond, field) { if (!cond) throw new OsaSchemaError(field) }
function isNumberInRange(v, min, max) {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
}

export function validatePayload(obj) {
  assert(obj && typeof obj === 'object', 'racine du fichier non-objet')
  assert(obj.version === OSA_VERSION, `version non supportée (attendu ${OSA_VERSION})`)
  assert(Array.isArray(obj.patches), 'patches absent ou non-tableau')
  assert(Array.isArray(obj.soundFolders), 'soundFolders absent ou non-tableau')

  const folderIds = new Set()
  for (const f of obj.soundFolders) {
    assert(f && typeof f === 'object', 'folder non-objet')
    assert(typeof f.id === 'string' && f.id.length > 0, 'folder.id invalide')
    assert(typeof f.name === 'string' && f.name.length > 0, `folder ${f.id}: name invalide`)
    assert(f.parentId === null || typeof f.parentId === 'string', `folder ${f.id}: parentId invalide`)
    assert(!folderIds.has(f.id), `folder.id dupliqué: ${f.id}`)
    folderIds.add(f.id)
  }
  for (const f of obj.soundFolders) {
    assert(f.parentId === null || folderIds.has(f.parentId),
      `folder ${f.id}: parentId orphelin ${f.parentId}`)
  }

  // Anti-cycle (Tarjan-light : remontée vers null, max N steps)
  const folderById = new Map(obj.soundFolders.map((f) => [f.id, f]))
  for (const f of obj.soundFolders) {
    let cur = f, steps = 0
    while (cur.parentId !== null) {
      cur = folderById.get(cur.parentId)
      assert(++steps <= obj.soundFolders.length, `cycle détecté impliquant folder ${f.id}`)
    }
  }

  const validSystems = new Set(Object.keys(TUNING_SYSTEMS))
  for (const p of obj.patches) {
    assert(p && typeof p === 'object', 'patch non-objet')
    assert(typeof p.id === 'string' && p.id.length > 0, 'patch.id invalide')
    assert(typeof p.name === 'string', `patch ${p.id}: name invalide`)
    assert(typeof p.color === 'string' && COLOR_RE.test(p.color), `patch ${p.id}: color invalide`)
    assert(Array.isArray(p.points) && p.points.length === 600, `patch ${p.id}: points doit être un tableau de 600`)
    for (let i = 0; i < 600; i++) {
      assert(isNumberInRange(p.points[i], -1, 1), `patch ${p.id}: point ${i} hors [-1,1]`)
    }
    assert(isNumberInRange(p.amplitude, 0, 1), `patch ${p.id}: amplitude hors [0,1]`)
    assert(isNumberInRange(p.attack, 0, 1000), `patch ${p.id}: attack hors [0,1000]`)
    assert(isNumberInRange(p.hold, 0, 1000), `patch ${p.id}: hold hors [0,1000]`)
    assert(isNumberInRange(p.decay, 0, 1000), `patch ${p.id}: decay hors [0,1000]`)
    assert(isNumberInRange(p.sustain, 0, 1), `patch ${p.id}: sustain hors [0,1]`)
    assert(isNumberInRange(p.release, 0, 1000), `patch ${p.id}: release hors [0,1000]`)
    assert(PRESETS.has(p.preset), `patch ${p.id}: preset invalide`)
    assert(p.folderId === null || folderIds.has(p.folderId),
      `patch ${p.id}: folderId orphelin ${p.folderId}`)
    assert(validSystems.has(p.defaultTuningSystem),
      `patch ${p.id}: defaultTuningSystem '${p.defaultTuningSystem}' inconnu`)
  }

  return obj
}

// Lit un ArrayBuffer .osa → renvoie le payload JSON parsé et validé.
// Throws OsaMagicError | OsaCorruptError | OsaParseError | OsaSchemaError selon l'étape qui échoue.
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
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new OsaParseError()
  }
  return validatePayload(parsed)
}
