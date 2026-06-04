# Prompt dev — Itération N · Phase 5a : Effacer le timbre sans confirmation

**Type** : `fix(iter-N/phase-5a)`. Petit, isolé.

## Demande

Le bouton **Effacer le timbre** (icône `Eraser`) de `DesignerToolbar`, à côté du
nom du patch, ouvre une `ConfirmDialog` (« on confirme ? ») à chaque clic. On veut
qu'il **s'applique directement, sans confirmation** — l'undo (Ctrl+Z) est le filet.

## Pourquoi c'est sûr

`onReset` → `requestResetWaveform` → `confirmResetWaveformOpen` (dialog) →
`doResetWaveform` → `editorActions.resetWaveform()`. Le reset est **undoable**
(`WaveformEditor.jsx` l.1401 : « pas de confirmation (undoable) » pour la même
classe d'action ; portée resserrée M.r.2.6 = canonical + ancres + interpolation +
résidu, `cap` et nombre d'ancres préservés). Donc retirer la confirmation ne perd
rien : Ctrl+Z restaure.

## Fix (`src/components/WaveformEditor.jsx`)

- Le bouton Effacer doit appeler **directement** `editorActions.resetWaveform()`
  (chemin de `doResetWaveform`, sans ouvrir de dialog).
- Retirer ce qui ne sert plus **pour le reset uniquement** : l'état
  `confirmResetWaveformOpen`, le helper `requestResetWaveform`, et l'instance de
  `ConfirmDialog` dédiée au reset. Ce qui est exposé au layout via le render-prop
  (l.2761, `requestResetWaveform`) doit pointer vers le reset immédiat.

## Ne PAS toucher

- La confirmation de **« Nouveau patch »** (`confirmNewOpen`, Ctrl+Alt+N) — action
  plus destructrice, hors scope, garde sa confirmation.
- La confirmation d'**écrasement au chargement de preset** (`confirmLoadPreset`) —
  hors scope.
- Le **point 1** (retrait de la barre des presets géométriques) → atterrira avec
  N.5c (la modale qui la remplace), pas ici.

## Vérifications

- Clic sur Effacer → le timbre est effacé **immédiatement**, aucun dialog.
- **Ctrl+Z** juste après → le timbre est **restauré** (confirme l'undo).
- « Nouveau patch » garde bien sa confirmation.
- `npm run build && npm run lint && npm run typecheck` verts (pas de `ConfirmDialog`
  / état orphelin laissé).
- MAJ `CONTEXT.md` + backlog. Commit `fix(iter-N/phase-5a): …`, push.
