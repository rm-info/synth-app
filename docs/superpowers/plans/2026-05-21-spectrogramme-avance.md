# Spectrogramme avancé Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir le Spectrogramme Designer avec un mode Live FFT (auto-switch sur note play + grace period), un toggle dB/linéaire applicable aux deux modes, et un peak hold optionnel pour le mode Live.

**Architecture:** Trois couches modifiées de manière coordonnée — (1) `WaveformEditor.jsx` insère un `AnalyserNode` comme tap entre les voix et `ctx.destination` et maintient un compteur de voix actives ; (2) `App.jsx` gère deux refs partagés (`analyserRef`, `activeVoicesCountRef`) et le state UI (`spectrogramDbScale`, `spectrogramPeakHold`) ; (3) `Spectrogram.jsx` se refactore autour d'une rAF loop permanente qui décide du mode statique/live et dessine selon les toggles.

**Tech Stack:** React 19 + Vite + Web Audio API natifs uniquement (AnalyserNode, requestAnimationFrame). Zéro dépendance npm ajoutée.

**Spec de référence:** `docs/superpowers/specs/2026-05-21-spectrogramme-avance-design.md`

**Convention commits:** `feat(iter-I/phase-1.N): description`.

---

## Préambule — Stratégie de test manuel

Le projet n'a pas de framework de tests automatisés (CLAUDE.md : "tests manuels"). Les subagents font :
1. `npm run lint` — pass attendu
2. `npm run build` — pass attendu (compile sans erreur)
3. Commit avec le préfixe `feat(iter-I/phase-1.N): ...`

Les vérifications manuelles UI/audio sont déférées à l'utilisateur après la livraison de toutes les tasks (browser-based : jouer une note, voir le mode live s'animer, tester les toggles, etc.).

---

## Task 1: Reducer — state fields + actions + persistance

**Files:**
- Modify: `src/reducer.js` (loadPersistedState + état initial + 2 nouveaux case)
- Modify: `src/App.jsx` (useEffect de persistance — ajout des 2 clés)

- [ ] **Step 1: Ajouter les 2 fields dans loadPersistedState**

Repérer la fonction `loadPersistedState()` autour de la ligne 169 dans `src/reducer.js`. Dans l'objet retourné, ajouter ces deux clés à proximité des autres champs UI persistés (genre `spectrogramVisible`, `durationMode`) :

```js
spectrogramDbScale: parsed.spectrogramDbScale ?? false,
spectrogramPeakHold: parsed.spectrogramPeakHold ?? false,
```

- [ ] **Step 2: Ajouter les 2 fields dans l'état initial par défaut**

Repérer l'état initial (autour de la ligne 315-355 dans `src/reducer.js`, où sont définis les valeurs par défaut comme `patchCounter: persisted?.patchCounter ?? 0`). Ajouter à proximité d'autres champs UI :

```js
spectrogramDbScale: persisted?.spectrogramDbScale ?? false,
spectrogramPeakHold: persisted?.spectrogramPeakHold ?? false,
```

- [ ] **Step 3: Ajouter les 2 cases dans le reducer switch**

Repérer le `switch (action.type)` du reducer principal. Ajouter à proximité du case `SET_SPECTROGRAM_VISIBLE` (s'il existe) ou ailleurs dans la liste des UI prefs :

```js
case 'SET_SPECTROGRAM_DB_SCALE':
  return { ...state, spectrogramDbScale: action.payload }
case 'SET_SPECTROGRAM_PEAK_HOLD':
  return { ...state, spectrogramPeakHold: action.payload }
```

**Important** : ne PAS ajouter ces actions à `DESIGNER_UNDOABLE` ni `COMPOSER_UNDOABLE`. Ce sont des préférences UI, non-undoable (cohérent avec `SET_SPECTROGRAM_VISIBLE`, `SET_DURATION_MODE`, etc.).

- [ ] **Step 4: Ajouter les 2 clés dans la persistance localStorage de App.jsx**

Repérer le `useEffect` de persistance dans `src/App.jsx` (autour des lignes 497-534, qui sérialise l'état métier vers localStorage). Ajouter les deux nouvelles clés dans l'objet sérialisé :

```js
spectrogramVisible,
spectrogramDbScale,        // NEW
spectrogramPeakHold,       // NEW
durationMode,
// ...autres clés existantes
```

Aussi ajouter `spectrogramDbScale` et `spectrogramPeakHold` à la destructure de `state` au début du composant (vers la ligne 52-75) si nécessaire — sinon ces variables ne sont pas en scope au moment de la sérialisation.

- [ ] **Step 5: Vérifier lint et build**

```bash
npm run lint
npm run build
```

Attendu : pas d'erreur.

- [ ] **Step 6: Commit**

```bash
git add src/reducer.js src/App.jsx
git commit -m "feat(iter-I/phase-1.1): reducer — spectrogramDbScale/peakHold + persistance"
```

---

## Task 2: WaveformEditor — analyser routing + activeVoicesCount

**Files:**
- Modify: `src/components/WaveformEditor.jsx`

- [ ] **Step 1: Accepter les nouveaux props**

Repérer la destructure des props du composant `WaveformEditor` (vers la ligne 260-280). Ajouter `analyserRef` et `activeVoicesCountRef` :

```jsx
function WaveformEditor({
  ...existing,
  analyserRef,
  activeVoicesCountRef,
}) {
```

- [ ] **Step 2: Ajouter un ref interne pour analyserGain**

Vers la ligne 318 où `audioCtxRef` est déclaré, ajouter à côté :

```jsx
const analyserGainRef = useRef(null)
```

- [ ] **Step 3: Créer l'analyser et le gain tap dans ensureAudioCtx**

Repérer la fonction `ensureAudioCtx` (vers la ligne 564). Sa forme actuelle est approximativement :

```jsx
const ensureAudioCtx = () => {
  const ctx = audioCtxRef.current || new AudioContext()
  audioCtxRef.current = ctx
  return ctx
}
```

Étendre pour créer l'analyser et l'analyserGain à la création d'un nouveau context. Une création se détecte par "ctx ne vient pas de audioCtxRef.current". Code :

```jsx
const ensureAudioCtx = () => {
  if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
    return audioCtxRef.current
  }
  const ctx = new AudioContext()
  audioCtxRef.current = ctx

  // Tap analyser pour le Spectrogram Designer (live FFT mode).
  // Les voix se connecteront à analyserGain au lieu de ctx.destination ;
  // analyserGain → analyser (lecture passive) et analyserGain → ctx.destination
  // (sortie audible inchangée).
  const analyserGain = ctx.createGain()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.75
  analyser.minDecibels = -90
  analyser.maxDecibels = -10
  analyserGain.connect(analyser)
  analyserGain.connect(ctx.destination)

  analyserGainRef.current = analyserGain
  if (analyserRef) analyserRef.current = analyser

  // Reset compteur de voix à la création d'un nouveau context
  if (activeVoicesCountRef) activeVoicesCountRef.current = 0

  return ctx
}
```

Note : la condition exacte de "création vs réutilisation" doit s'adapter à la forme existante de la fonction. Si l'ancienne forme était `ctx = audioCtxRef.current || new AudioContext()`, faire en sorte de détecter le cas de création (par exemple en testant `if (!audioCtxRef.current)`).

- [ ] **Step 4: Re-router les voix vers analyserGain**

Localiser TOUTES les occurrences de `gain.connect(ctx.destination)` dans `src/components/WaveformEditor.jsx`. Les remplacer par `gain.connect(analyserGainRef.current)`.

D'après l'inspection préalable, il y en a au moins une à la ligne ~620 (dans `playInstrumentNote`). Vérifier toutes les occurrences via grep et remplacer chacune.

```jsx
osc.connect(gain)
gain.connect(analyserGainRef.current)  // remplace ctx.destination
```

**Important** : ne pas oublier d'éventuelles autres voies (par exemple un mode "freeNote" en système libre). Toutes les voix qui sortent du Designer doivent passer par analyserGain pour que le Live FFT les voie.

- [ ] **Step 5: Maintenir activeVoicesCountRef sur play**

Dans `playInstrumentNote(idx)` (vers la ligne 570) — juste après `ensureAudioCtx()` et avant les `osc.start()` — incrémenter le compteur :

```jsx
const playInstrumentNote = (idx) => {
  const ctx = ensureAudioCtx()
  // ...existing code...

  // Si retrigger : la voix précédente est arrêtée juste avant (cf. existing code
  // qui fait osc.disconnect/gain.disconnect sur l'ancienne note). On
  // décrémente le compteur si c'est un retrigger pour cette idx.
  const existing = activeNotesRef.current.get(idx) // ou variable équivalente
  if (existing && activeVoicesCountRef) {
    activeVoicesCountRef.current = Math.max(0, activeVoicesCountRef.current - 1)
  }

  // ...crée la nouvelle voix...

  // Incrémenter pour la nouvelle voix
  if (activeVoicesCountRef) activeVoicesCountRef.current += 1

  // ...
}
```

**Le nom exact de la Map des voix actives** (`activeNotesRef`, `notesRef`, etc.) doit être identifié via lecture du code existant — la logique de retrigger existe déjà, il faut juste insérer la décrémentation/incrémentation au bon endroit.

- [ ] **Step 6: Décrémenter à la fin de chaque voix**

Quand une voix se termine naturellement (release ADSR fini + epsilon), on doit décrémenter `activeVoicesCountRef`.

L'approche la plus simple : planifier un `setTimeout` au moment de la création de la voix, dont la durée correspond au temps total avant que la voix devienne inaudible. Code à insérer dans `playInstrumentNote`, après la création de la voix :

```jsx
const totalDurationMs = (effectiveAttack + effectiveHold + effectiveDecay + effectiveRelease + 0.05) * 1000
// Note : effectiveAttack/Hold/Decay/Release sont les valeurs réellement
// utilisées pour ramper le gain — les noms exacts dépendent de l'existant
// (peut-être attack/hold/decay/release directement).

setTimeout(() => {
  if (activeVoicesCountRef) {
    activeVoicesCountRef.current = Math.max(0, activeVoicesCountRef.current - 1)
  }
}, totalDurationMs)
```

**Note sur les release prolongés** : si l'utilisateur maintient une touche (mode sustain), la voix reste active plus longtemps que `attack+hold+decay+release` — le setTimeout planifié peut décrémenter prématurément. On accepte cette imprécision : le compteur peut transitoirement être faux pendant un sustain long, mais la grace period 1s côté Spectrogram absorbe les écarts. Si problème observé en test manuel, on raffinera (e.g. planifier le setTimeout au release réel plutôt qu'au start).

- [ ] **Step 7: Cleanup safety net**

Si le composant gère un cleanup de context (recreate, blur, etc.), s'assurer que le compteur est reset à 0 et que le analyserRef est mis à null. Pattern type :

```jsx
// Dans le cleanup d'un useEffect ou d'un handler
if (activeVoicesCountRef) activeVoicesCountRef.current = 0
if (analyserRef) analyserRef.current = null
analyserGainRef.current = null
```

Adapter aux cleanup paths existants du composant (chercher les `try { ctx.close() } catch`).

- [ ] **Step 8: Vérifier lint et build**

```bash
npm run lint
npm run build
```

Attendu : pas d'erreur. Comme `analyserRef` et `activeVoicesCountRef` sont des props optionnelles à ce stade (App ne les passe pas encore — Task 3), les checks `if (analyserRef)` évitent les crashes.

- [ ] **Step 9: Commit**

```bash
git add src/components/WaveformEditor.jsx
git commit -m "feat(iter-I/phase-1.2): WaveformEditor — analyser tap + compteur voix actives"
```

---

## Task 3: App — refs + state destructure + handlers + props passing

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Créer les 2 nouveaux refs**

Dans le composant `App`, à proximité d'autres `useRef` existants (chercher `editorRef = useRef`), ajouter :

```jsx
const analyserRef = useRef(null)
const activeVoicesCountRef = useRef(0)
```

- [ ] **Step 2: Destructure des 2 nouveaux state fields**

Dans la destructure de `state` au début du composant (ligne ~52-75 d'après la lecture précédente), ajouter `spectrogramDbScale` et `spectrogramPeakHold` à la liste si elles n'y sont pas déjà depuis Task 1. (Si Task 1 a fait son boulot, c'est déjà fait.)

- [ ] **Step 3: Ajouter les handlers toggle**

À proximité d'autres handlers similaires (cherche `setSpectrogramVisible` ligne ~635), ajouter :

```jsx
const setSpectrogramDbScale = useCallback((v) => {
  dispatch({ type: 'SET_SPECTROGRAM_DB_SCALE', payload: v })
}, [])
const setSpectrogramPeakHold = useCallback((v) => {
  dispatch({ type: 'SET_SPECTROGRAM_PEAK_HOLD', payload: v })
}, [])
```

- [ ] **Step 4: Passer les refs à WaveformEditor**

Repérer l'invocation `<WaveformEditor>` dans App.jsx. Ajouter les deux refs :

```jsx
<WaveformEditor
  ... (existing props)
  analyserRef={analyserRef}
  activeVoicesCountRef={activeVoicesCountRef}
>
  ... (children render prop)
</WaveformEditor>
```

- [ ] **Step 5: Passer refs et props à toutes les instances Spectrogram**

Repérer les invocations `<Spectrogram>` dans App.jsx (il y en a une dans l'accordéon Designer mobile vers ligne 1726, possiblement d'autres). Pour chacune, étendre les props :

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

**Important** : si plusieurs `<Spectrogram>` apparaissent dans le code (modes responsive différents), les modifier toutes pour passer ces props. Une seule oubliée laisserait un Spectrogram dans un état incohérent.

- [ ] **Step 6: Vérifier lint et build**

```bash
npm run lint
npm run build
```

Attendu : pas d'erreur. Le composant `Spectrogram` reçoit ces nouvelles props mais ne les utilise pas encore (Task 4) — pas de crash car les props inconnues sont ignorées.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat(iter-I/phase-1.3): App — refs partagés + state + props passing"
```

---

## Task 4: Spectrogram — refactor static + dB toggle + header controls + CSS

**Files:**
- Modify: `src/components/Spectrogram.jsx`
- Modify: `src/components/Spectrogram.css`

- [ ] **Step 1: Accepter les nouveaux props et constantes**

En haut de `src/components/Spectrogram.jsx`, ajouter les constantes après celles existantes :

```js
const DB_FLOOR = -80
const DB_CEIL = 0
```

Modifier la signature du composant :

```jsx
function Spectrogram({
  points,
  frequency,
  analyserRef,
  activeVoicesCountRef,
  dbScale,
  peakHold,
  onToggleDbScale,
  onTogglePeakHold,
}) {
```

- [ ] **Step 2: Extraire drawStatic comme fonction interne**

La fonction `draw` actuelle (lignes 49-118) dessine le statique. La renommer en `drawStatic` et lui faire prendre `dbScale` en paramètre pour gérer l'échelle Y :

```jsx
const drawStatic = useCallback(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const W = canvas.width
  const H = canvas.height
  if (!W || !H) return
  const ctx = canvas.getContext('2d')
  const { points, frequency, dbScale } = propsRef.current

  // ...fond, grille, axe X (code existant inchangé)...

  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, W, H)

  const plotX = PADDING_LEFT
  const plotY = PADDING_TOP
  const plotW = W - PADDING_LEFT - PADDING_RIGHT
  const plotH = H - PADDING_TOP - PADDING_BOTTOM
  if (plotW <= 0 || plotH <= 0) return

  // Grille verticale (inchangé)
  ctx.strokeStyle = '#2a2a4a'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.fillStyle = '#8a8fa8'
  ctx.font = '10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const { hz, label } of GRID_LABELS) {
    const x = plotX + freqToX(hz, plotW)
    ctx.beginPath()
    ctx.moveTo(x, plotY)
    ctx.lineTo(x, plotY + plotH)
    ctx.stroke()
    ctx.fillText(label, x, plotY + plotH + 4)
  }
  ctx.setLineDash([])

  // Axe X (inchangé)
  ctx.strokeStyle = '#3a3a5a'
  ctx.beginPath()
  ctx.moveTo(plotX, plotY + plotH + 0.5)
  ctx.lineTo(plotX + plotW, plotY + plotH + 0.5)
  ctx.stroke()

  // Empty state (inchangé)
  const hasSignal = points.some((v) => v !== 0)
  if (!hasSignal) {
    ctx.fillStyle = '#7a7e96'
    ctx.font = 'italic 12px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText("Dessinez une onde pour voir le spectre", W / 2, plotY + plotH / 2)
    return
  }

  const { magnitudes } = pointsToHarmonics(points)
  let maxMag = 0
  for (let k = 1; k < magnitudes.length; k++) {
    if (magnitudes[k] > maxMag) maxMag = magnitudes[k]
  }
  if (maxMag <= 0) return

  ctx.fillStyle = '#00d4ff'
  for (let k = 1; k < magnitudes.length; k++) {
    const f = k * frequency
    if (f > FREQ_MAX) break
    if (f < FREQ_MIN) continue
    const ratio = magnitudes[k] / maxMag
    if (ratio <= 0) continue
    let barH
    if (dbScale) {
      const db = 20 * Math.log10(ratio)
      if (db < DB_FLOOR) continue
      barH = ((db - DB_FLOOR) / (DB_CEIL - DB_FLOOR)) * plotH
    } else {
      barH = ratio * plotH
    }
    const x = plotX + freqToX(f, plotW)
    ctx.fillRect(x - BAR_WIDTH_PX / 2, plotY + plotH - barH, BAR_WIDTH_PX, barH)
  }
}, [])
```

Mettre à jour `propsRef.current` pour inclure `dbScale` :

```jsx
useEffect(() => {
  propsRef.current = { points, frequency, dbScale }
}, [points, frequency, dbScale])
```

- [ ] **Step 3: Conserver le useEffect existant qui appelle drawStatic**

Le useEffect existant `useEffect(() => { draw() }, [points, frequency, draw])` doit être renommé pour appeler `drawStatic` et inclure `dbScale` :

```jsx
useEffect(() => {
  drawStatic()
}, [points, frequency, dbScale, drawStatic])
```

Le useEffect du ResizeObserver continue d'appeler `drawStatic()` (renommer dans son corps également).

- [ ] **Step 4: Ajouter les header controls**

Modifier le JSX du return pour inclure les boutons toggle :

```jsx
return (
  <div className="spectrogram">
    <header className="spectrogram-header">
      <h3>Spectrogramme</h3>
      <div className="spectrogram-controls">
        <button
          type="button"
          onClick={onToggleDbScale}
          className={`spectrogram-toggle${dbScale ? ' is-active' : ''}`}
          title="Échelle décibels"
        >dB</button>
        <button
          type="button"
          onClick={onTogglePeakHold}
          className={`spectrogram-toggle${peakHold ? ' is-active' : ''}`}
          title="Tenir les pics (mode Live)"
        >Peak</button>
      </div>
    </header>
    <div className="spectrogram-canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} className="spectrogram-canvas" />
    </div>
  </div>
)
```

- [ ] **Step 5: Ajouter les styles CSS**

Dans `src/components/Spectrogram.css`, ajouter à la fin du fichier :

```css
.spectrogram-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.spectrogram-controls {
  display: flex;
  gap: 4px;
}

.spectrogram-toggle {
  background: #1f1f30;
  color: #a8acc4;
  border: 1px solid #3a3a5a;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.85em;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.spectrogram-toggle:hover {
  background: #2a2a4a;
  color: #d0d4ec;
}

.spectrogram-toggle.is-active {
  background: #003a4a;
  color: #00d4ff;
  border-color: #00d4ff;
}
```

Si la classe `.spectrogram-header` existe déjà dans le CSS (vérifier par grep), modifier l'existante pour ajouter `display: flex; align-items: center; justify-content: space-between;`.

- [ ] **Step 6: Vérifier lint et build**

```bash
npm run lint
npm run build
```

Attendu : pas d'erreur.

- [ ] **Step 7: Commit**

```bash
git add src/components/Spectrogram.jsx src/components/Spectrogram.css
git commit -m "feat(iter-I/phase-1.4): Spectrogram — refactor static + dB toggle + controls"
```

---

## Task 5: Spectrogram — Live FFT mode (rAF loop + drawLive)

**Files:**
- Modify: `src/components/Spectrogram.jsx`

- [ ] **Step 1: Ajouter les constantes live**

En haut de `src/components/Spectrogram.jsx`, ajouter à proximité des autres constantes :

```js
const GRACE_MS = 1000
const FFT_SIZE = 2048
```

- [ ] **Step 2: Ajouter le state interne mutable**

À l'intérieur du composant, après les `useRef` existants (canvasRef, containerRef, propsRef), ajouter :

```jsx
const stateRef = useRef({
  mode: 'static',
  lastActivityTime: 0,
  fftDataBuffer: new Float32Array(FFT_SIZE / 2),  // 1024 bins
  peakBuffer: null,  // alloué quand canvas connaît sa largeur
  lastPointsKey: '',  // pour détecter changement static
})
```

Mettre à jour `propsRef` pour inclure les refs partagés et peakHold :

```jsx
useEffect(() => {
  propsRef.current = { points, frequency, dbScale, peakHold, analyserRef, activeVoicesCountRef }
}, [points, frequency, dbScale, peakHold, analyserRef, activeVoicesCountRef])
```

- [ ] **Step 3: Implémenter drawLive**

Ajouter une fonction `drawLive` à côté de `drawStatic` :

```jsx
const drawLive = useCallback(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const { analyserRef, dbScale, peakHold } = propsRef.current
  const analyser = analyserRef?.current
  if (!analyser) return

  const W = canvas.width
  const H = canvas.height
  if (!W || !H) return
  const ctx = canvas.getContext('2d')

  // Fond
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, W, H)

  const plotX = PADDING_LEFT
  const plotY = PADDING_TOP
  const plotW = W - PADDING_LEFT - PADDING_RIGHT
  const plotH = H - PADDING_TOP - PADDING_BOTTOM
  if (plotW <= 0 || plotH <= 0) return

  // Grille verticale (même que static)
  ctx.strokeStyle = '#2a2a4a'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.fillStyle = '#8a8fa8'
  ctx.font = '10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const { hz, label } of GRID_LABELS) {
    const x = plotX + freqToX(hz, plotW)
    ctx.beginPath()
    ctx.moveTo(x, plotY)
    ctx.lineTo(x, plotY + plotH)
    ctx.stroke()
    ctx.fillText(label, x, plotY + plotH + 4)
  }
  ctx.setLineDash([])

  ctx.strokeStyle = '#3a3a5a'
  ctx.beginPath()
  ctx.moveTo(plotX, plotY + plotH + 0.5)
  ctx.lineTo(plotX + plotW, plotY + plotH + 0.5)
  ctx.stroke()

  // Lire la FFT du analyser
  analyser.getFloatFrequencyData(stateRef.current.fftDataBuffer)
  const fft = stateRef.current.fftDataBuffer
  const numBins = fft.length
  const sampleRate = analyser.context.sampleRate
  const binHz = sampleRate / (numBins * 2)  // sampleRate / fftSize

  // Allouer/dimensionner peakBuffer si nécessaire (largeur plotW)
  if (!stateRef.current.peakBuffer || stateRef.current.peakBuffer.length !== plotW) {
    stateRef.current.peakBuffer = new Float32Array(plotW)
  }
  const peakBuffer = stateRef.current.peakBuffer

  // Pour chaque pixel x, calcule la valeur dB en interpolant les bins voisins
  const values = new Float32Array(plotW)
  for (let x = 0; x < plotW; x++) {
    const t = x / plotW
    const f = Math.pow(10, LOG_MIN + t * (LOG_MAX - LOG_MIN))
    const binF = f / binHz
    const bin0 = Math.floor(binF)
    const bin1 = Math.min(bin0 + 1, numBins - 1)
    const frac = binF - bin0
    if (bin0 < 0 || bin0 >= numBins) {
      values[x] = DB_FLOOR
    } else {
      values[x] = fft[bin0] * (1 - frac) + fft[bin1] * frac
    }
  }

  // Convertir en hauteur de pixel
  function dbToY(db) {
    let v = db
    if (v < DB_FLOOR) v = DB_FLOOR
    if (v > DB_CEIL) v = DB_CEIL
    if (dbScale) {
      return plotY + plotH - ((v - DB_FLOOR) / (DB_CEIL - DB_FLOOR)) * plotH
    } else {
      // Linéaire = magnitude normalisée 0..1 (10^(db/20))
      const lin = Math.pow(10, v / 20)
      return plotY + plotH - lin * plotH
    }
  }

  // Tracer la ligne continue
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let x = 0; x < plotW; x++) {
    const y = dbToY(values[x])
    if (x === 0) ctx.moveTo(plotX + x, y)
    else ctx.lineTo(plotX + x, y)
  }
  ctx.stroke()

  // Fill aire sous la courbe (alpha)
  ctx.fillStyle = 'rgba(0, 212, 255, 0.2)'
  ctx.lineTo(plotX + plotW - 1, plotY + plotH)
  ctx.lineTo(plotX, plotY + plotH)
  ctx.closePath()
  ctx.fill()

  // Peak hold
  if (peakHold) {
    ctx.strokeStyle = '#80efff'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < plotW; x++) {
      const current = values[x]
      // Decay vers DB_FLOOR
      const decayed = peakBuffer[x] - 0  // pour le calcul on garde en dB
      // En réalité on garde les peaks en dB : decay = peak - α (où α convertit
      // PEAK_DECAY frame-à-frame en dB). Simpler : on stocke le linéaire 0..1
      // et on applique * 0.97.
      const linCurrent = Math.pow(10, current / 20)
      peakBuffer[x] = Math.max(linCurrent, peakBuffer[x] * 0.97)
      // peakBuffer stocke linéaire 0..1
      const linToDb = peakBuffer[x] <= 0 ? DB_FLOOR : 20 * Math.log10(peakBuffer[x])
      const y = dbToY(linToDb)
      if (x === 0) ctx.moveTo(plotX + x, y)
      else ctx.lineTo(plotX + x, y)
    }
    ctx.stroke()
  }
}, [])
```

**Note importante sur le peakBuffer** : on stocke les peaks en **linéaire** (0..1) plutôt qu'en dB pour que le decay multiplicatif `* 0.97` soit naturel. La conversion vers dB ne se fait qu'au moment du dessin.

- [ ] **Step 4: Remplacer le useEffect statique par une rAF loop unique permanente**

Supprimer le useEffect `useEffect(() => { drawStatic() }, [points, frequency, dbScale, drawStatic])` (il sera remplacé par la rAF loop).

Ajouter une rAF loop permanente :

```jsx
useEffect(() => {
  let rafId = 0
  const loop = (now) => {
    const { activeVoicesCountRef } = propsRef.current

    // Guard anti-dérive
    if (activeVoicesCountRef?.current < 0) activeVoicesCountRef.current = 0

    const voicesActive = (activeVoicesCountRef?.current ?? 0) > 0

    if (voicesActive) {
      stateRef.current.lastActivityTime = now
      stateRef.current.mode = 'live'
    } else if (now - stateRef.current.lastActivityTime > GRACE_MS) {
      if (stateRef.current.mode === 'live') {
        // Reset peakBuffer quand on quitte live
        if (stateRef.current.peakBuffer) stateRef.current.peakBuffer.fill(0)
      }
      stateRef.current.mode = 'static'
    }

    if (stateRef.current.mode === 'live') {
      drawLive()
    } else {
      // Static : redraw si points/frequency/dbScale ont changé depuis le dernier
      const { points, frequency, dbScale } = propsRef.current
      const key = `${points.length}:${points[0]}:${points[300]}:${points[599]}:${frequency}:${dbScale}`
      if (key !== stateRef.current.lastPointsKey) {
        stateRef.current.lastPointsKey = key
        drawStatic()
      }
    }

    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(rafId)
}, [drawStatic, drawLive])
```

**Note sur la détection de changement static** : la `key` ci-dessus est un hash léger (longueur + 3 échantillons + frequency + dbScale). Suffisant pour détecter les changements significatifs. Pas parfait (une modif du même `points[300]` au même pixel ne déclenchera pas un redraw — mais c'est très improbable en pratique).

Le useEffect du ResizeObserver continue de fonctionner. **Modifier sa logique** pour qu'il force un redraw via la rAF loop plutôt que d'appeler `drawStatic` directement : à chaque resize, réinitialiser `stateRef.current.lastPointsKey = ''` et également `stateRef.current.peakBuffer = null` (le buffer doit être ré-alloué à la nouvelle largeur). La prochaine itération de la rAF loop fera le redraw — en statique ET en live, selon le mode courant. Plus de double-rAF Firefox nécessaire car la rAF loop tourne déjà à 60Hz.

Exemple de modification du useEffect ResizeObserver :

```jsx
useEffect(() => {
  const container = containerRef.current
  const canvas = canvasRef.current
  if (!container || !canvas || typeof ResizeObserver === 'undefined') return
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const w = Math.floor(entry.contentRect.width)
      const h = Math.floor(entry.contentRect.height)
      if (!w || !h) continue
      if (w !== canvas.width || h !== canvas.height) {
        canvas.width = w
        canvas.height = h
        // Force redraw au prochain tick rAF : invalide la cache static
        // et réinitialise le peakBuffer (sera ré-alloué à la nouvelle largeur).
        stateRef.current.lastPointsKey = ''
        stateRef.current.peakBuffer = null
      }
    }
  })
  ro.observe(container)
  return () => ro.disconnect()
}, [])
```

- [ ] **Step 5: Vérifier lint et build**

```bash
npm run lint
npm run build
```

Attendu : pas d'erreur.

- [ ] **Step 6: Commit**

```bash
git add src/components/Spectrogram.jsx
git commit -m "feat(iter-I/phase-1.5): Spectrogram — mode Live FFT + rAF loop + auto-switch"
```

---

## Task 6: CONTEXT.md update

**Files:**
- Modify: `CONTEXT.md`

- [ ] **Step 1: TL;DR — ajouter un paragraphe Itération I**

Trouver dans la section TL;DR où sont listés les itérations (chronologiquement A→H, suivi des releases v1.x en reverse-chrono). Ajouter un nouveau paragraphe APRÈS le bloc Itération H (et AVANT les releases v1.x). Contenu :

```markdown
**Itération I (Spectrogramme avancé)** **clôturée le 2026-05-21**.
Phase 1 : enrichissement du Spectrogram Designer avec deux modes
(statique = DFT canonique d'un cycle + Live FFT = AnalyserNode
temps réel pendant les notes test). Auto-switch sur note play avec
grace period 1s pour éviter le flicker en jeu rapide. Toggle dB /
linéaire applicable aux deux modes. Toggle peak hold pour le mode
Live (peaks persistants décroissant en ~1s). Nouveau routage audio
dans WaveformEditor (`osc → gain → analyserGain → analyser +
ctx.destination`). Compteur `activeVoicesCountRef` maintenu (utile
au-delà du spectrogramme). Refs `analyserRef` et `activeVoicesCountRef`
partagés App → WaveformEditor (peuple) → Spectrogram (lit), évite
les re-renders à 60fps. Scope α Designer-only — le Composer a son
propre AnalyserNode (usePlayback) non couvert dans cette phase.
```

- [ ] **Step 2: Arborescence — pas de nouveau fichier à ajouter**

Aucun nouveau fichier créé. Skip.

- [ ] **Step 3: Décisions architecturales — ajouter 4 nouveaux bullets**

Dans la section `## Décisions architecturales`, ajouter 4 nouveaux bullets à la fin :

```markdown
- **Spectrogram : double mode statique/live** — le statique reste la
  vue par défaut (DFT canonique d'un cycle du dessin), le live consomme
  l'AnalyserNode du WaveformEditor pendant les notes test. Auto-switch
  sur note play avec grace period 1s pour éviter le flicker en jeu
  rapide (cas "doum tchak doum tchak").

- **AnalyserNode Designer-only (scope α)** — le Spectrogram Designer
  ne reflète que les notes test du clavier piano, pas la lecture
  Composer (qui a son propre AnalyserNode dans usePlayback). Cohérent
  avec le placement du Spectrogram (Designer uniquement). Si on veut
  un Spectrogram Composer un jour, c'est une feature séparée.

- **Refs partagés entre WaveformEditor et Spectrogram** (`analyserRef`,
  `activeVoicesCountRef`) gérés par App — pattern de coordination
  cross-composant pour éviter re-renders à 60fps. Précédent :
  `editorRef` (imperative handle) existant déjà entre App et
  WaveformEditor.

- **Compteur `activeVoicesCountRef` côté WaveformEditor** — primitive
  utile au-delà du spectrogramme (indicateur visuel "ça joue", limiteur
  de polyphonie, etc.). Décrémentation planifiée via `setTimeout(release
  + epsilon)`. Guard anti-dérive au consumer (clamp à ≥ 0 par tick).
```

- [ ] **Step 4: État actuel — ajouter une entrée Terminé**

Dans la section `## État actuel`, dans le bloc `✅ **Terminé**`, ajouter (à proximité d'autres lignes Spectrogram existantes) :

```markdown
- Spectrogramme Designer avancé (itér I phase 1) : mode statique (DFT)
  + mode Live FFT (AnalyserNode temps réel) avec auto-switch sur note
  play (grace period 1s), toggle dB / linéaire, peak hold optionnel
  pour le Live.
```

- [ ] **Step 5: Roadmap & Backlog — fermer l'item et ajouter la section iter I**

Localiser dans le backlog général (vers la ligne 3616) l'entrée :

```markdown
- Spectrogramme avancé : toggle dB / linéaire, zoom, FFT temps réel
  pendant la lecture, affichage post-ADSR
```

La SUPPRIMER (la feature est livrée).

Puis ajouter une nouvelle section après la fermeture de l'iter H (à la fin de la liste des itérations) :

```markdown
### Itération I (Spectrogramme avancé) — clôturée 2026-05-21

- ✅ **Phase 1** (2026-05-21) — Spectrogramme avancé. 6 sous-commits
  (1.1-1.6) : reducer (state + persistance), WaveformEditor (analyser
  tap + compteur voix), App (refs + handlers + props), Spectrogram
  refactor (static + dB toggle + controls), Spectrogram Live FFT
  (rAF loop + drawLive + auto-switch), CONTEXT.md.
  Spec + plan dans `docs/superpowers/{specs,plans}/2026-05-21-spectrogramme-avance-*.md`.
  Zoom X axis et Spectrogram Composer restent en backlog.
```

Si le zoom X axis n'apparaît pas explicitement dans le backlog général, ajouter dans la section "Backlog général" :

```markdown
- Spectrogramme — zoom X axis (frequency range) — gardé en backlog
  depuis iter I phase 1, l'échelle log actuelle étale déjà
  suffisamment.
- Spectrogramme Composer (visualiser la lecture timeline via le
  AnalyserNode existant dans usePlayback) — gardé en backlog depuis
  iter I phase 1.
```

- [ ] **Step 6: Historique — ajouter une nouvelle entrée datée**

Prepend au début de la section `## Historique (chronologie inverse)` :

```markdown
- **2026-05-21 — Itération I phase 1 : Spectrogramme avancé**
  Enrichissement du Spectrogram Designer avec un mode Live FFT, un
  toggle dB / linéaire (applicable aux deux modes) et un toggle peak
  hold (mode Live).
  - 1.1 : reducer — `spectrogramDbScale` et `spectrogramPeakHold` +
    persistance.
  - 1.2 : `WaveformEditor.jsx` — analyser tap (`osc → gain → analyserGain
    → analyser + ctx.destination`), compteur `activeVoicesCountRef`
    maintenu (incrément/décrément planifié via `setTimeout(release+epsilon)`).
  - 1.3 : `App.jsx` — création des refs partagés (`analyserRef`,
    `activeVoicesCountRef`), handlers toggle, passing aux deux
    composants.
  - 1.4 : `Spectrogram.jsx` — refactor `drawStatic` avec support dB
    scale, ajout du header controls (`<button>` toggle dB / Peak).
    Static mode complet.
  - 1.5 : `Spectrogram.jsx` — rAF loop permanente (auto-switch
    statique/live avec grace period 1s), implémentation `drawLive`
    (interpolation des bins FFT sur axe log, peak hold optionnel).

  Cas d'usage typique : utilisateur dessine une onde → spectre
  statique en barres ; presse une touche du clavier piano → bascule
  immédiate en mode Live (ligne continue cyan + aire fill légère) qui
  suit l'enveloppe ADSR ; relâche → décroissance fluide, retour au
  statique après 1 seconde. Si peak hold actif, traits clairs
  persistent au-dessus de la courbe et redescendent en ~1s.

  Sécurité audio : le routage modifié dans WaveformEditor introduit
  un `GainNode` passif (`analyserGain`) entre les voix et la
  destination ; aucune altération du signal audible. L'AnalyserNode
  ne consomme que des copies des samples (lecture passive).

  Spec + plan archivés : `docs/superpowers/specs/2026-05-21-spectrogramme-avance-design.md`,
  `docs/superpowers/plans/2026-05-21-spectrogramme-avance.md`.

  Tests manuels round-trip attendus de l'utilisateur (jeu de notes,
  toggles dB/peak hold, vérification non-régression sur la lecture
  Composer).
```

- [ ] **Step 7: Vérifier cohérence**

Relire les modifications du CONTEXT.md. Vérifier :
- L'entrée Itération I dans TL;DR est BIEN entre Itération H et les releases v1.x.
- Pas de "TBD" / "TODO" / placeholder.
- Pas de référence à "Spectrogramme avancé" qui resterait dans le backlog (déplacé en Done).

- [ ] **Step 8: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: CONTEXT.md — Itération I phase 1 (spectrogramme avancé)"
```

---

## Auto-vérification du plan

**Couverture de la spec :**

- §1 Objectif (dB toggle + Live FFT + peak hold) → Tasks 4 (dB + controls), 5 (Live + peak hold).
- §2 Scope (in/out) → respecté ; hors-scope explicite préservé.
- §3 Architecture audio → Task 2 (analyser routing + activeVoicesCount).
- §4 Spectrogram component refactor → Tasks 4 (static + dB + UI) et 5 (Live + rAF + peak hold).
- §5 Reducer et persistance → Task 1.
- §6 Modifs App.jsx → Task 3.
- §7 Edge cases → couverts via les guards (analyserRef null check, dérive du compteur, etc.) répartis dans Tasks 2 et 5.
- §8 Tests manuels → déférés à l'utilisateur après livraison de toutes les tasks.
- §9 Décisions architecturales → Task 6 (CONTEXT.md).
- §10 Hors scope → Task 6 mentionne le zoom et Composer-side comme backlog.

**Pas de placeholder** : chaque task a son code, ses commandes, ses critères d'acceptation.

**Type consistency** : `analyserRef`, `activeVoicesCountRef`, `spectrogramDbScale`, `spectrogramPeakHold`, `SET_SPECTROGRAM_DB_SCALE`, `SET_SPECTROGRAM_PEAK_HOLD`, `setSpectrogramDbScale`, `setSpectrogramPeakHold`, `drawStatic`, `drawLive` — tous nommés de façon identique partout.
