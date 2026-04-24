# CONTEXT.md — Synth App

> Document maintenu automatiquement par Claude Code. Mis à jour à chaque fin de phase.
> Coller en début de session pour briefer un nouveau modèle/contexte.

## TL;DR

Synthétiseur web pédagogique : on dessine une forme d'onde à la souris,
on la place sur une timeline multipiste, on exporte en WAV. Stack minimale :
React 19 + Vite, Web Audio API native, persistance localStorage. **Pas de
TypeScript, pas de lib audio, pas de state manager, pas de framework UI,
pas de routing.** Itération A (refonte UX core : 2 onglets Designer/Composer,
dual save, zoom %, édition clips, undo/redo) **clôturée le 2026-04-15**.
Itération B **clôturée le 2026-04-17** (spectrogramme statique ;
multi-sélection + drag/resize/dup/delete groupés + Properties multi ;
copier/coller/fusion/split clips ; scroll/zoom Ctrl/Alt+drag ;
répertoires de sons arborescents avec drag interne ; menu contextuel
mesures avec supprimer/insérer/couper/copier/coller).
Itération C **clôturée le 2026-04-18** (multipiste : UI multi-tracks,
mute/solo/volume, moteur audio look-ahead, adaptation features A/B).
Itération D (Designer UX) **clôturée le 2026-04-19** : Phase 1 — sélecteur
de système `tuningSystem` (12-TET + Libre), mode libre étendu à 2^4-2^15
Hz (16-32768), clavier piano 12 notes + sélecteur d'octave 0-10, trois
boutons Test (impact/court/tenu).
Itération E (Patches vs Notes) **clôturée le 2026-04-22** — refonte
conceptuelle majeure. Phase 1 (2026-04-19) : les **sons** deviennent des **patches**
sans fréquence ni note ; la hauteur est portée par chaque **clip**
(tuningSystem + noteIndex/octave en 12-TET, ou frequency en Libre).
Un patch peut être joué à n'importe quelle hauteur sans duplication.
Pas de migration : ancien localStorage détecté → reset propre.
Phase 2 (2026-04-19) : la note s'affiche dans chaque clip (label
adaptatif selon largeur), s'édite dans Properties via un mini-clavier
(ou un FreqInput en mode libre), et s'ajuste au clavier (↑↓ demi-ton,
Shift octave, ←→ ±0.125 beat, Shift+←→ ±1 beat). Phase 3 (2026-04-19) :
le Designer devient un instrument de test polyphonique — clic/mouseup
sur le clavier, raccourcis QWERTY physique (SDFGHJK + ERYUI), PageUp/
PageDown pour décaler l'octave, Espace = pédale de sustain. Les 3 anciens
boutons Test impact/court/tenu sont retirés. Phase 4 (2026-04-19) :
dans le Composer, touche maintenue pendant un drag = drop à la note
correspondante (au lieu de la note par défaut du Designer). Touche
seule sans drag = placement contigu après le dernier clip touché
(permet d'écrire une mélodie au clavier en quelques touches).
Phase 6 (2026-04-20) : durées en boutons toggle (7 bases + 3 coefs),
snap triple croche (0.125), indicateur d'octave dans la toolbar,
animation des corridors 0.35s. Phase 7 (2026-04-20) : ajustements UI
— sync invariant `lastAnchorClipId ↔ selectedClipIds`, fraction
réf noire (1=noire, 1/2=croche), sidebars Composer resizables et
collapsibles (persist localStorage, label vertical en mode fermé),
settling frame pour animation drag cross-piste.
Phases 8-9 (2026-04-22) : fixes audio — release ADSR sur appui bref
(capture `gain.value` avant `cancelScheduledValues`), micro-fades
anti-clic démarrage (`MIN_ATTACK = 3ms`) et retrigger
(`RETRIGGER_FADE = 8ms`).
Itération F (multi-tempérament) **ouverte le 2026-04-22**. Phase 1 :
infrastructure posée — registre des systèmes de tempérament
(`src/lib/tuningSystems.js`) comme point d'extension unique, A4 de
référence configurable dans le modèle (champ `a4Ref`, défaut 440 Hz,
persisté, sans UI encore exposée). Phase 2 (2026-04-22) : premier
tempérament alternatif — **Pythagoricien 12 centré sur C** (chaîne
de quintes pures 3:2, loup entre F# et Db), sélecteurs de système
dynamisés (Designer + Properties), ajout du sélecteur dans
PropertiesPanel avec logique de bascule verrouillée au reducer
(`UPDATE_CLIPS_PITCH` dérive les champs cohérents — frequency /
noteIndex-octave — au changement de système). Nouvel input A4 dans
la toolbar Composer (`A4Input`, 380-480 Hz entiers).
Phase 3 (2026-04-23) : **multi-tempérament 24 notes**. Registre
enrichi (champs `layout` et `keyboardMap` portés par chaque entrée),
`keyboardMap.js` supprimé. Deux nouveaux tempéraments **24-TET égal**
et **24-TET Le Caire 1932** (table en dur, source aly-abbara.com,
ancrée 'Oshairan = A4 = 440 Hz). Clavier visuel adaptatif :
`PianoKeyboard` devient un dispatcher (`piano-12` / `grid-24`),
`Grid24Layout` rend une grille 4 rangées × 14 colonnes avec 4 niveaux
de couleur (naturelles, demi-dièses/-bémols, dièses pleins). Mapping
QWERTY 24 positions exactement (S/D/F/G/H/J/K + E/R/T/Y/U/I/O +
2/4/6/8/0 + X/C/B/N/,). Refonte raccourcis durées : NumPad sans Shift
ET Shift+Digit (les Digit nus sont libérés pour les notes 24-TET).
Snap inter-systèmes généralisé : `frequencyToNearestNote` (12-TET
only) → `frequencyToNearestIn(hz, sysId, a4Ref)` qui itère sur la
grille du système cible et minimise la distance en cents.
Phase 4.1 (2026-04-25) : **Juste intonation majeure centrée sur C**
— table d'Ellis 5-limit en dur (ratios canoniques pour les 7
naturelles, enharmoniques bémols fonctionnels pour les accidentels),
ancrage `C4 = a4Ref × 3/5` pour préserver A4 = a4Ref. Mêmes noms de
notes et même clavier physique que 12-TET (réutilise `piano-12` et
`TWELVE_KEY_MAP`). Registre à 6 entrées : 12-TET, Pythagoricien 12,
Juste majeure C, 24-TET égal, 24-TET Le Caire 1932, Libre.

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
    ├── App.jsx               # orchestration, persistance, raccourcis clavier
    ├── App.css               # layout grid responsive Designer/Composer
    ├── index.css
    ├── audio.js              # DFT (pointsToHarmonics, pointsToPeriodicWave), encodage WAV, palette couleurs
    ├── reducer.js            # useReducer global + withUndo (historique par onglet)
    ├── assets/               # résiduel template Vite (non utilisé)
    ├── hooks/
    │   └── usePlayback.js    # moteur de lecture timeline (partagé Designer/Composer)
    ├── lib/
    │   ├── timelineLayout.js # layoutClips + computeBounds (partagés Timeline/Properties)
    │   ├── durations.js      # catalogue durées (bases + coefs, phase 6.1)
    │   ├── clipNote.js       # formatClipNote + NOTE_NAMES Unicode
    │   └── tuningSystems.js  # registre tempéraments + freq + keyboardMap par système
    └── components/
        ├── Tabs.jsx + .css                    # bascule Designer / Composer
        ├── PatchBank.jsx + .css               # banque de patches partagée
        ├── WaveformEditor.jsx + .css          # éditeur ondes / patch (Designer)
        ├── Spectrogram.jsx + .css             # spectrogramme statique (Designer)
        ├── MiniPlayer.jsx + .css              # transport simplifié (Designer)
        ├── PianoKeyboard.jsx + .css           # dispatcher clavier (piano-12 / grid-24) + octaves
        ├── DurationButtons.jsx + .css         # boutons durée 7 bases + 3 coefs (phase 6.1)
        ├── SidebarResizer.jsx + .css          # poignée drag bordure sidebar (phase 7.4)
        ├── BpmInput.jsx                       # input BPM validation différée
        ├── A4Input.jsx                        # input A4 validation différée (F.2.2)
        ├── FreqInput.jsx                      # input fréquence libre (phase 3.7)
        ├── NumberInput.jsx                    # input numérique générique paramétré par parse/format (F.3.11.2)
        ├── Toast.jsx + .css                   # toast d'erreur (undo cross-onglet)
        ├── Toolbar.jsx + .css                 # toolbar (Composer)
        ├── Timeline.jsx + .css                # grille + clips + curseur (Composer)
        └── PropertiesPanel.jsx + .css         # édition du clip sélectionné (Composer)
```

### Layout

L'`App` rend **les deux layouts en permanence** et toggle leur visibilité via
l'attribut `hidden` (override CSS pour battre `display:grid`). Raison : ne pas
démonter le `WaveformEditor`, sinon perte de l'état local + du dirty check.

## Modèle de données

```ts
type SoundFolder = {              // racine virtuelle si parentId === null
  id: string                      // "folder-N"
  name: string
  parentId: string | null
}

// Depuis itération E : un patch ne porte PLUS ni fréquence ni note —
// c'est le clip qui porte la hauteur. Un même patch peut être joué à
// n'importe quelle hauteur sans duplication.
type Patch = {
  id: string                      // "patch-N"
  name: string                    // "Patch N" par défaut
  color: string                   // hex, palette SOUND_COLORS (12 couleurs)
  points: number[]                // 600 échantillons [-1, 1]
  amplitude: number               // 0..1
  preset: 'sine'|'square'|'sawtooth'|'triangle'|null  // null = dessin custom
  attack: number                  // ms, 0-1000 (F.3.11)
  hold: number                    // ms, 0-1000 (F.3.12) — plateau au peak entre attack et decay
  decay: number                   // ms, 0-1000 (F.3.11)
  sustain: number                 // 0..1
  release: number                 // ms, 0-1000 (F.3.11)
  folderId: string | null         // null = racine
}

type Track = {
  id: string                      // "track-N"
  name: string                    // "Piste 1" par défaut
  color: string                    // hex, palette TRACK_COLORS (8 couleurs muted)
  muted: boolean
  solo: boolean
  volume: number                  // 0..1
  height: number                  // px
}

type Clip = {                     // placement timeline + hauteur
  id: string                      // "clip-N"
  trackId: string
  patchId: string                 // ex-soundId, référence un Patch
  measure: number                 // 1-indexée, 1..numMeasures
  beat: number                    // en noires dans la mesure, 0..3.75 (snap 0.25 = 16ᵉ)
  duration: number                // en noires : 4=ronde, 2=blanche, 1.5=noire pointée,
                                  // 1=noire, 0.75=croche pointée, 0.5=croche, 0.25=double
  // Hauteur sonore (itération E) :
  tuningSystem: string            // clé du registre `TUNING_SYSTEMS` : '12-TET',
                                  // 'pythagorean-12', 'free' (F.2). Extensible.
  noteIndex: number | null        // 0..(notesPerOctave-1) du système courant,
                                  // null en Libre. 0..11 pour 12-TET aujourd'hui.
  octave: number | null           // 0-10 en 12-TET, null en Libre
  frequency: number | null        // null en systèmes-based (calculée), explicite en Libre
}

// State global (itération F) : champ `a4Ref` (Hz, défaut 440) — hauteur de
// référence utilisée par tous les systèmes-based pour calculer leurs
// fréquences. Persisté. Pas d'UI d'édition en F.1 (reportée en F.2 avec le
// premier tempérament non 12-TET).

// Fréquence effective d'un clip → `clipFrequency(clip, a4Ref)` (reducer.js) :
// délègue au registre `src/lib/tuningSystems.js`. Chaque entrée définit une
// fonction `freq(noteIndex, octave, a4Ref) → Hz` (ou null pour 'free' qui lit
// `clip.frequency`). Point d'extension unique : ajouter une entrée suffit,
// aucun autre code n'a besoin d'en savoir plus. Systèmes actuels (F.2) :
//   - '12-TET' : `a4Ref × 2^((midi-69)/12)`.
//   - 'pythagorean-12' : chaîne de quintes 3:2 centrée sur C, ancrée sur A4
//     (C4 = a4Ref × 16/27). 6 quintes montantes, 5 descendantes ; loup entre
//     F# (+6) et Db (-5). Ratios dérivés à l'init dans `PYTH_RATIOS_FROM_C`.
//   - 'free' : lit `clip.frequency` directement.

// Persistance (localStorage, clé "synth-app-state") :
// { patches, soundFolders, tracks, clips, bpm, numMeasures, a4Ref,
//   spectrogramVisible, durationMode, activeTab,
//   patchCounter, clipCounter, folderCounter, trackCounter,
//   composerBankWidth, composerAsideWidth,
//   composerBankCollapsed, composerAsideCollapsed }
// NON persisté (volatile) : selectedClipIds, currentPatchId, zoomH,
// defaultClipDuration, lastAnchorClipId, composerFlash,
// editor (éditeur vide au reload), clipboard, measureClipboard,
// piles undo/redo, settlingTops (Timeline local).
// Détection d'ancien format (savedSounds/soundCounter/noteCounter/
// placementCounter) → reset complet, pas de migration (deal assumé E.1).
```

⚠️ Vocabulaire : les **notes musicales** (C, D, E…) restent appelées "notes".
Seuls les **placements timeline** s'appellent "clips".

**Track par défaut** (créé en migration si absent) :
`{ id:"track-default", name:"Piste 1", color:TRACK_COLORS[0], muted:false, solo:false, volume:1, height:80 }`
**MAX_TRACKS** = 16. `trackCounter` persisté pour IDs uniques (`track-N`).

**Constantes** : `BEATS_PER_MEASURE=4`, BPM 60-240 (défaut 120),
`numMeasures` 16 par défaut (modifiable, prochainement).
**Formule temps** : `seconds = beats * 60 / bpm` (1 noire à 120 bpm = 0.5s).

## Composants

### `App.jsx` — racine
- Un seul `useReducer(withUndo(reducer))` détient tout l'état : `patches`,
  `soundFolders`, `tracks`, `clips`, `bpm`, `numMeasures`, `editor`,
  compteurs (`patchCounter`, `clipCounter`, `folderCounter`, `trackCounter`),
  `selectedClipIds`, `zoomH`, `clipboard`, `measureClipboard`, etc.
- `editorRef` (imperative handle) pour le dirty check de `WaveformEditor`.
- Persistance auto via `useEffect` (données métier uniquement, pas l'UI state).
- Appelle `usePlayback({ clips, patches, tracks, bpm, totalDurationSec })` ;
  useEffect synchro `updateTrackGains(tracks)` quand mute/solo/volume changent
  pendant la lecture.
- Handlers CRUD pistes : `handleCreateTrack`, `handleRenameTrack`,
  `handleDeleteTrack` (confirm si clips), `handleUpdateTrack`, `handleReorderTracks`.
- Handlers clipboard cross-piste : `handlePaste(absoluteBeat, targetTrackId)` calcule
  un delta de piste si targetTrackId fourni (clic droit ou Ctrl+V).
- `handleAddClip(patchId, measure, beat, duration, trackId)` : la hauteur du
  nouveau clip est lue depuis l'éditeur (`editorTestNoteFields(editor)`) —
  règle par défaut E.1, remplacée par les raccourcis clavier en E.4.

### `WaveformEditor.jsx`
- Canvas 600×300 dessinable à la souris (interpolation linéaire)
- Presets Sine / Square / Sawtooth / Triangle / Clear (tracking `activePreset`)
- Depuis itération E : le clavier, l'octave et le slider fréquence pilotent
  **uniquement la preview** (champs `testTuningSystem`, `testNoteIndex`,
  `testOctave`, `testFrequency` de `state.editor`). Ils ne sont pas copiés
  dans le patch sauvegardé — c'est le clip qui portera la hauteur au drop.
  Dropdown "Système de test" (12-TET / Libre) bascule entre les deux UIs :
  - 12-TET : clavier piano 12 notes + 11 boutons d'octave, affichage
    "Note : X Hz — A4".
  - Libre : slider log 2^4-2^15 Hz + FreqInput éditable.
- Éditeur AHDSR **visuel** 380×120 : 4 poignées draggables — P1
  (attack+amplitude en 2D), P1h (hold seul en 1D depuis F.3.13.1),
  P2 (decay+sustain en 2D), P4 (release seul en 1D). Courbe cyan +
  remplissage, 6 sliders éditables en colonne à droite (Amp →
  Attack → Hold → Decay → Sustain → Release, F.3.12.2). Graph
  fidèle : `p1.y = adsrLevelToY(amplitude)` (peak), `p2.y =
  adsrLevelToY(amp×sustain)` (sustain absolu = ratio du peak). À
  amp=0.5 et sustain=1, P2 atteint visuellement P1/P1h. P1h est
  rendu et testé en priorité sur P1 (z-order — P1h dessiné après,
  hit-testé avant) à hold=0 : grab attrape P1h, drag horizontal tire
  le hold à partir de 0. Pour accéder à P1 dans cette configuration,
  passer par les sliders Attack/Amp ou augmenter d'abord le hold via
  le slider dédié. Plateau sustain restauré en tirets symboliques
  entre P2 et P3 (P3 géométrique non-draggable, fin du plateau) — ne
  représente pas une durée audio, c'est un repère visuel de la phase.
  Constantes : `ADSR_W = 4 × ADSR_SEGMENT_PX + ADSR_SUSTAIN_PX = 380`,
  `ADSR_MAX_MS = 1000` ms, `ADSR_SEGMENT_PX = 80`,
  `ADSR_SUSTAIN_PX = 60`, `ADSR_HANDLE_RADIUS = 5`. Les 6 valeurs
  sont éditables au clavier via `NumberInput` (clic, parse permissif,
  Enter/blur commit, Esc annule).
  Polish handles (F.3.13.2-3) : cercles isotropes (dessinés en coords
  physiques après reset transform, pas d'ellipses), curseur dynamique
  (default → grab au survol d'un handle → grabbing pendant drag),
  tooltips au survol indiquant le rôle de chaque handle (P1, P1h, P2,
  P4) — composant `AdsrTooltip` positionné absolument dans le
  container, bascule sous le handle si proche du bord haut.
- Hydratation auto depuis `currentPatch` (prop) via `useEffect` qui compare l'id
  contre `hydratedFromIdRef`. Hydrate uniquement les champs du patch (points,
  ADSR, amplitude, preset) ; les champs `test*` (contexte de test de
  l'utilisateur) ne sont PAS écrasés.
- **Dirty check** exposé via `useImperativeHandle` (`isDirty()`). Compare
  uniquement les champs du patch (pas les `test*`) vs `referenceRef`.
- Deux boutons sauvegarder :
  - "Mettre à jour" (visible si `currentPatch`) : `onUpdatePatch(id, payload)`,
    flash "Patch mis à jour".
  - "Enregistrer comme nouveau" / "Sauvegarder le patch" : `onSavePatch(payload)`,
    bascule la référence et le `hydratedFromIdRef` vers le nouvel id, déclenche
    `onPatchCreated(id)` pour que App set `currentPatchId`.
- Header affiche soit "Patch N" (création) soit "Édition : NOM" (chargé).

### `Timeline.jsx` (Composer)
- Layout multipiste : colonne d'en-têtes de piste (sticky left, 120px) +
  grille scrollable (overflow-x/y) + zone d'extension (+1/+4/+16 mesures).
- En-tête de piste (2 lignes) : pastille couleur + nom (double-clic renomme) +
  × supprime | boutons M/S + slider volume. Drag en-tête = réordonnancement.
  Ghost flottant + indicateur d'insertion pendant le drag.
- Couloirs de piste : fond alternant, bordure gauche colorée, lane assignment
  greedy par piste, surbrillance au survol pendant drop/paste.
- Drop de patches : `findTrackAtY` identifie la piste cible depuis la coordonnée Y.
- Drag de clips cross-piste : `trackDelta` via `mouseStartTrackIndex`,
  `effectiveLane = 0` pendant le preview, commit `trackId` au drop.
- Clips : position absolue, snap 16ᵉ, drag/resize/duplication, multi-sélection
  (rectangle, Ctrl+clic, Shift+drag). Clic droit clip = retirer.
- Grille : lignes absolues, subdivision adaptative (noire/croche/double/triple),
  Ctrl+molette zoom centré souris. Numéros de mesure sticky top.
- Menu contextuel : clic droit zone vide = "Coller ici" (avec surbrillance
  pistes cibles), clic droit mesure = CRUD mesure. Échap ferme le menu.
- Curseur de lecture + visualiseur oscilloscope persistant.

### `PatchBank.jsx` (partagé Designer & Composer)
- Liste verticale de chips (responsive : bandeau horizontal en <900px).
- Drag → payload `text/plain` = patchId (drop sur Timeline).
- **Designer** : clic charge le patch dans l'éditeur ; double-clic = renommer
  inline ; pas de bouton ✎. × supprime.
- **Composer** : clic = no-op ; double-clic = renommer inline ; ✎ = éditer
  dans Designer (dirty check + bascule onglet) ; × supprime.
- **Dossiers** : clic = toggle ; double-clic = renommer inline ; × supprime.
- Chip avec `currentPatchId` reçoit la classe `is-current` (highlight bordure,
  Designer only). Plus d'affichage de fréquence : un patch n'a plus de hauteur.

### `usePlayback` (hook, `src/hooks/usePlayback.js`)
- Une instance dans App. Singleton de fait pour le moteur audio timeline.
- Retourne `{ isPlaying, cursorPos, currentTime, isExporting, analyserRef,
  play, stop, exportWav, updateTrackGains }`.
- AudioContext créé paresseusement. Cleanup à l'unmount d'App.
- **Scheduler look-ahead** : `setInterval` 25ms programme les clips dans
  une fenêtre de 100ms d'avance. Refs (`clipsRef`, `tracksRef`,
  `patchesRef`, `bpmRef`) pour lire le state frais à chaque tick.
  La fréquence effective est calculée par `clipFrequency(clip)` (pas lue
  sur le patch). Signature de changement inclut tuningSystem/note/octave/
  frequency → un clip dont la hauteur change pendant la lecture est
  invalidé et reprogrammé comme les autres modifications.
  `scheduledClipIds` (Set) évite le double-scheduling. `activeNodesRef`
  stocke les oscillators actifs.
- **GainNode par piste** (`trackGainNodesRef`) : chaque piste a son propre
  gain, tous convergent vers `analyserGain` → `AnalyserNode` + `destination`.
- `updateTrackGains(tracks)` : met à jour les gains en temps réel pendant
  la lecture (appelé par un useEffect dans App quand `tracks` change).
- **Export WAV** : scheduling one-shot via `scheduleAllClips` (pas de
  look-ahead dans l'OfflineAudioContext).

### `audio.js`
- `pointsToPeriodicWave(points, ctx)` — DFT 256 points
- `SOUND_COLORS` — palette de 12 couleurs
- `audioBufferToWav(buffer)` — encode PCM 16 bits stéréo (mono dupliqué L+R)
- `downloadWav(ab, filename)` — blob + `<a download>` programmatique

## Architecture audio

- **Live (look-ahead)** : scheduler à fenêtre glissante (25ms tick,
  100ms look-ahead). Chaque clip → `OscillatorNode` (PeriodicWave) →
  `GainNode` (AHDSR) → `trackGainNode` → `analyserGain` →
  `AnalyserNode` + `destination`. Un `GainNode` par piste ;
  gain = `track.volume` si audible, 0 si muté/solo-exclu.
  Changements de clips détectés par comparaison de signatures ;
  clips modifiés invalidés et reprogrammés. Depuis F.3.12.1, la
  signature inclut l'enveloppe du patch référencé → modifier
  attack/hold/decay/sustain/release/amplitude pendant la lecture
  re-schedule les clips à venir.
- **Export WAV** : `OfflineAudioContext(2, sampleRate * totalDurationSec, 44100)`,
  même routage per-track GainNode, mono up-mixé en stéréo, encodage RIFF/PCM16
- **AHDSR par note** : rampes linéaires
  attack→peak→hold(plateau)→decay→sustain→release→0 avec
  `clipDuration = max(noteDurationSec, attack + hold + decay + release)`.
  Le plateau hold est rendu par deux `linearRampToValueAtTime` au même
  niveau (peak), formulation idiomatique sans discontinuité
  (pas de `setValueAtTime` au milieu).

## Décisions architecturales

Choix non évidents pris pour de bonnes raisons. À ne pas remettre en question
à la légère — relire ici avant de refactorer.

- **L'éditeur de patch n'est plus détaché** : son state (points, ADSR,
  preset, etc.) vit dans `state.editor` du reducer global, pas en local
  dans `WaveformEditor`. Raison : l'undo/redo doit couvrir l'éditeur.
  Conséquence : les gestes continus (dessin canvas, drag poignées ADSR,
  sliders) **doivent** utiliser un draft local et ne dispatcher qu'au
  mouseup/touchend/blur, sinon chaque pixel pollue la pile d'historique.
- **Patches vs clips (itération E)** : un Patch ne porte que la forme
  (points + ADSR + amplitude + preset). La hauteur (tuningSystem +
  noteIndex/octave ou frequency) est portée par le Clip. Raison : on
  veut pouvoir jouer le même timbre à différentes hauteurs sans
  dupliquer le patch. Le calcul de la fréquence effective passe par
  `clipFrequency(clip, a4Ref)` qui délègue au registre des tempéraments
  (voir entrée suivante).
- **Registre des tempéraments (itération F.1)** : `src/lib/tuningSystems.js`
  est le **point d'extension unique** pour les systèmes d'accordage.
  Chaque entrée expose `{ id, label, notesPerOctave, noteNames, freq }`
  où `freq(noteIndex, octave, a4Ref)` donne la fréquence (ou `null` pour
  un système "libre" qui lit `clip.frequency` directement). Règle :
  tout calcul de fréquence depuis une note doit passer par le registre
  (moteur de lecture, preview Designer, affichage Properties,
  spectrogramme). Raison : en E.1 la formule 12-TET était dupliquée
  dans plusieurs fichiers, source de divergence potentielle. En F,
  ajouter 24-TET ou Pythagoricien = ajouter une entrée au registre,
  zéro `if/else` à modifier ailleurs. `formatClipNote` et `NOTE_NAMES`
  dérivent aussi du registre (pas de copie locale).
- **A4 de référence configurable (itération F.1)** : champ d'état
  `a4Ref` (Hz, défaut 440), persisté, global — pas un champ d'éditeur.
  Passé explicitement à `clipFrequency` et aux fonctions `freq` du
  registre (paramètre, pas import global → testable et découplé).
  Dans `usePlayback`, propagé via `a4RefRef` (comme `bpmRef`) lu au
  tick du scheduler : un changement pendant la lecture prend effet
  pour les clips schedulés après le changement (lag ≤ look-ahead =
  100 ms). Raison : un éventuel "A=432 Hz" est un réglage global,
  pas par-clip ; passer en argument le rend testable unitairement
  sans stub de state.
- **Éditeur = champs `test*` pour la preview** : le clavier piano /
  octave / slider fréquence du Designer pilotent uniquement la preview
  audio. Au drop d'un patch sur la timeline, `handleAddClip` lit
  `editorTestNoteFields(editor)` pour fixer la hauteur du nouveau clip
  (règle par défaut E.1). Les raccourcis clavier pour override au drop
  viendront en E.4.
- **Piles undo/redo en RAM pure** : pas de persistance localStorage.
  Motifs : taille (snapshots complets × 50 × 2 onglets), complexité
  (migration de format à chaque évolution du reducer), coût faible
  pour l'utilisateur (historique qui s'efface au reload est un comportement
  standard).
- **Snapshots undo complets (pas de diff)** : chaque entrée d'historique
  est un clone superficiel des champs trackés. Le partage de références
  via l'immutabilité du reducer rend ça bon marché en mémoire (un clip
  non modifié est la même référence dans tous les snapshots).
- **Moteur audio look-ahead** : `usePlayback` utilise un scheduler à
  fenêtre glissante (setInterval 25ms, look-ahead 100ms) qui programme
  les clips par petits blocs à l'avance. Les modifications de clips
  pendant la lecture sont prises en compte : le scheduler compare
  les signatures des clips à chaque tick et invalide/reprogramme les
  clips modifiés, supprimés ou ajoutés. L'export WAV conserve le
  scheduling one-shot (optimal pour OfflineAudioContext).
- **Lane assignment greedy, calculé au rendu** : la polyphonie (clips
  qui se chevauchent → lanes empilées) est calculée à chaque render de
  `Timeline` à partir des clips triés par position. Pas stocké dans le
  state. Raison : le calcul est O(n) et le layout se redébrouille après
  chaque drag/resize/drop sans invalidation manuelle.
- **Piles undo/redo isolées par onglet** (Option A parmi les alternatives
  discutées) : une pile pour Designer, une pile pour Composer. Raison :
  un Ctrl+Z doit annuler ce que l'utilisateur vient de faire *dans
  l'onglet où il est* ; partager une pile globale rendrait l'undo
  imprévisible (on annulerait une action invisible faite dans l'autre
  onglet). Conséquence : cross-onglet à gérer explicitement — un undo
  Designer qui supprimerait un son référencé par des clips du Composer
  est bloqué avec un Toast explicite, et symétriquement un undo
  Composer qui restaurerait des clips dont le son a été supprimé est
  aussi bloqué. Pas d'états incohérents possibles.
- **Pile undo classée par nature de l'action, pas par onglet
  source** (F.3.9) : `editor.testTuningSystem` est exposé dans deux
  endroits — sélecteur Designer ET sélecteur dans la toolbar
  Composer. Quel que soit le point de déclenchement, l'action
  `SET_EDITOR_TEST_TUNING_SYSTEM` reste dans `DESIGNER_UNDOABLE`
  (l'éditeur est sa juridiction sémantique). Un Ctrl+Z depuis le
  Composer ne défait pas un changement de tempérament fait depuis
  le Composer — il faut basculer vers le Designer. À surveiller
  comme accroc UX éventuel ; alternative déjà étudiée (déplacer
  l'action dans `COMPOSER_UNDOABLE` quand déclenchée depuis le
  Composer) écartée pour ne pas faire dépendre la classification
  de l'origine du dispatch (couplage UI ↔ reducer).
- **Suppression patches/dossiers : blocage avec assistance, pas de
  cascade**. Si des clips référencent le patch, on bloque la suppression,
  on affiche un toast, on auto-sélectionne les clips concernés et on
  bascule vers Composer. Raison : la cascade (supprimer patches + clips
  en une seule action) nécessitait un dual-stack undo complexe avec des
  edge cases insolubles (actions intercalées entre les deux piles). Le
  blocage est simple, robuste, et l'utilisateur garde le contrôle total.
- **Check undo symétrique bidirectionnel** : UNDO_DESIGNER vérifie que
  les clips actuels ne deviennent pas orphelins (via `patchId`) ;
  UNDO_COMPOSER vérifie que les patches référencés existent. Dans les
  deux cas : blocage + toast + auto-sélection des éléments concernés
  + bascule vers l'onglet approprié.
- **Deux clipboards séparés** : un pour les clips (Ctrl+C/X/V,
  positionné à la souris) et un pour les mesures (menu contextuel
  en-tête de mesure). Les deux sont volatils (RAM, non persistés).
  Raison : les deux opérations de collage ont des sémantiques
  différentes (clips = positionnement libre, mesures = insertion
  structurelle avec décalage).
- **Lanes = mécanisme d'affichage** : le lane assignment est greedy,
  recalculé à chaque rendu, jamais stocké dans le clip. Conséquence :
  la fusion (Ctrl+M) ignore les lanes et ne considère que l'adjacence
  temporelle, le patchId, la hauteur (tuningSystem/note/octave/frequency)
  et le trackId (même piste obligatoire).
- **Lane assignment par piste** : depuis C.1, le layout greedy est
  calculé indépendamment pour chaque piste (clips filtrés par trackId).
  Chaque piste a son propre `laneCount` et sa propre hauteur de
  corridor (`max(1, laneCount) × trackHeight`). Les bornes de resize
  (`computeBounds`) sont aussi filtrées par piste.
- **`tracks` dans COMPOSER_FIELDS** : inclus pour que CREATE/DELETE/
  RENAME_TRACK soient undoable. Conséquence : un undo d'action
  Composer peut aussi revert un changement de hauteur de piste
  (SET_TRACK_HEIGHT). Compromis accepté — la hauteur est un détail
  d'UI, pas une donnée métier.
- **Invariant `lastAnchorClipId ↔ selectedClipIds`** (E.7.1) : quand
  la sélection est non vide, l'anchor doit être égal au dernier clip
  sélectionné. Toutes les actions métier respectent déjà cette règle ;
  le helper `syncAnchorWithSelection(state)`, appliqué en sortie de
  `withUndo` sur chaque action (idempotent : retour direct si déjà
  aligné), garantit l'invariant dans les chemins UNDO/REDO qui ne
  mettent pas l'anchor à jour (anchor est non undoable). Corrige la
  classe de bugs où la sélection restaurée par un undo divergeait
  de l'anchor.
- **Settling frame pour animation drop drag** (E.7.6) : le retrait
  de la classe `is-dragging` (et donc le passage de `transition: none`
  à `transition: top 0.35s`) conjugué au changement de `top` dans
  le même frame ne déclenche pas la transition (race condition CSS
  Transitions). Solution : état local `settlingTops` dans Timeline
  qui capture `el.style.top` au mouseup, l'impose comme override
  inline pour le frame post-commit, et le libère via
  `requestAnimationFrame` au frame suivant. Permet à la transition
  de s'appliquer sur un changement de top détecté après activation
  de la transition-property.
- **Jamais de discontinuité dans le signal audio** (E.9) : un
  changement brutal de gain (saut 0→amp) ou une coupure d'oscillator
  en pleine phase (osc.stop() sans rampe) produit un clic audible.
  Règle : toute transition d'amplitude passe par une rampe ≥ quelques
  ms. Matérialisée par deux constantes :
    - `MIN_ATTACK = 0.003` (`audio.js`) : plancher appliqué via
      `Math.max(user_attack, MIN_ATTACK)` au démarrage de chaque
      voix. Concerne `WaveformEditor.playInstrumentNote` et les
      `scheduleXxxClip` de `usePlayback`. Sous le seuil perceptif
      d'attaque (~10 ms) → l'utilisateur ne "ressent" pas la
      contrainte.
    - `RETRIGGER_FADE = 0.008` (`WaveformEditor.jsx`) : durée du
      micro-fade-out appliqué à la voix précédente quand une note
      est retriggerée. La nouvelle voix démarre immédiatement, les
      deux se superposent 8 ms — imperceptible mais pas de clic.
  Pattern récurrent pour tout fade programmatique : capture
  `gain.value` AVANT `cancelScheduledValues`, sinon l'annulation
  fait retomber le param sur le dernier `setValueAtTime` antérieur
  et la valeur lue est fausse (voir aussi E.8 pour le release ADSR).

## Contraintes implicites

Conventions tacites. Les enfreindre sans raison crée des bugs subtils.

- **Pas de TypeScript** : choix initial, pas de migration en cours de
  projet. Le modèle est documenté en TS-like dans ce fichier à titre
  de référence uniquement.
- **IDs via compteurs persistés** (`soundCounter`, `clipCounter`,
  `folderCounter`, `trackCounter`) : jamais les recalculer depuis `.length`.
  Après des suppressions, deux créations successives auraient le même
  ID → collisions silencieuses.
- **Snapshots historique : mouseup pour gestes continus, dispatch direct
  pour contrôles discrets**. Un dropdown / un toggle / un clic preset
  dispatche directement (1 action = 1 snapshot). Un drag / un dessin /
  un slider utilise un draft local puis un dispatch unique au relâchement.
- **Non persisté dans localStorage** : `zoomH`, `zoomV` (par track),
  `selectedClipIds`, l'éditeur (drafts + state complet), l'historique
  undo/redo, `currentSoundId`, `composerFlash`. Au reload on retombe
  sur un état "propre" côté UI, seules les données métier survivent.
- **Lanes = affichage, pas de champ Clip** : le lane assignment est un
  calcul greedy au rendu (O(n) à chaque render de Timeline), jamais
  stocké dans le type Clip. Ne pas ajouter de champ `lane` au modèle.

## Itération terminée : A — Refonte UX core

Découpée en 6 phases. Voir le brief original pour les détails.
Phases listées ci-dessous dans l'ordre chronologique d'implémentation.

- ✅ **Phase 1** — Refonte modèle de données + migration (Note→Clip, +Track,
  +SoundFolder, +numMeasures, IDs préfixés, migration localStorage transparente)
- ✅ **Phase 2** — Layout split en 2 onglets (Designer / Composer) + responsive,
  banque partagée, mini-player, hydratation de l'éditeur, dual-save (Mettre à jour
  / Enregistrer comme nouveau), dirty check sur switch
- ✅ **Phase 2.5** — correctifs UX : double-clic seul charge (clic simple = no-op),
  nom intelligent pour duplication ("X" en note, "Copie de X" en free, suffixe
  collision), `allowDuplicate` flag pour bypass dup detect en duplication explicite,
  bouton "Nouveau" (reset complet + currentSoundId=null), defaults amp=1 / release=200ms.
- ✅ **Phase 2.6** — sliders ADSR draggables (Attack/Decay/Sustain/Release), même
  source de vérité que le canvas (les deux contrôles éditent le state local) ;
  banque contextuelle : clic simple charge en Designer, double-clic only en Composer
  (`activeTab` prop sur SoundBank).
- ✅ **Phase 2.7** — surbrillance currentSound uniquement dans Designer (chip
  is-current masquée dans Composer où l'info n'est pas pertinente).
- ✅ **Phase 3.1** — input BPM avec validation différée (composant `BpmInput`,
  type=text, commit au blur/Enter, ±1/±10 via flèches+Shift, Échap annule).
- ✅ **Phase 3.2-3.6** — nouveau zoom % basé triple croche (2-1000%, défaut 5%),
  zoom V (hauteur lane 30-200px stockée dans `track.height`), sélecteur durée
  par défaut sorti des clips et déplacé dans Toolbar, grille rendue en lignes
  absolues avec subdivision adaptative (noire/croche/double/triple selon
  pxPerBeat), labels adaptatifs via container queries (`@container max-width:20px`),
  oscilloscope persistant + fade entre repos (ligne plate) et lecture (signal),
  Ctrl+molette zoom centré sur la souris.
- ✅ **Phase 3.5 (fixes)** — Échap BPM corrigé (flag skipBlurCommitRef + restore
  preFocusValue), alignement Properties Composer (colonnes grid symétriques).
- ✅ **Phase 3.5 (Designer layout)** — refonte en 2 colonnes : sidebar gauche
  (banque + mini-player stackés verticalement) + zone centrale en grid 2×2
  (waveform | spectrogramme / params+boutons | ADSR). Plus de sidebar droite
  ni de footer.
  WaveformEditor passe en render-prop `children({ renderCanvasArea,
  renderParamsArea, renderAdsrArea })` : son state reste dans le composant
  (hydratation, dirty check, imperative handle isDirty) mais le parent (App)
  place les 3 zones où il veut dans le grid.
  Canvases waveform + ADSR dynamiques via ResizeObserver. Points array découplé
  (POINTS_RESOLUTION=600) de la taille pixel du canvas. ADSR utilise setTransform
  pour préserver ses coordonnées virtuelles 400×120. Bouton "Play" éditeur
  renommé en "Test" (preview du son en édition, pas lecture timeline).
  Mini-player simplifié : plus de marqueurs de mesure, juste un trait qui avance.
- ✅ **Phase 3.6** — toggle spectrogramme fonctionnel (state `spectrogramVisible`
  persisté dans localStorage, toggle dans le header de la zone Waveform, cell
  spectrogramme retirée du DOM quand OFF), mini-player avec barre de progression
  intégrée (linear-gradient --progress sur un seul élément texte, plus de bar
  séparée), fréquence libre étendue à 20-20000 Hz avec slider log (conversion
  via sliderToFreq/freqToSlider, arrondi entier, affichage formatFreq "X Hz"
  ou "X.X kHz"), contrastes renforcés (bordures cards #2a2a4a→#3a3a5a, inputs
  #3a3a5a→#4a4a6a, chip-info #6a6a8a→#9aa2b8, empty text #5a5a7a→#8a8fa8).
- ✅ **Phase 3.7** — fréquence libre éditable au clavier. Nouveau composant
  `FreqInput.jsx` (modèle BpmInput : `type=text inputMode=decimal`, validation
  différée au blur/Enter, Échap restaure preFocusValue via skipBlurCommitRef,
  re-sync depuis props quand pas focus). Parser permissif : `"440"`, `"440.5"`,
  `"440,5"`, suffixe `"Hz"` optionnel et insensible à la casse. Commit =
  parse + clamp [20, 20000] + arrondi 0.1 Hz ; invalide → revient à la dernière
  valeur valide. Slider onChange stocke `freeFrequency` en flottant arrondi
  à 0.1 Hz pour que la grille du slider colle à la précision affichée.
  `formatFreq` unifié en Hz avec 1 décimale max (plus de conversion kHz).
  Le label fréquence passe de `<label>` à `<div>` pour ne pas focus l'input
  sur clic dans la zone.
- ✅ **Phase 4** — Édition de clips (sélection + Properties + drag + resize) :
  - **4.1** `selectedClipIds` (tableau, préparation multi-sélect phase B) géré
    dans App ; clic clip = sélection, clic zone vide = désélection, outline
    blanc 2px + shadow sur le clip sélectionné (classe `.is-selected`). Clic
    droit conservé pour suppression rapide. PropertiesPanel refondu :
    dropdown son (avec dot couleur), position "Mesure X, beat Y" en lecture
    seule, dropdown durée (7 options), bouton Supprimer. Si 0 clips :
    placeholder. Si >1 : "N clips sélectionnés — édition phase B". Global
    keydown Delete/Backspace supprime les clips sélectionnés (skip si focus
    input/textarea/select/contenteditable).
  - **4.2** Drag à la souris via `onMouseDown` sur clip : session unifiée
    avec refs mutables + listeners window installés à l'ouverture de la
    session (pas de ré-attachement sur chaque mousemove). Seuil 5px
    (distance euclidienne) différencie clic (commit select) vs drag (commit
    measure/beat). Snap 16ᵉ, clamp `[0, totalBeats - duration]`.
    `document.body.style.cursor = 'grabbing' + userSelect:none` pendant le
    drag, reset sur mouseup. Layout greedy se redébrouille au commit.
  - **4.3** Resize via zones de 7px aux bords G/D (overlay `.resize-handle`
    positionnées absolument, cursor ew-resize). resize-right modifie
    `duration` ; resize-left modifie `measure + beat + duration` (bord droit
    fixe). Snap 16ᵉ, min 0.25. Bornes pré-calculées au mousedown :
    `minStartLeft` = fin du clip précédent dans la même lane (ou 0),
    `maxDurationRight` = espace jusqu'au clip suivant (ou fin). Drag et
    resize unifiés dans un même système `interactionRef`/`interactionVisual`
    avec champ `mode: 'drag' | 'resize-left' | 'resize-right'`. Resize actif
    immédiatement, pas de seuil 5px.
- ✅ **Phase 5** — Mesures dynamiques : boutons +/− dans la toolbar Composer
  (section "Mesures" à côté de Hauteur), affichage du compte entre les
  boutons. Ajout : `numMeasures++`, pas de plafond, grille s'étend. Suppression :
  si la dernière mesure contient ou reçoit un clip débordant (critère
  `clipEnd > (numMeasures-1)*4`), confirm window listant le nombre de clips
  à supprimer ; si confirmé, filter les clips affectés + désélection, puis
  `numMeasures--`. Plancher 1 mesure (bouton `−` désactivé à `numMeasures === 1`).
  Pas de raccourci clavier. Insertion au milieu reportée en phase B.
- ✅ **Phase 5.1** — Manipulation contextuelle des mesures :
  - Section "Mesures" retirée de la toolbar.
  - × discret au survol de la dernière mesure (header `.measure-label.is-last-measure`)
    déclenche `onRemoveLastMeasure`. Masqué si `numMeasures === 1`.
  - Zone d'extension à droite de la grille (sibling de `.timeline-grid` dans
    le wrapper flex `.timeline-grid-wrapper`) avec 3 boutons `+1` / `+4` / `+16`.
    Fond hachuré pour signaler "extension".
  - Suppression revue : pour chaque clip dont la fin > début de la dernière
    mesure, on distingue **suppression** (clip entièrement dans la dernière
    mesure) vs **troncature** (clip qui commence avant et déborde, sa
    `duration` est ramenée pile à la limite). Confirm uniquement si ≥1
    suppression ; troncatures-only = pas de confirm + flash transitoire
    `composerFlash` rendu dans la toolbar (auto-clear 3s).
- ✅ **Phase 5.2** — Fix persistance `numMeasures` : `loadState` faisait
  `Math.max(persisted, maxClipMeasure, DEFAULT_NUM_MEASURES)` → un user qui
  réduisait à 8 mesures retombait sur 16 au reload. Suppression du 3ᵉ
  argument (plancher remplacé par `1`). Audit du reste : `savedSounds || []`
  et `soundCounter || 0` migrés vers `??` pour cohérence (pas de bug actif).
- ✅ **Phase 6.1** — Refactor : un seul `useReducer` (src/reducer.js) qui
  remplace une dizaine de useState d'App.jsx. State de l'éditeur de son
  remonté dans `state.editor` (points, freeMode, noteIndex, octave,
  freeFrequency, amplitude, ADSR, preset). WaveformEditor lit ses valeurs
  via la prop `editor` et dispatche via `editorActions`. Drafts locaux
  pour les gestes continus (canvas drawing, drag poignées ADSR, sliders) :
  pas de pollution d'historique pendant le geste, dispatch unique au
  mouseup/touchend/keyup/blur. Compteurs (sound/clip) en state mais hors
  snapshot pour ne pas reculer sur undo. Hydratation déclenchée dans App
  via `HYDRATE_EDITOR_FROM_SOUND` (non-undoable). Aucun changement de
  comportement utilisateur.
- ✅ **Phase 6.2** — Undo/redo avec piles séparées par onglet (Designer
  et Composer indépendants). `withUndo(reducer)` wrapper qui gère
  `UNDO_*` / `REDO_*` et enregistre les snapshots avant chaque action
  undoable. Profondeur 50 actions/pile, FIFO. Snapshots par champs :
  Composer = `[clips, numMeasures, bpm, selectedClipIds, tracks]`,
  Designer = `[savedSounds, soundFolders, editor]`. Vérification
  cross-onglet : un undo Designer qui ferait disparaître un son utilisé
  par des clips est bloqué + Toast d'erreur (composant Toast.jsx, auto-clear
  4.5s). Boutons ⟲/⟳ dans la toolbar Composer et dans l'en-tête de la
  zone Waveform du Designer. Raccourcis Ctrl/Cmd+Z (undo) et
  Ctrl/Cmd+Shift+Z / Ctrl+Y (redo) au niveau window, skip si focus dans
  input/textarea/select/contenteditable. Historique RAM uniquement (non
  persisté).

## Itération terminée : B — édition avancée

- ✅ **Phase 1** (2026-04-16) — Spectrogramme statique. Remplace le placeholder
  par un vrai afficheur de spectre synchronisé avec l'éditeur :
  - DFT 256 harmoniques extraite d'`audio.js` dans une fonction partagée
    `pointsToHarmonics(points)` qui retourne `{ real, imag, magnitudes }`.
    `pointsToPeriodicWave` l'utilise sans changement fonctionnel.
  - Nouveau composant `Spectrogram.jsx` : canvas ResizeObserver, axe X log
    20 Hz→20 kHz, axe Y linéaire normalisé par max(magnitudes), barres
    verticales cyan (#00d4ff) 2px par harmonique k à fréquence k×f0.
    Grille à 100 Hz / 1 kHz / 10 kHz avec labels. Canvas vide → message
    "Dessinez une onde pour voir le spectre".
  - **Lecture seule** : aucun état interne, aucune interaction. Se redessine
    uniquement quand `editor.points` ou la fréquence fondamentale changent
    (drafts locaux absorbent les gestes continus — le redraw n'a lieu qu'au
    mouseup). `amplitude` n'est PAS appliquée (le spectrogramme montre la
    forme harmonique, pas le volume).
  - `App.jsx` calcule `editorFrequency` (freeFrequency ou note tempérée) et
    passe `points` + `frequency` au composant. `SpectrogramPlaceholder.*`
    supprimés.
  - Toggle On/Off dans le header Waveform inchangé (phase A.3.6) ; spec
    reste masqué côté DOM quand OFF.
- ✅ **Phase 2** (2026-04-16) — Multi-sélection et opérations groupées.
  Découpée en 5 sous-commits indépendants pour isoler les régressions.
  - **2.1** Multi-sélection : clic replace, Ctrl+clic toggle, rectangle
    de sélection sur zone vide (pointillé cyan), Shift+drag additif,
    Ctrl+drag sur zone vide réservé (futur scroll B.2.6). Échap vide la
    sélection. API sélection consolidée sous `onSetSelection(ids)` — le
    caller (Timeline) calcule la nouvelle liste finale. Suppression des
    props `onSelectClip`/`onDeselectAll`.
  - **2.2** Drag multi : action `MOVE_CLIPS` atomique et undoable. Quand
    le drag démarre sur un clip d'une multi-sélection, tous les membres
    prennent le même delta ; bornes = intersection des bornes individuelles
    (le groupe s'arrête quand le membre le plus contraignant butte). Drag
    d'un clip hors sélection remplace la sélection puis drag mono.
    Aperçu visuel : tous les membres du groupe rendus à leur offset.
  - **2.3** Resize multi absolu (non-proportionnel) : action `RESIZE_CLIPS`
    atomique. `computeBounds` généralisé avec `excludeIds` (les autres
    membres du groupe ne se contraignent pas entre eux). Delta intersecté
    pour respecter les min/max individuels (MIN_CLIP_DURATION et clip
    suivant non-sélectionné). Resize-left gère l'ajustement de
    mesure/beat + durée (bord droit de chaque membre fixe).
  - **2.4** Duplication (Ctrl+drag sur clip) : action `DUPLICATE_CLIPS`
    atomique qui reçoit les positions/soundId/trackId des copies,
    attribue les ids à partir de `clipCounter+1`, remplace
    `selectedClipIds` par les copies. Ctrl+mousedown démarre une session
    dont l'issue est décidée au mouseup : sous seuil → toggle de
    sélection (via `preselectionIds` capturés au mousedown), au-delà
    → duplication à l'offset. Curseur `copy` pendant le drag, ghosts
    pointillés à l'offset pour le preview. `selectedClipIds` ajouté aux
    champs snapshot Composer pour que l'undo restaure la sélection pré-
    action.
  - **2.5** Suppression multi + Properties multi-sélection : helpers
    `layoutClips` + `computeBounds` extraits dans `src/lib/timelineLayout.js`.
    Nouvelles actions `UPDATE_CLIPS_SOUND` et `UPDATE_CLIPS_DURATION`
    (durées pré-clampées par bornes individuelles côté Panel).
    `PropertiesPanel` gère désormais 3 modes : vide, mono, multi. En
    multi : badge du compte dans l'en-tête, dropdown Son/Durée si
    homogène sinon "Sons mixtes"/"Durées mixtes" lecture seule, bouton
    "Supprimer la sélection" rouge. Raccourci Delete/Backspace déjà
    opérationnel via `DELETE_SELECTED_CLIPS` existant.
- ✅ **Phase 6** (2026-04-16) — Répertoires de sons. Banque refactorée en
  arborescence dépliable/repliable avec dossiers imbriqués. 2 commits :
  - **6.1** UI répertoires : SoundBank passe de liste plate à arborescence.
    Bouton "+ Dossier" (nom auto `nextAvailableFolderName`). Dossiers avec
    chevron ▶/▼, icône 📁, badge compteur, bouton × inline.
    Renommage par double-clic (✎ retiré des dossiers en C). Suppression bloquée si des clips
    référencent les sons (toast + auto-sélection + bascule Composer) ;
    sinon confirmation si dossier non-vide puis suppression directe.
    `folderCounter` persisté en localStorage. Actions reducer
    `CREATE_FOLDER`, `RENAME_FOLDER`, `DELETE_FOLDER` — toutes undoable
    (pile Designer). Tri alphabétique, état déplié/replié volatile (tous
    dépliés par défaut). Indentation 16px par niveau de profondeur.
  - **6.2** Drag dans l'arborescence : drag d'un son vers un dossier
    (`folderId = folder.id`) ou vers la zone racine (`folderId = null`).
    Drag d'un dossier vers un autre (`parentId = target.id`) avec
    protection anti-boucle (vérification récursive des descendants). Zone
    "Déposer ici → racine" affichée pendant le drag. Feedback visuel :
    surbrillance cyan sur la cible, opacité réduite sur l'élément draggé.
    Drag vers la timeline inchangé (`text/plain` payload préservé pour les
    sons, les dossiers n'en émettent pas). Actions `MOVE_SOUND_TO_FOLDER`,
    `MOVE_FOLDER` undoable (pile Designer). Tri alphabétique, pas de
    sortOrder custom.
  - **6.4** Refonte suppression sons/dossiers + check undo symétrique.
    La suppression cascade (son/dossier → clips supprimés) est remplacée
    par un **blocage avec assistance** : si des clips référencent le son
    (ou des sons du dossier), la suppression est bloquée, un toast
    s'affiche, les clips concernés sont auto-sélectionnés et on bascule
    vers le Composer pour que l'utilisateur les supprime manuellement.
    Si aucun clip ne référence : suppression directe (avec confirmation
    pour les dossiers non-vides). Retrait de `DESIGNER_CASCADE` /
    `DESIGNER_CASCADE_FIELDS` — les snapshots Designer ne capturent plus
    les champs Composer. `DELETE_FOLDER` et `DELETE_SOUND` ne touchent
    plus aux clips. Check undo Composer symétrique ajouté :
    `UNDO_COMPOSER` / `REDO_COMPOSER` vérifient via `checkClipReferences`
    que le snapshot à restaurer ne contient pas de clips dont le soundId
    est absent des `savedSounds` actuels ; si oui, toast d'erreur et
    undo bloqué. Le check undo Designer existant (`findOrphanReferences`)
    est simplifié (plus de branche cascade). SoundBank ne reçoit plus
    la prop `clips` (logique de blocage remontée dans App.jsx).
  - **6.5** Alignement undo bloqué avec le comportement de suppression
    directe. Quand `UNDO_DESIGNER` / `REDO_DESIGNER` est bloqué par
    le check de référence : auto-sélection des clips orphelins +
    bascule vers Composer. Quand `UNDO_COMPOSER` / `REDO_COMPOSER`
    est bloqué par des sons manquants : bascule vers Designer.
- ✅ **Phase 7** (2026-04-17) — Menu contextuel sur en-tête de mesure.
  - **7.1** Clic droit sur un numéro de mesure → menu contextuel avec
    "Supprimer cette mesure" (split/truncate/shift des clips affectés,
    confirmation si destructif), "Insérer avant…" / "Insérer après…"
    (input inline nombre de mesures, split des clips à cheval, shift).
    Actions reducer `DELETE_MEASURE` et `INSERT_MEASURES_AT`, undoable.
    Helpers `snapBeat`, `beatToMeasureBeat`, `clipAbsoluteStart`
    extraits dans le reducer. Phase 7.2 grisée dans le menu.
  - **7.2** Couper/Copier/Coller mesures. `measureClipboard` volatile
    en RAM (séparé du clipboard clips). Copier copie les clips de la
    mesure (tronqués aux bords) avec offsets relatifs. Couper = copie +
    suppression. Coller avant/après insère N mesures et y place les
    clips du clipboard. Actions `CUT_MEASURE`, `PASTE_MEASURES`,
    `SET_MEASURE_CLIPBOARD`. Boutons activés dans le menu contextuel.

## Itération terminée : C — Multipiste

- ✅ **Phase 1** (2026-04-17) — UI Multi-tracks (5 sous-commits, voir Roadmap)
- ✅ **Phase 2** (2026-04-17) — Mute/Solo/Volume par piste (voir Roadmap)
- ✅ **Phase 3** (2026-04-17) — Refonte moteur audio look-ahead (voir Roadmap)
- ✅ **Phase 4** (2026-04-17) — Adaptation features A/B au multipiste (voir Roadmap)

**Décisions UX clés (à mémoire pour Iter A)**
- Sauvegarde dans l'éditeur quand `currentPatchId` est non-null : 2 boutons distincts
  ("Mettre à jour" + "Enregistrer comme nouveau"). Action "Mettre à jour" undoable.
- Banque de patches : sidebar gauche (les 2 onglets, composant partagé).
- Properties panel : sidebar droite sur grand écran, bottom-sheet collapsible <1100px.
- Éditeur waveform : son state vit dans `state.editor` du reducer (undo couvre
  l'éditeur). `useEffect` hydrate l'éditeur quand `currentPatchId` change.
  Confirm si modifs non sauvegardées au moment du switch.

## État actuel

✅ **Terminé**
- Dessin waveform + presets
- Éditeur ADSR visuel draggable
- Preview polyphonique via clavier piano interactif + raccourcis QWERTY
  (event.code) + Espace = sustain (E.3)
- Banque de patches : drag, rename, delete, dossiers arborescents
- Drop timeline avec snap triple croche (0.125 beat), polyphonie
  multi-lanes, multi-pistes
- Hauteur par clip (12-TET ou Libre) via `clipFrequency(clip)` (E.1)
- Durée par clip : 7 bases (carrée à triple croche) × 4 coefs (pur,
  ×1.25, pointé, double-pointé) via `DurationButtons` (E.6.1)
- BPM ajustable + recalcul durée totale
- Curseur animé + affichage temps
- Zoom horizontal + vertical (hauteur de piste modifiable)
- Visualiseur oscilloscope temps réel
- Sidebars Composer resizables et collapsibles (E.7.4-7.5)
- Export WAV PCM 16-bit stéréo
- Persistance localStorage (pas de migration vers nouveau format en E.1 :
  reset si ancien format détecté)

✅ **Itération A terminée**.

✅ **Itération B terminée** (2026-04-17)
- Spectrogramme statique synchronisé (DFT, échelle log)
- Multi-sélection (rectangle, Ctrl+clic, Shift+drag additionnel)
- Drag/resize/duplication multi avec bornes groupées
- Copier/couper/coller clips (Ctrl+C/X/V, clic droit, positionnement souris)
- Fusion (Ctrl+M) et split (Ctrl+D ÷2, Ctrl+Shift+D ÷3)
- Ctrl+drag scroll horizontal, Alt+drag zoom rectangle
- Répertoires de sons arborescents (CRUD, drag interne, indentation)
- Suppression sons/dossiers avec blocage si clips référencent + assistance
- Check undo symétrique cross-onglet (Designer ↔ Composer)
- Menu contextuel mesures : supprimer/insérer/couper/copier/coller
  avec split automatique des clips à cheval
- Properties panel multi-sélection (son/durée mixtes, actions groupées)

✅ **Itération C terminée** (2026-04-18)
- UI multi-tracks : en-têtes + couloirs, CRUD pistes, drop/drag cross-piste,
  réordonnancement par drag, refactor banque double-clic=renommer (phase 1)
- Mute/Solo/Volume par piste : UI M/S/slider, logique solo DAW, GainNode
  per-track, gains temps réel, atténuation visuelle clips (phase 2)
- Moteur audio look-ahead : scheduler fenêtre glissante, réactivité temps
  réel aux modifications de clips pendant lecture (phase 3)
- Adaptation multipiste : fusion check trackId, coller cross-piste (clic droit
  + Ctrl+V), PropertiesPanel affiche piste, Échap ferme menu contextuel (phase 4)

✅ **Itération D terminée** (2026-04-19) — Refonte Designer
- Phase 1 — Refonte sélecteur de notes : dropdown "Système"
  (12-TET / Libre), clavier piano 12 notes, sélecteur d'octave 0-10,
  extension mode libre 2^4-2^15 Hz. Les trois boutons Test
  (impact/court/tenu) introduits ici ont été remplacés par la preview
  polyphonique au clavier en E.3 puis retirés en F.3.5.
  Modèle : `mode: 'note' | 'free'` → `tuningSystem: '12-TET' | 'free'`
  (migration transparente via `normalizeSound`).

✅ **Itération E terminée** (2026-04-22) — Patches vs Notes (refonte conceptuelle majeure)
- ✅ **Phase 1** (2026-04-19) — Patches remplacent Sounds, notes portées par
  les clips. Commit unique.
  - Modèle : `SavedSound` → `Patch` (id `patch-N`) sans fréquence ni note ;
    champs supprimés : `frequency`, `mode`, `tuningSystem`, `noteIndex`,
    `octave`.
  - `Clip` enrichi : `soundId` → `patchId`, + `tuningSystem`, `noteIndex`,
    `octave`, `frequency` (null côté non applicable). Helper partagé
    `clipFrequency(clip)` dans reducer.js.
  - Éditeur : nouveaux champs `testTuningSystem`, `testNoteIndex`,
    `testOctave`, `testFrequency` — uniquement pour piloter la preview,
    pas copiés dans le patch sauvegardé. Hydratation d'un patch préserve
    ces champs (contexte de test utilisateur).
  - Drop de patch sur timeline : la hauteur du nouveau clip est celle du
    clavier de test courant (règle par défaut, raccourcis clavier prévus
    en E.4). `handleAddClip` utilise `editorTestNoteFields(editor)`.
  - Actions reducer renommées : `SAVE_SOUND` → `SAVE_PATCH`,
    `UPDATE_SOUND` → `UPDATE_PATCH`, `DELETE_SOUND` → `DELETE_PATCH`,
    `RENAME_SOUND` → `RENAME_PATCH`, `MOVE_SOUND_TO_FOLDER` →
    `MOVE_PATCH_TO_FOLDER`, `UPDATE_CLIPS_SOUND` → `UPDATE_CLIPS_PATCH`,
    `SET_CURRENT_SOUND_ID` → `SET_CURRENT_PATCH_ID`,
    `HYDRATE_EDITOR_FROM_SOUND` → `HYDRATE_EDITOR_FROM_PATCH`,
    `SET_EDITOR_NOTE/OCTAVE/TUNING_SYSTEM/FREQUENCY` →
    `SET_EDITOR_TEST_NOTE/OCTAVE/TUNING_SYSTEM/FREQUENCY`.
  - State renommé : `savedSounds` → `patches`, `soundCounter` →
    `patchCounter`, `currentSoundId` → `currentPatchId`.
  - Split/merge/paste/cut/insert/delete measure propagent désormais les
    champs de hauteur du clip source vers les nouveaux clips créés
    (helper `buildSplitPart` dans App, `cloneClipNote` dans reducer).
  - `canMergeClips` ajoute la vérification que tous les clips aient la
    même hauteur (en plus du même `patchId` et `trackId`).
  - Plus de détection de doublons au save : un patch est toujours créé
    avec un id unique (un même timbre peut exister plusieurs fois sous
    des noms différents, c'est permis).
  - **Pas de migration** : si `loadPersistedState` détecte un ancien format
    (clés `savedSounds`, `soundCounter`, `noteCounter`, `placementCounter`),
    on log un warning et on repart d'un état initial vide. Deal assumé.
  - Renommage fichier : `SoundBank.jsx/.css` → `PatchBank.jsx/.css` ;
    props renommées (`savedSounds` → `patches`, `onLoadSound` →
    `onLoadPatch`, etc.). Affichage de la fréquence retiré des chips
    (un patch n'en a plus).
  - `usePlayback` : signature `{ clips, patches, tracks, bpm, ... }`,
    résolution fréquence via `clipFrequency(clip)` à l'attaque de
    chaque clip (live + export WAV). Signature de changement inclut
    les champs de hauteur pour invalider les clips reprogrammés.
- ✅ **Phase 2** (2026-04-19) — Affichage note dans clips + édition
  Properties + flèches clavier. 3 sous-commits :
  - **2.1** Label adaptatif : `src/lib/clipNote.js` exporte
    `formatClipNote(clip)` (12-TET → "A4", free → "440.0 Hz") et
    `NOTE_NAMES` avec ♯ Unicode. Dans Timeline, la `.placed-name` est
    scindée en `.placed-note` (gras) + `.placed-patch-name` (opacité
    0.7). Container queries : patch name masqué sous 120px, tout
    masqué sous 30px.
  - **2.2** `PianoKeyboard`/`OctaveSelector` extraits dans
    `src/components/PianoKeyboard.{jsx,css}`, prop `compact` pour la
    variante Properties (56px de haut, pas de labels). Action
    `UPDATE_CLIPS_PITCH` (payload `[{id, tuningSystem?, noteIndex?,
    octave?, frequency?}]`, undoable pile Composer). Handler
    `handleUpdateClipsPitch`. PropertiesPanel mono : nouveau champ
    "Note" entre Patch et Position (mini-clavier + octave en 12-TET,
    FreqInput en Libre). PropertiesPanel multi : éditable si toutes
    les hauteurs identiques, sinon "Notes mixtes" lecture seule.
  - **2.3** Listener keydown global (App, activeTab=composer). ↑↓ :
    ±1 demi-ton via arithmétique midi (passage d'octave auto).
    Shift+↑↓ : ±1 octave entière. ←→ : ±0.25 beat. Shift+←→ : ±1 beat.
    Bornes intersectées : midi ∈ [12, 143] (C0..B10), position ∈
    [0, totalBeats]. Groupe bloqué si le membre le plus contraint
    ne peut pas bouger. Clips free ignorés pour ↑↓ (édition libre
    via input Hz). Exclusions : input/textarea/select/contenteditable,
    `.timeline-context-menu` ouvert, body cursor en drag.
- ✅ **Phase 3** (2026-04-19) — Designer = instrument de test
  polyphonique. 5 sous-commits :
  - **3.1** PianoKeyboard accepte `onKeyPress(idx)` / `onKeyRelease(idx)`
    + prop `activeNotes` (Set). mousedown → onSelectNote + onKeyPress ;
    un listener window mouseup déclenche onKeyRelease (option B : la
    note tient tant que la souris n'est pas relâchée, même hors de la
    touche). WaveformEditor maintient `activeNotesMapRef` (Map<idx,
    {osc, gain, octave}>) et `instrumentParamsRef` (valeurs ADSR /
    amplitude / testOctave fraîches pour les handlers). Cleanup à
    l'unmount et au changement de patch. Classe `.is-playing` jaune
    vif pour les touches actives (distincte du cyan is-active).
  - **3.2** Mapping `event.code` → noteIndex : KeyS/D/F/G/H/J/K pour
    les blanches (C D E F G A B), KeyE/R/Y/U/I pour les noires. Utilise
    event.code (position physique) donc fonctionne identiquement QWERTY /
    AZERTY / DVORAK. event.repeat ignoré. `instrumentBridgeRef` stable
    sert de pont entre le listener (attaché une fois par activeTab) et
    les fonctions play/release recréées à chaque render. Sortie du
    Designer = stopAllInstrumentNotes.
  - **3.3** PageUp/PageDown décalent testOctave (±1, bornes [0, 10]).
    Keydown unique, skip form fields et combos Ctrl/Alt/Cmd
    (navigation d'onglet navigateur). e.repeat autorisé : maintenir la
    touche traverse les octaves. Initialement Shift/Ctrl "seuls" via
    flags shiftAloneRef/ctrlAloneRef invalidés par toute autre touche
    ou mousedown, remplacé car l'ordre de relâchement dans des combos
    créait des octaves intempestives.
  - **3.4** Pédale de sustain : Espace maintenue = sustainActiveRef.
    Le release est extrait dans `performRelease` et
    `releaseInstrumentNote` le diffère vers `sustainedNotesRef` quand
    sustain est actif. Au relâchement de Espace, performRelease est
    appelé sur toutes les notes sustainées. `playInstrumentNote`
    gère le retrigger : si la note est déjà active (sustainée ou non),
    la voix existante est coupée net avant d'en démarrer une nouvelle.
    preventDefault sur Space (empêche scroll). Badge SUSTAIN orange
    à côté du label "Note".
  - **3.5** Suppression des 3 boutons Test impact/court/tenu et toute
    la logique associée (startAudio, stopAudio, handleTestClick,
    playingMode, oscRef/gainRef, COURT_HOLD_SEC, useEffect live
    frequency/amplitude, CSS .test-btn-mode/.test-buttons). Le test
    d'un patch passe exclusivement par le clavier interactif.
- ✅ **Phase 4** (2026-04-19) — Drop intelligent + placement contigu.
  2 sous-commits :
  - **4.1** `KEY_CODE_TO_NOTE_INDEX` déplacé dans
    `src/lib/keyboardMap.js` partagé. App maintient `pressedNoteKeyRef`
    (synchrone) + `pressedNoteKey` state. Listener Composer : keydown
    enregistre la touche (skip sur Ctrl/Cmd combos + repeat), keyup
    clear. `handleAddClip` priorise pressedNoteKey : si set, clip créé
    en 12-TET à cette note + testOctave, sinon fallback
    `editorTestNoteFields`. Badge ♪ XN orange dans la toolbar Composer
    pendant qu'une touche est maintenue. Raccourcis d'octave (PageUp/
    PageDown) logés dans un useEffect dédié de App (actif les deux
    onglets).
  - **4.2** State `lastAnchorClipId` (non undoable, non persisté)
    ajouté au reducer. Mis à jour par ADD_CLIP, DUPLICATE_CLIPS,
    SPLIT_CLIPS, MERGE_CLIPS, PASTE_CLIPS, SELECT_CLIPS (dernier du
    payload). Nettoyé à REMOVE_CLIP / DELETE_SELECTED_CLIPS /
    CLEAR_TIMELINE si l'anchor disparaît. Le keyup Composer, si aucun
    drag en cours (dragstart/dragend window listeners + body cursor
    check), dispatch ADD_CLIP après l'anchor : même patch, même piste,
    même durée par défaut, note = touche pressée, octave = testOctave.
    ADD_CLIP accepte `extraMeasures` pour étendre automatiquement la
    composition. `handleAddClip` consomme pressedNoteKey au drop pour
    que le keyup suivant ne double pas le placement.
- ✅ **Phase 5** (2026-04-19) — Fixes placement contigu (voir Roadmap).
- ✅ **Phase 6** (2026-04-20) — UX enrichie : durées en boutons toggle
  (7 bases + 3 coefs, snap 0.125), indicateur octave dans la toolbar,
  animation CSS des corridors (voir Roadmap).
- ✅ **Phase 7** (2026-04-20) — Ajustements UI : invariant
  `lastAnchorClipId ↔ selectedClipIds`, fractions réf noire
  (1=noire, 1/2=croche), pas flèche Composer 0.125, sidebars
  resizables + collapsibles, settling frame drag cross-piste
  (voir Roadmap).
- ✅ **Phase 8** (2026-04-22) — Fix release ADSR Designer sur appui
  bref : `gain.value` lu avant `cancelScheduledValues` + marge 20ms
  sur `osc.stop()` (voir Roadmap).
- ✅ **Phase 9** (2026-04-22) — Micro-fades anti-clic. `MIN_ATTACK`
  (3 ms) en plancher d'attack côté Designer + Composer (clic au
  démarrage), `RETRIGGER_FADE` (8 ms) en fade-out de la voix
  précédente lors d'un retrigger (clic de voice-stealing sur note
  déjà active ou sustainée) (voir Roadmap).

🚧 **Itération F en cours** — Multi-tempérament
- ✅ **Phase 1** (2026-04-22) — Infrastructure multi-tempérament.
  Création de `src/lib/tuningSystems.js` : registre `TUNING_SYSTEMS`
  (clé = id de système) avec `{ id, label, notesPerOctave, noteNames,
  freq }`. `clipFrequency(clip, a4Ref)` délègue au registre —
  `sys.freq(noteIndex, octave, a4Ref)` pour les systèmes note/octave,
  `clip.frequency` pour `free`. `frequencyToNearestNote` et les noms
  de notes 12-TET migrés dans le registre. `formatClipNote` lit
  `noteNames` depuis le registre (plus de copie locale).
  `WaveformEditor` (preview polyphonique) passe par le même registre
  que `usePlayback` — plus de copie locale de `noteToFrequency`.
  `PropertiesPanel` et `App.jsx` (spectrogramme) routent leurs
  calculs MIDI via le registre. Nouveau champ d'état `a4Ref` (défaut
  440 Hz, persisté, propagé via ref dans le scheduler live, via prop
  directe pour l'export WAV). Aucune UI d'édition exposée — A4 reste
  à 440 Hz pour l'utilisateur final. Comportement strictement
  identique à E.9.
- ✅ **Phase 2** (2026-04-22) — Premier tempérament alternatif +
  UI A4. 2 sous-commits :
  - **2.1** Tempérament Pythagoricien 12 centré sur C. Ratios dérivés
    à l'init par parcours de la chaîne (6 montantes, 5 descendantes,
    loup F#↔Db ~678 cents). Mêmes noms de notes que 12-TET → clavier
    et UI existants réutilisés. Ordre registre : 12-TET,
    pythagorean-12, free. Sélecteurs dynamisés (Designer +
    PropertiesPanel — ajout du sélecteur dans Properties, absent
    auparavant : multi avec check `allSameTuningSystem` →
    "Systèmes mixtes" en lecture seule sinon). Logique de bascule
    portée par le reducer (`UPDATE_CLIPS_PITCH` étendu) pour
    verrouiller l'invariant "clip cohérent" au modèle : vers 'free'
    calcule la fréquence courante, entre systèmes de même grille
    garde note/octave, sinon snap via 12-TET. Fix latent dans
    `SET_EDITOR_TEST_TUNING_SYSTEM` du Designer (hardcode '12-TET'
    en branche non-free) corrigé au passage.
  - **2.2** Input A4 dans la toolbar Composer. Nouveau composant
    `A4Input` (même pattern que `BpmInput` — validation différée,
    Échap restaure, ±1 flèches / ±5 Shift). Fourchette 380-480 Hz
    entiers. Action `SET_A4_REF` undoable, `a4Ref` ajouté à
    `COMPOSER_FIELDS`. `A4Input` candidat à extraction en
    `ValidatedIntegerInput` partagé si un 3e input similaire
    apparaît (pas extrait par choix de scope en F.2).
- ✅ **Phase 3** (2026-04-23 → 2026-04-24) — Multi-tempérament 24
  notes + refonte UI ADSR. ~13 sous-commits (détail dans Historique
  et Roadmap). Registre enrichi : chaque entrée porte ses champs
  `layout` et `keyboardMap` — `src/lib/keyboardMap.js` supprimé,
  les consommateurs lisent `getTuningSystem(id).keyboardMap`. Deux
  nouveaux tempéraments **24-TET égal** et **24-TET Le Caire 1932**
  (table en dur, source aly-abbara.com, ancrée 'Oshairan = A4 = 440).
  `PianoKeyboard` devient un dispatcher (`LAYOUT_COMPONENTS` :
  `piano-12` → `PianoLayout12`, `grid-24` → `Grid24Layout`). Nouveau
  `Grid24Layout` en CSS Grid 4×30 sub-cols (escalier 1/4 d'unité par
  rangée), palette HSL par degré — 7 hues naturelles, lightness
  différencié par kind ♮/♯/↑/↓ ; `is-active` et `is-playing` en
  outlines pour préserver la couleur de position. Mapping QWERTY 24
  positions géométriquement alignées (SDFGHJK naturelles, ERTYUIO
  demi-dièses, 24680 dièses pleins, XCBNM demi-bémols). Refonte
  raccourcis durées : NumPad sans Shift + Shift+Digit (Digit nus
  libérés pour les notes 24-TET). Snap inter-systèmes généralisé :
  `frequencyToNearestNote` (12-TET only) → `frequencyToNearestIn(hz,
  sysId, a4Ref)` qui itère sur la grille du système cible × 11
  octaves et minimise |cents|. Sélecteur de tempérament ajouté dans
  la toolbar Composer (à côté de A4). **ADSR → AHDSR** : nouveau
  champ `hold` (0-1000 ms, défaut 0) — plateau au peak entre attack
  et decay, pédagogiquement précieux pour distinguer hold forcé vs
  sustain tant que la touche est tenue. UI Enveloppe refondue :
  Amplitude rapatriée dans la zone ADSR (6 sliders Amp/A/H/D/S/R
  empilés), valeurs éditables au clavier via composant générique
  `NumberInput`, tooltips au survol (`AdsrTooltip`), handles
  isotropes, curseur dynamique, P3 retiré (sustain = niveau
  sémantique, pas plateau temporel). Action combinée
  `SET_EDITOR_ADSR_AND_AMP` pour unifier le drag P1 diagonal en un
  seul snapshot undo. P1h géré en z-order (au-dessus de P1 en ordre
  de dessin + hit-test), pas en Y-offset : silhouette fidèle.
- ✅ **Phase 4.1** (2026-04-25) — Juste intonation majeure centrée
  sur C. Ajout de l'entrée `'just-major-c'` au registre (3e
  position, entre `pythagorean-12` et `24-tet-equal`). Table d'Ellis
  5-limit en dur (`JUST_MAJOR_RATIOS_FROM_C`) ; ancrage `C4 = a4Ref
  × 3/5` pour préserver l'invariant A4 = a4Ref exact (A/C = 5/3 dans
  la table). Accidentels en enharmoniques bémols fonctionnels
  (D♯=6/5, G♯=8/5, A♯=9/5, C♯=16/15, F♯=45/32) — écart vs dièses
  non enharmoniques que le tempérament égal efface, point
  pédagogique assumé. Aucun nouveau layout ni mapping : réutilise
  `piano-12` et `TWELVE_KEY_MAP`. Sélecteurs et reducer consomment
  la nouvelle entrée sans modification — le pattern d'extension
  posé en F.3 tient.

## Historique (chronologie inverse)

00000000000. **Iter F — Phase 4.1** (2026-04-25) : Juste intonation
    majeure centrée sur C. 5e tempérament non-libre : table d'Ellis
    5-limit en dur (7 naturelles aux ratios canoniques, 5
    accidentels en enharmoniques bémols — D♯=6/5, G♯=8/5, A♯=9/5,
    plus C♯=16/15 et F♯=45/32). Ancrage `C4 = a4Ref × 3/5`
    (A/C = 5/3 dans la table, invariant A4 = a4Ref préservé). Même
    `notesPerOctave=12`, mêmes noms, même mapping QWERTY et même
    layout `piano-12` que 12-TET et Pythag-12 — sélecteurs et
    reducer consomment la nouvelle entrée sans modification. Le
    pattern d'extension posé en F.3 tient : une seule entrée de
    registre suffit.
0000000000. **Iter F — Phase 3.13.4** (2026-04-24) : correction
    z-order P1h. Rollback de l'offset vertical de 3.13.3 (mauvaise
    interprétation de "P1h au-dessus de P1" — voulait dire z-order,
    pas Y). `p1h.y` revient à `peakY`. À hold=0, P1h prend la priorité
    via z-order (dessin) + ordre de hit-test (P1h avant P1). Grab
    attrape P1h, drag horizontal tire le hold. Pour P1 dans cette
    configuration : sliders ou augmenter d'abord le hold.
000000000. **Iter F — Phase 3.13.3** (2026-04-24) : affinages
    visuels ADSR. Rayon handles 4 → 5 px. Plateau sustain restauré
    en tirets symboliques (`ADSR_SUSTAIN_PX = 60`, `ADSR_W = 380`,
    P3 géométrique non-draggable). Tentative de décalage vertical
    de P1h corrigée en 3.13.4.
00000000. **Iter F — Phase 3.13** (2026-04-24) : UX handles ADSR.
    P1h passe à 1D (X=hold seul, plus d'édition d'amplitude — la
    double édition P1/P1h post-3.12.2 était confuse). P3 et le
    segment plateau sustain visuel supprimés : `ADSR_W` 480 → 320,
    `ADSR_SUSTAIN_PX` retirée. Le sustain devient un niveau
    (point d'arrivée à P2), la release descend directement de P2
    vers P4. Polish handles : cercles isotropes (reset transform
    + coords physiques), curseur dynamique
    `default`/`grab`/`grabbing`, tooltips au survol indiquant le
    rôle (`AdsrTooltip`). Audio inchangé.
0000000. **Iter F — Phase 3.12** (2026-04-24) : ADSR → AHDSR.
    Champ `hold` (0-1000 ms, défaut 0) ajouté à l'enveloppe —
    plateau au peak entre attack et decay, utile percussifs avec
    punch et pédagogiquement précieux pour distinguer hold (forcé)
    vs sustain (tant que la touche est tenue). Audio Designer +
    Composer (live + WAV export) insèrent un plateau via deux
    rampes linéaires successives au même niveau. Persistance
    rétrocompat (?? 0). Re-scheduling pendant lecture désormais
    sensible aux changements d'enveloppe du patch (signature
    enrichie). UI : `ADSR_W` 400 → 480, nouveau handle P1h
    (X=hold, Y=amp en 2D, indexé `5`), 6e slider Hold inséré entre
    Attack et Decay. Drag P1h diagonal réutilise l'action combinée
    `SET_EDITOR_ADSR_AND_AMP` de F.3.11.3.
000000. **Iter F — Phase 3.11** (2026-04-24) : UI Enveloppe ADSR.
    Slider Amplitude rapatrié dans la zone Enveloppe (colonne droite
    à côté du canvas, 5 sliders Amp/A/D/S/R empilés). Graph fidèle
    au signal joué : `p1.y` reflète `amplitude`, `p2/p3.y` reflètent
    `amp×sustain` (sustain absolu = ratio du peak). Drag P1 devient
    2D (X=attack, Y=amp). ADSR_MAX_MS étendu à 1000 ms (plages A/D/R
    plus longues). Les 5 valeurs sont éditables au clavier via un
    nouveau composant générique `NumberInput` (parse/format
    paramétrables) — clic, parse permissif sur "%"/"ms"/virgule,
    Enter/blur commit, Esc annule. Allège la zone Paramètres pour
    le clavier grid-24 24-TET.
00000. **Iter F — Phase 3** (2026-04-23) : multi-tempérament 24 notes.
    Registre enrichi (`layout` + `keyboardMap`), `keyboardMap.js`
    supprimé. Deux nouvelles entrées 24-TET (égal + Le Caire 1932,
    table en dur ancrée 'Oshairan = A4 = 440). `PianoKeyboard`
    devient un dispatcher (`piano-12` / `grid-24`). Nouveau
    `Grid24Layout` (CSS Grid 4×14, 4 niveaux de couleur, cases
    d'enharmonie absentes). Refonte raccourcis durées : NumPad sans
    Shift + Shift+Digit (Digit nus libérés pour 24-TET).
    `frequencyToNearestNote` → `frequencyToNearestIn(hz, sysId,
    a4Ref)` (snap inter-systèmes en cents). Mapping QWERTY 24
    positions exactement.
0000. **Iter F — Phase 2** (2026-04-22) : premier tempérament alternatif
    (Pythagoricien 12 centré sur C, loup F#↔Db), sélecteurs dynamiques
    Designer + Properties, nouveau sélecteur dans PropertiesPanel avec
    logique de bascule verrouillée au reducer (dérivation cohérente des
    champs hauteur au changement de système), nouveau composant
    `A4Input` dans la toolbar Composer (380-480 Hz, undoable).
000. **Iter F — Phase 1** (2026-04-22) : infrastructure multi-tempérament.
   Registre `src/lib/tuningSystems.js` comme point d'extension unique pour
   les systèmes d'accordage ; `clipFrequency(clip, a4Ref)` délégué au
   registre ; champ d'état `a4Ref` (défaut 440 Hz, persisté) propagé à
   `usePlayback`, `WaveformEditor`, `PropertiesPanel`. Aucune UI nouvelle,
   comportement strictement identique à E.9.
00. **Iter A — Phase 2** : split onglets Designer/Composer + responsive (grid),
    SoundBank partagée extraite, MiniPlayer/Toolbar séparés, `usePlayback` hook
    partagé, hydratation de l'éditeur depuis `currentSoundId`, dual save
    (Mettre à jour / Enregistrer comme nouveau), dirty check via imperative handle,
    SpectrogramPlaceholder + PropertiesPanel placeholders, suppression de la
    largeur max globale.
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

## Roadmap & Backlog

### Itération B (édition avancée) — clôturée 2026-04-17

- ✅ Spectrogramme statique lecture seule (phase 1)
- ✅ Multi-sélection + drag/resize/dup/delete groupés + Properties multi
  (phase 2, commits 2.1–2.5)
- ✅ Copier/couper/coller (phase B.3)
- ✅ Fusion de clips (phase B.4)
- ✅ Compléments drag Composer : Ctrl+drag scroll, Alt+drag zoom (phase B.5)
- ✅ Répertoires de sons : arborescence, drag interne, CRUD dossiers (phase B.6)
- ✅ Menu contextuel mesures : supprimer/insérer/couper/copier/coller
  avec split clips à cheval (phase B.7)

### Itération C (multipiste) — clôturée 2026-04-18

- ✅ **Phase 1** (2026-04-17) — UI Multi-tracks. 5 sous-commits :
  - **1.1** En-têtes de pistes + couloirs visuels : refonte layout timeline
    en empilement vertical de couloirs. Colonne d'en-têtes sticky left (120px)
    avec pastille couleur + nom. Palette `TRACK_COLORS` (8 couleurs muted).
    Lane assignment greedy par piste. Fond alternant pair/impair. Bordure
    gauche colorée par corridor. Migration tracks color null → palette.
    `SET_TRACK_HEIGHT` appliqué uniformément à toutes les pistes.
  - **1.2** Création/renommage/suppression : `CREATE_TRACK` (bouton "+ Piste",
    max 16), `RENAME_TRACK` (double-clic input inline), `DELETE_TRACK`
    (× au survol, confirmation si clips, cascade suppression, plancher 1).
    `trackCounter` persisté. `tracks` ajouté à `COMPOSER_FIELDS` pour undo.
  - **1.3** Drop de sons sur la piste survolée : `findTrackAtY` identifie
    le couloir cible depuis la coordonnée Y, surbrillance cyan du couloir
    pendant le drag, `trackId` passé à `onAddClip`.
  - **1.4** Drag de clips entre pistes : `trackDelta` calculé en temps réel
    depuis le Y de la souris via `mouseStartTrackIndex` (corridor sous le
    curseur au mousedown, pas le track du clip — évite les sauts depuis
    lane > 0). Preview : `effectiveLane = 0` quand trackDelta ≠ 0 (la lane
    réelle est recalculée au drop). Multi-sélection cross-piste : même
    delta appliqué à tous, bornes intersectées. `MOVE_CLIPS` enrichi
    avec `trackId` optionnel.
  - **1.5** Réordonnancement des pistes par drag : mousedown sur l'en-tête
    + drag vertical. `REORDER_TRACKS` action (undoable). Feedback visuel :
    opacité réduite + bordure cyan d'insertion.
- ✅ **Phase 2** (2026-04-17) — Mute/Solo/Volume par piste. UI dans
    l'en-tête : boutons M/S toggle + slider volume compact. Logique
    solo standard DAW (mute prioritaire sur solo). GainNode par piste
    dans le graphe audio, gains mis à jour en temps réel pendant la
    lecture. Export WAV respecte mute/solo/volume. Clips des pistes
    mutées/solo-exclues affichés à opacité réduite. `UPDATE_TRACK`
    action undoable (pile Composer).
- ✅ **Phase 3** (2026-04-17) — Refonte moteur audio look-ahead.
    Scheduler à fenêtre glissante (25ms tick, 100ms look-ahead).
    Clips programmés par petits blocs au lieu d'un seul burst.
    Détection de changements par signatures (measure:beat:duration:
    soundId:trackId) : clips modifiés/supprimés invalidés et
    reprogrammés en temps réel. Export WAV inchangé (one-shot).
- ✅ **Phase 4** (2026-04-17) — Adaptation features A/B au multipiste.
    `canMergeClips` vérifie même trackId. Coller cross-piste : clic droit
    et Ctrl+V passent le trackId de la piste survolée → delta de piste
    appliqué à tous les clips collés (clampé aux bornes). Surbrillance
    des pistes cibles au clic droit "Coller ici". `mousePositionRef`
    enrichi avec `trackId`. PropertiesPanel affiche la piste (mono: nom,
    multi: "Pistes mixtes"). Échap ferme le menu contextuel timeline
    (listener capture phase, priorité sur désélection globale).
    Audit : clipboard, measure clipboard, split, delete/insert mesure,
    export WAV, multi-sélection cross-piste — tous déjà corrects.

### Itération D (Designer UX) — clôturée 2026-04-19

- ✅ **Phase 1** (2026-04-19) — Refonte sélecteur de notes + boutons Test :
  - **1.1** Sélecteur de système : dropdown "Système" (12-TET, Libre)
    remplace le toggle "Mode libre". Mode libre étendu à 2^4-2^15 Hz.
  - **1.2** Clavier piano 12 notes + rangée 11 boutons d'octave 0-10.
  - **1.3** Trois boutons Test : impact (•), court (━), tenu (∞).

### Itération E (Patches vs Notes) — clôturée 2026-04-22

- ✅ **Phase 1** (2026-04-19) — Refonte modèle : patches remplacent sounds,
  notes portées par les clips. Commit unique. Voir section État actuel.
- ✅ **Phase 2** (2026-04-19) — Affichage note dans les clips, édition
  via Properties (mini-clavier + octave), flèches clavier pour ajuster
  note/position. 3 sous-commits (2.1, 2.2, 2.3).
- ✅ **Phase 3** (2026-04-19) — Designer = instrument de test
  polyphonique : mousedown/mouseup sur le clavier, raccourcis QWERTY
  physique (event.code), PageUp/PageDown pour décaler l'octave, pédale
  de sustain Espace. 5 sous-commits (3.1, 3.2, 3.3, 3.4, 3.5). Les 3
  boutons Test impact/court/tenu sont retirés. Phase 3.3 initialement
  basée sur Shift/Ctrl "seuls", remplacée le 2026-04-23 par
  PageUp/PageDown (l'ordre de relâchement dans les combos créait des
  octaves intempestives).
- ✅ **Phase 4** (2026-04-19) — Drop intelligent au Composer +
  placement contigu au clavier. 2 sous-commits (4.1, 4.2).
  Extraction de `KEY_CODE_TO_NOTE_INDEX` dans `src/lib/keyboardMap.js`
  partagé entre les deux onglets. Raccourcis d'octave logés dans App
  (actif les deux onglets).
- ✅ **Phase 5** (2026-04-19) — Fixes placement contigu. Commit unique.
  (1) dragstart/dragend en phase capture (PatchBank stopPropagation
  empêchait dragInProgressRef d'être set). (2) preventDefault sur
  toutes les touches de note mappées dans le Composer (bloque F=Find
  et autres raccourcis navigateur), sauf combos Ctrl/Cmd et form
  fields. (3) Fallback anchor après UNDO/REDO_COMPOSER : si l'anchor
  a disparu, on retombe sur le clip avec la fin la plus tardive sur
  la même piste. (4) ADD_CLIP sélectionne le nouveau clip (drop OU
  placement contigu) pour permettre flèches/Ctrl+C immédiats.
- ✅ **Phase 6** (2026-04-20) — UX enrichie. 3 sous-commits :
  - **6.1** Durées en boutons toggle (7 bases + 3 coefs mutuellement
    exclusifs) remplaçant les dropdowns du toolbar et du panneau
    Properties. Snap 0.25 → 0.125 (triple croche). Module partagé
    `src/lib/durations.js` (catalogue, validité coef). Composant
    `DurationButtons`. Mode d'affichage solfège/fraction toggleable
    (state `durationMode` persisté). Raccourcis 1-7 (bases) et 8-0
    (coefs) actifs en Composer.
  - **6.2** Indicateur "Octave : N" dans la toolbar Composer,
    synchronisé avec `state.editor.testOctave` (partagé avec
    Designer). Fond "référence" bleuté quand octave 4.
  - **6.3** Transition CSS 0.35s ease-out sur `.track-corridor`
    (top + height) et `.track-header` (height) : ajout/retrait
    d'une lane s'anime au lieu de sauter. `.placed-sound` suit via
    transition sur `top` (désactivée pendant drag/resize/ghost).
- ✅ **Phase 7** (2026-04-20) — Ajustements UI et cohérence. 6 sous-commits :
  - **7.1** Invariant `lastAnchorClipId === selectedClipIds.at(-1)` quand
    la sélection est non vide. Helper `syncAnchorWithSelection(state)`
    appliqué en sortie de `withUndo` sur chaque action (idempotent).
    Corrige le bug où une cascade d'undo Composer pouvait laisser
    l'anchor sur une piste vidée pendant que la sélection restaurée
    pointait ailleurs → le placement contigu au clavier (touches note
    mappées) agissait sur la mauvaise piste.
  - **7.2** Mode fraction des durées réaligné sur la noire (= 1 beat,
    cohérent avec `seconds = beats * 60 / bpm`). Noire = "1", blanche
    = "2", ronde = "4", carrée = "8", croche = "1/2", double croche =
    "1/4", triple croche = "1/8". Icône du toggle solfège/fraction
    passée de `1/4` à `½` (plus de collision avec la double croche).
  - **7.3** Pas de déplacement clavier ←→ passé de 0.25 à **0.125** beat
    (aligné sur le snap triple croche depuis E.6.1). Shift+←→ reste à
    ±1 beat.
  - **7.4** Redimensionnement manuel des sidebars Composer. Nouveau
    composant `SidebarResizer` (poignée sur la bordure externe). State
    persisté `composerBankWidth` / `composerAsideWidth` (min/défaut
    `COMPOSER_SIDEBAR_MIN_WIDTH = 300`). Max dynamique : la zone
    centrale doit rester ≥ `COMPOSER_MAIN_MIN_WIDTH = 200` px
    (constantes dans `reducer.js`, clamp côté handler dans App).
    useEffect resize de la fenêtre reclampe si la fenêtre rétrécit.
    Largeurs appliquées via CSS variables `--composer-bank-width` /
    `--composer-aside-width` sur `.composer-layout` ; responsive
    (<1100px) ignore ces variables via media query existante.
    `PatchBank.css` et `PropertiesPanel.css` : `max-width: 280px`
    retiré (contraignait l'élargissement). `DurationButtons.css` :
    `flex-wrap: wrap` ajouté sur le conteneur et les sous-groupes
    bases/coefs pour que les boutons passent sur plusieurs lignes si
    la sidebar Properties est étroite.
  - **7.5** Toggle collapse/expand des sidebars. State persisté
    `composerBankCollapsed` / `composerAsideCollapsed` (défaut false).
    Action `SET_COMPOSER_SIDEBAR_COLLAPSED`. En mode fermé, la sidebar
    prend une largeur fixe `COMPOSER_SIDEBAR_COLLAPSED_WIDTH = 32px`
    via override de la CSS variable ; le panneau est démonté (state
    local volatile perdu — dossiers ouverts de la banque) et remplacé
    par le bouton `▶`/`◀` en haut + un label vertical "BANQUE" /
    "PROPRIÉTÉS" (`writing-mode: vertical-rl`). En mode ouvert, le
    bouton est injecté dans le header du panneau via nouvelle prop
    `headerExtra` (PatchBank + PropertiesPanel) — placement naturel
    dans le flex, pas de chevauchement avec le titre.
  - **7.6** Animation cohérente du drag cross-piste ("settling frame").
    Race condition CSS Transitions corrigée : le changement simultané
    de `transition-property` (none → top 0.35s, via retrait de la
    classe `is-dragging`) et de la valeur de `top` dans le même frame
    ne déclenche pas la transition. Fix : au mouseup, capture du `top`
    visuel de chaque clip déplacé/resizé via `el.style.top` (attribut
    `data-clip-id` ajouté), stockage dans le state local `settlingTops`
    appliqué au render suivant comme override inline, puis
    `requestAnimationFrame(() => setSettlingTops(null))` libère la
    valeur. Résultat : le clip glisse en 0.35s synchrone avec les
    corridors qui s'étirent/rétractent. Pendant le drag, la transition
    reste désactivée (réactivité instantanée préservée).
- ✅ **Phase 8** (2026-04-22) — Fix release ADSR Designer sur appui
  bref. Symptôme : appui court sur une touche (souris ou QWERTY) →
  clic sec au lieu d'attack+release. Cause réelle : dans
  `performRelease`, la lecture de `node.gain.gain.value` se faisait
  APRÈS `cancelScheduledValues(now)`. Or ce dernier annule la
  `linearRampToValueAtTime` d'attack encore en cours et fait retomber
  le param sur le dernier `setValueAtTime` antérieur à `now` — c'est-à-
  dire 0 (posé au start de la note). Donc `gain.value` lu juste après
  valait 0, et la rampe de release programmée allait de 0 à 0 : silence
  instantané perçu comme un clic. Fix minimal : capturer `currentGain
  = node.gain.gain.value` AVANT `cancelScheduledValues`, et réinjecter
  cette valeur via `setValueAtTime(currentGain, now)` avant la rampe
  vers 0. Complément : `osc.stop(now + r + 0.02)` au lieu de
  `osc.stop(now + r)` pour garantir une marge de 20ms évitant la coupe
  prématurée. Branches sustain (E.3.4) et retrigger (E.3.4) intactes.
- ✅ **Phase 9** (2026-04-22) — Micro-fades anti-clic. Deux clics
  résiduels post-E.8, causes distinctes, fix indépendants :
  - **9.1** Clic au démarrage d'une voix (Designer + Composer).
    Cause : `OscillatorNode` démarre à une phase arbitraire, et
    avec `attack = 0` le gain passe de 0 à amplitude en un
    sample-block → discontinuité. Fix : `MIN_ATTACK = 0.003s`
    exportée depuis `audio.js`, appliquée via
    `Math.max(user_attack, MIN_ATTACK)` dans
    `WaveformEditor.playInstrumentNote` et dans les deux
    `scheduleXxxClip` de `usePlayback` (temps réel + export WAV).
    Plancher de 3 ms sous le seuil perceptif (~10 ms) → l'attack
    utilisateur ≥ 3 ms n'est pas affecté.
  - **9.2** Clic au retrigger (rejeu d'une note déjà active ou
    sustainée). Cause : la branche retrigger coupait la voix
    précédente via `osc.stop()` sans argument — osc interrompu en
    pleine phase à gain élevé → clic marqué, pire en sustain.
    Fix : `RETRIGGER_FADE = 0.008s` (local `WaveformEditor.jsx`).
    Avant démarrage de la nouvelle voix, on applique à l'ancienne
    le pattern E.8 (capture `gain.value` AVANT
    `cancelScheduledValues`, `setValueAtTime`, rampe vers 0 en
    8 ms, `osc.stop` différé avec marge 20 ms, cleanup dans
    `onended`). La nouvelle voix démarre immédiatement, les deux
    se superposent 8 ms — imperceptible mais supprime le tick.
    `sustainedNotesRef.delete(idx)` préservé : la voix retriggée
    ne réapparaît pas au relâchement de Espace. Invariant
    retrigger "perçu net" (E.3.4) respecté.

### Itération F (multi-tempérament) — en cours

- ✅ **Phase 1** (2026-04-22) — Infrastructure multi-tempérament.
  Deux sous-commits :
  - **1.1** Registre des systèmes de tempérament. Création de
    `src/lib/tuningSystems.js` exposant `TUNING_SYSTEMS` (entrées
    '12-TET' et 'free' pour l'instant), `getTuningSystem(id)`,
    `DEFAULT_A4 = 440`, et `frequencyToNearestNote(hz, a4Ref)`.
    `clipFrequency(clip, a4Ref)` (reducer.js) délègue à `sys.freq(...)` ;
    les cas "free" sont détectés par `sys.freq === null`. Les copies
    locales de `noteToFrequency` (reducer.js et WaveformEditor.jsx)
    et les formules MIDI inline (App.jsx pour le spectrogramme,
    PropertiesPanel.jsx pour l'affichage Hz) sont toutes remplacées
    par des appels au registre. `formatClipNote` et `NOTE_NAMES`
    (clipNote.js) lisent les noms de notes depuis l'entrée '12-TET'
    du registre.
  - **1.2** A4 de référence dans le modèle. Nouveau champ d'état
    `a4Ref` (Hz, défaut 440), persisté dans localStorage avec les
    autres champs métier, validé au chargement (fallback 440 si
    absent/invalide). Propagé : App → `usePlayback` (miroir
    `a4RefRef` comme `bpmRef`, lu au tick du scheduler → lag ≤ 100ms
    pour un changement mid-playback ; `exportWav` lit depuis les
    props directement, OfflineAudioContext one-shot), App →
    `WaveformEditor` (preview polyphonique + spectrogramme), App →
    `PropertiesPanel` (affichage Hz dans NoteEditor). Aucune UI
    d'édition exposée — A4 reste à 440 Hz pour l'utilisateur final.
    Comportement strictement identique à E.9.
- ✅ **Phase 2** (2026-04-22) — Premier tempérament alternatif +
  UI A4. 2 sous-commits :
  - **2.1** Tempérament Pythagoricien 12 centré sur C. Nouvelle
    entrée `'pythagorean-12'` dans `TUNING_SYSTEMS`, label
    "Pythagoricien 12 (quintes pures, centré sur C)". Mêmes 12 noms
    de notes que 12-TET → clavier et UI existants réutilisés sans
    modification. Ratios pythagoriciens dérivés à l'init par parcours
    de la chaîne (constantes `PYTH_FIFTHS_FROM_C` = position dans la
    chaîne par noteIndex, 6 montantes G D A E B F# et 5 descendantes
    F Bb Eb Ab Db ; puis `PYTH_RATIOS_FROM_C` = (3/2)^k replié dans
    [1, 2) par octave-fold). `pythagoreanFreq(noteIndex, octave,
    a4Ref)` ancre C4 = a4Ref × 16/27 et multiplie par le ratio et
    2^(octave-4). La quinte du loup tombe naturellement entre F#
    (+6) et Db (-5) : ~678 cents au lieu de 702 — audible, attendu.
    Ordre dans le registre : `12-TET`, `pythagorean-12`, `free`.
    Sélecteurs de système dérivés du registre (itération
    `Object.values(TUNING_SYSTEMS)`) — Designer et Properties
    Composer. **Ajout du sélecteur dans PropertiesPanel** (absent
    auparavant, seul le Designer en avait un) via composant local
    `TuningSystemSelect` réutilisé en mono (ClipEditor) et multi
    (MultiClipEditor). En multi, check `allSameTuningSystem` ajouté
    à côté de `allSamePitch` → sélecteur éditable si homogène, sinon
    "Systèmes mixtes" read-only. Logique de bascule portée par le
    reducer (`UPDATE_CLIPS_PITCH` étendu) : vers `'free'` calcule
    la fréquence courante (via `clipFrequency`), entre systèmes de
    même `notesPerOctave` garde noteIndex/octave tels quels, sinon
    snap via `frequencyToNearestNote` (12-TET ref pour F.2). Pattern
    symétrique appliqué à `SET_EDITOR_TEST_TUNING_SYSTEM` du
    Designer — corrige un bug latent (le hardcode `'12-TET'` en
    branche non-free aurait snappé aléatoirement à la bascule
    12-TET → Pythagoricien). Libre → Pythagoricien reste un snap
    via 12-TET en F.2 : acceptable puisque les 12 noms de notes
    sont partagés.
  - **2.2** Input A4 dans la toolbar Composer. Nouveau composant
    `A4Input.jsx` — pattern identique à `BpmInput` (validation
    différée au blur/Enter, Échap restaure `preFocusValue`,
    ArrowUp/Down ±1, Shift ±5). Fourchette 380-480 Hz entiers
    (couvre tous les diapasons historiques usuels : Versailles 392,
    baroque 415, XIXe français 435, moderne 440, contemporain
    442-444). Ignoré pour F.2 : décimales (si besoin ressenti) et
    extraction d'un helper `ValidatedIntegerInput` partagé avec
    BpmInput (candidat si un 3e input similaire apparaît). Nouvelle
    action `SET_A4_REF` ajoutée à `COMPOSER_UNDOABLE` ; `a4Ref`
    ajouté à `COMPOSER_FIELDS` pour que l'undo Composer restaure
    aussi la hauteur de référence. Intégration visuelle à côté du
    BPM dans la même `toolbar-section` (même gap, suffixe "Hz" en
    gris clair, style aligné).
- ✅ **Phase 3** (2026-04-23) — Multi-tempérament 24 notes. 4 sous-commits :
  - **3.1** Enrichissement du registre (`layout`, `keyboardMap`).
    Chaque entrée porte désormais son layout (`'piano-12'`,
    `'grid-24'`, `'free'`) et son mapping QWERTY (event.code →
    noteIndex, ou `null` pour 'free'). `src/lib/keyboardMap.js`
    supprimé : les consommateurs (listener Composer App.jsx,
    listener Designer WaveformEditor) lisent dynamiquement
    `getTuningSystem(testTuningSystem).keyboardMap`. Le clip placé
    via touche maintenue hérite du `editor.testTuningSystem` (au
    lieu de `'12-TET'` hardcodé). Guard modificateurs unifié
    (note = pas de Shift/Ctrl/Alt/Meta) en préparation des durées
    Shift+Digit et des notes Digit2..0 en 24-TET.
    `getTuningSystem(id)` inconnu : `console.warn` + fallback
    explicite (plus de fallback silencieux).
  - **3.2** Ajout des deux 24-TET au registre. `'24-tet-equal'` :
    formule `a4Ref·2^((i-18)/24)·2^(oct-4)` (A=index 18 ancré).
    `'24-tet-cairo-1932'` : table en dur des 24 fréquences de
    l'octave 4 (`CAIRO_1932_HZ_OCT4`), réindexée C-centrée, ancrée
    'Oshairan = A4 = 440. Les "anomalies" — E à +46¢, E↑ à +38¢,
    B à +42¢ — sont la signature des tierces et sixtes neutres des
    maqâmat, à ne pas "corriger" vers le 24-TET égal. Noms partagés
    (`TWENTYFOUR_NOTE_NAMES`) : `C, C↑, C♯, D♭, D, …, B↑`. Mapping
    QWERTY 24 positions (`TWENTYFOUR_KEY_MAP`) : naturelles SDFGHJK,
    demi-dièses ERTYUIO, dièses pleins 24680, demi-bémols XCBN,.
    Ordre dans le registre : `12-TET`, `pythagorean-12`,
    `24-tet-equal`, `24-tet-cairo-1932`, `free`.
  - **3.3** Clavier visuel `Grid24Layout`. `PianoKeyboard` devient
    un dispatcher (`LAYOUT_COMPONENTS = { 'piano-12':
    PianoLayout12, 'grid-24': Grid24Layout }`). L'implémentation
    piano historique est extraite telle quelle dans `PianoLayout12`
    — aucun changement comportemental pour 12-TET / Pythag-12.
    `Grid24Layout` : CSS Grid 4 rangées × 14 colonnes (chaque
    naturelle occupe 2 cols, les altérations s'insèrent entre avec
    décalage), 3 niveaux de couleur (naturelles claires,
    demi-dièses/-bémols intermédiaires, dièses pleins sombres),
    4 cases "réellement absentes" (Mi/Si rangée 1 et 4) qui
    matérialisent l'enharmonie F♯=…, B♯=C, F♭=E, C♭=B. Hook
    partagé `useMouseDownHandler` factorise la logique
    mousedown→onKeyPress + window-mouseup→onKeyRelease entre les
    deux layouts. Nouvelle prop `tuningSystem` passée par
    WaveformEditor (`testTuningSystem`) et PropertiesPanel
    (`clip.tuningSystem`).
  - **3.4** Refonte raccourcis durées + snap inter-systèmes
    généralisé. Durées : retiré Digit1..0 sans Shift (libérés pour
    les notes 24-TET), ajouté NumPad1..0 sans Shift et Shift+Digit
    en fallback laptop. `decodeRank()` factorise event → rang 1..10
    (1..7 = bases, 8..10 = coefs ×1.25/Pointé/Double-pointé).
    Snap : `frequencyToNearestNote` (12-TET only) →
    `frequencyToNearestIn(hz, sysId, a4Ref)` qui itère sur la
    grille du système cible × 11 octaves et minimise
    `|1200·log2(candidate/hz)|`. Reducer
    (`UPDATE_CLIPS_PITCH` + `SET_EDITOR_TEST_TUNING_SYSTEM`) lit la
    fréquence source depuis le rendu de l'ancien système (et plus
    de `clip.frequency`, qui peut être `null`) puis snappe vers le
    système cible. Tests-clés : 12-TET C4 → 24-TET-egal reste C4
    (0¢), 24-TET-egal C↑4 → 12-TET snap C4 (~49¢ < ~51¢ de C♯4),
    24-TET-cairo Busalik (E +46¢) → 12-TET snap E.
  - **3.5** (2026-04-23) Signes ↓ au lieu de ♭ en 24-TET. D♭ plein
    et C♯ plein sont enharmoniques dans une grille 24-TET → écrire
    ♭ pour les positions 3, 7, 13, 17, 21 attribuait deux noms à la
    même position. Remplacement par ↓ (demi-bémol) dans
    `TWENTYFOUR_NOTE_NAMES` ; `formatClipNote` et Grid24Layout
    s'alignent automatiquement (lecture du registre).
  - **3.6** (2026-04-23) Remapping QWERTY géométrique + preventDefault
    Firefox. Rangée 1 (♯) décalée d'un cran : Digit4=C♯, Digit5=D♯,
    Digit7=F♯, Digit8=G♯, Digit9=A♯ — chaque chiffre est centré
    entre les deux lettres de la rangée du dessous (Digit4 entre
    KeyE et KeyR → C♯ entre C↑ et D↑). Rangée 4 : Comma → KeyM
    pour B↓ (KeyM entre KeyJ et KeyK = entre A et B). Designer
    onKeyDown : `e.preventDefault()` déplacé AVANT le check
    `e.repeat` — Firefox déclenche QuickFind sur ' (AZERTY Digit4)
    à chaque keydown répété, pas seulement au premier.
  - **3.7** (2026-04-23) Alignement grid-24 escalier + palette par
    hue. Grid passe de 14 à 15 sub-cols pour permettre l'escalier :
    chaque rangée décalée d'+1 sub-col par rapport à celle du
    dessous (r3 offset 0, r2 +1, r1 +2, r4 +3). Chaque
    demi-altération centrée entre les naturelles voisines, chaque
    dièse plein centré entre les demi-dièses voisins — géométrie
    cohérente avec le mapping QWERTY. Palette : 7 hues répartis
    (HUE_PER_NATURAL = [0, 38, 76, 145, 200, 256, 310]), un par
    naturelle. Altérations héritent du hue de leur "parente"
    (↑ et ♯ → naturelle ascendante, ↓ → naturelle suivante).
    Lightness varie par kind (♯ 35%, ♮ 62%, ↑/↓ 75%) →
    différenciation conservée en niveaux de gris. États is-active
    (cyan) et is-playing (jaune) écrasent par !important.
  - **3.8** (2026-04-23) Escalier 1/4 + palette différenciée +
    surbrillance qui préserve la couleur. Grid passe de 15 à 30
    sub-cols (4 sub-cols par naturelle). Décalage 1/4 d'unité par
    rangée : r3 offset 0, r2 +1, r1 +2, r4 −1 (au lieu de +3).
    D↑ et D↓ s'organisent désormais en diamant autour de D
    (équidistants sur côtés opposés). Centre visuel = 3 +
    noteIndex/2 → la grille devient une vraie gamme chromatique
    24-TET linéaire de gauche à droite. Palette : ♮ 60%, ↑ 45%,
    ♯ 30%, ↓ 75% (4 lightness distincts au lieu de 3, ↑ et ↓ ne
    partagent plus la même teinte). is-playing devient outline
    jaune épais (`outline: 3px solid #ffc600` + `outline-offset:
    -3px` + glow) → le fill HSL natif reste visible, l'utilisateur
    garde son repère couleur+position pendant la lecture. is-active
    (sélection cyan) inchangé.
  - **3.9** (2026-04-23) Sélecteur de tempérament dans la toolbar
    Composer. Nouveau dropdown à côté de A4, options identiques
    au sélecteur Designer (`Object.values(TUNING_SYSTEMS)`).
    Reflète `editor.testTuningSystem` (single source of truth) ;
    changement → dispatch `SET_EDITOR_TEST_TUNING_SYSTEM` (action
    existante, pile undo `DESIGNER_UNDOABLE` inchangée). Permet de
    vérifier/changer le tempérament des nouveaux clips placés au
    clavier dans le Composer sans revenir au Designer. Aucun
    raccourci clavier (report si besoin émerge).
  - **3.10** (2026-04-23) Sélection grid-24 préserve aussi la
    couleur HSL. Oubli de F.3.8 : `is-active` gardait `background
    cyan !important` qui écrasait le fill par-degré. Remplacé par
    `box-shadow: inset 0 0 0 3px #00d4ff` — le fond HSL reste
    visible. Combiné avec `is-playing` (outline jaune) via une
    règle dédiée `.is-active.is-playing` qui pose `inset cyan` +
    `glow jaune` simultanément. Triple indication possible sans
    écraser la couleur. Piano-12 inchangé.
  - **3.11** (2026-04-24) UI Enveloppe — Amplitude rapatriée dans
    l'ADSR + valeurs éditables + range étendu. 2 sous-commits :
    - **3.11.1** Layout colonne sliders à droite du canvas ADSR
      (.adsr-body flex row : canvas flex 1 + .adsr-sliders fixed
      150px). Slider Amp déplacé depuis Paramètres → tête de
      colonne, suivi de A/D/S/R. Allège la zone Paramètres pour
      le clavier grid-24. Graph fidèle au signal joué :
      `adsrLevelToY(level) = ADSR_PEAK_Y + (1-level)·(ADSR_H-
      ADSR_PEAK_Y)`, `p1.y = adsrLevelToY(amp)`,
      `p2.y = p3.y = adsrLevelToY(amp×sustain)`. À amp=0.5
      sustain=1, P2 atteint visuellement P1 (drop decay disparaît,
      comme dans l'audio). Drag P1 devient 2D : X édite attack
      (draftAdsr), Y édite amp (draftAmp). Drag P2 Y inverse :
      `sustain = level/amp` clampé ; amp=0 → no-op. ADSR_MAX_MS
      passe de 500 à 1000 — sliders A/D/R max=1000, ADSR_SEGMENT_PX
      reste 80 (les valeurs longues remplissent les 80 px alloués).
      Pas de migration patch (les valeurs existantes restent
      audibles à l'identique).
    - **3.11.2** Valeurs ADSR éditables au clavier. Nouveau
      composant générique `NumberInput` (paramétré par parse/format)
      remplace les `<strong>` par des inputs cliquables. Pattern
      FreqInput généralisé : pas de validation pendant la frappe,
      parse + clamp + format au blur/Enter, Esc restaure
      preFocusValueRef. Helpers : `parsePercent` / `formatPercent`
      ("75" ↔ 0.75 ↔ "75%") et `parseMs` / `formatMs` ("240" ↔
      240 ↔ "240 ms"), permissifs sur "%", "ms" suffix et virgule
      décimale. `commitInputAdsr(key, v)` retire la clé du draftAdsr
      avant le dispatch (sinon le slider afficherait la valeur draft
      pré-input après commit). Slider et input partagent le draft —
      le dernier qui commit gagne, pas de verrou. Focus guard
      existant (`isFormField`) couvre déjà les nouveaux inputs.
    - **3.11.3** Fix undo : drag P1 diagonal unifié en un snapshot
      via nouvelle action `SET_EDITOR_ADSR_AND_AMP` (payload
      `{ adsr?, amplitude? }` fusionnés dans un seul update reducer).
      Avant : endAdsrDrag dispatchait `SET_EDITOR_ADSR` puis
      `SET_EDITOR_AMPLITUDE` → withUndo créait 2 snapshots → 2
      Ctrl+Z pour annuler un geste. Filtre no-op factorisé dans
      `filterAdsrPatch(draft)` — réutilisé par les chemins simple
      et combiné. Bifurcation dans endAdsrDrag selon les drafts
      effectivement modifiés (adsr+amp / adsr seul / amp seul /
      rien). Autres chemins (sliders, NumberInputs, drag P2/P4)
      inchangés.
  - **3.12** (2026-04-24) Champ Hold — ADSR → AHDSR. 2 sous-commits :
    - **3.12.1** Modèle + audio + persistance. Nouveau champ
      `hold` (0-1000 ms, défaut 0) sur `editor` et `Patch`. Plateau
      au peak inséré entre attack et decay via deux
      `linearRampToValueAtTime` au même niveau (Designer
      `playInstrumentNote`, Composer `usePlayback` schedulers live
      et WAV export). `clipDuration = max(noteDurationSec, a + h +
      d + r)`. Hydratation rétrocompat (`?? 0`) — patches
      localStorage existants restent audibles à l'identique. La
      signature de re-scheduling dans usePlayback inclut désormais
      l'enveloppe du patch référencé (attack, hold, decay, sustain,
      release, amplitude) — modifier ces champs pendant la lecture
      re-schedule les clips à venir. `prevPatchesRef` track le
      delta inter-patches. Pas d'UI dans ce sous-commit.
    - **3.12.2** UI hold. `ADSR_W` 400 → 480 (unité de dessin,
      canvas reste responsive). Nouveau point P1h = `{ x: attackPx
      + holdPx, y: adsrLevelToY(amp) }` — même Y que P1 (peak
      line). Trait dessiné P1 → P1h horizontal au peak (le plateau
      hold), puis P1h → P2 (decay). p2/p3/p4.x recalés avec holdPx.
      Drag P1h (idx 5) : 2D comme P1 (X=hold, Y=amp). Réutilise
      sans nouveau code l'infrastructure F.3.11.3 (`endAdsrDrag`
      bifurque vers `SET_EDITOR_ADSR_AND_AMP` si les deux drafts
      ont bougé). Drags P2/P4 corrigés : la base X intègre désormais
      `holdPx` (avant, calculait depuis attackPx seul → faux dès
      qu'un hold était présent). Hit-test ordre P1, P1h, P2, P4 —
      à hold=0 P1h gagne (préfère introduire du hold). 6e
      slider/NumberInput Hold inséré entre Attack et Decay (ordre
      Amp → Attack → Hold → Decay → Sustain → Release). Colonne
      sliders 150 → 160 px, gap 8 → 6 px.
  - **3.13** (2026-04-24) UX handles ADSR : recadrage P1h, P3 retiré,
    polish. 2 sous-commits :
    - **3.13.1** Canvas sémantique. P1h passe à 1D (X=hold seul, Y
      ignoré) — la double édition d'amplitude P1/P1h post-3.12.2
      était confuse. P3 et le segment plateau sustain visuel
      supprimés : sustain est sémantiquement un NIVEAU (point
      d'arrivée à P2), pas une zone temporelle, le moteur audio
      n'a jamais tenu de plateau sustain fixe. La courbe descend
      directement de P2 vers P4. `ADSR_W = 4 × ADSR_SEGMENT_PX =
      320` (plus de zone fixe), `ADSR_SUSTAIN_PX` supprimée. Drag
      P4 base recalculée sans le segment fixe. Hit-test à hold=0 :
      P1 testé en premier → tie-break favorise drag attack+amp,
      hold démarre via slider/NumberInput. Audio inchangé.
    - **3.13.2** Polish handles : cercles isotropes (dessinés en
      coords physiques après `setTransform(1,0,0,1,0,0)` — plus
      d'ellipses dues au scale anisotrope du canvas), curseur
      dynamique (`default` ailleurs → `grab` au survol → `grabbing`
      pendant drag), tooltips au survol via composant `AdsrTooltip`
      (P1: Attack+Amplitude, P1h: Hold, P2: Decay+Sustain, P4:
      Release). État `hover = { idx, px, py }` populé à event-time
      dans `handleAdsrMouseMove` — coords px DOM calculées via
      `getBoundingClientRect`, passées en props au tooltip
      (interdiction ESLint d'accéder au ref pendant render).
      Tooltip caché pendant un drag, bascule sous le handle si
      proche du bord haut. `findHoveredHandle(pos)` factorise le
      hit-test géométrique avec `handleAdsrMouseDown`.
    - **3.13.3** Affinages visuels. Rayon des handles 4 → 5 px
      (`ADSR_HANDLE_RADIUS`), HIT_RADIUS 11. Plateau sustain
      restauré en tirets symboliques (`setLineDash([4, 4])`)
      entre P2 et P3 — `ADSR_SUSTAIN_PX = 60`, `ADSR_W = 380`.
      P3 géométrique non-draggable (fin du plateau), pas de
      handle visible, drag P4 base réintègre `ADSR_SUSTAIN_PX`.
      Tentative de décalage vertical de P1h (8 px au-dessus de la
      peak line) — corrigée en 3.13.4.
    - **3.13.4** Correction P1h via z-order, pas Y-offset. Mauvaise
      interprétation de "P1h au-dessus de P1" en 3.13.3 : voulait
      dire en z-order, pas en Y. Rollback de
      `ADSR_P1H_Y_OFFSET` ; `p1h.y = peakY`. Ordre de hit-test
      inversé (P1h avant P1) dans `handleAdsrMouseDown` et
      `findHoveredHandle` → tie-break à hold=0 favorise P1h. Ordre
      de dessin déjà correct (P1 dessiné avant P1h, donc P1h sur
      le dessus). Conséquence : à hold=0, un seul cercle visible
      (P1h sur P1), grab attrape P1h, drag horizontal tire le hold.
      Pour P1 dans cette configuration : sliders Attack/Amp ou
      augmenter d'abord le hold. Silhouette de l'enveloppe à
      nouveau strictement fidèle (plus de dérogation visuelle de
      la peak line).
- ✅ **Phase 4.1** (2026-04-25) — Tempérament Juste intonation
  majeure centrée sur C. 5e entrée du registre (`'just-major-c'`),
  3e position (entre `pythagorean-12` et `24-tet-equal`). Table
  d'Ellis 5-limit `JUST_MAJOR_RATIOS_FROM_C` en dur (valeurs
  canoniques — dériver procéduralement obscurcirait) : `[1, 16/15,
  9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8]`.
  `justMajorCFreq(noteIndex, octave, a4Ref)` ancre `C4 = a4Ref ×
  3/5` (A/C = 5/3 dans la table → A4 = a4Ref exactement, invariant
  F.2 préservé) et multiplie par le ratio et `2^(octave-4)`. Les 5
  accidentels sont les enharmoniques bémols fonctionnels
  (D♯=6/5=E♭ mineur, G♯=8/5=A♭ mineur, A♯=9/5=B♭ mineur, C♯=16/15,
  F♯=45/32) — conséquence pédagogique assumée : D♯ sonne comme un
  mi bémol pur. Aucun nouveau layout ni mapping clavier :
  réutilisation de `piano-12` et `TWELVE_KEY_MAP`. Sélecteurs
  (Designer, Composer, PropertiesPanel mono et multi) et reducer
  (`UPDATE_CLIPS_PITCH`, `SET_EDITOR_TEST_TUNING_SYSTEM`, snap
  `frequencyToNearestIn`) consomment la nouvelle entrée sans
  modification — le pattern d'extension posé en F.3 tient.
  Vérifs numériques : à `a4Ref=440`, C4=264 Hz, A4=440 Hz exactement ;
  triade C-E-G en ratios 5:4 et 3:2 purs (battements supprimés vs
  12-TET). À `a4Ref=415`, C4=249 Hz.
- 🔜 **Phase 4.2** — 5-TET pentatonique (à livrer).
- 🔜 **Phase 4.3** — 31-EDO (à livrer).

### Backlog général (à caser quand pertinent)

- Spectrogramme avancé : toggle dB / linéaire, zoom, FFT temps réel
  pendant la lecture, affichage post-ADSR
- Bouton "Vider la banque" (avec undo)
- Toggle thème clair/sombre
- Améliorations contrastes (passe 2)
- Section stats (nb mesures, nb clips, durée totale)
- Migration timeline DOM → Canvas (perf à grand nombre de clips)
- Annulation drag par Échap (selon ressenti)
- Optimisation stockage localStorage (résolution points, quantification,
  ou IndexedDB)
- Fréquence libre : flèches haut/bas dans FreqInput pour incréments fins
- Flèches haut/bas dans NumberInput (sliders ADSR : Amp, A, D, S, R) pour
  incréments fins, sur le modèle de A4Input/BpmInput
- Anti-aliasing / qualité de synthèse audio (harmoniques parasites
  découvertes via spectrogramme sur les basses fréquences, voir
  image triangle C1)
- Refonte système notes/durées : boutons au lieu de dropdowns pour
  note/octave, durées manquantes dans le sélecteur (blanche pointée,
  ronde pointée, double-pointées)
- Pause/reprise de lecture + curseur de lecture déplaçable par clic
  sur la timeline
- Bug intermittent : Ctrl+D déclenche parfois le bookmark navigateur
  malgré preventDefault (mode opératoire à reproduire)
- DynamicsCompressorNode sur master bus (protection clipping quand
  plusieurs pistes jouent simultanément, identifié en C.2)
- Loop : marqueurs de boucle, activation, affichage (rendu possible
  par le scheduler look-ahead de C.3)
