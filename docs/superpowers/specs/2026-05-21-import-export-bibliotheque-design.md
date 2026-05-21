# Spec — Import / Export de la bibliothèque (`.osa`)

> Date : 2026-05-21
> Statut : spec validée — en attente de plan d'implémentation
> Hérité du backlog G.2.2 (boutons Upload/Download placeholders en panneau Actions Designer)

## 1. Objectif

Permettre à l'utilisateur d'exporter tout ou partie de sa bibliothèque
de patches (patches + dossiers) vers un fichier portable, puis de
réimporter ce fichier ultérieurement — sur la même machine après reset,
ou pour partager avec un autre utilisateur.

Granularité d'export :

- **Bibliothèque complète** — déclenchée depuis le panneau Actions du
  Designer (bouton `Download`).
- **Un dossier et son sous-arbre** — déclenchée depuis un menu
  contextuel sur la row dossier dans PatchBank.
- **Un patch seul** — déclenchée depuis le même menu contextuel sur la
  row patch.

## 2. Format de fichier

### 2.1 Extension et structure binaire

Extension : `.osa` (« On_Synth_App »). Anticipation : `.osaproj` plus
tard pour les exports de projets complets (état Composer + bibliothèque).

```
[4 octets magic : 0x4F 0x53 0x41 0x31 ("OSA1")] [N octets : gzip(JSON)]
```

À l'import : lecture des 4 premiers octets, comparaison stricte au
magic. Mismatch = rejet immédiat sans tentative de décompression.
Match = décompression gzip puis parse JSON.

Compression via les APIs natives `CompressionStream('gzip')` /
`DecompressionStream('gzip')` du navigateur. **Aucune dépendance npm
ajoutée** — cette contrainte est non négociable (cf. CLAUDE.md).

### 2.2 Schéma JSON

```js
{
  version: 1,
  exportedAt: "2026-05-21T14:32:00Z",
  patches: [
    {
      id: "patch-X",                   // ignoré à l'import (régénéré)
      name: "Basse moelleuse",
      color: "#A1B2C3",
      points: [/* 600 floats ∈ [-1, 1] */],
      amplitude: 0.8,
      preset: 'sine' | 'square' | 'sawtooth' | 'triangle' | null,
      attack: 10, hold: 0, decay: 100, sustain: 0.7, release: 200,
      folderId: "folder-X" | null,     // remappé à l'import
      defaultTuningSystem: "12-TET"
    }
  ],
  soundFolders: [
    {
      id: "folder-X",                  // ignoré (régénéré)
      name: "Basses",
      parentId: "folder-Y" | null      // remappé
    }
  ]
}
```

### 2.3 Validation strict-strict à l'import

Toute violation entraîne un rejet complet (état inchangé, toast
descriptif). Pas de tolérance partielle.

**Niveau structure :**

- Magic header correct
- Décompression gzip réussit
- `JSON.parse` réussit
- `version === 1`
- `patches` et `soundFolders` sont des tableaux

**Niveau patch :**

- `id` : string non vide
- `name` : string
- `color` : string matchant `/^#[0-9A-Fa-f]{6}$/`
- `points` : tableau de 600 nombres, chacun ∈ [-1, 1]
- `amplitude`, `sustain` : nombres ∈ [0, 1]
- `attack`, `hold`, `decay`, `release` : nombres ∈ [0, 1000]
- `preset` : ∈ `{'sine', 'square', 'sawtooth', 'triangle', null}`
- `folderId` : `null` ou pointe vers un folder existant dans le payload
- `defaultTuningSystem` : id d'un système du registre `tuningSystems.js`

**Niveau folder :**

- `id` : string non vide
- `name` : string non vide
- `parentId` : `null` ou pointe vers un folder existant dans le payload
- Aucun cycle dans le graphe parent (vérification sur le payload avant
  remap — la topologie ne change pas, seules les étiquettes le font)

### 2.4 Refus d'export vide

Critère : `0 patch dans le scope` → refus. Un sous-arbre composé
uniquement de dossiers vides est aussi refusé (pas de cas d'usage
identifié pour exporter une hiérarchie sans contenu).

Garde double :

- **UI** : bouton Actions `Download` disabled si bibliothèque vide ;
  entrée menu contextuel `"Exporter ce dossier"` disabled si sous-arbre
  sans patches.
- **Safety net** : `buildExportPayload` throw `EmptyExportError` si
  appelé sur un scope vide. Toast `"Rien à exporter"`. Garantit que
  même un path UI bugué n'aboutit jamais à un fichier `.osa` vide.

## 3. Flux export

### 3.1 Modale "Export as..."

Toutes les voies d'export passent par une modale légère (un champ
texte + boutons Annuler/Exporter). Pré-remplissage du nom dépend du
contexte :

- Export complet : `synth-app-bibliotheque-YYYY-MM-DD`
- Export dossier : `<nom-dossier-slugifié>`
- Export patch : `<nom-patch-slugifié>`

Le suffixe `.osa` est automatiquement ajouté si absent (ex. `foo` →
`foo.osa`, `foo.txt` → `foo.txt.osa` — pas de remplacement d'extension,
juste un append si le nom ne se termine pas déjà par `.osa`).
Slugification : remplacement des caractères filesystem-interdits
(`/ \ : * ? < > | "`, contrôles) par `_`. Espaces et accents préservés.
Nom vide après trim = bouton `Exporter` disabled.

Comportement navigateur après confirmation : on passe le nom à
`<a download="...">` et on déclenche le download programmatique. Selon
la config du navigateur, soit le fichier est sauvé directement, soit
une Save As OS s'ouvre avec notre nom préfillé (éditable). Limitation
non bypassable, et acceptable — on garde la maîtrise du nom, le
navigateur garde la maîtrise du "où" et du "confirme".

### 3.2 Voies de déclenchement

**A. Bouton Actions `Download`** (panneau Actions Designer)

1. `disabled` si `patches.length === 0`.
2. Clic → ouvre la modale Export avec scope `{ type: 'all' }`,
   nom pré-rempli `synth-app-bibliotheque-2026-05-21`.

**B. Menu contextuel sur row dossier** (PatchBank)

1. Clic droit sur la row → menu avec entrée `"Exporter ce dossier"`.
2. Entrée disabled si sous-arbre sans patches.
3. Clic → modale Export avec scope `{ type: 'folder', id }`,
   nom pré-rempli `<slug du nom dossier>`.

**C. Menu contextuel sur row patch** (PatchBank)

1. Clic droit sur la row → menu avec entrée `"Exporter ce patch"`.
2. Toujours activable (un patch a toujours du contenu).
3. Clic → modale Export avec scope `{ type: 'patch', id }`,
   nom pré-rempli `<slug du nom patch>`.

### 3.3 Construction du payload selon le scope

`buildExportPayload({ patches, soundFolders, scope })` :

- **scope = `{ type: 'all' }`** : tous les patches + tous les
  soundFolders. Throw `EmptyExportError` si `patches.length === 0`.
- **scope = `{ type: 'folder', id }`** : sous-arbre récursif —
  inclut le folder ciblé, tous ses descendants, tous les patches
  dont `folderId ∈ {folder, descendants}`. Le `parentId` du folder
  racine est mis à `null` (il deviendra racine du payload). Throw
  `EmptyExportError` si 0 patch dans le sous-arbre.
- **scope = `{ type: 'patch', id }`** : `patches: [le patch]` avec
  `folderId: null`, `soundFolders: []`.

Une fois le payload construit, `encodeOsa(payload)` produit un Blob
(magic + gzip(JSON)) qui est ensuite proposé en download.

## 4. Flux import

### 4.1 Déclenchement

Bouton Actions `Upload` (panneau Actions Designer). Toujours activable.

Au clic, déclenchement d'un `<input type="file" accept=".osa" hidden>`
caché. La sélection utilisateur dispatch `handleFileSelected(file)`.

### 4.2 Validation pré-modale

Effectuée avant toute interaction utilisateur supplémentaire (l'idée :
si le fichier est mauvais, l'utilisateur l'apprend avant d'avoir à
choisir un mode d'import).

```
1. file.arrayBuffer()
2. decodeOsa(buffer) :
   - check magic         → OsaMagicError
   - DecompressionStream → OsaCorruptError
   - JSON.parse          → OsaParseError
   - validatePayload     → OsaSchemaError(description)
```

Chaque erreur correspond à un toast utilisateur précis (cf. §6).

### 4.3 Modale de placement

Si la validation passe, la modale s'ouvre :

```
┌─ Importer ma-banque.osa ───────────────────────┐
│  47 patches, 6 dossiers détectés               │
│                                                │
│  ⦿ Comme sous-ensemble dans un nouveau dossier │
│     Nom : [ma-banque              ]            │
│                                                │
│  ○ À la racine de la bibliothèque              │
│     (dossiers de premier niveau du fichier     │
│      deviennent racines de la bibliothèque)    │
│                                                │
│             [ Annuler ]  [ Importer ]          │
└────────────────────────────────────────────────┘
```

- Mode par défaut : **sous-ensemble** (le plus prévisible).
- Nom du wrapper pré-rempli au nom du fichier sans extension.
- Champ nom visible uniquement en mode `subset`.
- Bouton `Importer` disabled si mode `subset` et nom vide après trim.

### 4.4 Commit (dispatch `IMPORT_LIBRARY`)

`applyImport(payload, mode, wrapperName, currentState)` produit le
delta à dispatcher :

1. **Remappage IDs** : chaque folder et patch du payload reçoit un
   nouvel ID via `folderCounter` / `patchCounter` (incrémentés). Une
   table `oldId → newId` est construite. Tous les `parentId` (folders)
   et `folderId` (patches) du payload sont remappés via cette table.

2. **Mode subset** : un folder wrapper supplémentaire est créé
   (`name: wrapperName`, `parentId: null`). Les anciennes racines du
   payload (folders avec `parentId: null` après remap) sont
   reparentées sur le wrapper. Les patches orphelins du payload
   (`folderId: null`) y vont aussi.

3. **Mode root** : les anciennes racines du payload restent à
   `parentId: null`. Patches orphelins → racine bibliothèque
   (`folderId: null`).

4. **Déduplication noms dossiers** : pour chaque folder importé
   (wrapper inclus), appliquer
   `nextAvailableFolderName(name, allFoldersAfterMerge)` —
   réutilise la fonction existante (PatchBank.jsx:5), suffixe ` (2)`,
   ` (3)`. Comportement cohérent avec la création manuelle de dossier.

5. **Patches** : noms conservés tels quels (cohérent avec le reste de
   l'app — pas de contrainte d'unicité sur les noms de patches).

6. **Reset de `fileInputRef.value`** après la sélection pour permettre
   à l'utilisateur de re-sélectionner le même fichier.

Toast succès : `"Importé : N patches, M dossiers"`.

## 5. Architecture code

### 5.1 Nouveaux modules

```
src/lib/osaFormat.js
  - OSA_MAGIC = [0x4F, 0x53, 0x41, 0x31]
  - OSA_VERSION = 1
  - async encodeOsa(payload) → Promise<Blob>
  - async decodeOsa(arrayBuffer) → Promise<payload>
  - class OsaMagicError, OsaCorruptError, OsaParseError, OsaSchemaError
  - validatePayload(obj) → payload sanitisé | throw OsaSchemaError

src/lib/libraryTransfer.js
  - buildExportPayload({ patches, soundFolders, scope })
      → payload | throw EmptyExportError
  - applyImport(payload, mode, wrapperName,
                { patches, soundFolders, folderCounter, patchCounter })
      → { newPatches, newFolders,
          patchCounterAfter, folderCounterAfter }
  - class EmptyExportError
```

Les deux modules sont **purs** (pas de DOM, pas d'état React) et
testables isolément. La validation de format vit dans `osaFormat`,
la logique d'état dans `libraryTransfer`. Séparation transport / état.

### 5.2 Nouveaux composants

```
src/components/Modal.jsx + .css     — primitive partagé
  Props : { isOpen, onClose, title, children, size? }
  Backdrop fixed cliquable, Escape close, focus trap basique,
  scroll body bloqué pendant ouverture.

src/components/ExportModal.jsx
  Props : { isOpen, defaultName, scope, onConfirm(filename), onCancel }
  Un champ texte + boutons. Slugification + extension automatique.

src/components/ImportModal.jsx
  Props : { isOpen, payload, fileName,
            onConfirm(mode, wrapperName), onCancel }
  Compteurs + radio mode + input nom wrapper (conditionnel) + boutons.
```

Le primitive `Modal.jsx` peut être nourri de la modale existante
"Paramètres du système musical" (v1.1.0) si extraction utile sans
régression. À évaluer au moment de l'implémentation.

### 5.3 Modifications à l'existant

```
src/reducer.js
  - case 'IMPORT_LIBRARY' : merge newPatches / newFolders,
    met à jour patchCounter / folderCounter.
  - Ajout 'IMPORT_LIBRARY' à DESIGNER_UNDOABLE (l.1461).

src/components/PatchBank.jsx
  - State local contextMenu (calqué Timeline.jsx).
  - onContextMenu sur rows folder et patch.
  - Rendu inline du menu + backdrop (pattern Timeline).
  - Nouvelles props onExportFolder(folderId), onExportPatch(patchId),
    isFolderEmpty(folderId) pour le disabled de l'entrée folder.

src/components/WaveformEditor.jsx
  - Boutons Upload/Download : retrait du disabled, ajout onClick.
  - Nouvelles props onImport(), onExport(), canExport (pour le disabled
    du bouton Download).

src/App.jsx
  - State UI : exportModal (useState), importModal (useState).
  - Handlers : handleExportAll, handleExportFolder, handleExportPatch,
    handleImportClick, handleFileSelected, handleConfirmExport,
    handleConfirmImport.
  - <input type="file" accept=".osa" hidden ref={fileInputRef}>.
  - Rendu conditionnel des deux modales.
```

### 5.4 Reducer — `IMPORT_LIBRARY`

```js
case 'IMPORT_LIBRARY': {
  const { newPatches, newFolders,
          patchCounterAfter, folderCounterAfter } = action
  return {
    ...state,
    patches: [...state.patches, ...newPatches],
    soundFolders: [...state.soundFolders, ...newFolders],
    patchCounter: patchCounterAfter,
    folderCounter: folderCounterAfter
  }
}
```

Pile undoable : Designer (`DESIGNER_FIELDS = ['patches', 'soundFolders',
'editor']`). Les compteurs ne sont snapshotted dans aucune pile —
forward-only par construction. Conséquence souhaitable : undo d'un
import efface les patches/folders ajoutés sans réémettre leurs IDs
plus tard. Cohérent avec SAVE_PATCH existant.

## 6. Gestion d'erreurs

| Erreur | Origine | Toast |
|--------|---------|-------|
| Magic mismatch | osaFormat | `"Fichier non reconnu (format .osa attendu)"` |
| Gzip échoue | osaFormat | `"Fichier corrompu"` |
| JSON.parse échoue | osaFormat | `"Contenu malformé"` |
| Schéma invalide | osaFormat | `"Fichier invalide : <description précise>"` (champ fautif) |
| Empty export | libraryTransfer | `"Rien à exporter"` |
| FileReader fail | App | `"Lecture du fichier impossible"` |

Tous les toasts via le composant `Toast.jsx` existant. À vérifier au
moment de l'implémentation s'il supporte plusieurs messages ou s'il
faut l'enrichir d'une variante d'erreur (probable que non — wording
suffit).

## 7. Décisions architecturales à inscrire dans CONTEXT.md

À ajouter en section "Décisions architecturales" après livraison :

1. **Format `.osa` = magic header `OSA1` + gzip(JSON) versionné**
   (zéro dépendance npm, CompressionStream natif). Tout changement
   incompatible du schéma → bump version (puis `migrateVNtoVN+1`
   explicite à l'import) ou bump magic (`OSA2`) si on change le wire
   format. Pas de tolérance silencieuse.

2. **IDs régénérés à l'import** (jamais d'overlap entre payload et
   state). Garantit que les clips de la timeline ne peuvent jamais
   être affectés par un import. Les `folderId` / `parentId` internes
   au payload sont remappés via une table `oldId → newId`. Non
   négociable.

3. **Validation strict-strict des fichiers `.osa`** : un seul champ
   malformé = rejet complet. Pas de tolérance partielle. Raison : un
   fichier partiellement importé est une banque dans un état
   indéterminé, source de bugs subtils plus tard.

4. **Pas de compression du localStorage** (décision *contre*) : on
   compresse au transport (`.osa`), pas au stockage actif. Le path
   chaud localStorage doit rester synchrone et bon marché. Si la
   pression sur le quota devient réelle, la bonne réponse est
   IndexedDB ou quantification des points, pas gzip-in-localStorage.

5. **Modale comme primitive partagé** (`Modal.jsx`) : pattern
   manuscrit léger (backdrop, Escape, focus trap), réutilisé par les
   modales import / export / Paramètres-système-musical. Pas de
   framework. Si une 4ème modale émerge, vérifier la cohérence d'UX
   (backdrop close-on-outside, animation, padding) plutôt que de
   chacune diverger.

## 8. Vérification anti-régression / tests manuels

- Export complet, dossier, patch : fichier `.osa` non lisible
  directement (`file foo.osa` ne dit pas "gzip compressed"). Magic
  bytes corrects (vérifier au `xxd`).
- Round-trip : exporter puis importer immédiatement. Pas de
  duplication d'IDs côté state, structure préservée.
- Import mode `subset` : wrapper créé avec nom personnalisé.
  Déduplication si collision.
- Import mode `root` : folders racine du fichier deviennent racines
  de la bibliothèque. Déduplication si collision.
- Import alors que la timeline référence `patch-3` : aucun effet sur
  les clips, patches importés ont des IDs neufs (au-delà du
  `patchCounter` actuel).
- Undo après import : tous les patches/folders importés disparaissent
  en un undo, compteurs ne reviennent pas en arrière.
- Fichier corrompu (gzip cassé manuellement) : toast correct, état
  inchangé.
- Fichier non `.osa` (JSON brut, image, etc.) : toast magic, état
  inchangé.
- Export bibliothèque vide : bouton disabled, modale ne s'ouvre pas.
- Re-sélection du même fichier `<input type="file">` après cancel :
  doit fonctionner (reset de `value` côté handler).

## 9. Hors scope (à ne pas faire dans cette phase)

- Sélection multi-éléments arbitraire à l'export (option C écartée
  Q1 — la modale de sélection n'apporte pas assez face à folder+patch
  contextuel).
- Hash / signature des fichiers (écarté Q4 — pas de gain réel sans
  secret-key).
- Compression du localStorage (cf. décision archi 4).
- Format `.osaproj` (export de projets complets avec état Composer).
  Anticipation de nommage seulement.
- Drag-and-drop de fichiers `.osa` directement sur la fenêtre app
  (alternative à l'`<input type="file">`). Backlog futur si pertinent.
- Aperçu / preview du contenu d'un `.osa` avant import (au-delà des
  compteurs `N patches, M dossiers`).
