# Import / Export bibliothèque (.osa) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre l'export/import de tout ou partie de la bibliothèque de patches via un fichier binaire `.osa` (magic header + gzip(JSON)), avec trois granularités d'export (complet / dossier / patch unique) et un choix de placement à l'import (sous-ensemble wrapper / racine).

**Architecture:** Trois couches découplées et pures pour la logique (`osaFormat.js` = transport binaire, `libraryTransfer.js` = transformation d'état, reducer = persistance), puis trois composants UI (`Modal.jsx` primitive partagée, `ExportModal.jsx`, `ImportModal.jsx`), avec orchestration depuis `App.jsx` et déclencheurs depuis `WaveformEditor.jsx` (Actions panel) et `PatchBank.jsx` (menu contextuel).

**Tech Stack:** React 19 + Web APIs natives uniquement (CompressionStream, FileReader, Blob, URL.createObjectURL). Zéro dépendance npm ajoutée — contrainte CLAUDE.md non négociable.

**Spec de référence:** `docs/superpowers/specs/2026-05-21-import-export-bibliotheque-design.md`

**Convention commits:** `feat(iter-H/phase-1.N): description` pour les nouvelles features, `refactor(iter-H/phase-1.N): ...` pour les extractions, `docs: ...` pour CONTEXT.md.

---

## Préambule — Stratégie de test manuel

Le projet n'a pas de framework de tests automatisés (CLAUDE.md : "tests manuels"). Pour les modules purs (`osaFormat`, `libraryTransfer`), on expose les fonctions via `window.__osa` en mode dev uniquement, et on les exerce depuis la console devtools du navigateur. Pour les composants UI, vérification manuelle dans le navigateur via `npm run dev`.

Chaque task se termine par :
1. `npm run lint` — pass attendu
2. `npm run build` — pass attendu (compile sans erreur)
3. Vérification manuelle décrite dans la task (instructions précises)
4. Commit avec le préfixe `feat(iter-H/phase-1.N): ...`

---

## Task 1: Squelette osaFormat.js + encodeOsa

**Files:**
- Create: `src/lib/osaFormat.js`
- Modify: `src/main.jsx:1-20` (exposition `window.__osa` en dev)

- [ ] **Step 1: Créer src/lib/osaFormat.js avec constantes et encodeOsa**

```js
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
```

- [ ] **Step 2: Exposer window.__osa en dev uniquement**

Modifier `src/main.jsx` — ajouter en bas (après le ReactDOM.createRoot) :

```js
// Dev-only : exposer les utilitaires .osa pour tests manuels console.
// import.meta.env.DEV est inliné par Vite à false en prod → bloc supprimé.
if (import.meta.env.DEV) {
  import('./lib/osaFormat.js').then((mod) => {
    window.__osa = mod
  })
}
```

- [ ] **Step 3: Vérifier compilation et lint**

```bash
npm run lint
npm run build
```

Attendu : pas d'erreur.

- [ ] **Step 4: Vérification manuelle dans la console**

```bash
npm run dev
```

Ouvrir l'app, ouvrir devtools console :

```js
const blob = await window.__osa.encodeOsa({ version: 1, patches: [], soundFolders: [] })
console.log('Size:', blob.size)
const buf = new Uint8Array(await blob.arrayBuffer())
console.log('Magic:', buf.slice(0, 4))  // doit afficher [79, 83, 65, 49]
```

Attendu : 4 premiers octets = `[79, 83, 65, 49]` (= `"OSA1"` en ASCII), taille totale > 4 octets.

- [ ] **Step 5: Commit**

```bash
git add src/lib/osaFormat.js src/main.jsx
git commit -m "feat(iter-H/phase-1.1): squelette osaFormat + encodeOsa (magic + gzip)"
```

---

## Task 2: decodeOsa (magic check + décompression + parse)

**Files:**
- Modify: `src/lib/osaFormat.js`

- [ ] **Step 1: Ajouter les classes d'erreurs et la fonction decodeOsa**

Ajouter dans `src/lib/osaFormat.js` après `encodeOsa` :

```js
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
```

- [ ] **Step 2: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Vérification manuelle round-trip**

Dans la console devtools (app en dev) :

```js
const original = { version: 1, exportedAt: '2026-05-21', patches: [], soundFolders: [] }
const blob = await window.__osa.encodeOsa(original)
const decoded = await window.__osa.decodeOsa(await blob.arrayBuffer())
console.log('Round-trip OK:', JSON.stringify(decoded) === JSON.stringify(original))
```

Attendu : `Round-trip OK: true`.

- [ ] **Step 4: Vérification manuelle erreurs**

```js
// Magic invalide
try { await window.__osa.decodeOsa(new TextEncoder().encode('NOPE').buffer) }
catch (e) { console.log(e.name) }  // → OsaMagicError

// Gzip corrompu (magic OK mais payload bidon)
const bad = new Uint8Array([0x4F, 0x53, 0x41, 0x31, 0xFF, 0xFF, 0xFF])
try { await window.__osa.decodeOsa(bad.buffer) }
catch (e) { console.log(e.name) }  // → OsaCorruptError
```

Attendu : les bons noms d'erreur s'affichent.

- [ ] **Step 5: Commit**

```bash
git add src/lib/osaFormat.js
git commit -m "feat(iter-H/phase-1.2): decodeOsa + classes d'erreur (magic/corrupt/parse)"
```

---

## Task 3: validatePayload (schéma strict-strict)

**Files:**
- Modify: `src/lib/osaFormat.js`
- Read: `src/lib/tuningSystems.js` (pour récupérer la liste des ids valides)

- [ ] **Step 1: Identifier la fonction de listing des systèmes**

Vérifier dans `src/lib/tuningSystems.js` qu'une fonction (ou la clé du registre) permet de connaître la liste des ids valides. Si `TUNING_SYSTEMS` est un objet, `Object.keys(TUNING_SYSTEMS)` suffit. Sinon adapter.

- [ ] **Step 2: Ajouter OsaSchemaError et validatePayload**

Ajouter dans `src/lib/osaFormat.js` :

```js
import { TUNING_SYSTEMS } from './tuningSystems.js'

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
```

- [ ] **Step 3: Câbler validatePayload dans decodeOsa**

Modifier la fonction `decodeOsa` — juste avant le `return JSON.parse(jsonText)`, remplacer par :

```js
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new OsaParseError()
  }
  return validatePayload(parsed)
}
```

- [ ] **Step 4: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 5: Vérification manuelle**

Console devtools :

```js
const valid = { version: 1, exportedAt: '2026-05-21', patches: [], soundFolders: [] }
const blobValid = await window.__osa.encodeOsa(valid)
await window.__osa.decodeOsa(await blobValid.arrayBuffer())  // doit passer

const badVersion = { version: 99, exportedAt: '2026-05-21', patches: [], soundFolders: [] }
const blobBad = await window.__osa.encodeOsa(badVersion)
try { await window.__osa.decodeOsa(await blobBad.arrayBuffer()) }
catch (e) { console.log(e.name, e.field) }  // → OsaSchemaError 'version non supportée...'

const badPoints = { version: 1, exportedAt: '2026-05-21', patches: [{
  id: 'patch-1', name: 'X', color: '#123456', points: [0, 0, 0],
  amplitude: 0.5, attack: 0, hold: 0, decay: 0, sustain: 0, release: 0,
  preset: null, folderId: null, defaultTuningSystem: '12-TET'
}], soundFolders: [] }
const blobBad2 = await window.__osa.encodeOsa(badPoints)
try { await window.__osa.decodeOsa(await blobBad2.arrayBuffer()) }
catch (e) { console.log(e.name, e.field) }  // → OsaSchemaError 'patch patch-1: points...'
```

Attendu : valides passent, invalides throw avec le bon champ identifié.

- [ ] **Step 6: Commit**

```bash
git add src/lib/osaFormat.js
git commit -m "feat(iter-H/phase-1.3): validatePayload — schéma strict-strict"
```

---

## Task 4: Extraction nextAvailableFolderName vers lib partagée

**Files:**
- Create: `src/lib/folderNames.js`
- Modify: `src/components/PatchBank.jsx:5-11` (suppression + import)

**Pourquoi cette task séparée :** `libraryTransfer` (Task 6) doit dédupliquer les noms de dossiers à l'import. La fonction existe dans `PatchBank.jsx`, mais importer depuis un composant vers une lib serait un anti-pattern (sens d'import inversé). On l'extrait avant.

- [ ] **Step 1: Créer src/lib/folderNames.js**

```js
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
```

- [ ] **Step 2: Modifier PatchBank.jsx pour importer**

Dans `src/components/PatchBank.jsx`, supprimer les lignes 5-11 (la fonction locale) et ajouter en haut du fichier (après les imports React existants) :

```js
import { nextAvailableFolderName } from '../lib/folderNames.js'
```

- [ ] **Step 3: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Vérification manuelle**

```bash
npm run dev
```

Dans l'app, créer plusieurs dossiers consécutivement via "+ Dossier". Vérifier que la séquence est bien `"Nouveau dossier"`, `"Nouveau dossier (2)"`, `"Nouveau dossier (3)"`.

Attendu : comportement identique à avant l'extraction (pas de régression visible).

- [ ] **Step 5: Commit**

```bash
git add src/lib/folderNames.js src/components/PatchBank.jsx
git commit -m "refactor(iter-H/phase-1.4): extract nextAvailableFolderName vers src/lib/"
```

---

## Task 5: Module libraryTransfer.js — buildExportPayload (3 scopes)

**Files:**
- Create: `src/lib/libraryTransfer.js`
- Modify: `src/main.jsx` (exposition window.__libtransfer en dev)

- [ ] **Step 1: Créer src/lib/libraryTransfer.js avec EmptyExportError et buildExportPayload**

```js
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
```

- [ ] **Step 2: Exposer window.__libtransfer en dev**

Dans `src/main.jsx`, modifier le bloc dev pour aussi exposer libraryTransfer :

```js
if (import.meta.env.DEV) {
  import('./lib/osaFormat.js').then((mod) => { window.__osa = mod })
  import('./lib/libraryTransfer.js').then((mod) => { window.__libtransfer = mod })
}
```

- [ ] **Step 3: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Vérification manuelle**

Console devtools (app en dev) :

```js
// Snapshot du state actuel
const state = window.__store.getState()  // si dispo en dev, sinon adapter
// (À défaut, fabriquer un mock manuellement)

const mock = {
  patches: [
    { id: 'patch-1', name: 'A', folderId: 'folder-1', color: '#000000',
      points: new Array(600).fill(0), amplitude: 1, attack: 0, hold: 0, decay: 0,
      sustain: 1, release: 0, preset: 'sine', defaultTuningSystem: '12-TET' },
    { id: 'patch-2', name: 'B', folderId: null, color: '#000000',
      points: new Array(600).fill(0), amplitude: 1, attack: 0, hold: 0, decay: 0,
      sustain: 1, release: 0, preset: 'sine', defaultTuningSystem: '12-TET' },
  ],
  soundFolders: [
    { id: 'folder-1', name: 'Basses', parentId: null },
    { id: 'folder-2', name: 'Sub', parentId: 'folder-1' },
  ],
}

const all = window.__libtransfer.buildExportPayload({ ...mock, scope: { type: 'all' } })
console.log('all:', all.patches.length, all.soundFolders.length)  // 2, 2

const folder = window.__libtransfer.buildExportPayload({ ...mock, scope: { type: 'folder', id: 'folder-1' } })
console.log('folder:', folder.patches.length, folder.soundFolders.length, folder.soundFolders[0].parentId)
// → 1, 2, null (folder-1 a parentId remis à null)

const patch = window.__libtransfer.buildExportPayload({ ...mock, scope: { type: 'patch', id: 'patch-1' } })
console.log('patch:', patch.patches.length, patch.patches[0].folderId)  // 1, null

try { window.__libtransfer.buildExportPayload({ patches: [], soundFolders: [], scope: { type: 'all' } }) }
catch (e) { console.log(e.name) }  // → EmptyExportError
```

Attendu : tous les console.log produisent les valeurs attendues, l'EmptyExportError est levée pour le scope vide.

- [ ] **Step 5: Commit**

```bash
git add src/lib/libraryTransfer.js src/main.jsx
git commit -m "feat(iter-H/phase-1.5): buildExportPayload (scopes all/folder/patch)"
```

---

## Task 6: applyImport (modes subset/root)

**Files:**
- Modify: `src/lib/libraryTransfer.js`

- [ ] **Step 1: Ajouter applyImport**

Ajouter à la fin de `src/lib/libraryTransfer.js` :

```js
// Applique un payload .osa au state.
// Renvoie les nouveaux patches/folders à concaténer + les compteurs après.
// Ne mute rien.
//
// mode = 'subset' : un wrapper folder est créé, contenu importé dedans.
// mode = 'root'   : les racines du payload deviennent racines de la biblio.
//
// IDs régénérés systématiquement → aucun risque de collision avec les
// clips de la timeline qui référencent des patchIds existants.
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
```

- [ ] **Step 2: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Vérification manuelle — mode subset**

Console devtools :

```js
const payload = {
  version: 1, exportedAt: '2026-05-21',
  patches: [
    { id: 'patch-1', name: 'A', folderId: 'folder-1', color: '#000000',
      points: new Array(600).fill(0), amplitude: 1, attack: 0, hold: 0, decay: 0,
      sustain: 1, release: 0, preset: 'sine', defaultTuningSystem: '12-TET' },
    { id: 'patch-2', name: 'B', folderId: null, color: '#000000',
      points: new Array(600).fill(0), amplitude: 1, attack: 0, hold: 0, decay: 0,
      sustain: 1, release: 0, preset: 'sine', defaultTuningSystem: '12-TET' },
  ],
  soundFolders: [{ id: 'folder-1', name: 'Basses', parentId: null }],
}

const currentState = { patches: [], soundFolders: [], folderCounter: 5, patchCounter: 10 }
const result = window.__libtransfer.applyImport(payload, 'subset', 'mon-import', currentState)
console.log('newFolders:', result.newFolders)
// → wrapper "mon-import" (folder-7), "Basses" reparented sur le wrapper (folder-6 parentId=folder-7)
console.log('newPatches:', result.newPatches)
// → patch-11 (folderId=folder-6), patch-12 (folderId=folder-7 → wrapper)
console.log('counters:', result.folderCounterAfter, result.patchCounterAfter)  // 7, 12
```

Attendu : les valeurs imprimées correspondent.

- [ ] **Step 4: Vérification manuelle — mode root et déduplication**

```js
const stateWithBasses = {
  patches: [], soundFolders: [{ id: 'folder-99', name: 'Basses', parentId: null }],
  folderCounter: 99, patchCounter: 0
}
const result2 = window.__libtransfer.applyImport(payload, 'root', '', stateWithBasses)
console.log('newFolders[0].name:', result2.newFolders[0].name)  // → "Basses (2)" (dédupé)
console.log('newFolders[0].parentId:', result2.newFolders[0].parentId)  // → null (racine)
console.log('newPatches[1].folderId:', result2.newPatches[1].folderId)  // → null (orphelin reste racine en mode root)
```

Attendu : `"Basses (2)"`, `null`, `null`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/libraryTransfer.js
git commit -m "feat(iter-H/phase-1.6): applyImport (subset + root) avec regen IDs"
```

---

## Task 7: Reducer — action IMPORT_LIBRARY

**Files:**
- Modify: `src/reducer.js` (case ajouté + DESIGNER_UNDOABLE étendu)

- [ ] **Step 1: Localiser le Set DESIGNER_UNDOABLE (l.1460)**

Rechercher dans `src/reducer.js` la constante `DESIGNER_UNDOABLE` (c'est un `new Set([...])` autour de la ligne 1460). Ajouter `'IMPORT_LIBRARY'` à la fin du Set, avant la fermeture `])` :

```js
const DESIGNER_UNDOABLE = new Set([
  'SAVE_PATCH', 'UPDATE_PATCH', 'DELETE_PATCH', 'RENAME_PATCH',
  'CREATE_FOLDER', 'RENAME_FOLDER', 'DELETE_FOLDER',
  'MOVE_PATCH_TO_FOLDER', 'MOVE_FOLDER',
  'SET_EDITOR_POINTS', 'SET_EDITOR_TEST_NOTE', 'SET_EDITOR_TEST_OCTAVE',
  'SET_EDITOR_TEST_TUNING_SYSTEM', 'SET_EDITOR_TEST_FREQUENCY', 'SET_EDITOR_AMPLITUDE',
  'SET_EDITOR_ADSR', 'SET_EDITOR_ADSR_AND_AMP', 'APPLY_EDITOR_PRESET', 'RESET_EDITOR',
  'SET_EDITOR_VISUAL_CUE_PATTERN', 'SET_EDITOR_VISUAL_CUE_TONIC',
  'IMPORT_LIBRARY',
])
```

(Conserver toutes les entrées existantes ; juste ajouter la nouvelle à la fin.)

- [ ] **Step 2: Ajouter le case IMPORT_LIBRARY dans le reducer**

Repérer le `switch (action.type)` du reducer principal. Ajouter (à proximité des autres cases patch — DELETE_PATCH par exemple) :

```js
case 'IMPORT_LIBRARY': {
  return {
    ...state,
    patches: [...state.patches, ...action.newPatches],
    soundFolders: [...state.soundFolders, ...action.newFolders],
    patchCounter: action.patchCounterAfter,
    folderCounter: action.folderCounterAfter,
  }
}
```

- [ ] **Step 3: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Vérification manuelle**

Console devtools, app en dev (les patches/folders doivent persister après la dispatch) :

```js
const stateBefore = window.__store.getState()
console.log('patches avant:', stateBefore.patches.length, 'folders avant:', stateBefore.soundFolders.length)

const fakeImport = window.__libtransfer.applyImport(
  { version: 1, exportedAt: '2026-05-21', patches: [], soundFolders: [
    { id: 'folder-1', name: 'TestImport', parentId: null }
  ] },
  'subset', 'TestWrapper', stateBefore
)
window.__store.dispatch({ type: 'IMPORT_LIBRARY', ...fakeImport })

const stateAfter = window.__store.getState()
console.log('patches après:', stateAfter.patches.length, 'folders après:', stateAfter.soundFolders.length)
console.log('compteurs:', stateAfter.folderCounter, stateAfter.patchCounter)
```

Vérifier visuellement dans PatchBank que `TestWrapper` (avec `TestImport` à l'intérieur) apparaît. Ctrl+Z dans le Designer → ils disparaissent. Ctrl+Shift+Z → ils réapparaissent. Recharger la page → ils persistent (localStorage).

Note : si `window.__store` n'existe pas en dev, ajouter son exposition dans `src/App.jsx` à proximité du reducer initial (cohérent avec ce qui a été fait pour X-EDO N en F.8.1).

- [ ] **Step 5: Commit**

```bash
git add src/reducer.js
git commit -m "feat(iter-H/phase-1.7): action IMPORT_LIBRARY (undoable Designer)"
```

---

## Task 8: Modal.jsx — primitive partagé

**Files:**
- Create: `src/components/Modal.jsx`
- Create: `src/components/Modal.css`

- [ ] **Step 1: Créer Modal.jsx**

```jsx
// src/components/Modal.jsx
//
// Primitive modale réutilisable : backdrop fixed, Escape close, focus trap
// basique (premier focusable au mount), prévention du scroll body.
// Pas de framework UI — manuscrit dans l'esprit du projet.

import { useEffect, useRef } from 'react'
import './Modal.css'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)

    // Focus le premier élément focusable du dialog au mount
    const firstFocusable = dialogRef.current?.querySelector(
      'input, button, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-dialog modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Créer Modal.css**

```css
/* src/components/Modal.css */

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 20px 24px;
  max-width: 480px;
  width: 100%;
  margin: 16px;
  color: #e0e0e0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.modal-sm { max-width: 360px; }
.modal-md { max-width: 480px; }
.modal-lg { max-width: 640px; }

.modal-title {
  margin: 0 0 16px;
  font-size: 1.1em;
  font-weight: 600;
}

/* Boutons de modale standardisés (réutilisés par ExportModal et ImportModal) */
.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
}
.modal-btn {
  padding: 8px 16px;
  border: 1px solid #444;
  border-radius: 4px;
  background: #2a2a2a;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 0.95em;
}
.modal-btn:hover:not(:disabled) { background: #333; }
.modal-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.modal-btn-primary {
  background: #2c5070;
  border-color: #3e6890;
}
.modal-btn-primary:hover:not(:disabled) { background: #356085; }
```

- [ ] **Step 3: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Vérification manuelle**

Modal n'est pas encore utilisé. Vérification reportée à la Task 9 (ExportModal).

- [ ] **Step 5: Commit**

```bash
git add src/components/Modal.jsx src/components/Modal.css
git commit -m "feat(iter-H/phase-1.8): Modal.jsx primitive partagé (backdrop/Escape/focus)"
```

---

## Task 9: ExportModal.jsx

**Files:**
- Create: `src/components/ExportModal.jsx`

- [ ] **Step 1: Créer ExportModal.jsx**

```jsx
// src/components/ExportModal.jsx
//
// Modale "Export as..." — saisit le nom du fichier, slugifie, ajoute .osa
// si absent, déclenche onConfirm(filename). Utilisée par les 3 voies
// d'export (panneau Actions, menu contextuel folder, menu contextuel patch).

import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'

const FILESYSTEM_INVALID_RE = /[\\/:*?"<>|\x00-\x1f]/g

function slugifyForFilesystem(name) {
  return name.replace(FILESYSTEM_INVALID_RE, '_')
}

function ensureOsaSuffix(name) {
  return name.endsWith('.osa') ? name : `${name}.osa`
}

export default function ExportModal({ isOpen, defaultName, onConfirm, onCancel }) {
  const [name, setName] = useState(defaultName)

  useEffect(() => { if (isOpen) setName(defaultName) }, [isOpen, defaultName])

  const trimmed = name.trim()
  const isValid = trimmed.length > 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isValid) return
    const finalName = ensureOsaSuffix(slugifyForFilesystem(trimmed))
    onConfirm(finalName)
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Exporter">
      <form onSubmit={handleSubmit}>
        <label className="modal-field">
          <span>Nom du fichier</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <p className="modal-hint">L'extension .osa sera ajoutée automatiquement.</p>
        <div className="modal-actions">
          <button type="button" className="modal-btn" onClick={onCancel}>Annuler</button>
          <button
            type="submit"
            className="modal-btn modal-btn-primary"
            disabled={!isValid}
          >Exporter</button>
        </div>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 2: Étendre Modal.css avec les classes form**

Ajouter à `src/components/Modal.css` :

```css
.modal-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 4px;
}
.modal-field > span {
  font-size: 0.9em;
  color: #aaa;
}
.modal-field input[type="text"] {
  background: #0e0e0e;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 8px 10px;
  color: #e0e0e0;
  font-size: 0.95em;
}
.modal-field input[type="text"]:focus {
  outline: none;
  border-color: #4a8ab8;
}
.modal-hint {
  margin: 4px 0 0;
  font-size: 0.85em;
  color: #888;
}
```

- [ ] **Step 3: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Vérification manuelle**

ExportModal n'est pas encore branché. Vérification reportée à la Task 10.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExportModal.jsx src/components/Modal.css
git commit -m "feat(iter-H/phase-1.9): ExportModal.jsx (champ nom + slugify + suffix)"
```

---

## Task 10: Wiring export bibliothèque complète (Actions Download)

**Files:**
- Modify: `src/App.jsx` (state modale + handlers + render)
- Modify: `src/components/WaveformEditor.jsx` (Download button onClick + disabled)

- [ ] **Step 1: Ajouter helper download dans App.jsx**

Vers le haut de `src/App.jsx` (après les imports, avant le composant App) :

```jsx
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Ajouter imports et state dans App**

Dans `src/App.jsx`, ajouter aux imports :

```jsx
import ExportModal from './components/ExportModal.jsx'
import { encodeOsa } from './lib/osaFormat.js'
import { buildExportPayload, EmptyExportError } from './lib/libraryTransfer.js'
```

Dans le composant App (à proximité des autres useState UI) :

```jsx
const [exportModal, setExportModal] = useState(null)
// exportModal: null | { scope: {type, id?}, defaultName: string }
```

- [ ] **Step 3: Ajouter helper notify et handlers export**

Le mécanisme de notification existant utilise `dispatch({ type: 'SET_NOTIFICATION', payload: { message, type, timestamp } })`. Pour éviter la répétition, ajouter dans App (à côté des autres handlers) un helper :

```jsx
const notify = (message, type = 'info') => {
  dispatch({ type: 'SET_NOTIFICATION', payload: { message, type, timestamp: Date.now() } })
}
```

Puis les handlers export :

```jsx
const handleExportAll = () => {
  if (patches.length === 0) {
    notify('Rien à exporter', 'error')
    return
  }
  const today = new Date().toISOString().slice(0, 10)
  setExportModal({
    scope: { type: 'all' },
    defaultName: `synth-app-bibliotheque-${today}`,
  })
}

const handleConfirmExport = async (filename) => {
  const { scope } = exportModal
  try {
    const payload = buildExportPayload({ patches, soundFolders, scope })
    const blob = await encodeOsa(payload)
    triggerDownload(blob, filename)
    setExportModal(null)
    const np = payload.patches.length
    const nf = payload.soundFolders.length
    notify(`Exporté : ${np} patch${np > 1 ? 'es' : ''}, ${nf} dossier${nf > 1 ? 's' : ''}`, 'success')
  } catch (e) {
    setExportModal(null)
    if (e instanceof EmptyExportError) notify('Rien à exporter', 'error')
    else notify(`Erreur d'export : ${e.message}`, 'error')
  }
}
```

Note : les types acceptés par `Toast.jsx` sont `'error'`, `'success'`, `'info'` (vérifier dans le composant si besoin — adapter si différent).

- [ ] **Step 4: Render ExportModal en bas de App**

Juste avant la fermeture de la racine du render :

```jsx
{exportModal && (
  <ExportModal
    isOpen={true}
    defaultName={exportModal.defaultName}
    onConfirm={handleConfirmExport}
    onCancel={() => setExportModal(null)}
  />
)}
```

- [ ] **Step 5: Passer handleExportAll et canExport à WaveformEditor**

Repérer la prop passée à `<WaveformEditor>` dans App.jsx, ajouter :

```jsx
<WaveformEditor
  ...autresProps
  onExport={handleExportAll}
  canExport={patches.length > 0}
/>
```

- [ ] **Step 6: Modifier WaveformEditor pour câbler le bouton Download**

Dans `src/components/WaveformEditor.jsx`, dans la signature du composant ou la destructuration des props :

```jsx
function WaveformEditor({ ...existing, onExport, canExport }) {
```

Localiser les deux occurrences du bouton Download (lignes 1740-1746 mode collapsed, 1811-1817 mode ouvert) et remplacer le `disabled` par un câblage conditionnel + onClick :

Mode collapsed (lignes ~1740) :

```jsx
<button
  type="button"
  className="actions-icon-btn"
  onClick={onExport}
  disabled={!canExport}
  title={canExport ? "Exporter la bibliothèque" : "Bibliothèque vide"}
  aria-label="Exporter la bibliothèque"
><Download size={16} strokeWidth={2} /></button>
```

Mode ouvert (lignes ~1811) — même chose avec `size={18}`.

- [ ] **Step 7: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 8: Vérification manuelle**

```bash
npm run dev
```

1. Avec une bibliothèque vide : bouton Download disabled. Hover → tooltip "Bibliothèque vide".
2. Créer un patch ("Enregistrer le patch") puis : bouton Download activable. Clic → modale "Exporter" avec nom pré-rempli `synth-app-bibliotheque-YYYY-MM-DD`. Bouton Exporter clicable.
3. Cliquer Exporter → un fichier `.osa` est téléchargé.
4. Renommer dans la modale → le fichier téléchargé porte ce nom (avec `.osa` ajouté si absent).
5. Inspecter le fichier : `xxd nomdufichier.osa | head -1` → premiers octets `4f 53 41 31 ...` (= OSA1).
6. Toast `"Exporté : 1 patch, 0 dossier"` apparaît.

- [ ] **Step 9: Commit**

```bash
git add src/App.jsx src/components/WaveformEditor.jsx
git commit -m "feat(iter-H/phase-1.10): export bibliothèque complète (Actions Download)"
```

---

## Task 11: PatchBank — menu contextuel folder/patch

**Files:**
- Modify: `src/components/PatchBank.jsx` (state contextMenu + handlers + render inline)
- Modify: `src/components/PatchBank.css` (styles menu)

**Pattern de référence:** `src/components/Timeline.jsx` (state `contextMenu`, render inline avec backdrop, fermeture Escape). Reproduire le même schéma.

- [ ] **Step 1: Ajouter state contextMenu et helpers**

Dans `src/components/PatchBank.jsx`, dans le composant (à proximité des autres useState) :

```jsx
const [contextMenu, setContextMenu] = useState(null)
// contextMenu: null | { type: 'folder'|'patch', id: string, clientX, clientY }

useEffect(() => {
  if (!contextMenu) return
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); setContextMenu(null) }
  }
  document.addEventListener('keydown', onKey, true)
  return () => document.removeEventListener('keydown', onKey, true)
}, [contextMenu])
```

- [ ] **Step 2: Ajouter helper pour détecter folder vide**

Dans le composant (ou en haut du fichier comme utilitaire) :

```jsx
function folderHasAnyPatch(folderId, patches, soundFolders) {
  // Sous-arbre récursif : le folder lui-même + descendants
  const ids = new Set([folderId])
  let changed = true
  while (changed) {
    changed = false
    for (const f of soundFolders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id); changed = true
      }
    }
  }
  return patches.some((p) => ids.has(p.folderId))
}
```

- [ ] **Step 3: Ajouter props onExportFolder et onExportPatch à PatchBank**

Étendre la signature :

```jsx
function PatchBank({
  ...existingProps,
  onExportFolder,
  onExportPatch,
}) {
```

- [ ] **Step 4: Câbler onContextMenu sur les rows folder et patch**

Localiser les rows. Sur la row folder (l'élément `<li className="folder-item">` ou équivalent), ajouter :

```jsx
onContextMenu={(e) => {
  e.preventDefault()
  e.stopPropagation()
  setContextMenu({ type: 'folder', id: folder.id, clientX: e.clientX, clientY: e.clientY })
}}
```

Sur la row patch (l'élément `<li>` ou wrapper de chip), ajouter le même `onContextMenu` avec `type: 'patch', id: patch.id`.

- [ ] **Step 5: Render inline du menu**

Vers la fin du JSX du composant (avant le closing tag de la racine) :

```jsx
{contextMenu && (
  <>
    <div
      className="patchbank-context-backdrop"
      onClick={() => setContextMenu(null)}
      onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
    />
    <div
      className="patchbank-context-menu"
      style={{ left: `${contextMenu.clientX}px`, top: `${contextMenu.clientY}px` }}
    >
      {contextMenu.type === 'folder' && (() => {
        const isEmpty = !folderHasAnyPatch(contextMenu.id, patches, soundFolders)
        return (
          <button
            type="button"
            className="patchbank-context-item"
            disabled={isEmpty}
            onClick={() => {
              const id = contextMenu.id
              setContextMenu(null)
              onExportFolder?.(id)
            }}
          >Exporter ce dossier</button>
        )
      })()}
      {contextMenu.type === 'patch' && (
        <button
          type="button"
          className="patchbank-context-item"
          onClick={() => {
            const id = contextMenu.id
            setContextMenu(null)
            onExportPatch?.(id)
          }}
        >Exporter ce patch</button>
      )}
    </div>
  </>
)}
```

- [ ] **Step 6: Ajouter les styles du menu**

Ajouter à `src/components/PatchBank.css` :

```css
.patchbank-context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 998;
}
.patchbank-context-menu {
  position: fixed;
  z-index: 999;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 4px 0;
  min-width: 180px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}
.patchbank-context-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: #e0e0e0;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.92em;
}
.patchbank-context-item:hover:not(:disabled) { background: #2a2a2a; }
.patchbank-context-item:disabled { color: #555; cursor: not-allowed; }
```

- [ ] **Step 7: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 8: Vérification manuelle (sans handlers — placeholder)**

À ce stade `onExportFolder` / `onExportPatch` ne sont pas branchés depuis App (Task 12). Vérifier :
1. Clic droit sur une row dossier → menu s'affiche, position cohérente.
2. Clic droit sur un dossier vide → entrée "Exporter ce dossier" grisée.
3. Clic droit sur un dossier non vide → entrée activable (clic = no-op pour l'instant).
4. Clic droit sur une row patch → menu avec "Exporter ce patch" activable (no-op).
5. Escape ferme. Clic ailleurs ferme.

- [ ] **Step 9: Commit**

```bash
git add src/components/PatchBank.jsx src/components/PatchBank.css
git commit -m "feat(iter-H/phase-1.11): menu contextuel PatchBank (folder + patch)"
```

---

## Task 12: Wiring export folder/patch depuis App

**Files:**
- Modify: `src/App.jsx` (handlers + props passées à PatchBank)

- [ ] **Step 1: Ajouter handlers handleExportFolder et handleExportPatch**

Dans `src/App.jsx`, à côté de `handleExportAll` :

```jsx
const handleExportFolder = (folderId) => {
  const folder = soundFolders.find((f) => f.id === folderId)
  if (!folder) return
  setExportModal({
    scope: { type: 'folder', id: folderId },
    defaultName: folder.name,
  })
}

const handleExportPatch = (patchId) => {
  const patch = patches.find((p) => p.id === patchId)
  if (!patch) return
  setExportModal({
    scope: { type: 'patch', id: patchId },
    defaultName: patch.name,
  })
}
```

- [ ] **Step 2: Passer les handlers à toutes les instances PatchBank**

Repérer toutes les utilisations de `<PatchBank>` dans App.jsx (il y en a plusieurs — Designer ouvert, Designer collapsed popover, Composer). Pour chacune, ajouter :

```jsx
<PatchBank
  ...existing
  onExportFolder={handleExportFolder}
  onExportPatch={handleExportPatch}
/>
```

- [ ] **Step 3: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Vérification manuelle — export folder**

1. Créer un dossier "Basses", y placer 2-3 patches via drag interne.
2. Clic droit sur "Basses" → "Exporter ce dossier" → modale s'ouvre avec nom pré-rempli "Basses".
3. Exporter → fichier `Basses.osa` téléchargé.
4. Inspecter via la console : `await (await fetch(URL.createObjectURL(<le fichier>))).arrayBuffer()` — ou réimporter plus tard (Task 14).
5. Toast `"Exporté : N patches, M dossiers"`.

- [ ] **Step 5: Vérification manuelle — export patch**

1. Clic droit sur un patch → "Exporter ce patch" → modale "Exporter" avec nom pré-rempli au nom du patch.
2. Exporter → fichier `<nom-patch>.osa` téléchargé.
3. Toast `"Exporté : 1 patch, 0 dossier"`.

- [ ] **Step 6: Vérification manuelle — refus export folder vide**

1. Créer un dossier vide (pas de patch dedans, pas de sous-dossier non vide).
2. Clic droit → entrée "Exporter ce dossier" grisée (Task 11).
3. Si malgré tout `handleExportFolder` est appelé avec un folder vide (forçage console) : `buildExportPayload` throw `EmptyExportError` → toast `"Rien à exporter"`, modale ne s'ouvre pas.

(Pour le forçage console, dispatch un évènement custom ou caller `setExportModal` directement.)

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat(iter-H/phase-1.12): wiring export folder + patch (menu contextuel)"
```

---

## Task 13: ImportModal.jsx

**Files:**
- Create: `src/components/ImportModal.jsx`

- [ ] **Step 1: Créer ImportModal.jsx**

```jsx
// src/components/ImportModal.jsx
//
// Modale post-validation .osa : affiche les compteurs détectés, propose
// le placement (sous-ensemble dans un dossier wrapper / racine).
// Appelle onConfirm(mode, wrapperName) où wrapperName est ignoré si
// mode === 'root'.

import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'

function stripExtension(fileName) {
  const idx = fileName.lastIndexOf('.')
  return idx > 0 ? fileName.slice(0, idx) : fileName
}

export default function ImportModal({ isOpen, payload, fileName, onConfirm, onCancel }) {
  const [mode, setMode] = useState('subset')
  const [wrapperName, setWrapperName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setMode('subset')
      setWrapperName(stripExtension(fileName || ''))
    }
  }, [isOpen, fileName])

  const patchCount = payload?.patches.length ?? 0
  const folderCount = payload?.soundFolders.length ?? 0
  const wrapperTrimmed = wrapperName.trim()
  const canSubmit = mode === 'root' || wrapperTrimmed.length > 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    onConfirm(mode, wrapperTrimmed)
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={`Importer ${fileName ?? ''}`}>
      <form onSubmit={handleSubmit}>
        <p className="modal-summary">
          {patchCount} patch{patchCount > 1 ? 'es' : ''}, {folderCount} dossier{folderCount > 1 ? 's' : ''} détecté{folderCount > 1 ? 's' : ''}
        </p>

        <label className="modal-radio">
          <input
            type="radio"
            name="import-mode"
            checked={mode === 'subset'}
            onChange={() => setMode('subset')}
          />
          <span>Comme sous-ensemble dans un nouveau dossier</span>
        </label>
        {mode === 'subset' && (
          <label className="modal-field modal-field-indent">
            <span>Nom du dossier</span>
            <input
              type="text"
              value={wrapperName}
              onChange={(e) => setWrapperName(e.target.value)}
              autoFocus
            />
          </label>
        )}

        <label className="modal-radio">
          <input
            type="radio"
            name="import-mode"
            checked={mode === 'root'}
            onChange={() => setMode('root')}
          />
          <span>À la racine de la bibliothèque</span>
        </label>
        {mode === 'root' && (
          <p className="modal-hint modal-field-indent">
            Les dossiers de premier niveau du fichier deviennent racines.
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="modal-btn" onClick={onCancel}>Annuler</button>
          <button
            type="submit"
            className="modal-btn modal-btn-primary"
            disabled={!canSubmit}
          >Importer</button>
        </div>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 2: Étendre Modal.css avec les nouvelles classes**

Ajouter à `src/components/Modal.css` :

```css
.modal-summary {
  margin: 0 0 14px;
  color: #aaa;
  font-size: 0.95em;
}
.modal-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 4px;
  cursor: pointer;
}
.modal-radio input { margin: 0; }
.modal-field-indent { margin-left: 24px; }
```

- [ ] **Step 3: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Vérification manuelle**

Reportée à Task 14 (branchement effectif).

- [ ] **Step 5: Commit**

```bash
git add src/components/ImportModal.jsx src/components/Modal.css
git commit -m "feat(iter-H/phase-1.13): ImportModal.jsx (radio + wrapper name)"
```

---

## Task 14: Wiring import depuis App

**Files:**
- Modify: `src/App.jsx` (state importModal + handlers + file input + render modal)
- Modify: `src/components/WaveformEditor.jsx` (Upload button onClick)

- [ ] **Step 1: Ajouter imports, state et ref dans App**

Dans `src/App.jsx` :

```jsx
import ImportModal from './components/ImportModal.jsx'
import {
  decodeOsa,
  OsaMagicError, OsaCorruptError, OsaParseError, OsaSchemaError
} from './lib/osaFormat.js'
import { applyImport } from './lib/libraryTransfer.js'
```

Dans App (à côté de `exportModal`) :

```jsx
const [importModal, setImportModal] = useState(null)
// importModal: null | { payload, fileName }

const fileInputRef = useRef(null)
```

- [ ] **Step 2: Ajouter handler import**

```jsx
const handleImportClick = () => {
  fileInputRef.current?.click()
}

const handleFileSelected = async (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''  // reset pour permettre re-sélection du même fichier
  if (!file) return
  try {
    const buffer = await file.arrayBuffer()
    const payload = await decodeOsa(buffer)
    setImportModal({ payload, fileName: file.name })
  } catch (err) {
    if (err instanceof OsaMagicError) notify('Fichier non reconnu (format .osa attendu)', 'error')
    else if (err instanceof OsaCorruptError) notify('Fichier corrompu', 'error')
    else if (err instanceof OsaParseError) notify('Contenu malformé', 'error')
    else if (err instanceof OsaSchemaError) notify(`Fichier invalide : ${err.field}`, 'error')
    else notify('Lecture du fichier impossible', 'error')
  }
}

const handleConfirmImport = (mode, wrapperName) => {
  const { payload } = importModal
  const result = applyImport(payload, mode, wrapperName, {
    patches, soundFolders, folderCounter, patchCounter,
  })
  dispatch({ type: 'IMPORT_LIBRARY', ...result })
  setImportModal(null)
  const np = result.newPatches.length
  const nf = result.newFolders.length
  notify(`Importé : ${np} patch${np > 1 ? 'es' : ''}, ${nf} dossier${nf > 1 ? 's' : ''}`, 'success')
}
```

- [ ] **Step 3: Render input file caché et ImportModal**

À proximité du render ExportModal :

```jsx
<input
  type="file"
  accept=".osa"
  ref={fileInputRef}
  onChange={handleFileSelected}
  style={{ display: 'none' }}
/>
{importModal && (
  <ImportModal
    isOpen={true}
    payload={importModal.payload}
    fileName={importModal.fileName}
    onConfirm={handleConfirmImport}
    onCancel={() => setImportModal(null)}
  />
)}
```

- [ ] **Step 4: Passer onImport à WaveformEditor**

```jsx
<WaveformEditor
  ...existing
  onImport={handleImportClick}
/>
```

- [ ] **Step 5: Câbler Upload button dans WaveformEditor**

Dans `src/components/WaveformEditor.jsx`, ajouter `onImport` à la destructuration des props. Remplacer les deux occurrences du bouton Upload (lignes ~1733-1739 mode collapsed, ~1804-1810 mode ouvert) :

Mode collapsed :

```jsx
<button
  type="button"
  className="actions-icon-btn"
  onClick={onImport}
  title="Importer une bibliothèque"
  aria-label="Importer une bibliothèque"
><Upload size={16} strokeWidth={2} /></button>
```

Mode ouvert — même chose avec `size={18}`.

- [ ] **Step 6: Vérifier lint et build**

```bash
npm run lint && npm run build
```

- [ ] **Step 7: Vérification manuelle — round-trip subset**

```bash
npm run dev
```

1. Créer un patch "P1", un dossier "Basses", y placer "P1". Exporter tout → `synth-app-bibliotheque-YYYY-MM-DD.osa`.
2. Cliquer Upload → sélectionner le fichier → modale s'ouvre, indique "1 patch, 1 dossier détecté", radio sur "sous-ensemble", nom du dossier pré-rempli (= nom du fichier sans extension).
3. Saisir un nom de wrapper personnalisé "MonImport" → Importer.
4. Vérifier dans PatchBank : un dossier "MonImport" apparaît, contient "Basses", qui contient "P1". Les originaux ("Basses" + "P1") sont toujours là.
5. Vérifier les IDs en console : `window.__store.getState().patches.map(p => p.id)` → les IDs des patches importés sont au-delà du compteur initial (pas de réutilisation).

- [ ] **Step 8: Vérification manuelle — mode racine**

1. Réimporter le même fichier en mode racine → "Basses (2)" apparaît à la racine (déduplication via `nextAvailableFolderName`).
2. Vérifier que le patch dedans ne collide avec aucun clip existant.

- [ ] **Step 9: Vérification manuelle — protection clips**

1. Avant l'import, placer "P1" dans la timeline Composer.
2. Importer la même bibliothèque.
3. Vérifier que le clip de la timeline pointe toujours vers le P1 *original* (et pas celui importé). Lire la valeur de `clip.patchId` en console pour confirmer.
4. Lecture audio du clip → toujours le bon son.

- [ ] **Step 10: Vérification manuelle — erreurs**

1. Sélectionner un fichier non-`.osa` (un PNG, un txt...) — toast "Fichier non reconnu".
2. Sélectionner un `.osa` modifié (changer un octet du gzip à la main avec `printf '\x00' | dd of=foo.osa bs=1 seek=10 count=1 conv=notrunc`) — toast "Fichier corrompu".
3. Sélectionner deux fois le même fichier → la modale s'ouvre à chaque fois (reset value OK).
4. Annuler la modale → état inchangé, aucun toast.

- [ ] **Step 11: Vérification undo après import**

1. Compter les patches avant un import.
2. Importer un .osa avec plusieurs patches.
3. Ctrl+Z en mode Designer → les patches/folders importés disparaissent en un undo.
4. Ctrl+Shift+Z → ils reviennent.

- [ ] **Step 12: Commit**

```bash
git add src/App.jsx src/components/WaveformEditor.jsx
git commit -m "feat(iter-H/phase-1.14): wiring import — validation pré-modale + applyImport"
```

---

## Task 15: Vérification d'intégration finale

**Files:** aucune modification — verification pass.

- [ ] **Step 1: Cycle export complet → reset localStorage → import**

1. Créer ~10 patches dans plusieurs dossiers imbriqués (3 niveaux), assigner des défauts tuningSystem variés, des couleurs différentes.
2. Exporter la bibliothèque complète.
3. Dans la console : `localStorage.clear(); location.reload()`.
4. L'app rouvre vide. Cliquer Upload → sélectionner le fichier.
5. Mode racine → Importer.
6. Vérifier que toute la structure (dossiers imbriqués, patches avec leurs paramètres, defaultTuningSystem, couleurs) est restaurée fidèlement.

- [ ] **Step 2: Inspection binaire du fichier**

```bash
file <fichier.osa>
# Doit dire "data" (et pas "gzip compressed")
xxd <fichier.osa> | head -1
# Doit montrer "4f 53 41 31" au début
```

- [ ] **Step 3: Lecture audio des patches importés**

Charger un patch importé dans le Designer, le tester au clavier. Vérifier que le son est strictement identique à l'original (pas de drift ADSR, pas de quantification destructive).

- [ ] **Step 4: Lint global et build prod**

```bash
npm run lint
npm run build
```

Attendu : aucune erreur, aucun warning nouveau.

- [ ] **Step 5: Inspection devtools — `import.meta.env.DEV` exposures**

En build prod (`npm run preview` après `npm run build`), vérifier que `window.__osa` et `window.__libtransfer` ne sont **pas** exposés (le bloc `if (import.meta.env.DEV)` doit être éliminé par Vite).

```bash
npm run preview
```

Puis console : `typeof window.__osa` → `"undefined"`.

- [ ] **Step 6: Commit (si patch correctif nécessaire suite à cette vérif)**

Si la vérif révèle un bug, fixer et committer. Si tout passe, pas de commit. Cette task est une porte de qualité, pas un livrable.

---

## Task 16: Mise à jour CONTEXT.md

**Files:**
- Modify: `CONTEXT.md`

- [ ] **Step 1: Mise à jour TL;DR**

En haut du `CONTEXT.md`, ajouter un paragraphe après le dernier (sur v1.2.x) :

```markdown
**Itération H (Import/Export)** **clôturée le 2026-05-XX**. Phase 1
(import/export bibliothèque) : nouveau format binaire `.osa` (magic
header OSA1 + gzip(JSON versionné), zéro dépendance npm via
CompressionStream natif). Trois voies d'export — bouton Actions
Download (bibliothèque complète), clic droit row dossier ("Exporter ce
dossier", désactivé si sous-arbre vide), clic droit row patch
("Exporter ce patch"). Modale "Export as..." avec saisie du nom de
fichier, suffixe `.osa` auto, slugification des chars filesystem
interdits. Import unique via bouton Actions Upload : validation
pré-modale strict-strict (magic / gzip / JSON parse / schéma), puis
modale de placement (sous-ensemble dans un dossier wrapper / racine).
IDs systématiquement régénérés à l'import → invariant timeline
préservé (les clips existants ne peuvent jamais être affectés).
Déduplication des noms de dossiers via `nextAvailableFolderName`
(extrait dans `src/lib/folderNames.js` au passage). Nouveau primitive
`Modal.jsx` partagé (backdrop / Escape / focus trap basique).
Persistance auto via la pile undo Designer.
```

- [ ] **Step 2: Mise à jour Arborescence**

Dans la section `## Arborescence`, ajouter sous `src/lib/` :

```
│   ├── osaFormat.js         # format binaire .osa (encode/decode/validate)
│   ├── libraryTransfer.js   # transformations état ↔ payload .osa
│   ├── folderNames.js       # nextAvailableFolderName partagé (extraction H.1.4)
```

Sous `src/components/` :

```
        ├── Modal.jsx + .css          # primitive modale partagé (H.1.8)
        ├── ExportModal.jsx           # modale "Export as..." (H.1.9)
        ├── ImportModal.jsx           # modale post-validation (H.1.13)
```

- [ ] **Step 3: Ajouter Section "Décisions architecturales"**

Vers la section "Décisions architecturales", ajouter cinq entrées (cf. spec §7) :

1. **Format `.osa` = magic `OSA1` + gzip(JSON) versionné** — zéro dépendance npm (CompressionStream natif). Tout changement incompatible du schéma → bump version (`migrateVNtoVN+1` explicite à l'import) ou bump magic (`OSA2`) si on change le wire format. Pas de tolérance silencieuse.

2. **IDs régénérés à l'import (jamais d'overlap)** — garantit que les clips de la timeline ne peuvent jamais être affectés par un import. Les `folderId` / `parentId` internes au payload sont remappés via une table `oldId → newId`. Non négociable.

3. **Validation strict-strict des fichiers `.osa`** — un seul champ malformé = rejet complet. Pas de tolérance partielle. Raison : un fichier partiellement importé est une banque dans un état indéterminé.

4. **Pas de compression du localStorage** (décision *contre*) — on compresse au transport (`.osa`), pas au stockage actif. Si pression sur le quota un jour, IndexedDB ou quantification points, pas gzip-in-localStorage.

5. **Modale comme primitive partagé** (`Modal.jsx`) — pattern manuscrit léger, réutilisé import / export / Paramètres-système-musical. Pas de framework. Si une 4ème modale émerge, vérifier la cohérence d'UX plutôt que diverger.

- [ ] **Step 4: Mise à jour État actuel**

Dans la section `## État actuel`, ajouter sous "Terminé" :

```markdown
- Import / Export bibliothèque format .osa (H.1) : 3 voies d'export
  (Actions Download / menu contextuel folder / menu contextuel patch),
  import unique avec choix de placement (sous-ensemble wrapper / racine),
  IDs régénérés systématiquement, déduplication des noms de dossiers.
```

- [ ] **Step 5: Mise à jour Roadmap & Backlog**

Dans `## Roadmap & Backlog`, retirer "Import / export bibliothèque" du backlog général. Ajouter une section :

```markdown
### Itération H (Import/Export) — clôturée 2026-05-XX

- ✅ **Phase 1** (2026-05-XX) — Import/Export bibliothèque format `.osa`.
  16 sous-commits (1.1-1.16) couvrant : osaFormat (encode/decode/validate),
  libraryTransfer (build/apply), extraction folderNames, action reducer
  IMPORT_LIBRARY undoable Designer, primitive Modal partagé, ExportModal,
  ImportModal, menu contextuel PatchBank folder+patch, wiring App
  complet, intégration round-trip vérifiée, doc CONTEXT.md mise à jour.
```

Retirer aussi du Backlog général "22-EDO Erlich" et "53-EDO" (couverts par X-EDO N=22 et N=53 respectivement — décision prise au début de l'itération H).

- [ ] **Step 6: Mise à jour Historique (chronologie inverse)**

Au début de la section `## Historique (chronologie inverse)`, ajouter une entrée H.1 récapitulant les 16 sous-commits dans l'ordre. Reprendre le style des entrées G.x existantes.

- [ ] **Step 7: Vérifier que le fichier est cohérent**

Relire les modifications du CONTEXT.md, vérifier qu'aucune référence pendante ne traîne (typos, références aux 22-EDO Erlich / 53-EDO qui n'auraient pas été retirées).

- [ ] **Step 8: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: CONTEXT.md — Itération H phase 1 (import/export .osa)"
```

- [ ] **Step 9: Push final**

```bash
git push origin main
```

---

## Auto-vérification du plan

**Couverture de la spec :**

- §1 Objectif (3 granularités) → Tasks 10 (all), 12 (folder/patch via menu)
- §2.1 Magic + structure binaire → Tasks 1, 2
- §2.2 Schéma JSON → Tasks 3 (validation)
- §2.3 Strict-strict → Task 3
- §2.4 Refus export vide → Tasks 5 (EmptyExportError), 10, 12 (toast + disabled)
- §3 Flux export → Tasks 9 (modale), 10 (all), 12 (folder/patch)
- §4 Flux import → Tasks 13 (modale), 14 (wiring + validation + handlers)
- §5.1 Modules → Tasks 1-7
- §5.2 Composants → Tasks 8, 9, 13
- §5.3 Modifications existant → Tasks 4, 7, 10, 11, 12, 14
- §5.4 Reducer → Task 7
- §6 Gestion erreurs → Tasks 3 (sources), 10/14 (toasts)
- §7 Décisions archi à inscrire → Task 16
- §8 Tests anti-régression → Tasks 10, 12, 14, 15
- §9 Hors scope → respecté (rien d'extra)

**Type consistency :** identifiants exportés cohérents — `OSA_MAGIC`, `OSA_VERSION`, `encodeOsa`, `decodeOsa`, `validatePayload`, `OsaMagicError`/`OsaCorruptError`/`OsaParseError`/`OsaSchemaError`, `buildExportPayload`, `applyImport`, `EmptyExportError`, `nextAvailableFolderName`. Tous référencés avec ces noms partout.

**Pas de placeholder** : chaque task a son code, ses commandes, ses critères d'acceptation.
