import { useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react'
import { pointsToPeriodicWave } from '../audio'
import FreqInput from './FreqInput'
import { PianoKeyboard, OctaveSelector, NOTE_NAMES } from './PianoKeyboard'
import './WaveformEditor.css'

const POINTS_RESOLUTION = 600

function noteToFrequency(noteIndex, octave) {
  const midi = (octave + 1) * 12 + noteIndex
  return 440 * Math.pow(2, (midi - 69) / 12)
}

const FREQ_MIN = 16
const FREQ_MAX = 32768
const FREQ_MIN_LOG = Math.log(FREQ_MIN)
const FREQ_MAX_LOG = Math.log(FREQ_MAX)

function sliderToFreq(v) {
  return Math.exp(FREQ_MIN_LOG + v * (FREQ_MAX_LOG - FREQ_MIN_LOG))
}
function freqToSlider(hz) {
  const clamped = Math.max(FREQ_MIN, Math.min(FREQ_MAX, hz))
  return (Math.log(clamped) - FREQ_MIN_LOG) / (FREQ_MAX_LOG - FREQ_MIN_LOG)
}
function formatFreq(hz) {
  const r = Math.round(hz * 10) / 10
  if (Number.isInteger(r)) return `${r} Hz`
  return `${r.toFixed(1)} Hz`
}

const ADSR_W = 400
const ADSR_H = 120
const ADSR_MAX_MS = 500
const ADSR_SEGMENT_PX = 80
const ADSR_SUSTAIN_PX = ADSR_W * 0.4
const ADSR_PEAK_Y = ADSR_H * 0.05
const ADSR_HIT_RADIUS = 10
const ADSR_HANDLE_RADIUS = 4

function stripSuffix(name) {
  let s = name
  for (;;) {
    const m = s.match(/^(.*?)\s*\(\d+\)$/)
    if (!m) return s
    s = m[1]
  }
}

function nextAvailableName(rawBase, existingPatches) {
  const base = stripSuffix(rawBase)
  const taken = new Set(existingPatches.map((p) => p.name))
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base} (${i})`)) i++
  return `${base} (${i})`
}

function blankPointsArray() {
  return new Array(POINTS_RESOLUTION).fill(0)
}

function generatePresetPoints(type) {
  const pts = new Array(POINTS_RESOLUTION).fill(0)
  for (let i = 0; i < POINTS_RESOLUTION; i++) {
    const t = i / POINTS_RESOLUTION
    switch (type) {
      case 'sine': pts[i] = Math.sin(2 * Math.PI * t); break
      case 'square': pts[i] = t < 0.5 ? 1 : -1; break
      case 'sawtooth': pts[i] = 2 * t - 1; break
      case 'triangle': pts[i] = t < 0.5 ? 4 * t - 1 : 3 - 4 * t; break
    }
  }
  return pts
}

// Dirty check : on compare uniquement les champs stockés sur le Patch
// (points + ADSR + amplitude + preset). Les champs test* sont volatils et
// ne participent pas au dirty (ils n'affectent pas le patch sauvegardé).
function patchFieldsEqual(a, b) {
  if (!a || !b) return false
  if (a.amplitude !== b.amplitude) return false
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

function snapshotPatchFields(editor) {
  return {
    points: Array.from(editor.points),
    amplitude: editor.amplitude,
    preset: editor.preset,
    attack: editor.attack,
    decay: editor.decay,
    sustain: editor.sustain,
    release: editor.release,
  }
}

function patchToReference(patch) {
  return {
    points: Array.from(patch.points),
    amplitude: patch.amplitude,
    preset: patch.preset,
    attack: patch.attack,
    decay: patch.decay,
    sustain: patch.sustain,
    release: patch.release,
  }
}

/**
 * WaveformEditor — éditeur de patch.
 *
 * Depuis itération E : un patch ne porte plus de fréquence ni de note. Le
 * clavier + sélecteur d'octave + slider fréquence ne pilotent que la preview
 * (test* fields du state editor). Au drop d'un patch sur la timeline, la
 * note courante du clavier devient celle du clip créé.
 */
function WaveformEditor({
  editor,
  editorActions,
  onSavePatch,
  onUpdatePatch,
  onRequestNew,
  nextPatchName,
  currentPatch,
  patches,
  onPatchCreated,
  spectrogramVisible,
  onToggleSpectrogram,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  ref,
  children,
}) {
  const [draftPoints, setDraftPoints] = useState(null)
  const [draftAdsr, setDraftAdsr] = useState(null)
  const [draftAmp, setDraftAmp] = useState(null)
  const [draftFreq, setDraftFreq] = useState(null)

  const points = draftPoints ?? editor.points
  const amplitude = draftAmp ?? editor.amplitude
  const testFrequency = draftFreq ?? editor.testFrequency
  const attack = draftAdsr?.attack ?? editor.attack
  const decay = draftAdsr?.decay ?? editor.decay
  const sustain = draftAdsr?.sustain ?? editor.sustain
  const release = draftAdsr?.release ?? editor.release

  const { testTuningSystem, testNoteIndex, testOctave, preset: activePreset } = editor
  const freeMode = testTuningSystem === 'free'

  const frequency = freeMode ? testFrequency : noteToFrequency(testNoteIndex, testOctave)
  const defaultName = nextPatchName

  const canvasRef = useRef(null)
  const canvasContainerRef = useRef(null)
  const adsrCanvasRef = useRef(null)
  const adsrContainerRef = useRef(null)
  const audioCtxRef = useRef(null)
  const oscRef = useRef(null)
  const gainRef = useRef(null)

  const [isDrawing, setIsDrawing] = useState(false)
  const [playingMode, setPlayingMode] = useState(null)
  const isPlaying = playingMode !== null
  const [draggingHandle, setDraggingHandle] = useState(null)
  const [saveMessage, setSaveMessage] = useState('')
  const saveMsgTimerRef = useRef(null)

  const referenceRef = useRef(snapshotPatchFields(editor))
  const referencedPatchIdRef = useRef(null)

  useEffect(() => {
    const incomingId = currentPatch?.id ?? null
    if (incomingId === referencedPatchIdRef.current) return
    referencedPatchIdRef.current = incomingId
    referenceRef.current = currentPatch
      ? patchToReference(currentPatch)
      : { ...snapshotPatchFields(editor), points: Array.from(blankPointsArray()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPatch])

  const stateSnapshotRef = useRef(null)
  stateSnapshotRef.current = {
    points, amplitude, preset: activePreset, attack, decay, sustain, release,
  }

  useImperativeHandle(ref, () => ({
    isDirty: () => {
      if (!stateSnapshotRef.current) return false
      return !patchFieldsEqual(stateSnapshotRef.current, referenceRef.current)
    },
  }), [])

  const pointsRef = useRef(points)
  useEffect(() => { pointsRef.current = points }, [points])

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

  useEffect(() => {
    const container = canvasContainerRef.current
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
          drawCanvas(pointsRef.current)
        }
      }
    })
    ro.observe(container)
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
    const pt = getCanvasPoint(e)
    lastPointRef.current = pt
    const next = Array.from(points)
    next[pt.x] = pt.value
    setDraftPoints(next)
  }

  const handleMouseMove = (e) => {
    if (!isDrawing) return
    const pt = getCanvasPoint(e)
    const last = lastPointRef.current
    if (last) {
      const next = Array.from(draftPoints ?? points)
      const dx = pt.x - last.x
      const steps = Math.max(Math.abs(dx), 1)
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = Math.round(last.x + dx * t)
        const v = last.value + (pt.value - last.value) * t
        if (x >= 0 && x < POINTS_RESOLUTION) next[x] = v
      }
      setDraftPoints(next)
    }
    lastPointRef.current = pt
  }

  const commitDraftPoints = () => {
    if (draftPoints) {
      const same = draftPoints.length === editor.points.length &&
        draftPoints.every((v, i) => v === editor.points[i])
      if (!same) editorActions.setPoints(draftPoints)
      setDraftPoints(null)
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    lastPointRef.current = null
    commitDraftPoints()
  }

  const handleMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false)
      lastPointRef.current = null
      commitDraftPoints()
    }
  }

  const COURT_HOLD_SEC = 1.0

  const startAudio = (mode) => {
    if (playingMode !== null) return

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
    const r = release / 1000
    const sustainLevel = sustain * amplitude

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(amplitude, now + a)
    gain.gain.linearRampToValueAtTime(sustainLevel, now + a + d)

    let stopTime = null
    if (mode === 'impact' || mode === 'court') {
      const holdSec = mode === 'court' ? COURT_HOLD_SEC : 0
      const releaseStart = now + a + d + holdSec
      if (holdSec > 0) gain.gain.setValueAtTime(sustainLevel, releaseStart)
      gain.gain.linearRampToValueAtTime(0, releaseStart + r)
      stopTime = releaseStart + r + 0.02
    }

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()

    if (stopTime !== null) {
      osc.stop(stopTime)
      osc.onended = () => {
        try { osc.disconnect() } catch { /* already */ }
        try { gain.disconnect() } catch { /* already */ }
        setPlayingMode((cur) => (cur === mode ? null : cur))
        if (oscRef.current === osc) oscRef.current = null
        if (gainRef.current === gain) gainRef.current = null
      }
    }

    oscRef.current = osc
    gainRef.current = gain
    setPlayingMode(mode)
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
    setPlayingMode(null)
  }

  const handleTestClick = (mode) => {
    if (mode === 'tenu' && playingMode === 'tenu') {
      stopAudio()
      return
    }
    if (playingMode !== null) return
    startAudio(mode)
  }

  useEffect(() => {
    if (oscRef.current && audioCtxRef.current) {
      oscRef.current.frequency.setValueAtTime(frequency, audioCtxRef.current.currentTime)
    }
  }, [frequency])

  useEffect(() => {
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setValueAtTime(amplitude, audioCtxRef.current.currentTime)
    }
  }, [amplitude])

  useEffect(() => {
    return () => {
      if (oscRef.current) { oscRef.current.stop(); oscRef.current.disconnect() }
      if (gainRef.current) gainRef.current.disconnect()
    }
  }, [])

  const clearCanvas = () => {
    editorActions.setPoints(blankPointsArray())
  }

  const loadPreset = (type) => {
    const pts = generatePresetPoints(type)
    editorActions.applyPreset(type, pts)
  }

  const flashMessage = (msg) => {
    setSaveMessage(msg)
    if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current)
    saveMsgTimerRef.current = setTimeout(() => setSaveMessage(''), 2000)
  }

  useEffect(() => () => {
    if (saveMsgTimerRef.current) clearTimeout(saveMsgTimerRef.current)
  }, [])

  const buildPayload = (name) => ({
    name,
    preset: activePreset,
    points: Array.from(points),
    amplitude,
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

    const proposedName = currentPatch
      ? nextAvailableName(`Copie de ${currentPatch.name}`, patches ?? [])
      : defaultName

    const result = onSavePatch(buildPayload(proposedName))
    referenceRef.current = stateSnapshotRef.current
    if (result?.id) {
      referencedPatchIdRef.current = result.id
      onPatchCreated?.(result.id)
    }
    flashMessage(currentPatch ? 'Nouveau patch enregistré' : 'Patch enregistré')
  }

  const handleUpdate = () => {
    if (!currentPatch) return
    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      flashMessage('Canvas vide')
      return
    }
    onUpdatePatch(currentPatch.id, buildPayload(currentPatch.name))
    referenceRef.current = stateSnapshotRef.current
    flashMessage('Patch mis à jour')
  }

  const handleNew = () => {
    const dirty = !patchFieldsEqual(stateSnapshotRef.current, referenceRef.current)
    if (dirty) {
      const ok = window.confirm('Modifications non sauvegardées, continuer ?')
      if (!ok) return
    }
    if (isPlaying) stopAudio()
    onRequestNew?.()
  }

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
    const container = adsrContainerRef.current
    const canvas = adsrCanvasRef.current
    if (!container || !canvas || typeof ResizeObserver === 'undefined') return
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
    ro.observe(container)
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
    setDraftAdsr((prev) => {
      const next = { ...(prev ?? {}) }
      if (handleIdx === 1) {
        const newAttackPx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x))
        next.attack = pxToMs(newAttackPx)
      } else if (handleIdx === 2) {
        const baseAtk = next.attack ?? attack
        const baseAtkPx = (baseAtk / ADSR_MAX_MS) * ADSR_SEGMENT_PX
        const newDecayPx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x - baseAtkPx))
        next.decay = pxToMs(newDecayPx)
        const newSustain = Math.max(0, Math.min(1, 1 - pos.y / ADSR_H))
        next.sustain = Math.round(newSustain * 100) / 100
      } else if (handleIdx === 4) {
        const baseAtk = next.attack ?? attack
        const baseDec = next.decay ?? decay
        const base = ((baseAtk + baseDec) / ADSR_MAX_MS) * ADSR_SEGMENT_PX + ADSR_SUSTAIN_PX
        const newReleasePx = Math.max(0, Math.min(ADSR_SEGMENT_PX, pos.x - base))
        next.release = pxToMs(newReleasePx)
      }
      return next
    })
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

  const commitDraftAdsr = () => {
    if (draftAdsr && Object.keys(draftAdsr).length > 0) {
      const patch = {}
      for (const k of Object.keys(draftAdsr)) {
        if (draftAdsr[k] !== editor[k]) patch[k] = draftAdsr[k]
      }
      if (Object.keys(patch).length > 0) editorActions.setAdsr(patch)
      setDraftAdsr(null)
    }
  }

  const endAdsrDrag = () => {
    if (draggingHandle !== null) {
      setDraggingHandle(null)
      commitDraftAdsr()
    }
  }

  const sliderCommitter = (commit) => ({
    onPointerUp: commit,
    onMouseUp: commit,
    onTouchEnd: commit,
    onKeyUp: commit,
    onBlur: commit,
  })

  const commitDraftAmp = () => {
    if (draftAmp != null) {
      if (draftAmp !== editor.amplitude) editorActions.setAmplitude(draftAmp)
      setDraftAmp(null)
    }
  }
  const commitDraftFreq = () => {
    if (draftFreq != null) {
      if (draftFreq !== editor.testFrequency) editorActions.setTestFrequency(draftFreq)
      setDraftFreq(null)
    }
  }
  const commitDraftAdsrSlider = () => {
    commitDraftAdsr()
  }

  const renderCanvasArea = () => (
    <div className="we-canvas-area">
      <header className="we-area-header">
        <div className="we-header-left">
          <h3 className="we-area-title">Waveform</h3>
          <span className="we-sound-tag">
            {currentPatch ? `Édition : ${currentPatch.name}` : defaultName}
          </span>
        </div>
        <div className="we-header-right">
          {(onUndo || onRedo) && (
            <div className="we-history">
              <button
                type="button"
                className="we-history-btn"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Annuler"
                title="Annuler (Ctrl+Z)"
              >⟲</button>
              <button
                type="button"
                className="we-history-btn"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="Rétablir"
                title="Rétablir (Ctrl+Shift+Z)"
              >⟳</button>
            </div>
          )}
          {onToggleSpectrogram && (
            <label className="spectro-toggle" title="Afficher le spectrogramme à côté">
              <input
                type="checkbox"
                checked={!!spectrogramVisible}
                onChange={(e) => onToggleSpectrogram(e.target.checked)}
              />
              <span>Spectro</span>
            </label>
          )}
        </div>
      </header>
      <div className="presets">
        <button onClick={() => loadPreset('sine')}>Sine</button>
        <button onClick={() => loadPreset('square')}>Square</button>
        <button onClick={() => loadPreset('sawtooth')}>Sawtooth</button>
        <button onClick={() => loadPreset('triangle')}>Triangle</button>
        <button onClick={clearCanvas}>Clear</button>
      </div>
      <div className="canvas-container" ref={canvasContainerRef}>
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
          <label className="system-label" htmlFor="tuning-system">Système de test</label>
          <select
            id="tuning-system"
            className="tuning-system-select"
            value={testTuningSystem}
            onChange={(e) => editorActions.setTestTuningSystem(e.target.value)}
          >
            <option value="12-TET">12-TET (Tempérament égal occidental)</option>
            <option value="free">Libre (Hz)</option>
          </select>
        </div>

        <div className="control-group">
          {freeMode ? (
            <>
              <div className="freq-label">
                Fréquence libre :{' '}
                <FreqInput
                  value={testFrequency}
                  onChange={editorActions.setTestFrequency}
                  min={FREQ_MIN}
                  max={FREQ_MAX}
                  className="freq-input"
                />
                <span className="freq-unit"> Hz</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={freqToSlider(testFrequency)}
                onChange={(e) => {
                  const hz = sliderToFreq(Number(e.target.value))
                  setDraftFreq(Math.round(hz * 10) / 10)
                }}
                {...sliderCommitter(commitDraftFreq)}
              />
            </>
          ) : (
            <>
              <PianoKeyboard
                noteIndex={testNoteIndex}
                onSelectNote={editorActions.setTestNoteIndex}
              />
              <OctaveSelector
                octave={testOctave}
                onSelectOctave={editorActions.setTestOctave}
              />
              <div className="freq-label">
                Note : <strong>{formatFreq(frequency)}</strong>
                <span className="note-display">
                  {' '}— {NOTE_NAMES[testNoteIndex]}{testOctave}
                </span>
              </div>
            </>
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
            onChange={(e) => setDraftAmp(Number(e.target.value))}
            {...sliderCommitter(commitDraftAmp)}
          />
        </div>
      </div>

      <div className="we-params-spacer" />

      <div className="control-buttons">
        <div className="test-buttons" role="group" aria-label="Tests de lecture">
          <button
            type="button"
            className={`test-btn-mode${playingMode === 'impact' ? ' is-playing' : ''}`}
            onClick={() => handleTestClick('impact')}
            disabled={playingMode !== null && playingMode !== 'impact'}
            title="Test impact — son bref avec release immédiat"
            aria-label="Test impact"
          >•</button>
          <button
            type="button"
            className={`test-btn-mode${playingMode === 'court' ? ' is-playing' : ''}`}
            onClick={() => handleTestClick('court')}
            disabled={playingMode !== null && playingMode !== 'court'}
            title="Test court — son tenu 1 seconde"
            aria-label="Test court"
          >━</button>
          <button
            type="button"
            className={`test-btn-mode${playingMode === 'tenu' ? ' is-playing' : ''}`}
            onClick={() => handleTestClick('tenu')}
            disabled={playingMode === 'impact' || playingMode === 'court'}
            title={playingMode === 'tenu' ? 'Arrêter' : 'Test tenu — son infini, clic pour arrêter'}
            aria-label={playingMode === 'tenu' ? 'Arrêter le test tenu' : 'Test tenu'}
          >{playingMode === 'tenu' ? '■' : '∞'}</button>
        </div>
        <button type="button" className="new-btn" onClick={handleNew} title="Nouveau patch (réinitialise l'éditeur)">
          Nouveau
        </button>
        {currentPatch && (
          <button className="update-btn" onClick={handleUpdate}>
            Mettre à jour
          </button>
        )}
        <button className="save-btn" onClick={handleSaveAsNew}>
          {currentPatch ? 'Enregistrer comme nouveau' : 'Sauvegarder le patch'}
        </button>
      </div>

      <div className="save-message-slot">
        {saveMessage && <span className="save-message">{saveMessage}</span>}
      </div>
    </div>
  )

  const renderAdsrArea = () => {
    const renderSlider = (key, label, max, step, format) => (
      <div className="adsr-slider">
        <label htmlFor={`adsr-${key}`}>
          {label} <strong>{format(editor[key], { attack, decay, sustain, release }[key])}</strong>
        </label>
        <input
          id={`adsr-${key}`}
          type="range"
          min="0"
          max={max}
          step={step}
          value={{ attack, decay, sustain, release }[key]}
          onChange={(e) => {
            const val = Number(e.target.value)
            setDraftAdsr((prev) => ({ ...(prev ?? {}), [key]: val }))
          }}
          {...sliderCommitter(commitDraftAdsrSlider)}
        />
      </div>
    )

    return (
      <div className="we-adsr-area">
        <header className="we-area-header">
          <h3 className="we-area-title">Enveloppe ADSR</h3>
        </header>
        <div className="adsr-canvas-container" ref={adsrContainerRef}>
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
          {renderSlider('attack', 'Attack', 500, 1, (_, v) => `${v} ms`)}
          {renderSlider('decay', 'Decay', 500, 1, (_, v) => `${v} ms`)}
          {renderSlider('sustain', 'Sustain', 1, 0.01, (_, v) => `${Math.round(v * 100)}%`)}
          {renderSlider('release', 'Release', 500, 1, (_, v) => `${v} ms`)}
        </div>
      </div>
    )
  }

  return children({ renderCanvasArea, renderParamsArea, renderAdsrArea })
}

export default WaveformEditor
