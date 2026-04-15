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
type SavedSound = {
  id: string                     // "sound-N"
  name: string                   // "A4", "C#3", ou "Son N" en mode libre
  color: string                  // hex, palette SOUND_COLORS (12 couleurs)
  points: number[]               // 600 échantillons [-1, 1] — résolution canvas
  frequency: number              // Hz
  amplitude: number              // 0..1
  mode: 'note' | 'free'          // détecte les doublons
  noteIndex: number | null       // 0-11 (C..B), null en free
  octave: number | null          // 1-7
  preset: 'sine'|'square'|'sawtooth'|'triangle'|null  // null = dessin custom
  attack: number                 // ms, 0-500
  decay: number                  // ms, 0-500
  sustain: number                // 0..1
  release: number                // ms, 0-500
}

type Note = {                    // anciennement "Placement"
  id: string                     // "note-N"
  soundId: string
  measure: number                // 1-indexée, 1..16
  beat: number                   // en noires dans la mesure, 0..3.75 (snap 0.25 = 16ᵉ)
  duration: number               // en noires : 4=ronde, 2=blanche, 1.5=noire pointée,
                                 // 1=noire, 0.75=croche pointée, 0.5=croche, 0.25=double
}

// Persistance (localStorage) :
// { savedSounds, notes, bpm, soundCounter, noteCounter }
// Migration auto des formats legacy au chargement.
```

**Constantes** : `NUM_MEASURES=16`, `BEATS_PER_MEASURE=4`, BPM 60-240 (défaut 120).
**Formule temps** : `seconds = beats * 60 / bpm` (1 noire à 120 bpm = 0.5s).

## Composants

### `App.jsx` — racine
- Détient tout l'état : `savedSounds`, `notes`, `bpm` + refs counters
- Persistance auto via `useEffect`
- Détection de doublons en mode note (note + octave + waveform via preset ou similarité
  moyenne des points < 0.01)
- Handlers : `handleSaveSound`, `handleAddNote`, `handleRemoveNote`, `handleUpdateNote`,
  `handleClearTimeline`, `handleDeleteSound`, `handleRenameSound`

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

🔜 **Prochaine phase** : à définir avec l'utilisateur

## Historique (chronologie inverse)

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
