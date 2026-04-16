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
Itération B en cours : **phase 1 livrée le 2026-04-16** (spectrogramme
statique). Reste multi-sélection, folders UI, etc. Itération C (multipiste,
look-ahead audio) à venir.

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
    └── components/
        ├── Tabs.jsx + .css                    # bascule Designer / Composer
        ├── SoundBank.jsx + .css               # banque de sons partagée
        ├── WaveformEditor.jsx + .css          # éditeur ondes (Designer)
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

// Persistance (localStorage, clé "synth-app-state") :
// { savedSounds, soundFolders, tracks, clips, bpm, numMeasures,
//   spectrogramVisible, activeTab, soundCounter, clipCounter }
// NON persisté (volatile) : selectedClipIds, currentSoundId, zoomH,
// defaultClipDuration, composerFlash, editor (éditeur vide au reload),
// piles undo/redo.
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
- État UI : `activeTab`, `currentSoundId`, `measureWidth` (zoom ancien, refondu en phase 3)
- Détention d'une `editorRef` (imperative handle) pour interroger le `WaveformEditor`
  sur son état dirty avant de charger un nouveau son.
- Persistance auto via `useEffect` (n'inclut PAS l'UI state).
- Handlers : `handleSaveSound` (retourne `{duplicate, id}`), `handleUpdateSound`
  (MAJ d'un son existant), `handleAddClip`, `handleRemoveClip`, `handleUpdateClip`,
  `handleClearTimeline`, `handleDeleteSound`, `handleRenameSound`, `handleLoadSound`
  (avec confirm si dirty), `handleSoundCreated` (set currentSoundId au nouveau).
- Appelle `usePlayback({ clips, savedSounds, bpm, totalDurationSec })` UNE fois ;
  les contrôles (play/stop/cursorPos/etc.) sont distribués au MiniPlayer (Designer)
  et au Toolbar/Timeline (Composer).
- État restant à venir : `selectedClipIds`, `zoomH/V` (% continus), tracks/folders.

### `WaveformEditor.jsx`
- Canvas 600×300 dessinable à la souris (interpolation linéaire)
- Presets Sine / Square / Sawtooth / Triangle / Clear (tracking `activePreset`)
- Sélecteur note + octave (tempérament égal) OU slider fréquence libre 20-2000 Hz,
  toggle entre les deux modes
- Éditeur ADSR **visuel** 400×120 : 4 poignées draggables (P1 attack, P2 decay+sustain,
  P3 fin sustain non-draggable, P4 release), courbe cyan + remplissage, sliders read-only
  en dessous
- Preview Play/Stop avec enveloppe AD→sustain hold puis release, cleanup via `osc.onended`
- Hydratation auto depuis `currentSound` (prop) via `useEffect` qui compare l'id
  contre `hydratedFromIdRef`. Pas de re-hydrate si même id.
- **Dirty check** exposé via `useImperativeHandle` (`isDirty()`). Compare l'état local
  vs `referenceRef` (snapshot mis à jour à chaque hydrate / save).
- Deux boutons sauvegarder :
  - "Mettre à jour" (visible si `currentSound`) : appelle `onUpdateSound(id, payload)`,
    referenceRef est synchronisée, flash "Son mis à jour".
  - "Enregistrer comme nouveau" (toujours visible) : appelle `onSaveSound(payload)`,
    bascule la référence et le `hydratedFromIdRef` vers le nouvel id, déclenche
    `onSoundCreated(id)` pour que App set `currentSoundId`. Flash "Nouveau son enregistré".
- Header affiche soit le nom prochain (création) soit "Édition : NOM" (chargé).

### `Timeline.jsx` (Composer)
- Reçu en props : `cursorPos`, `isPlaying`, `analyserRef` (depuis `usePlayback`),
  `measureWidth`, `numMeasures`, handlers de clips.
- Grille : `numMeasures` × 4 `.beat-cell` (pointillés), drop unique sur `.cells-wrapper`
  avec snap 16ᵉ + clamp anti-débordement.
- Clips placés (couche absolue) : lane layout greedy pour polyphonie, `<select>` durée
  embarqué (sortira en phase 3), clic droit = retirer.
- Curseur de lecture + visualiseur oscilloscope visible pendant lecture (persistant en phase 3).
- Plus de header ni de banque (déplacés vers Toolbar / SoundBank).

### `SoundBank.jsx` (partagé Designer & Composer)
- Liste verticale de chips (responsive : bandeau horizontal en <900px).
- Drag → payload `text/plain` = soundId (drop sur Timeline).
- Click ou double-click → `onLoadSound(id)` (App fait dirty check + tab switch).
- Bouton ✎ rename inline ; bouton × supprime (confirm si utilisé).
- Chip avec `currentSoundId` reçoit la classe `is-current` (highlight bordure).

### `usePlayback` (hook, `src/hooks/usePlayback.js`)
- Une instance dans App. Singleton de fait pour le moteur audio timeline.
- Retourne `{ isPlaying, cursorPos, currentTime, isExporting, analyserRef,
  play, stop, exportWav }`.
- AudioContext créé paresseusement. Cleanup à l'unmount d'App.

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

## Décisions architecturales

Choix non évidents pris pour de bonnes raisons. À ne pas remettre en question
à la légère — relire ici avant de refactorer.

- **L'éditeur de son n'est plus détaché** : son state (points, ADSR,
  fréquence, preset, etc.) vit dans `state.editor` du reducer global,
  pas en local dans `WaveformEditor`. Raison : l'undo/redo doit couvrir
  l'éditeur. Conséquence : les gestes continus (dessin canvas, drag
  poignées ADSR, sliders) **doivent** utiliser un draft local et ne
  dispatcher qu'au mouseup/touchend/blur, sinon chaque pixel pollue
  la pile d'historique.
- **Piles undo/redo en RAM pure** : pas de persistance localStorage.
  Motifs : taille (snapshots complets × 50 × 2 onglets), complexité
  (migration de format à chaque évolution du reducer), coût faible
  pour l'utilisateur (historique qui s'efface au reload est un comportement
  standard).
- **Snapshots undo complets (pas de diff)** : chaque entrée d'historique
  est un clone superficiel des champs trackés. Le partage de références
  via l'immutabilité du reducer rend ça bon marché en mémoire (un clip
  non modifié est la même référence dans tous les snapshots).
- **Moteur audio schedule tout au démarrage** : `usePlayback` appelle
  `scheduleNotes()` une fois au `play()` pour tous les clips. Pas de
  look-ahead, pas de re-schedule pendant lecture. **Bug connu** : toute
  modification de clips pendant que ça joue est ignorée jusqu'au prochain
  play. À refondre en **itération C** (look-ahead par fenêtre glissante,
  voir Roadmap).
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
  est bloqué avec un Toast explicite, plutôt que d'orphaniser
  silencieusement les clips.

## Contraintes implicites

Conventions tacites. Les enfreindre sans raison crée des bugs subtils.

- **Pas de TypeScript** : choix initial, pas de migration en cours de
  projet. Le modèle est documenté en TS-like dans ce fichier à titre
  de référence uniquement.
- **IDs via compteurs persistés** (`soundCounter`, `clipCounter`) :
  jamais les recalculer depuis `savedSounds.length` ou `clips.length`.
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
  Composer = `[clips, numMeasures, bpm]` (tracks exclu pour préserver
  zoom V), Designer = `[savedSounds, soundFolders, editor]`. Vérification
  cross-onglet : un undo Designer qui ferait disparaître un son utilisé
  par des clips est bloqué + Toast d'erreur (composant Toast.jsx, auto-clear
  4.5s). Boutons ⟲/⟳ dans la toolbar Composer et dans l'en-tête de la
  zone Waveform du Designer. Raccourcis Ctrl/Cmd+Z (undo) et
  Ctrl/Cmd+Shift+Z / Ctrl+Y (redo) au niveau window, skip si focus dans
  input/textarea/select/contenteditable. Historique RAM uniquement (non
  persisté).

## Itération en cours : B — édition avancée

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

✅ **Itération A terminée**. Prochaine étape : itération B (folders, multi-
sélection, multipiste, insertion de mesures au milieu, etc.) ou
sous-itérations correctifs/UX selon les retours.

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

### Itération B (édition avancée) — en cours

- ✅ Spectrogramme statique lecture seule (phase 1)
- Multi-sélection clips (Shift+clic, rectangle, Ctrl+clic)
- Copier/coller/déplacer clips en groupe
- Répertoires de sons exposés dans l'UI
- Menu contextuel sur en-tête de mesure (insertion milieu, couper/
  copier/coller mesures, split clips)
- Spectrogramme : options (toggle dB / linéaire, zoom, FFT temps réel
  pendant la lecture, affichage post-ADSR)

### Itération C (multipiste) — à rediscuter

- UI multi-tracks (créer/renommer/supprimer/réordonner)
- Mute/Solo/volume par piste
- Refonte moteur audio en look-ahead (résout bug modif pendant lecture)

### Backlog général (à caser quand pertinent)

- Bouton "Vider la banque" (avec undo)
- Notes/octaves en boutons type clavier au lieu de dropdowns
- Concept "patch/instrument" : son sans fréquence, hauteur appliquée
  par le clip (refonte conceptuelle majeure, à rediscuter)
- Toggle thème clair/sombre
- Améliorations contrastes (passe 2)
- Section stats (nb mesures, nb clips, durée totale)
- Migration timeline DOM → Canvas (perf à grand nombre de clips)
- Annulation drag par Échap (selon ressenti)
- Optimisation stockage localStorage (résolution points, quantification,
  ou IndexedDB)
- Fréquence libre : flèches haut/bas dans FreqInput pour incréments fins
