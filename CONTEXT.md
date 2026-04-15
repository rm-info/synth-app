# CONTEXT.md — Synth App

> Document maintenu automatiquement par Claude Code. Mis à jour à chaque fin de phase.
> Coller en début de session pour briefer un nouveau modèle/contexte.

## Objectif

Synthétiseur web pédagogique / créatif : dessiner des formes d'onde à la souris,
les assembler en compositions musicales sur une timeline, exporter en WAV.
**Contrainte forte** : Web Audio API natif uniquement, pas de lib audio externe.

## Stack

- React 19 + Vite 8 (SWC via `@vitejs/plugin-react`)
- ESLint 9
- Pas de TypeScript, pas de state manager, pas de routing
- Persistance : `localStorage` (clé `synth-app-state`)

## Arborescence

```
synth-app/
├── CONTEXT.md                # ce fichier
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
└── src/
    ├── main.jsx              # entry point React
    ├── App.jsx               # état global + composition
    ├── App.css
    ├── index.css
    ├── audio.js              # DFT -> PeriodicWave, encodage WAV, palette couleurs
    ├── assets/               # logos du template Vite (résiduel, non utilisé)
    └── components/
        ├── WaveformEditor.jsx + .css
        └── Timeline.jsx + .css
```

## Modèle de données

```ts
type SoundFolder = {              // racine virtuelle si parentId === null
  id: string                      // "folder-N"
  name: string
  parentId: string | null
}

type SavedSound = {
  id: string                      // "sound-N"
  name: string                    // "A4", "C#3", ou "Son N" en mode libre
  color: string                   // hex, palette SOUND_COLORS (12 couleurs)
  points: number[]                // 600 échantillons [-1, 1] — résolution canvas
  frequency: number               // Hz
  amplitude: number               // 0..1
  mode: 'note' | 'free'           // détecte les doublons
  noteIndex: number | null        // 0-11 (C..B), null en free
  octave: number | null           // 1-7
  preset: 'sine'|'square'|'sawtooth'|'triangle'|null  // null = dessin custom
  attack: number                  // ms, 0-500
  decay: number                   // ms, 0-500
  sustain: number                 // 0..1
  release: number                 // ms, 0-500
  folderId: string | null         // null = racine
}

type Track = {
  id: string                      // "track-N"
  name: string                    // "Piste 1" par défaut
  color: string | null
  muted: boolean
  solo: boolean
  volume: number                  // 0..1
  height: number                  // px
}

type Clip = {                     // ex-Note (placement timeline)
  id: string                      // "clip-N"
  trackId: string
  soundId: string
  measure: number                 // 1-indexée, 1..numMeasures
  beat: number                    // en noires dans la mesure, 0..3.75 (snap 0.25 = 16ᵉ)
  duration: number                // en noires : 4=ronde, 2=blanche, 1.5=noire pointée,
                                  // 1=noire, 0.75=croche pointée, 0.5=croche, 0.25=double
}

// Persistance (localStorage) :
// { savedSounds, soundFolders, tracks, clips, bpm, numMeasures,
//   soundCounter, clipCounter }
// Migration auto des formats legacy au chargement (notes→clips, IDs note-N→clip-N,
// trackId par défaut "track-default", folderId null par défaut, numMeasures inféré).
```

⚠️ Vocabulaire : les **notes musicales** (C, D, E…) restent appelées "notes".
Seuls les **placements timeline** s'appellent "clips".

**Track par défaut** (créé en migration si absent) :
`{ id:"track-default", name:"Piste 1", color:null, muted:false, solo:false, volume:1, height:80 }`

**Constantes** : `BEATS_PER_MEASURE=4`, BPM 60-240 (défaut 120),
`numMeasures` 16 par défaut (modifiable, prochainement).
**Formule temps** : `seconds = beats * 60 / bpm` (1 noire à 120 bpm = 0.5s).

## Composants

### `App.jsx` — racine
- Détient tout l'état du modèle : `savedSounds`, `soundFolders`, `tracks`, `clips`,
  `bpm`, `numMeasures` + refs counters (`soundCounterRef`, `clipCounterRef`)
- Persistance auto via `useEffect`
- Détection de doublons en mode note (note + octave + waveform via preset ou similarité
  moyenne des points < 0.01)
- Handlers : `handleSaveSound`, `handleAddClip`, `handleRemoveClip`, `handleUpdateClip`,
  `handleClearTimeline`, `handleDeleteSound`, `handleRenameSound`
- État UI (à venir) : `selectedClipIds`, `currentSoundId`, `zoomH`, `zoomV`,
  `activeTab` — ajoutés dans les phases qui les consomment.

### `WaveformEditor.jsx`
- Canvas 600×300 dessinable à la souris (interpolation linéaire)
- Presets Sine / Square / Sawtooth / Triangle / Clear (tracking `activePreset`)
- Sélecteur note + octave (tempérament égal) OU slider fréquence libre 20-2000 Hz,
  toggle entre les deux modes
- Éditeur ADSR **visuel** 400×120 : 4 poignées draggables (P1 attack, P2 decay+sustain,
  P3 fin sustain non-draggable, P4 release), courbe cyan + remplissage, sliders read-only
  en dessous
- Preview Play/Stop avec enveloppe AD→sustain hold puis release, cleanup via `osc.onended`
- Badge "prochain nom" en haut à droite
- Message flash 2s (doublon / canvas vide)

### `Timeline.jsx`
- Header : input BPM 60-240, temps live `X.Xs / Y.Ys`, Play/Stop toggle, Effacer,
  Exporter WAV, zoom −/+ (40-200px par mesure)
- Banque de sons : chips draggables, double-clic = rename inline (Enter/blur valide,
  vide annule, Escape annule), × avec confirm si utilisé
- Grille : 16 mesures × 4 `.beat-cell` (pointillés), drop unique sur `.cells-wrapper`
  avec snap 16ᵉ + clamp anti-débordement
- Clips placés (couche absolue) : lane layout greedy pour polyphonie, `<select>` durée
  embarqué, clic droit = retirer
- Curseur de lecture + visualiseur oscilloscope (canvas 900×120, ligne verte 2px) via
  `AnalyserNode`, visible pendant lecture uniquement

### `audio.js`
- `pointsToPeriodicWave(points, ctx)` — DFT 256 points
- `SOUND_COLORS` — palette de 12 couleurs
- `audioBufferToWav(buffer)` — encode PCM 16 bits stéréo (mono dupliqué L+R)
- `downloadWav(ab, filename)` — blob + `<a download>` programmatique

## Architecture audio

- **Live** : chaque note → `OscillatorNode` (PeriodicWave) → `GainNode` (ADSR) →
  `analyserGain` → `AnalyserNode` + `destination`
- **Export WAV** : `OfflineAudioContext(2, sampleRate * totalDurationSec, 44100)`,
  même `scheduleNotes()`, mono up-mixé en stéréo, encodage RIFF/PCM16
- **ADSR par note** : rampes linéaires attack→peak→sustain→hold→release→0
  avec `clipDuration = max(noteDurationSec, attack+decay+release)`

## Itération en cours : A — Refonte UX core

Découpée en 6 phases. Voir le brief original pour les détails.

- ✅ **Phase 1** — Refonte modèle de données + migration (Note→Clip, +Track,
  +SoundFolder, +numMeasures, IDs préfixés, migration localStorage transparente)
- 🔜 Phase 2 — Layout split en 2 onglets (Designer / Composer) + responsive
- 🔜 Phase 3 — Fixes UX et zoom (BPM input, zoom H/V continu, subdivision, oscilloscope persistant)
- 🔜 Phase 4 — Édition de clips (sélection, drag, resize, panneau Properties)
- 🔜 Phase 5 — Mesures dynamiques
- 🔜 Phase 6 — Undo/Redo (migration vers useReducer)

**Décisions UX clés (à mémoire pour Iter A)**
- Sauvegarde dans l'éditeur quand `currentSoundId` est non-null : 2 boutons distincts
  ("Mettre à jour" + "Enregistrer comme nouveau"). Action "Mettre à jour" undoable.
- Banque de sons : sidebar gauche (les 2 onglets, composant partagé).
- Properties panel : sidebar droite sur grand écran, bottom-sheet collapsible <1100px.
- Éditeur waveform reste détaché : modifs locales n'affectent rien tant qu'on n'a
  pas cliqué Sauvegarder/MAJ. `useEffect` hydrate l'état local quand `currentSoundId` change.
  Confirm si modifs non sauvegardées au moment du switch.

## État actuel

✅ **Terminé**
- Dessin waveform + presets
- Mode note tempérée + mode fréquence libre
- Éditeur ADSR visuel draggable
- Preview Play/Stop avec enveloppe
- Détection doublons + messages flash
- Banque de sons : drag, rename, delete
- Drop timeline avec snap 16ᵉ, polyphonie multi-lanes
- Sélecteur durée musicale par note (7 options)
- BPM ajustable + recalcul durée totale
- Curseur animé + affichage temps
- Zoom horizontal
- Visualiseur oscilloscope temps réel
- Export WAV PCM 16-bit stéréo
- Persistance localStorage + migration

🔜 **Prochaine phase** : Iter A — Phase 2 (split en 2 onglets Designer/Composer)

## Historique (chronologie inverse)

0. **Iter A — Phase 1** : refonte modèle (Note→Clip, +Track/SoundFolder/numMeasures,
   migration localStorage transparente, IDs préfixés). Aucun changement d'UI.
1. **Refactor son↔note** : duration retirée des sounds, déplacée sur les notes ;
   BPM, beat, duration musicale ; beat subdivisions dans la grille ; migration localStorage
2. **Éditeur ADSR visuel** : canvas + poignées draggables remplacent les sliders
3. **Export WAV + zoom + visualiseur**
4. **Durée + ADSR par son** (avant refactor son↔note)
5. **Nom par défaut + doublons + rename inline**
6. **Persistance localStorage + suppression de sons**
7. **Sélecteur note musicale tempérée**
8. **Timeline initiale** : grille + drag-drop + lecture polyphonique + curseur
9. **WaveformEditor initial** : canvas + PeriodicWave + Play/Stop

## Règles de travail

- Pas de lib audio externe, Web Audio natif uniquement
- Formule BPM utilisée : `seconds = beats * 60 / bpm` (pas `× 4`, pour cohérence
  musicale standard : noire = 1 unité)
- Git : remote `origin` = `git@github.com:rm-info/synth-app.git`, branche `main`
- CONTEXT.md mis à jour à chaque fin de phase par Claude Code
