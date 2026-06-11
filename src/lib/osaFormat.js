// src/lib/osaFormat.js
//
// Format binaire portable pour les exports de bibliothèque .osa
// Structure : [4 octets magic "OSA2"] [N octets gzip(JSON) corrompu]
// Décision archi (spec §7.1) : zéro dépendance, CompressionStream natif.

import { TUNING_SYSTEMS } from './tuningSystems'

export const OSA_MAGIC = new Uint8Array([0x4F, 0x53, 0x41, 0x32]) // "OSA2"
// v3 (itération P) : ajoute vibrato/tremolo (LFO par patch). Le modèle canonique
// est inchangé depuis v2 — v3 = v2 + deux objets Lfo optionnels par patch.
// v4 (itération T) : ajoute autoPan (3ᵉ Lfo, auto-pan stéréo). SEUL bump de
// l'itération T : les phases T.3→T.6 ajouteront leurs champs DANS v4 avec la même
// règle « champ absent → défaut injecté à l'hydratation ».
export const OSA_VERSION = 4

// 4 octets injectés à l'intérieur du flux gzip à GARBAGE_OFFSET (= juste
// après le header gzip standard de 10 octets). Casse les archiveurs
// permissifs qui scannent le signature gzip (7-zip et al.) : la
// décompression échoue dès le premier bloc DEFLATE. Décision archi :
// dissuasion casual uniquement, pas de sécurité réelle (un lecteur de
// code source trouvera l'offset en 2 minutes).
const GARBAGE_OFFSET = 10
const GARBAGE_BYTES = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])

export async function encodeOsa(payload) {
  const json = JSON.stringify(payload)
  const jsonBlob = new Blob([json], { type: 'application/json' })
  const compressedStream = jsonBlob.stream().pipeThrough(new CompressionStream('gzip'))
  const compressedBuffer = await new Response(compressedStream).arrayBuffer()
  const compressed = new Uint8Array(compressedBuffer)
  // Injection mid-stream : [10 octets header gzip][4 garbage][reste flux deflate]
  const corrupted = new Uint8Array(compressed.length + 4)
  corrupted.set(compressed.subarray(0, GARBAGE_OFFSET), 0)
  corrupted.set(GARBAGE_BYTES, GARBAGE_OFFSET)
  corrupted.set(compressed.subarray(GARBAGE_OFFSET), GARBAGE_OFFSET + 4)
  return new Blob([OSA_MAGIC, corrupted], { type: 'application/octet-stream' })
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

// itération P : un Lfo bien formé (v3). Tolérant à l'absence (champ manquant →
// défauts injectés à l'hydratation via migrateLegacyPatch) ; strict si présent
// (cohérent avec le reste de validatePayload). Bornes en dur : rate [0.1,20] Hz,
// onset [0,2000] ms, depth [0, depthMax] (200 cents vibrato / 1 trémolo).
function isLfoValidOrAbsent(v, depthMax) {
  if (v === undefined || v === null) return true
  if (typeof v !== 'object') return false
  if (typeof v.enabled !== 'boolean') return false
  if (!isNumberInRange(v.rate, 0.1, 20)) return false
  if (!isNumberInRange(v.depth, 0, depthMax)) return false
  if (!isNumberInRange(v.onset, 0, 2000)) return false
  if (v.shape !== 'sine' && v.shape !== 'triangle' && v.shape !== 'square') return false
  return true
}

// itération T (T.3/T.5, v4 inchangé) : ParamEnv (pitchEnv | filterEnv). Même contrat
// que les Lfo (tolérant à l'absence, strict si présent) mais champs distincts : amount
// cents SIGNÉ [-amountMax, amountMax] (2400 pitch / 4800 filtre), time ms [0, 2000].
function isParamEnvValidOrAbsent(v, amountMax) {
  if (v === undefined || v === null) return true
  if (typeof v !== 'object') return false
  if (typeof v.enabled !== 'boolean') return false
  if (!isNumberInRange(v.amount, -amountMax, amountMax)) return false
  if (!isNumberInRange(v.time, 0, 2000)) return false
  // T.3bis : `invert` optionnel (absent = patch T.3 → false à l'hydratation).
  if (v.invert !== undefined && typeof v.invert !== 'boolean') return false
  // T.3ter : `curve` optionnel (absent = patch antérieur → 'linear' à l'hydratation).
  if (v.curve !== undefined && v.curve !== 'linear' && v.curve !== 'easeOut'
    && v.curve !== 'expo' && v.curve !== 'easeIn') return false
  return true
}

// itération T (T.4, v4 inchangé) : filtre statique. Même contrat que les Lfo
// (tolérant à l'absence, strict si présent) : enum type + cutoff Hz [20, 20000] +
// q linéaire [0.1, 20].
function isFilterValidOrAbsent(v) {
  if (v === undefined || v === null) return true
  if (typeof v !== 'object') return false
  if (typeof v.enabled !== 'boolean') return false
  if (v.type !== 'lowpass' && v.type !== 'highpass' && v.type !== 'bandpass' && v.type !== 'notch') return false
  if (!isNumberInRange(v.cutoff, 20, 20000)) return false
  if (!isNumberInRange(v.q, 0.1, 20)) return false
  return true
}

// itération T (T.6, v4 inchangé) : distorsion par voix. Même contrat (tolérant à
// l'absence, strict si présent) : enum curve + drive [1, 50] + mix [0, 1].
function isDistortionValidOrAbsent(v) {
  if (v === undefined || v === null) return true
  if (typeof v !== 'object') return false
  if (typeof v.enabled !== 'boolean') return false
  if (v.curve !== 'soft' && v.curve !== 'hard' && v.curve !== 'fold') return false
  if (!isNumberInRange(v.drive, 1, 50)) return false
  if (!isNumberInRange(v.mix, 0, 1)) return false
  return true
}

export function validatePayload(obj) {
  assert(obj && typeof obj === 'object', 'racine du fichier non-objet')
  assert(obj.version === 1 || obj.version === 2 || obj.version === 3 || obj.version === 4,
    'version non supportée (attendu 1, 2, 3 ou 4)')
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
    if (obj.version >= 2) {
      // v2 (M rattrapage) : modèle canonique unifié. v3 (itération P) : idem +
      // vibrato/tremolo par patch. v4 (itération T) : idem + autoPan. Les LFO
      // sont validés plus bas, tolérants à l'absence.
      // M.r.5.bis — borne défensive [-10, 10] (résidu [-12, 12]) au lieu de ±1.
      // Le pic théorique est Σ amplitudes_k (4-5 pour des patches normaux) ; 10
      // absorbe les cas extrêmes (résidu accumulé, harmoniques saturées) sans
      // laisser un fichier corrompu charger n'importe quoi. La canonical brute
      // n'est volontairement pas clampée à ±1 — l'audio est normalisé à la lecture
      // par le navigateur (disableNormalization: false), le marqueur ±1 visuel
      // sert de repère pédagogique.
      assert(Array.isArray(p.canonical) && p.canonical.length === 600, `patch ${p.id}: canonical doit être un tableau de 600`)
      for (let i = 0; i < 600; i++) {
        assert(isNumberInRange(p.canonical[i], -10, 10), `patch ${p.id}: canonical ${i} hors [-10,10]`)
      }
      assert(isNumberInRange(p.cap, 1, 256) && Number.isInteger(p.cap), `patch ${p.id}: cap hors [1,256]`)
      assert(Array.isArray(p.anchors) && p.anchors.length >= 4 && p.anchors.length <= 32,
        `patch ${p.id}: anchors doit être un tableau de 4 à 32`)
      for (let i = 0; i < p.anchors.length; i++) {
        const a = p.anchors[i]
        assert(a && typeof a === 'object', `patch ${p.id}: anchor ${i} non-objet`)
        assert(typeof a.x === 'number' && Number.isFinite(a.x) && a.x >= 0 && a.x < 600,
          `patch ${p.id}: anchor ${i} x hors [0,600)`)
        assert(isNumberInRange(a.y, -10, 10), `patch ${p.id}: anchor ${i} y hors [-10,10]`)
      }
      assert(p.interpolation === 'soft' || p.interpolation === 'hard',
        `patch ${p.id}: interpolation '${p.interpolation}' inconnue`)
      // Résidu = canonical − spline : borne défensive [-12, 12] (somme des deux
      // bornes étendues).
      assert(Array.isArray(p.residual) && p.residual.length === 600, `patch ${p.id}: residual doit être un tableau de 600`)
      for (let i = 0; i < 600; i++) {
        assert(isNumberInRange(p.residual[i], -12, 12), `patch ${p.id}: residual ${i} hors [-12,12]`)
      }
      assert(isNumberInRange(p.amplitude, 0, 1), `patch ${p.id}: amplitude hors [0,1]`)
      if (obj.version >= 3) {
        // itération P : modulations LFO. Absentes = tolérées (defaults à
        // l'hydratation) ; présentes = validées strictement.
        assert(isLfoValidOrAbsent(p.vibrato, 200), `patch ${p.id}: vibrato invalide`)
        assert(isLfoValidOrAbsent(p.tremolo, 1), `patch ${p.id}: tremolo invalide`)
      }
      if (obj.version >= 4) {
        // itération T : auto-pan stéréo (depth ∈ [0,1]). Absent (v1/v2/v3) →
        // DEFAULT_AUTOPAN injecté à l'hydratation.
        assert(isLfoValidOrAbsent(p.autoPan, 1), `patch ${p.id}: autoPan invalide`)
        // T.3 : pitch envelope (v4 inchangé — champ absent → défaut injecté).
        assert(isParamEnvValidOrAbsent(p.pitchEnv, 2400), `patch ${p.id}: pitchEnv invalide`)
        // T.4 : filtre statique (v4 inchangé — champ absent → défaut injecté).
        assert(isFilterValidOrAbsent(p.filter), `patch ${p.id}: filter invalide`)
        // T.5 : enveloppe de filtre (amount ±4800) + wah (Lfo, depth cents [0, 3600]).
        assert(isParamEnvValidOrAbsent(p.filterEnv, 4800), `patch ${p.id}: filterEnv invalide`)
        assert(isLfoValidOrAbsent(p.wah, 3600), `patch ${p.id}: wah invalide`)
        // T.6 : distorsion (curve soft/hard/fold, drive [1,50], mix [0,1]).
        assert(isDistortionValidOrAbsent(p.distortion), `patch ${p.id}: distortion invalide`)
        // T.6bis : enveloppe de drive (ParamEnv, amount gain ±1).
        assert(isParamEnvValidOrAbsent(p.driveEnv, 1), `patch ${p.id}: driveEnv invalide`)
      }
    } else {
      // v1 (legacy) : union discriminée par `mode`. Convertie en v2 à
      // l'hydratation/import (migrateLegacyPatch). Validée telle quelle ici.
      assert(Array.isArray(p.points) && p.points.length === 600, `patch ${p.id}: points doit être un tableau de 600`)
      for (let i = 0; i < 600; i++) {
        assert(isNumberInRange(p.points[i], -1, 1), `patch ${p.id}: point ${i} hors [-1,1]`)
      }
      assert(isNumberInRange(p.amplitude, 0, 1), `patch ${p.id}: amplitude hors [0,1]`)
      assert(p.definition === undefined ||
        (isNumberInRange(p.definition, 1, 256) && Number.isInteger(p.definition)),
        `patch ${p.id}: definition hors [1,256]`)
      assert(p.mode === undefined || p.mode === 'draw' || p.mode === 'harmonic' || p.mode === 'spline',
        `patch ${p.id}: mode '${p.mode}' inconnu`)
      if (p.mode === 'harmonic') {
        assert(isNumberInRange(p.N, 16, 256) && Number.isInteger(p.N), `patch ${p.id}: N hors [16,256]`)
        assert(Array.isArray(p.amplitudes) && p.amplitudes.length === p.N,
          `patch ${p.id}: amplitudes doit être un tableau de longueur N`)
        for (let i = 0; i < p.N; i++) {
          assert(isNumberInRange(p.amplitudes[i], 0, 1), `patch ${p.id}: amplitude ${i} hors [0,1]`)
        }
      }
      if (p.mode === 'spline') {
        assert(Array.isArray(p.anchors) && p.anchors.length >= 4 && p.anchors.length <= 32,
          `patch ${p.id}: anchors doit être un tableau de 4 à 32`)
        for (let i = 0; i < p.anchors.length; i++) {
          const a = p.anchors[i]
          assert(a && typeof a === 'object', `patch ${p.id}: anchor ${i} non-objet`)
          assert(typeof a.x === 'number' && Number.isFinite(a.x) && a.x >= 0 && a.x < 600,
            `patch ${p.id}: anchor ${i} x hors [0,600)`)
          assert(isNumberInRange(a.y, -1, 1), `patch ${p.id}: anchor ${i} y hors [-1,1]`)
        }
        assert(p.interpolation === 'soft' || p.interpolation === 'hard',
          `patch ${p.id}: interpolation '${p.interpolation}' inconnue`)
      }
    }
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
  if (bytes.length < 4 + GARBAGE_OFFSET + 4) throw new OsaMagicError()
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== OSA_MAGIC[i]) throw new OsaMagicError()
  }
  // Retire les 4 octets garbage injectés à offset GARBAGE_OFFSET du gzip
  // (= offset 4 + GARBAGE_OFFSET du fichier complet) avant décompression.
  const gzipStart = 4
  const injectedAt = gzipStart + GARBAGE_OFFSET
  const cleaned = new Uint8Array(bytes.length - 4 - 4)
  cleaned.set(bytes.subarray(gzipStart, injectedAt), 0)
  cleaned.set(bytes.subarray(injectedAt + 4), injectedAt - gzipStart)
  let jsonText
  try {
    const stream = new Blob([cleaned]).stream().pipeThrough(new DecompressionStream('gzip'))
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
