# Spec — Spectrogramme avancé (dB toggle + Live FFT)

> Date : 2026-05-21
> Statut : spec validée — en attente de plan d'implémentation
> Hérité du backlog général ("Spectrogramme avancé : toggle dB / linéaire, FFT temps réel pendant la lecture")

## 1. Objectif

Enrichir le composant `Spectrogram.jsx` du Designer pour offrir deux
modes d'affichage :

- **Statique** (existant) : DFT d'un cycle de l'onde dessinée. Affiche
  l'"ADN harmonique" intrinsèque du dessin. Pédagogiquement structurel.
- **Live FFT** (nouveau) : FFT temps réel de la sortie audio pendant
  qu'une note test joue. Affiche l'effet de l'enveloppe ADSR sur le
  spectre. Pédagogiquement comportemental.

Plus un **toggle dB / linéaire** sur l'axe Y, applicable aux deux modes.

Plus un **toggle peak hold** (mode Live uniquement) qui dessine un
trait persistant à la valeur maximale récente, décroissant lentement
— permet de voir les transitoires d'attack.

## 2. Scope

### In scope

- Le Spectrogram Designer (`src/components/Spectrogram.jsx`) reçoit
  deux nouveaux modes statique/live.
- Auto-switch sur note play (mode Live activé quand une voix joue),
  avec grace period 1 seconde après la dernière note pour éviter le
  flicker entre notes successives.
- Toggle dB / linéaire sur l'axe Y (toujours visible dans le header).
- Toggle peak hold (visible dans le header, n'a d'effet qu'en mode Live).
- Persistance des deux toggles via le reducer global (cohérent avec
  `spectrogramVisible` existant).
- Nouveau routage audio dans `WaveformEditor.jsx` : un `AnalyserNode`
  est ajouté entre les voix et `ctx.destination`.

### Hors scope

- Zoom X axis (frequency range) — gardé en backlog, l'échelle log
  actuelle étale déjà suffisamment.
- Spectrogram Composer (visualiser la lecture timeline) — feature
  séparée si demandée un jour.
- Peak hold à plusieurs courbes (peaks différents pour attack vs
  release, etc.) — YAGNI.
- Heatmap waterfall (spectrogramme 2D temps × fréquence × intensité)
  — projet à part entière.
- Spectrogram-side d'effets (clipping detector, harmoniques détectées
  automatiquement, etc.).

## 3. Architecture audio

### 3.1 Routage actuel du Designer

```
osc → gain → ctx.destination
```

L'`AnalyserNode` de `usePlayback.js` (Composer) **ne voit pas** les
notes test Designer — les deux AudioContext sont distincts (cf.
décision archi historique : Composer = look-ahead scheduler, Designer
= jouer-tester immédiat).

### 3.2 Nouveau routage

```
osc → gain → analyserGain → analyser + ctx.destination
```

L'`analyserGain` agit comme un tap : tous les `gain` des voix s'y
connectent. L'analyser reçoit une copie passive, et
`analyserGain → ctx.destination` reste pour la sortie audible. Pas de
double émission audio.

### 3.3 Paramètres de l'AnalyserNode

```js
analyser.fftSize = 2048                  // 1024 bins, ≈23 Hz / bin @ 48kHz
analyser.smoothingTimeConstant = 0.75    // décroissance visible sans flicker
analyser.minDecibels = -90               // floor des valeurs lues
analyser.maxDecibels = -10               // ceiling des valeurs lues
```

### 3.4 Création et cleanup

L'analyser est créé dans `ensureAudioCtx()` de `WaveformEditor.jsx`,
au moment de la (re-)création du contexte. Sur cleanup (changement
de context, unmount du composant), disconnect propre via try/catch
(pattern existant pour les voix).

### 3.5 Détection "any note playing"

Un compteur `activeVoicesCountRef` est maintenu côté `WaveformEditor.jsx` :

- Incrémenté au début de `playInstrumentNote(idx)`, juste après
  `ensureAudioCtx()`.
- Décrémenté à la fin de la voix : planifié via `setTimeout` égal à
  `(release + epsilon) * 1000` ms après le déclenchement.
- En cas de retrigger (note relancée alors qu'elle joue encore), on
  décrémente l'ancienne voix et incrémente la nouvelle (cohérence du
  compteur).
- Reset à 0 dans le cleanup forcé (changement de context, etc.).
- Guard contre dérive : `if (activeVoicesCountRef.current < 0) reset à 0`
  appliqué au début de chaque tick rAF du Spectrogram.

## 4. Spectrogram component refactor

### 4.1 Nouvelle signature

```jsx
<Spectrogram
  points={editor.points}                 // existant — static mode
  frequency={editorFrequency}            // existant
  analyserRef={analyserRef}              // NEW
  activeVoicesCountRef={activeVoicesCountRef}  // NEW
  dbScale={spectrogramDbScale}           // NEW — persisté
  peakHold={spectrogramPeakHold}         // NEW — persisté
  onToggleDbScale={handler}              // NEW
  onTogglePeakHold={handler}             // NEW
/>
```

Les refs `analyserRef` et `activeVoicesCountRef` sont des React refs
**partagés entre App, WaveformEditor et Spectrogram** : App les crée,
WaveformEditor les peuple, Spectrogram les lit. Pas de re-render à
60fps grâce à l'usage des refs.

### 4.2 State interne

```js
// React state — toggles UI, persistés via reducer
// (dans le composant : reçus en props, gérés par App)
dbScale     // boolean, default false
peakHold    // boolean, default false

// Internal mutable state (ref — pas de rerender par frame)
stateRef.current = {
  mode: 'static' | 'live',         // mode courant
  lastActivityTime: 0,             // timestamp ms du dernier instant
                                   // où une voix était active
  peakBuffer: Float32Array,        // buffer peak hold, size = display width
  lastPointsHash: 0,               // détection changement static (évite
                                   // redraw inutile dans la boucle)
  lastFrequency: 0,
  fftDataBuffer: Float32Array,     // réutilisé pour getFloatFrequencyData
                                   // (allocation unique, recyclé chaque frame)
}
```

### 4.3 rAF loop unique, permanente

```js
function loop(now) {
  // 1. Guard contre dérive du compteur
  if (activeVoicesCountRef.current < 0) activeVoicesCountRef.current = 0

  // 2. Détermine le mode
  const voicesActive = activeVoicesCountRef.current > 0
  if (voicesActive) {
    stateRef.lastActivityTime = now
    stateRef.mode = 'live'
  } else if (now - stateRef.lastActivityTime > GRACE_MS) {
    stateRef.mode = 'static'
  }
  // sinon : on stay dans le mode courant (dans la grace period)

  // 3. Render selon le mode
  if (stateRef.mode === 'live') {
    drawLive(analyserRef.current, dbScale, peakHold)
  } else {
    if (pointsOrFreqChangedSinceLastDraw()) {
      drawStatic(points, frequency, dbScale)
      stateRef.peakBuffer.fill(0)  // reset peaks quand on quitte le live
    }
  }

  requestAnimationFrame(loop)
}
```

La rAF tourne en permanence tant que le composant est monté. En mode
statique stable (rien ne change), un tick consiste juste en un test
d'égalité — coût négligeable. En mode live, lecture analyser + draw,
coût similaire à l'oscilloscope existant.

### 4.4 Fonctions de dessin

#### 4.4.1 `drawStatic(points, frequency, dbScale)`

Refactor du dessin actuel + branche dB :

- Récupère `magnitudes` via `pointsToHarmonics(points)`.
- Calcule `maxMag` (déjà fait actuellement).
- Pour chaque harmonique k, calcule la position X (log scale) et la
  position Y :
  - **Linéaire** : `barH = (magnitudes[k] / maxMag) * plotH` (actuel).
  - **dB** : `db = 20 * log10(magnitudes[k] / maxMag)`, clamp à
    `[DB_FLOOR, 0]`, mapper sur `[0, plotH]`.
- Dessine les barres cyan (style actuel préservé).

#### 4.4.2 `drawLive(analyser, dbScale, peakHold)`

- `analyser.getFloatFrequencyData(stateRef.fftDataBuffer)` — récupère
  1024 valeurs en dB (entre `minDecibels` et `maxDecibels`).
- Pour chaque pixel X de l'affichage (typiquement ~600 px) :
  - Calcule la fréquence correspondante (inverse de `freqToX`).
  - Trouve le bin FFT correspondant : `bin = freq / (sampleRate / fftSize)`.
  - Interpole linéairement entre les deux bins voisins pour la valeur.
  - Si `dbScale` : utilise la valeur dB directement, clamp à
    `[DB_FLOOR, 0]`, mappe sur `[0, plotH]`.
  - Sinon : convertit en linéaire via `Math.pow(10, db / 20)`, normalise
    sur `Math.pow(10, 0 / 20) = 1` (= signal saturé), mappe sur `[0, plotH]`.
- Trace une ligne continue via `ctx.beginPath() / moveTo / lineTo`.
  Optionnellement fill l'aire sous la courbe (alpha 0.2-0.3).
- Si `peakHold` :
  - Pour chaque pixel X : `peakBuffer[x] = max(currentValue, peakBuffer[x] * PEAK_DECAY)`.
  - Dessine un trait fin (1px) au niveau du peak, couleur cyan claire (e.g. `#80efff`).

### 4.5 Header et controls

```jsx
<header className="spectrogram-header">
  <h3>Spectrogramme</h3>
  <div className="spectrogram-controls">
    <button onClick={onToggleDbScale}
            className={dbScale ? 'spectrogram-toggle is-active' : 'spectrogram-toggle'}
            title="Échelle décibels">dB</button>
    <button onClick={onTogglePeakHold}
            className={peakHold ? 'spectrogram-toggle is-active' : 'spectrogram-toggle'}
            title="Tenir les pics (Live)">Peak</button>
  </div>
</header>
```

Deux boutons toggle compacts. État ON = fond cyan (cohérent avec
DurationButtons et autres toggles existants). Tous deux toujours
visibles, indépendants du mode courant (Peak n'a juste pas d'effet
en static — pas grave, on garde l'UI prévisible).

**Indicateur de mode** : pas de label texte "Statique" vs "Live". Le
style de la visualisation (barres discrètes vs ligne continue) signale
lui-même le mode. YAGNI sur un indicateur explicite.

### 4.6 Constantes

```js
const GRACE_MS = 1000           // grace period auto-switch live → static
const PEAK_DECAY = 0.97         // factor par frame, peak décroît visible en ~1s @ 60fps
const FFT_SIZE = 2048           // 1024 bins, ≈23 Hz résolution
const SMOOTHING = 0.75          // smoothingTimeConstant
const DB_FLOOR = -80            // dB minimum affiché
const DB_CEIL = 0               // dB maximum affiché (signal saturé)
```

## 5. Reducer et persistance

### 5.1 Nouveaux champs d'état

```js
spectrogramDbScale: boolean,    // default false
spectrogramPeakHold: boolean,   // default false
```

Ajoutés dans `loadPersistedState` (avec fallback `?? false`) et dans
l'état initial par défaut.

### 5.2 Nouvelles actions

```js
case 'SET_SPECTROGRAM_DB_SCALE':
  return { ...state, spectrogramDbScale: action.payload }
case 'SET_SPECTROGRAM_PEAK_HOLD':
  return { ...state, spectrogramPeakHold: action.payload }
```

### 5.3 Persistance et pile undo

- **Persistés** dans le `useEffect` de sauvegarde localStorage de
  `App.jsx` (cohérent avec `spectrogramVisible`, `durationMode`).
- **Non-undoable** — pas dans `COMPOSER_UNDOABLE` ni dans
  `DESIGNER_UNDOABLE`. Ce sont des préférences UI pures, pas de
  données métier (cohérent avec `spectrogramVisible`).

## 6. Modifs `App.jsx`

### 6.1 Nouveaux refs partagés

```jsx
const analyserRef = useRef(null)
const activeVoicesCountRef = useRef(0)
```

Ces refs sont créés par App et **passés à la fois à WaveformEditor
(qui les peuple) et à Spectrogram (qui les lit)**. Pattern de
coordination cross-composant cohérent avec l'existant `editorRef`
(imperative handle entre App et WaveformEditor).

### 6.2 Destructure et handlers

```jsx
const {
  // ...existing,
  spectrogramDbScale, spectrogramPeakHold,
} = state

const setSpectrogramDbScale = useCallback((v) => {
  dispatch({ type: 'SET_SPECTROGRAM_DB_SCALE', payload: v })
}, [])

const setSpectrogramPeakHold = useCallback((v) => {
  dispatch({ type: 'SET_SPECTROGRAM_PEAK_HOLD', payload: v })
}, [])
```

### 6.3 Pass aux composants

WaveformEditor reçoit les refs (qu'il peuple) :

```jsx
<WaveformEditor
  ... (existing props)
  analyserRef={analyserRef}
  activeVoicesCountRef={activeVoicesCountRef}
>
  ... (children render prop)
</WaveformEditor>
```

Spectrogram reçoit les refs et les toggles :

```jsx
<Spectrogram
  points={editor.points}
  frequency={editorFrequency}
  analyserRef={analyserRef}
  activeVoicesCountRef={activeVoicesCountRef}
  dbScale={spectrogramDbScale}
  peakHold={spectrogramPeakHold}
  onToggleDbScale={() => setSpectrogramDbScale(!spectrogramDbScale)}
  onTogglePeakHold={() => setSpectrogramPeakHold(!spectrogramPeakHold)}
/>
```

## 7. Edge cases

- **Spectrogramme caché** (`spectrogramVisible === false`) : le
  Spectrogram n'est pas monté → pas de rAF loop → pas de coût. Aucun
  changement à prévoir.
- **Onglet inactif** : `requestAnimationFrame` est suspendu par le
  navigateur → pas de tick → pas de coût.
- **`activeVoicesCountRef` qui dérive** (incrément sans décrément
  correspondant, à cause d'un bug de timing) : guard
  `if (activeVoicesCountRef.current < 0) reset à 0` au début de chaque
  tick rAF du Spectrogram. Grace period s'épuise normalement.
- **Lecture Composer simultanée** : pas concernée. Le Composer a son
  propre AnalyserNode (usePlayback) qu'on ne touche pas. Le Spectrogram
  Designer ne voit pas la lecture Composer (cohérent avec scope α).
- **Changement de context AudioContext** : `analyserRef.current` est
  re-peuplé à la création du nouveau context, `activeVoicesCountRef`
  reset à 0. Pas de leak.
- **Peak hold reset** : quand on quitte le mode live (grace period
  expirée), on remplit `peakBuffer` de zéros pour ne pas avoir des
  peaks fantômes au prochain passage en live.

## 8. Tests manuels anti-régression

1. **Statique de base** : dessiner une onde → spectre affiché. Toggle
   dB → barres réparties en échelle dB (les harmoniques faibles
   deviennent visibles). Toggle re-clic → retour linéaire.
2. **Live single note** : jouer une touche → bascule vers ligne live
   qui s'anime selon l'ADSR. Relâcher → décroissance fluide, retour
   au statique après ~1s.
3. **Live multi notes rapides** : marteler plusieurs touches → reste
   en mode live tout du long, pas de flip vers static entre les notes.
4. **Peak hold ON** : marteler une touche → courbe live + traits de
   peak qui persistent et redescendent en ~1s.
5. **dB toggle pendant le live** : la courbe se reformat sans
   redémarrage de la note.
6. **Peak hold toggle pendant le live** : les peaks apparaissent /
   disparaissent immédiatement.
7. **Persistance** : reload de la page → les toggles dB et Peak hold
   gardent leur état.
8. **Lecture Composer** (non-régression) : la lecture timeline ne
   déclenche PAS le mode live du spectrogramme Designer.
9. **Note pendant lecture Composer** : si l'utilisateur joue une note
   test Designer pendant que la timeline tourne, le Spectrogram passe
   en live (réagit seulement à la note Designer, pas à la timeline).
10. **Spectrogramme caché** (toggle `spectrogramVisible`) : aucun
    impact, le composant n'est pas monté.

## 9. Décisions architecturales à inscrire dans CONTEXT.md

À ajouter en section "Décisions architecturales" après livraison :

1. **Spectrogram : double mode statique/live** — le statique reste la
   vue par défaut (DFT canonique d'un cycle du dessin), le live
   consomme l'AnalyserNode du WaveformEditor pendant les notes test.
   Auto-switch sur note play avec grace period 1s pour éviter le
   flicker en jeu rapide.

2. **AnalyserNode Designer-only (scope α)** — le Spectrogram Designer
   ne reflète que les notes test du clavier piano, pas la lecture
   Composer (qui a son propre AnalyserNode dans usePlayback). Cohérent
   avec le placement du Spectrogram (Designer uniquement). Si on veut
   un Spectrogram Composer un jour, c'est une feature séparée.

3. **Refs partagés entre WaveformEditor et Spectrogram**
   (`analyserRef`, `activeVoicesCountRef`) gérés par App — pattern de
   coordination cross-composant pour éviter re-renders à 60fps.
   Précédent : `editorRef` (imperative handle) existant déjà entre
   App et WaveformEditor.

4. **Compteur `activeVoicesCountRef`** maintenu côté WaveformEditor —
   primitive utile au-delà du spectrogramme (indicateur visuel "ça
   joue", limiteur de polyphonie, etc.). Décrémentation planifiée via
   `setTimeout(release + epsilon)`. Guard anti-dérive au consumer (clamp à
   ≥ 0 par tick).

## 10. Hors scope explicite

Réaffirmé pour clarté à l'implémentation :

- Pas de zoom X axis dans cette phase.
- Pas de Spectrogram Composer (l'analyser de usePlayback existe mais
  on ne le câble pas à un composant viz dans cette phase).
- Pas de heatmap waterfall.
- Pas de détection automatique de clipping / harmoniques aliasées
  (sera tangentiellement adressé par le point 2 de la roadmap user :
  anti-aliasing).
- Pas d'overlay statique+live (mode simultané) ni de mode "split".
- Pas de UI exposée pour les constantes (`GRACE_MS`, `PEAK_DECAY`,
  etc.) — internes au code.
