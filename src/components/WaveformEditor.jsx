import { useRef, useState, useCallback, useEffect } from 'react'
import { pointsToPeriodicWave } from '../audio'
import './WaveformEditor.css'

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 300

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const OCTAVES = [1, 2, 3, 4, 5, 6, 7]

function noteToFrequency(noteIndex, octave) {
  const midi = (octave + 1) * 12 + noteIndex
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// ADSR visual editor constants
const ADSR_W = 400
const ADSR_H = 120
const ADSR_MAX_MS = 500
const ADSR_SEGMENT_PX = 80 // 500 ms maps to 80 px in width
const ADSR_SUSTAIN_PX = ADSR_W * 0.4 // fixed sustain portion
const ADSR_PEAK_Y = ADSR_H * 0.05 // peak is fixed at 95% amplitude (5% from top)
const ADSR_HIT_RADIUS = 10
const ADSR_HANDLE_RADIUS = 4

function WaveformEditor({ onSaveSound, nextSoundName }) {
  const canvasRef = useRef(null)
  const audioCtxRef = useRef(null)
  const oscRef = useRef(null)
  const gainRef = useRef(null)

  const [points, setPoints] = useState(() => new Float32Array(CANVAS_WIDTH))
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [freeMode, setFreeMode] = useState(false)
  const [noteIndex, setNoteIndex] = useState(9) // A
  const [octave, setOctave] = useState(4)
  const [freeFrequency, setFreeFrequency] = useState(440)
  const [amplitude, setAmplitude] = useState(0.5)
  const [activePreset, setActivePreset] = useState(null) // 'sine' | 'square' | ... | null
  const [saveMessage, setSaveMessage] = useState('')
  const saveMsgTimerRef = useRef(null)

  // ADSR (attack/decay/release in ms, sustain in 0..1)
  const [attack, setAttack] = useState(10)
  const [decay, setDecay] = useState(100)
  const [sustain, setSustain] = useState(0.7)
  const [release, setRelease] = useState(100)
  const [draggingHandle, setDraggingHandle] = useState(null) // 1 | 2 | 4 | null
  const adsrCanvasRef = useRef(null)

  // Derived handle positions
  const attackPx = (attack / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const decayPx = (decay / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const releasePx = (release / ADSR_MAX_MS) * ADSR_SEGMENT_PX
  const sustainY = (1 - sustain) * ADSR_H

  const p1 = { x: attackPx, y: ADSR_PEAK_Y }
  const p2 = { x: attackPx + decayPx, y: sustainY }
  const p3 = { x: attackPx + decayPx + ADSR_SUSTAIN_PX, y: sustainY }
  const p4 = { x: attackPx + decayPx + ADSR_SUSTAIN_PX + releasePx, y: ADSR_H }

  const frequency = freeMode ? freeFrequency : noteToFrequency(noteIndex, octave)
  const defaultName = freeMode ? nextSoundName : `${NOTE_NAMES[noteIndex]}${octave}`

  const pointsRef = useRef(points)
  pointsRef.current = points

  const drawCanvas = useCallback((pts) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const midY = CANVAS_HEIGHT / 2

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.strokeStyle = '#2a2a4a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, midY)
    ctx.lineTo(CANVAS_WIDTH, midY)
    ctx.stroke()

    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, midY - CANVAS_HEIGHT / 4)
    ctx.lineTo(CANVAS_WIDTH, midY - CANVAS_HEIGHT / 4)
    ctx.moveTo(0, midY + CANVAS_HEIGHT / 4)
    ctx.lineTo(CANVAS_WIDTH, midY + CANVAS_HEIGHT / 4)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      const y = midY - pts[x] * (CANVAS_HEIGHT / 2)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)'
    ctx.lineWidth = 6
    ctx.beginPath()
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      const y = midY - pts[x] * (CANVAS_HEIGHT / 2)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [])

  useEffect(() => {
    drawCanvas(points)
  }, [points, drawCanvas])

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = (e.clientY - rect.top) * scaleY
    const normalized = -((y / CANVAS_HEIGHT) * 2 - 1)
    return {
      x: Math.max(0, Math.min(CANVAS_WIDTH - 1, x)),
      value: Math.max(-1, Math.min(1, normalized)),
    }
  }

  const lastPointRef = useRef(null)

  const handleMouseDown = (e) => {
    setIsDrawing(true)
    setActivePreset(null) // custom drawing invalidates preset identity
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
          if (x >= 0 && x < CANVAS_WIDTH) next[x] = v
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

    // ADSR attack -> decay -> sustain (holds until Stop)
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
        try { osc.disconnect() } catch {}
        try { gain.disconnect() } catch {}
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
    setPoints(new Float32Array(CANVAS_WIDTH))
    setActivePreset(null)
    if (isPlaying) updateOscillator()
  }

  const loadPreset = (type) => {
    const pts = new Float32Array(CANVAS_WIDTH)
    for (let i = 0; i < CANVAS_WIDTH; i++) {
      const t = i / CANVAS_WIDTH
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
  const drawAdsr = useCallback(() => {
    const canvas = adsrCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, ADSR_W, ADSR_H)

    // Baseline
    ctx.strokeStyle = '#2a2a4a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H - 0.5)
    ctx.lineTo(ADSR_W, ADSR_H - 0.5)
    ctx.stroke()

    // Filled region under the curve
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

    // Curve
    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, ADSR_H)
    ctx.lineTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.lineTo(p3.x, p3.y)
    ctx.lineTo(p4.x, p4.y)
    ctx.stroke()

    // Handles
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

  const getAdsrPos = (e) => {
    const canvas = adsrCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = ADSR_W / rect.width
    const scaleY = ADSR_H / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
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
    // P3 (index 2 in array below) is not draggable per spec
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

  const handleSave = () => {
    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      flashMessage('Canvas vide')
      return
    }
    const result = onSaveSound({
      name: defaultName,
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
    if (result && result.duplicate) {
      flashMessage('Ce son existe déjà')
    }
  }

  return (
    <div className="waveform-editor">
      <div className="editor-header">
        <h2>Waveform Editor</h2>
        <span className="next-sound-name">{defaultName}</span>
      </div>

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
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        <span className="label top">+1</span>
        <span className="label middle">0</span>
        <span className="label bottom">-1</span>
      </div>

      <div className="controls">
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

        <div className="adsr-group">
          <div className="adsr-title">Enveloppe ADSR</div>
          <canvas
            ref={adsrCanvasRef}
            className="adsr-canvas"
            width={ADSR_W}
            height={ADSR_H}
            onMouseDown={handleAdsrMouseDown}
            onMouseMove={handleAdsrMouseMove}
            onMouseUp={endAdsrDrag}
            onMouseLeave={endAdsrDrag}
          />
          <div className="adsr-sliders">
            <div className="adsr-slider">
              <label>Attack <strong>{attack} ms</strong></label>
              <input type="range" min="0" max="500" value={attack} disabled readOnly />
            </div>
            <div className="adsr-slider">
              <label>Decay <strong>{decay} ms</strong></label>
              <input type="range" min="0" max="500" value={decay} disabled readOnly />
            </div>
            <div className="adsr-slider">
              <label>Sustain <strong>{Math.round(sustain * 100)}%</strong></label>
              <input type="range" min="0" max="1" step="0.01" value={sustain} disabled readOnly />
            </div>
            <div className="adsr-slider">
              <label>Release <strong>{release} ms</strong></label>
              <input type="range" min="0" max="500" value={release} disabled readOnly />
            </div>
          </div>
        </div>

        <div className="control-buttons">
          <button className={`play-btn ${isPlaying ? 'playing' : ''}`} onClick={togglePlay}>
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <button className="save-btn" onClick={handleSave}>
            Sauvegarder le son
          </button>
        </div>

        <div className="save-message-slot">
          {saveMessage && <span className="save-message">{saveMessage}</span>}
        </div>
      </div>
    </div>
  )
}

export default WaveformEditor
