import { useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react'
import { pointsToPeriodicWave } from '../audio'
import './WaveformEditor.css'

// Résolution logique du tableau de points (indépendante de la taille pixel
// du canvas). Le canvas peut avoir n'importe quelle taille, on échantillonne
// pts à ptIdx = floor((x/W) * POINTS_RESOLUTION) pour chaque colonne.
const POINTS_RESOLUTION = 600

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const OCTAVES = [1, 2, 3, 4, 5, 6, 7]

function noteToFrequency(noteIndex, octave) {
  const midi = (octave + 1) * 12 + noteIndex
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// ADSR : coordonnées VIRTUELLES (le canvas peut avoir n'importe quelle taille,
// on applique setTransform(W/ADSR_W, H/ADSR_H) avant de dessiner, et toute la
// logique de positions/interactions reste en 400×120).
const ADSR_W = 400
const ADSR_H = 120
const ADSR_MAX_MS = 500
const ADSR_SEGMENT_PX = 80
const ADSR_SUSTAIN_PX = ADSR_W * 0.4
const ADSR_PEAK_Y = ADSR_H * 0.05
const ADSR_HIT_RADIUS = 10
const ADSR_HANDLE_RADIUS = 4

const DEFAULT_STATE = {
  freeMode: false,
  noteIndex: 9,
  octave: 4,
  freeFrequency: 440,
  amplitude: 1,
  preset: null,
  attack: 10,
  decay: 100,
  sustain: 0.7,
  release: 200,
}

function nextAvailableName(base, existingSounds) {
  const taken = new Set(existingSounds.map((s) => s.name))
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base} (${i})`)) i++
  return `${base} (${i})`
}

function blankPoints() {
  return new Float32Array(POINTS_RESOLUTION)
}

function blankReference() {
  return {
    points: Array.from(blankPoints()),
    ...DEFAULT_STATE,
  }
}

function soundToReference(sound) {
  return {
    points: Array.from(sound.points),
    freeMode: sound.mode === 'free',
    noteIndex: sound.noteIndex ?? DEFAULT_STATE.noteIndex,
    octave: sound.octave ?? DEFAULT_STATE.octave,
    freeFrequency: sound.mode === 'free' ? sound.frequency : DEFAULT_STATE.freeFrequency,
    amplitude: sound.amplitude,
    preset: sound.preset,
    attack: sound.attack,
    decay: sound.decay,
    sustain: sound.sustain,
    release: sound.release,
  }
}

function statesEqual(a, b) {
  if (!a || !b) return false
  if (a.amplitude !== b.amplitude) return false
  if (a.freeMode !== b.freeMode) return false
  if (a.noteIndex !== b.noteIndex) return false
  if (a.octave !== b.octave) return false
  if (a.freeFrequency !== b.freeFrequency) return false
  if (a.preset !== b.preset) return false
  if (a.attack !== b.attack) return false
  if (a.decay !== b.decay) return false
  if (a.sustain !== b.sustain) return false
  if (a.release !== b.release) return false
  if (a.points.length !== b.points.length) return false
  for (let i = 0; i < a.points.length; i++) {
    if (a.points[i] !== b.points[i]) return false
  }
  return true
}

/**
 * WaveformEditor — state container pour l'éditeur de son.
 *
 * Expose 3 zones rendues via render-prop `children` : `renderCanvasArea`,
 * `renderParamsArea`, `renderAdsrArea`. Le parent (App) place ces trois zones
 * où il veut dans le layout Designer (phase 3.5 : grid 2×2 avec le spectrogramme
 * à côté du waveform et l'ADSR à côté des params).
 *
 * Les canvases (waveform + ADSR) s'adaptent à la taille de leur conteneur via
 * ResizeObserver. Le waveform garde POINTS_RESOLUTION samples fixes ; l'ADSR
 * utilise setTransform pour conserver des coordonnées virtuelles 400×120.
 */
function WaveformEditor({
  onSaveSound,
  onUpdateSound,
  onRequestNew,
  nextSoundName,
  currentSound,
  savedSounds,
  onSoundCreated,
  ref,
  children,
}) {
  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const oscRef = useRef(null)
  const gainRef = useRef(null)

  const [points, setPoints] = useState(() => blankPoints())
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [freeMode, setFreeMode] = useState(DEFAULT_STATE.freeMode)
  const [noteIndex, setNoteIndex] = useState(DEFAULT_STATE.noteIndex)
  const [octave, setOctave] = useState(DEFAULT_STATE.octave)
  const [freeFrequency, setFreeFrequency] = useState(DEFAULT_STATE.freeFrequency)
  const [amplitude, setAmplitude] = useState(DEFAULT_STATE.amplitude)
  const [activePreset, setActivePreset] = useState(DEFAULT_STATE.preset)
  const [saveMessage, setSaveMessage] = useState('')
  const saveMsgTimerRef = useRef(null)

  const [attack, setAttack] = useState(DEFAULT_STATE.attack)
  const [decay, setDecay] = useState(DEFAULT_STATE.decay)
  const [sustain, setSustain] = useState(DEFAULT_STATE.sustain)
  const [release, setRelease] = useState(DEFAULT_STATE.release)
  const [draggingHandle, setDraggingHandle] = useState(null)
  const adsrCanvasRef = useRef(null)

  // --- Hydration depuis currentSound ---
  const referenceRef = useRef(blankReference())
  const hydratedFromIdRef = useRef(null)

  useEffect(() => {
    const incomingId = currentSound?.id ?? null
    if (incomingId === hydratedFromIdRef.current) return

    if (currentSound) {
      setPoints(new Float32Array(currentSound.points))
      setFreeMode(currentSound.mode === 'free')
      setNoteIndex(currentSound.noteIndex ?? DEFAULT_STATE.noteIndex)
      setOctave(currentSound.octave ?? DEFAULT_STATE.octave)
      setFreeFrequency(currentSound.mode === 'free' ? currentSound.frequency : DEFAULT_STATE.freeFrequency)
      setAmplitude(currentSound.amplitude)
      setActivePreset(currentSound.preset)
      setAttack(currentSound.attack)
      setDecay(currentSound.decay)
      setSustain(currentSound.sustain)
      setRelease(currentSound.release)
      referenceRef.current = soundToReference(currentSound)
    } else {
      setPoints(blankPoints())
      setFreeMode(DEFAULT_STATE.freeMode)
      setNoteIndex(DEFAULT_STATE.noteIndex)
      setOctave(DEFAULT_STATE.octave)
      setFreeFrequency(DEFAULT_STATE.freeFrequency)
      setAmplitude(DEFAULT_STATE.amplitude)
      setActivePreset(DEFAULT_STATE.preset)
      setAttack(DEFAULT_STATE.attack)
      setDecay(DEFAULT_STATE.decay)
      setSustain(DEFAULT_STATE.sustain)
      setRelease(DEFAULT_STATE.release)
      referenceRef.current = blankReference()
    }
    hydratedFromIdRef.current = incomingId
  }, [currentSound])

  // Snapshot mis à jour après chaque render pour le dirty check.
  const stateSnapshotRef = useRef(null)
  useEffect(() => {
    stateSnapshotRef.current = {
      points,
      freeMode,
      noteIndex,
      octave,
      freeFrequency,
      amplitude,
      preset: activePreset,
      attack,
      decay,
      sustain,
      release,
    }
  })

  useImperativeHandle(ref, () => ({
    isDirty: () => {
      if (!stateSnapshotRef.current) return false
      return !statesEqual(stateSnapshotRef.current, referenceRef.current)
    },
  }), [])

  const frequency = freeMode ? freeFrequency : noteToFrequency(noteIndex, octave)
  const defaultName = freeMode ? nextSoundName : `${NOTE_NAMES[noteIndex]}${octave}`

  const pointsRef = useRef(points)
  pointsRef.current = points

  const drawCanvas = useCallback((pts) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return
    const ctx = canvas.getContext('2d')
    const midY = H / 2

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = '#2a2a4a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, midY)
    ctx.lineTo(W, midY)
    ctx.stroke()

    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, midY - H / 4)
    ctx.lineTo(W, midY - H / 4)
    ctx.moveTo(0, midY + H / 4)
    ctx.lineTo(W, midY + H / 4)
    ctx.stroke()
    ctx.setLineDash([])

    // Courbe : une colonne par px, échantillonne pts à ptIdx.
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x < W; x++) {
      const ptFloat = (x / W) * POINTS_RESOLUTION
      const ptIdx = Math.min(Math.floor(ptFloat), POINTS_RESOLUTION - 1)
      const y = midY - pts[ptIdx] * (H / 2)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)'
    ctx.lineWidth = 6
    ctx.beginPath()
    for (let x = 0; x < W; x++) {
      const ptFloat = (x / W) * POINTS_RESOLUTION
      const ptIdx = Math.min(Math.floor(ptFloat), POINTS_RESOLUTION - 1)
      const y = midY - pts[ptIdx] * (H / 2)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [])

  useEffect(() => {
    drawCanvas(points)
  }, [points, drawCanvas])

  // Suit la taille du conteneur du canvas waveform. Sync canvas.width/height
  // au pixel près et redessine.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        const h = Math.floor(entry.contentRect.height)
        if (!w || !h) continue
        if (w !== canvas.width || h !== canvas.height) {
          canvas.width = w
          canvas.height = h
          drawCanvas(pointsRef.current)
        }
      }
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [drawCanvas])

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const xPct = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
    const yPct = (e.clientY - rect.top) / rect.height
    const normalized = -(yPct * 2 - 1)
    const x = Math.floor(xPct * POINTS_RESOLUTION)
    return {
      x: Math.max(0, Math.min(POINTS_RESOLUTION - 1, x)),
      value: Math.max(-1, Math.min(1, normalized)),
    }
  }

  const lastPointRef = useRef(null)

  const handleMouseDown = (e) => {
    setIsDrawing(true)
    setActivePreset(null)
    const pt = getCanvasPoint(e)
    lastPointRef.current = pt
    setPoints((prev) => {
      const next = new Float32Array(prev)
      next[pt.x] = pt.value
      return next
    })
  }

  const handleMouseMove = (e) => {
    if (!isDrawing) return
    const pt = getCanvasPoint(e)
    const last = lastPointRef.current
    if (last) {
      setPoints((prev) => {
        const next = new Float32Array(prev)
        const dx = pt.x - last.x
        const steps = Math.max(Math.abs(dx), 1)
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const x = Math.round(last.x + dx * t)
          const v = last.value + (pt.value - last.value) * t
          if (x >= 0 && x < POINTS_RESOLUTION) next[x] = v
        }
        return next
      })
    }
    lastPointRef.current = pt
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    lastPointRef.current = null
    updateOscillator()
  }

  const handleMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false)
      lastPointRef.current = null
      updateOscillator()
    }
  }

  const updateOscillator = useCallback(() => {
    if (!oscRef.current || !audioCtxRef.current) return
    const wave = pointsToPeriodicWave(pointsRef.current, audioCtxRef.current)
    oscRef.current.setPeriodicWave(wave)
  }, [])

  const togglePlay = () => {
    if (isPlaying) stopAudio()
    else startAudio()
  }

  const startAudio = () => {
    const ctx = audioCtxRef.current || new AudioContext()
    audioCtxRef.current = ctx
    if (ctx.state === 'suspended') ctx.resume()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const wave = pointsToPeriodicWave(pointsRef.current, ctx)
    osc.setPeriodicWave(wave)
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(frequency, now)

    const a = attack / 1000
    const d = decay / 1000
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(amplitude, now + a)
    gain.gain.linearRampToValueAtTime(sustain * amplitude, now + a + d)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()

    oscRef.current = osc
    gainRef.current = gain
    setIsPlaying(true)
  }

  const stopAudio = () => {
    const ctx = audioCtxRef.current
    const osc = oscRef.current
    const gain = gainRef.current
    if (osc && gain && ctx) {
      const now = ctx.currentTime
      const r = release / 1000
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + r)
      osc.stop(now + r)
      osc.onended = () => {
        try { osc.disconnect() } catch { /* already */ }
        try { gain.disconnect() } catch { /* already */ }
      }
    }
    oscRef.current = null
    gainRef.current = null
    setIsPlaying(false)
  }

  useEffect(() => {
    if (oscRef.current)
      oscRef.current.frequency.setValueAtTime(frequency, audioCtxRef.current.currentTime)
  }, [frequency])

  useEffect(() => {
    if (gainRef.current)
      gainRef.current.gain.setValueAtTime(amplitude, audioCtxRef.current.currentTime)
  }, [amplitude])

  useEffect(() => {
    return () => {
      if (oscRef.current) { oscRef.current.stop(); oscRef.current.disconnect() }
      if (gainRef.current) gainRef.current.disconnect()
    }
  }, [])

  useEffect(() => {
    if (isPlaying && oscRef.current && audioCtxRef.current) {
      const wave = pointsToPeriodicWave(points, audioCtxRef.current)
      oscRef.current.setPeriodicWave(wave)
    }
  }, [points, isPlaying])

  const clearCanvas = () => {
    setPoints(blankPoints())
    setActivePreset(null)
    if (isPlaying) updateOscillator()
  }

  const loadPreset = (type) => {
    const pts = blankPoints()
    for (let i = 0; i < POINTS_RESOLUTION; i++) {
      const t = i / POINTS_RESOLUTION
      switch (type) {
        case 'sine': pts[i] = Math.sin(2 * Math.PI * t); break
        case 'square': pts[i] = t < 0.5 ? 1 : -1; break
        case 'sawtooth': pts[i] = 2 * t - 1; break
        case 'triangle': pts[i] = t < 0.5 ? 4 * t - 1 : 3 - 4 * t; break
      }
    }
    setPoints(pts)
    setActivePreset(type)
  }

  const flashMessage = (msg) => {
    setSaveMessage(msg)
    if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current)
    saveMsgTimerRef.current = setTimeout(() => setSaveMessage(''), 2000)
  }

  useEffect(() => () => {
    if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current)
  }, [])

  // --- ADSR visual editor ---
  // Tout est calculé en coordonnées virtuelles (ADSR_W=400, ADSR_H=120). Le
  // canvas peut avoir n'importe quelle taille pixel ; drawAdsr applique
  // setTransform avant de dessiner. Les interactions souris sont converties
  // en virtuel via getAdsrPos.
  const attackPx = (attack / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const decayPx = (decay / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const releasePx = (release / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const sustainY = (1 - sustain) * ADSR_H

  const p1 = { x: attackPx, y: ADSR_PEAK_Y }
  const p2 = { x: attackPx + decayPx, y: sustainY }
  const p3 = { x: attackPx + decayPx + ADSR_SUSTAIN_PX, y: sustainY }
  const p4 = { x: attackPx + decayPx + ADSR_SUSTAIN_PX + releasePx, y: ADSR_H }

  const drawAdsr = useCallback(() => {
    const canvas = adsrCanvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return
    const ctx = canvas.getContext('2d')
    ctx.setTransform(W / ADSR_W, 0, 0, H / ADSR_H, 0, 0)

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, ADSR_W, ADSR_H)

    ctx.strokeStyle = '#2a2a4a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H - 0.5)
    ctx.lineTo(ADSR_W, ADSR_H - 0.5)
    ctx.stroke()

    ctx.fillStyle = 'rgba(0, 212, 255, 0.12)'
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H)
    ctx.lineTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.lineTo(p4.x, p4.y)
    ctx.lineTo(p4.x, ADSR_H)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H)
    ctx.lineTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.lineTo(p4.x, p4.y)
    ctx.stroke()

    const handles = [p1, p2, p3, p4]
    for (const h of handles) {
      ctx.beginPath()
      ctx.arc(h.x, h.y, ADSR_HANDLE_RADIUS, 0, 2 * Math.PI)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#00d4ff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }, [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y])

  useEffect(() => {
    drawAdsr()
  }, [drawAdsr])

  useEffect(() => {
    const canvas = adsrCanvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        const h = Math.floor(entry.contentRect.height)
        if (!w || !h) continue
        if (w !== canvas.width || h !== canvas.height) {
          canvas.width = w
          canvas.height = h
          drawAdsr()
        }
      }
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [drawAdsr])

  const getAdsrPos = (e) => {
    const canvas = adsrCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * ADSR_W,
      y: ((e.clientY - rect.top) / rect.height) * ADSR_H,
    }
  }

  const pxToMs = (px) => Math.round((px / ADSR_SEGMENT_PX) * ADSR_MAX_MS)

  const applyHandleDrag = (handleIdx, pos) => {
    if (handleIdx === 1) {
      const newAttackPx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x))
      setAttack(pxToMs(newAttackPx))
    } else if (handleIdx === 2) {
      const newDecayPx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x - attackPx))
      setDecay(pxToMs(newDecayPx))
      const newSustain = Math.max(0, Math.min(1, 1 - pos.y / ADSR_H))
      setSustain(Math.round(newSustain * 100) / 100)
    } else if (handleIdx === 4) {
      const base = attackPx + decayPx + ADSR_SUSTAIN_PX
      const newReleasePx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x - base))
      setRelease(pxToMs(newReleasePx))
    }
  }

  const handleAdsrMouseDown = (e) => {
    const pos = getAdsrPos(e)
    const candidates = [
      { idx: 1, point: p1 },
      { idx: 2, point: p2 },
      { idx: 4, point: p4 },
    ]
    let picked = null
    let minDist = ADSR_HIT_RADIUS
    for (const c of candidates) {
      const dx = pos.x - c.point.x
      const dy = pos.y - c.point.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) {
        minDist = dist
        picked = c.idx
      }
    }
    if (picked !== null) {
      setDraggingHandle(picked)
      applyHandleDrag(picked, pos)
    }
  }

  const handleAdsrMouseMove = (e) => {
    if (!draggingHandle) return
    applyHandleDrag(draggingHandle, getAdsrPos(e))
  }

  const endAdsrDrag = () => setDraggingHandle(null)

  const buildPayload = (name) => ({
    name,
    mode: freeMode ? 'free' : 'note',
    noteIndex: freeMode ? null : noteIndex,
    octave: freeMode ? null : octave,
    preset: activePreset,
    points: Array.from(points),
    frequency,
    amplitude,
    attack,
    decay,
    sustain,
    release,
  })

  const captureCurrentReference = () => ({
    points: Array.from(points),
    freeMode,
    noteIndex,
    octave,
    freeFrequency,
    amplitude,
    preset: activePreset,
    attack,
    decay,
    sustain,
    release,
  })

  const handleSaveAsNew = () => {
    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      flashMessage('Canvas vide')
      return
    }

    const isExplicitDuplicate = !!currentSound
    let proposedName
    if (isExplicitDuplicate) {
      const base = currentSound.mode === 'note'
        ? currentSound.name
        : `Copie de ${currentSound.name}`
      proposedName = nextAvailableName(base, savedSounds ?? [])
    } else {
      proposedName = defaultName
    }

    const result = onSaveSound(
      buildPayload(proposedName),
      { allowDuplicate: isExplicitDuplicate },
    )
    if (result?.duplicate) {
      flashMessage('Ce son existe déjà')
      return
    }
    referenceRef.current = captureCurrentReference()
    if (result?.id) {
      hydratedFromIdRef.current = result.id
      onSoundCreated?.(result.id)
    }
    flashMessage('Nouveau son enregistré')
  }

  const handleUpdate = () => {
    if (!currentSound) return
    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      flashMessage('Canvas vide')
      return
    }
    onUpdateSound(currentSound.id, buildPayload(currentSound.name))
    referenceRef.current = captureCurrentReference()
    flashMessage('Son mis à jour')
  }

  const handleNew = () => {
    const dirty = !statesEqual(stateSnapshotRef.current, referenceRef.current)
    if (dirty) {
      const ok = window.confirm('Modifications non sauvegardées, continuer ?')
      if (!ok) return
    }
    if (isPlaying) stopAudio()
    setPoints(blankPoints())
    setFreeMode(DEFAULT_STATE.freeMode)
    setNoteIndex(DEFAULT_STATE.noteIndex)
    setOctave(DEFAULT_STATE.octave)
    setFreeFrequency(DEFAULT_STATE.freeFrequency)
    setAmplitude(DEFAULT_STATE.amplitude)
    setActivePreset(DEFAULT_STATE.preset)
    setAttack(DEFAULT_STATE.attack)
    setDecay(DEFAULT_STATE.decay)
    setSustain(DEFAULT_STATE.sustain)
    setRelease(DEFAULT_STATE.release)
    referenceRef.current = blankReference()
    hydratedFromIdRef.current = null
    onRequestNew?.()
  }

  // --- Render areas (render-prop) ---

  const renderCanvasArea = () => (
    <div className="we-canvas-area">
      <header className="we-area-header">
        <h3 className="we-area-title">Waveform</h3>
        <span className="we-sound-tag">
          {currentSound ? `Édition : ${currentSound.name}` : defaultName}
        </span>
      </header>
      <div className="presets">
        <button onClick={() => loadPreset('sine')}>Sine</button>
        <button onClick={() => loadPreset('square')}>Square</button>
        <button onClick={() => loadPreset('sawtooth')}>Sawtooth</button>
        <button onClick={() => loadPreset('triangle')}>Triangle</button>
        <button onClick={clearCanvas}>Clear</button>
      </div>
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        <span className="label top">+1</span>
        <span className="label middle">0</span>
        <span className="label bottom">-1</span>
      </div>
    </div>
  )

  const renderParamsArea = () => (
    <div className="we-params-area">
      <header className="we-area-header">
        <h3 className="we-area-title">Paramètres</h3>
      </header>

      <div className="we-params-fields">
        <div className="control-group">
          <div className="freq-header">
            <label>
              {freeMode ? 'Fréquence libre' : 'Note'}:{' '}
              <strong>{frequency.toFixed(1)} Hz</strong>
              {!freeMode && (
                <span className="note-display">
                  {' '}— {NOTE_NAMES[noteIndex]}{octave}
                </span>
              )}
            </label>
            <button
              type="button"
              className="mode-toggle"
              onClick={() => setFreeMode((m) => !m)}
              title="Basculer entre note tempérée et fréquence libre"
            >
              {freeMode ? 'Mode note' : 'Mode libre'}
            </button>
          </div>

          {freeMode ? (
            <input
              type="range"
              min="20"
              max="2000"
              value={freeFrequency}
              onChange={(e) => setFreeFrequency(Number(e.target.value))}
            />
          ) : (
            <div className="note-selectors">
              <select
                value={noteIndex}
                onChange={(e) => setNoteIndex(Number(e.target.value))}
                aria-label="Note"
              >
                {NOTE_NAMES.map((n, i) => (
                  <option key={n} value={i}>{n}</option>
                ))}
              </select>
              <select
                value={octave}
                onChange={(e) => setOctave(Number(e.target.value))}
                aria-label="Octave"
              >
                {OCTAVES.map((o) => (
                  <option key={o} value={o}>Octave {o}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="control-group">
          <label>
            Amplitude: <strong>{Math.round(amplitude * 100)}%</strong>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={amplitude}
            onChange={(e) => setAmplitude(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="we-params-spacer" />

      <div className="control-buttons">
        <button
          type="button"
          className={`test-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          title="Preview du son en cours d'édition"
        >
          {isPlaying ? 'Stop' : 'Test'}
        </button>
        <button type="button" className="new-btn" onClick={handleNew} title="Nouveau son (réinitialise l'éditeur)">
          Nouveau
        </button>
        {currentSound && (
          <button className="update-btn" onClick={handleUpdate}>
            Mettre à jour
          </button>
        )}
        <button className="save-btn" onClick={handleSaveAsNew}>
          {currentSound ? 'Enregistrer comme nouveau' : 'Sauvegarder le son'}
        </button>
      </div>

      <div className="save-message-slot">
        {saveMessage && <span className="save-message">{saveMessage}</span>}
      </div>
    </div>
  )

  const renderAdsrArea = () => (
    <div className="we-adsr-area">
      <header className="we-area-header">
        <h3 className="we-area-title">Enveloppe ADSR</h3>
      </header>
      <div className="adsr-canvas-container">
        <canvas
          ref={adsrCanvasRef}
          className="adsr-canvas"
          onMouseDown={handleAdsrMouseDown}
          onMouseMove={handleAdsrMouseMove}
          onMouseUp={endAdsrDrag}
          onMouseLeave={endAdsrDrag}
        />
      </div>
      <div className="adsr-sliders">
        <div className="adsr-slider">
          <label htmlFor="adsr-attack">Attack <strong>{attack} ms</strong></label>
          <input
            id="adsr-attack"
            type="range"
            min="0"
            max="500"
            step="1"
            value={attack}
            onChange={(e) => setAttack(Number(e.target.value))}
          />
        </div>
        <div className="adsr-slider">
          <label htmlFor="adsr-decay">Decay <strong>{decay} ms</strong></label>
          <input
            id="adsr-decay"
            type="range"
            min="0"
            max="500"
            step="1"
            value={decay}
            onChange={(e) => setDecay(Number(e.target.value))}
          />
        </div>
        <div className="adsr-slider">
          <label htmlFor="adsr-sustain">Sustain <strong>{Math.round(sustain * 100)}%</strong></label>
          <input
            id="adsr-sustain"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sustain}
            onChange={(e) => setSustain(Number(e.target.value))}
          />
        </div>
        <div className="adsr-slider">
          <label htmlFor="adsr-release">Release <strong>{release} ms</strong></label>
          <input
            id="adsr-release"
            type="range"
            min="0"
            max="500"
            step="1"
            value={release}
            onChange={(e) => setRelease(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  )

  return children({ renderCanvasArea, renderParamsArea, renderAdsrArea })
}

export default WaveformEditor
