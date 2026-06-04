# Prompt dev — Itération N · Phase 5e : chargement preset + phase de la scie

**Type** : `fix(iter-N/phase-5e.1)` et `fix(iter-N/phase-5e.2)`. Deux correctifs
remontés en passe d'usage N.5c. Indépendants.

## 5e.1 — Charger un preset doit se comporter comme « Effacer » (pas comme Ctrl+Alt+N)

**Problèmes** :
1. Le chargement demande **systématiquement** de confirmer l'écrasement.
2. Il **détache du patch courant** : `LOAD_PRESET` (reducer ~l.1877) pose
   `currentPatchId: null` → effet « nouveau patch », comme Ctrl+Alt+N.

Or **Effacer** (`RESET_EDITOR_WAVEFORM`, N.5a) est la bonne référence : **pas de
confirmation** (undo = filet) et **conserve `currentPatchId`** (remplace le timbre
en place, marque dirty).

**Fix** :
- **Reducer** : dans `LOAD_PRESET`, **retirer `currentPatchId: null`** → conserver
  `currentPatchId` (chargement en place, comme `RESET_EDITOR_WAVEFORM`).
- **UI** (`WaveformEditor`) : retirer la **confirmation d'écrasement** du
  chargement de preset — charger directement. Supprimer `pendingPresetPayload`,
  `confirmLoadPreset` et le `ConfirmDialog` associé au preset. `onPick` →
  `editorActions.loadPreset(payload)` direct. (Undo restaure.)

**Vérif** : charger un preset depuis un patch sauvegardé → aucune confirmation, on
**reste sur le même patch** (dirty), Ctrl+Z restaure l'état d'avant. Ctrl+Alt+N
garde, lui, sa confirmation et son comportement « nouveau patch ».

## 5e.2 — Dent de scie chargée en phase inversée

**Problème** : `idealWaveform('sawtooth')` = `2*t − 1` (`src/lib/waveforms.js`
~l.50). Sa série de Fourier est en **−sin** (phase inversée vs la convention
canonique sinus, qui est en +sin). Conséquence : la version **normalisée**
apparaît **à l'envers** (le Normaliser retourne la forme).

**Fix** : `case 'sawtooth': pts[i] = 1 - 2 * t` (au lieu de `2 * t - 1`). La scie
est alors en **+sin = phase canonique** → la band-limitée et la normalisée
coïncident, **plus de flip au Normaliser**.

> Conséquence visuelle assumée : la scie idéale **descend** (de +1 à −1, saut en
> fin de période) au lieu de monter. C'est la seule orientation « flip-free »
> (monter = phase −sin = retournée au Normaliser). Vérifié : carré (déjà +sin) et
> sinus sont OK ; le triangle change de forme au Normaliser **par nature** (vue
> cosinus → vue sinus, c'est la dualité voulue, pas un bug). La scie était la seule
> avec ce flip parasite.

**Vérif** : charger la scie → Normaliser ne retourne plus la forme (band-limitée
et normalisée alignées).

## Global

- `npm run build && npm run lint && npm run typecheck` verts.
- MAJ `CONTEXT.md` + backlog. Commits `fix(iter-N/phase-5e.{1,2}): …`, push.

## Hors scope

- Renommage de « Presets » (en cours de décision archi).
- Ajout de nouveaux timbres (en cours de cadrage).
- N.4, N.6.
