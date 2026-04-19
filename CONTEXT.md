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
Itération E (Patches vs Notes) **en cours** — refonte conceptuelle
majeure. Phase 1 (2026-04-19) : les **sons** deviennent des **patches**
sans fréquence ni note ; la hauteur est portée par chaque **clip**
(tuningSystem + noteIndex/octave en 12-TET, ou frequency en Libre).
Un patch peut être joué à n'importe quelle hauteur sans duplication.
Pas de migration : ancien localStorage détecté → reset propre.
Phase 2 (2026-04-19) : la note s'affiche dans chaque clip (label
adaptatif selon largeur), s'édite dans Properties via un mini-clavier
(ou un FreqInput en mode libre), et s'ajuste au clavier (↑↓ demi-ton,
Shift octave, ←→ ±0.25 beat, Shift+←→ ±1 beat).

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
    │   └── timelineLayout.js # layoutClips + computeBounds (partagés Timeline/Properties)
    └── components/
        ├── Tabs.jsx + .css                    # bascule Designer / Composer
        ├── PatchBank.jsx + .css               # banque de patches partagée
        ├── WaveformEditor.jsx + .css          # éditeur ondes / patch (Designer)
        ├── Spectrogram.jsx + .css             # spectrogramme statique (Designer)
        ├── MiniPlayer.jsx + .css              # transport simplifié (Designer)
        ├── BpmInput.jsx                       # input BPM validation différée
        ├── FreqInput.jsx                      # input fréquence libre (phase 3.7)
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
  attack: number                  // ms, 0-500
  decay: number                   // ms, 0-500
  sustain: number                 // 0..1
  release: number                 // ms, 0-500
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
  tuningSystem: '12-TET' | 'free'
  noteIndex: number | null        // 0-11 en 12-TET, null en Libre
  octave: number | null           // 0-10 en 12-TET, null en Libre
  frequency: number | null        // null en 12-TET (calculée), explicite en Libre
}

// Fréquence effective d'un clip → `clipFrequency(clip)` (reducer.js) :
//   - 'free'   → clip.frequency
//   - '12-TET' → 440 * 2^((midi - 69) / 12) avec midi = (octave+1)*12 + noteIndex
// Utilisé par usePlayback (live + export WAV). Point d'extension pour futurs
// systèmes d'accordage (24-TET, Pythagorean, etc.).

// Persistance (localStorage, clé "synth-app-state") :
// { patches, soundFolders, tracks, clips, bpm, numMeasures,
//   spectrogramVisible, activeTab, patchCounter, clipCounter,
//   folderCounter, trackCounter }
// NON persisté (volatile) : selectedClipIds, currentPatchId, zoomH,
// defaultClipDuration, composerFlash, editor (éditeur vide au reload),
// piles undo/redo.
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
- Éditeur ADSR **visuel** 400×120 : 4 poignées draggables (P1 attack, P2 decay+sustain,
  P3 fin sustain non-draggable, P4 release), courbe cyan + remplissage, sliders read-only
  en dessous
- **Trois boutons Test** (impact •, court ━, tenu ∞) : impact joue A→D→R,
  court ajoute un hold 1s entre decay et release, tenu joue indéfiniment
  jusqu'à clic Stop (■). Auto-fin pour impact/court via `osc.onended`.
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
  `GainNode` (ADSR) → `trackGainNode` → `analyserGain` →
  `AnalyserNode` + `destination`. Un `GainNode` par piste ;
  gain = `track.volume` si audible, 0 si muté/solo-exclu.
  Changements de clips détectés par comparaison de signatures ;
  clips modifiés invalidés et reprogrammés.
- **Export WAV** : `OfflineAudioContext(2, sampleRate * totalDurationSec, 44100)`,
  même routage per-track GainNode, mono up-mixé en stéréo, encodage RIFF/PCM16
- **ADSR par note** : rampes linéaires attack→peak→sustain→hold→release→0
  avec `clipDuration = max(noteDurationSec, attack+decay+release)`

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
  `clipFrequency(clip)` (reducer.js) ; point d'extension unique pour
  les futurs systèmes d'accordage.
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
- Preview Play/Stop avec enveloppe (trois modes : impact/court/tenu)
- Banque de patches : drag, rename, delete, dossiers arborescents
- Drop timeline avec snap 16ᵉ, polyphonie multi-lanes, multi-pistes
- Hauteur par clip (12-TET ou Libre) via `clipFrequency(clip)` (itération E.1)
- Sélecteur durée musicale par clip (7 options)
- BPM ajustable + recalcul durée totale
- Curseur animé + affichage temps
- Zoom horizontal + vertical
- Visualiseur oscilloscope temps réel
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
- Phase 1 — Refonte sélecteur de notes + boutons Test : dropdown "Système"
  (12-TET / Libre), clavier piano 12 notes, sélecteur d'octave 0-10,
  extension mode libre 2^4-2^15 Hz, trois boutons Test (impact/court/tenu).
  Modèle : `mode: 'note' | 'free'` → `tuningSystem: '12-TET' | 'free'`
  (migration transparente via `normalizeSound`).

🚧 **Itération E en cours** — Patches vs Notes (refonte conceptuelle majeure)
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

## Historique (chronologie inverse)

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

### Itération E (Patches vs Notes) — en cours

- ✅ **Phase 1** (2026-04-19) — Refonte modèle : patches remplacent sounds,
  notes portées par les clips. Commit unique. Voir section État actuel.
- ✅ **Phase 2** (2026-04-19) — Affichage note dans les clips, édition
  via Properties (mini-clavier + octave), flèches clavier pour ajuster
  note/position. 3 sous-commits (2.1, 2.2, 2.3).
- ⏳ **Phase 3** — Designer comme instrument de test : clavier QWERTY,
  Espace sustain, mousedown/mouseup comme piano.
- ⏳ **Phase 4** — Drop intelligent : raccourcis clavier au drop,
  placement contigu, override de note au drop.

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
