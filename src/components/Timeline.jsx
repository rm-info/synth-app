import { useRef, useState, useCallback, useEffect } from 'react'
import { pointsToPeriodicWave, audioBufferToWav, downloadWav } from '../audio'
import './Timeline.css'

const NUM_MEASURES = 16
const BEATS_PER_MEASURE = 4
const TOTAL_BEATS = NUM_MEASURES * BEATS_PER_MEASURE
const SNAP_RESOLUTION = 0.25 // 16th-note snap

const MIN_BPM = 60
const MAX_BPM = 240

const MIN_MEASURE_WIDTH = 40
const MAX_MEASURE_WIDTH = 200
const DEFAULT_MEASURE_WIDTH = 80
const ZOOM_STEP = 20

const DURATION_OPTIONS = [
  { label: 'Ronde', value: 4 },
  { label: 'Blanche', value: 2 },
  { label: 'Noire pointée', value: 1.5 },
  { label: 'Noire', value: 1 },
  { label: 'Croche pointée', value: 0.75 },
  { label: 'Croche', value: 0.5 },
  { label: 'Double croche', value: 0.25 },
]

function beatToSeconds(beats, bpm) {
  return (beats * 60) / bpm
}

function noteBeatOffset(note) {
  return (note.measure - 1) * BEATS_PER_MEASURE + note.beat
}

function layoutNotes(notes, savedSounds) {
  const enriched = notes
    .map((note) => {
      const sound = savedSounds.find((s) => s.id === note.soundId)
      if (!sound) return null
      const start = noteBeatOffset(note)
      const end = start + note.duration
      return { note, sound, start, end }
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start)

  const lanes = []
  const result = []
  for (const item of enriched) {
    let lane = 0
    while (lane < lanes.length && lanes[lane] > item.start) lane++
    if (lane === lanes.length) lanes.push(item.end)
    else lanes[lane] = item.end
    result.push({ ...item, lane })
  }
  return { items: result, laneCount: Math.max(1, lanes.length) }
}

function scheduleNotes(ctx, notes, savedSounds, startTime, destination, bpm) {
  const nodes = []
  for (const note of notes) {
    const sound = savedSounds.find((s) => s.id === note.soundId)
    if (!sound) continue

    const wave = pointsToPeriodicWave(sound.points, ctx)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.setPeriodicWave(wave)

    const beatOffset = noteBeatOffset(note)
    const noteStart = startTime + beatToSeconds(beatOffset, bpm)
    const a = (sound.attack ?? 10) / 1000
    const d = (sound.decay ?? 100) / 1000
    const r = (sound.release ?? 100) / 1000
    const sus = sound.sustain ?? 0.7
    const amp = sound.amplitude
    const sustainLevel = sus * amp
    const placedDuration = beatToSeconds(note.duration, bpm)
    const minDuration = a + d + r
    const clipDuration = Math.max(placedDuration, minDuration)
    const releaseStart = noteStart + clipDuration - r

    osc.frequency.setValueAtTime(sound.frequency, noteStart)
    gain.gain.setValueAtTime(0, noteStart)
    gain.gain.linearRampToValueAtTime(amp, noteStart + a)
    gain.gain.linearRampToValueAtTime(sustainLevel, noteStart + a + d)
    gain.gain.linearRampToValueAtTime(sustainLevel, releaseStart)
    gain.gain.linearRampToValueAtTime(0, noteStart + clipDuration)

    osc.connect(gain)
    gain.connect(destination)
    osc.start(noteStart)
    osc.stop(noteStart + clipDuration)

    nodes.push({ osc, gain })
  }
  return nodes
}

function Timeline({
  savedSounds,
  notes,
  bpm,
  onSetBpm,
  onAddNote,
  onRemoveNote,
  onUpdateNote,
  onClearTimeline,
  onDeleteSound,
  onRenameSound,
}) {
  const gridRef = useRef(null)
  const dropZoneRef = useRef(null)
  const audioCtxRef = useRef(null)
  const scheduledNodesRef = useRef([])
  const animFrameRef = useRef(null)
  const analyserRef = useRef(null)
  const analyserGainRef = useRef(null)
  const visualizerCanvasRef = useRef(null)
  const visualizerFrameRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [editingSoundId, setEditingSoundId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [measureWidth, setMeasureWidth] = useState(DEFAULT_MEASURE_WIDTH)
  const [isExporting, setIsExporting] = useState(false)

  const totalDurationSec = beatToSeconds(TOTAL_BEATS, bpm)

  const startEdit = (sound) => {
    setEditingSoundId(sound.id)
    setEditingValue(sound.name)
  }

  const commitEdit = () => {
    if (!editingSoundId) return
    const trimmed = editingValue.trim()
    if (trimmed) onRenameSound(editingSoundId, trimmed)
    setEditingSoundId(null)
    setEditingValue('')
  }

  const cancelEdit = () => {
    setEditingSoundId(null)
    setEditingValue('')
  }

  // --- Drag & Drop ---
  const handleDragStart = (e, soundId) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', soundId)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const soundId = e.dataTransfer.getData('text/plain')
    if (!soundId) return
    const zone = dropZoneRef.current
    if (!zone) return
    const rect = zone.getBoundingClientRect()
    const frac = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
    const rawBeat = frac * TOTAL_BEATS
    const snapped = Math.round(rawBeat / SNAP_RESOLUTION) * SNAP_RESOLUTION
    const defaultDuration = 1
    const maxStart = Math.max(0, TOTAL_BEATS - defaultDuration)
    const clamped = Math.max(0, Math.min(snapped, maxStart))
    const measure = Math.floor(clamped / BEATS_PER_MEASURE) + 1
    const beat = clamped - (measure - 1) * BEATS_PER_MEASURE
    onAddNote(soundId, measure, beat, defaultDuration)
  }

  // --- Playback ---
  const play = useCallback(() => {
    if (notes.length === 0) return

    const ctx = audioCtxRef.current || new AudioContext()
    audioCtxRef.current = ctx
    if (ctx.state === 'suspended') ctx.resume()

    const analyserGain = ctx.createGain()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyserGain.connect(analyser)
    analyserGain.connect(ctx.destination)
    analyserRef.current = analyser
    analyserGainRef.current = analyserGain

    const startTime = ctx.currentTime + 0.05
    const nodes = scheduleNotes(ctx, notes, savedSounds, startTime, analyserGain, bpm)
    scheduledNodesRef.current = nodes
    setIsPlaying(true)
    setCursorPos(0)
    setCurrentTime(0)

    const animate = () => {
      const elapsed = ctx.currentTime - startTime
      if (elapsed >= totalDurationSec) {
        stop()
        return
      }
      setCursorPos(elapsed / totalDurationSec)
      setCurrentTime(elapsed)
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
  }, [notes, savedSounds, bpm, totalDurationSec])

  const stop = useCallback(() => {
    for (const node of scheduledNodesRef.current) {
      try { node.osc.stop() } catch {}
      try { node.osc.disconnect() } catch {}
      try { node.gain.disconnect() } catch {}
    }
    scheduledNodesRef.current = []
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (analyserGainRef.current) {
      try { analyserGainRef.current.disconnect() } catch {}
      analyserGainRef.current = null
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect() } catch {}
      analyserRef.current = null
    }
    setIsPlaying(false)
    setCursorPos(0)
    setCurrentTime(0)
  }, [])

  const exportWav = useCallback(async () => {
    if (notes.length === 0 || isExporting) return
    setIsExporting(true)
    try {
      const sampleRate = 44100
      const offlineCtx = new OfflineAudioContext(
        2,
        Math.ceil(sampleRate * totalDurationSec),
        sampleRate,
      )
      scheduleNotes(offlineCtx, notes, savedSounds, 0, offlineCtx.destination, bpm)
      const renderedBuffer = await offlineCtx.startRendering()
      const wav = audioBufferToWav(renderedBuffer)
      downloadWav(wav, 'composition.wav')
    } finally {
      setIsExporting(false)
    }
  }, [notes, savedSounds, bpm, totalDurationSec, isExporting])

  // Visualizer
  useEffect(() => {
    if (!isPlaying) return
    const canvas = visualizerCanvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx2d = canvas.getContext('2d')
    const bufferLength = analyser.fftSize
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray)
      const W = canvas.width
      const H = canvas.height
      ctx2d.fillStyle = '#0a0a1a'
      ctx2d.fillRect(0, 0, W, H)
      ctx2d.lineWidth = 2
      ctx2d.strokeStyle = '#4ade80'
      ctx2d.beginPath()
      const sliceWidth = W / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * H) / 2
        if (i === 0) ctx2d.moveTo(x, y)
        else ctx2d.lineTo(x, y)
        x += sliceWidth
      }
      ctx2d.stroke()
      visualizerFrameRef.current = requestAnimationFrame(draw)
    }
    visualizerFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (visualizerFrameRef.current) cancelAnimationFrame(visualizerFrameRef.current)
    }
  }, [isPlaying])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (visualizerFrameRef.current) cancelAnimationFrame(visualizerFrameRef.current)
      for (const node of scheduledNodesRef.current) {
        try { node.osc.stop() } catch {}
        try { node.osc.disconnect() } catch {}
        try { node.gain.disconnect() } catch {}
      }
    }
  }, [])

  const zoomOut = () => setMeasureWidth((w) => Math.max(MIN_MEASURE_WIDTH, w - ZOOM_STEP))
  const zoomIn = () => setMeasureWidth((w) => Math.min(MAX_MEASURE_WIDTH, w + ZOOM_STEP))

  const handleBpmChange = (e) => {
    const v = Number(e.target.value)
    if (Number.isFinite(v)) {
      onSetBpm(Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v))))
    }
  }

  const { items: laidOut, laneCount } = layoutNotes(notes, savedSounds)
  const hasNoNotes = notes.length === 0
  const beatWidth = measureWidth / BEATS_PER_MEASURE

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h2>Timeline</h2>
        <div className="timeline-controls">
          <label className="bpm-control" title="Tempo (noires par minute)">
            BPM
            <input
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={handleBpmChange}
            />
          </label>
          {isPlaying && (
            <span className="time-display">
              {currentTime.toFixed(1)}s / {totalDurationSec.toFixed(1)}s
            </span>
          )}
          <button
            className={`timeline-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={isPlaying ? stop : play}
            disabled={hasNoNotes}
          >
            {isPlaying ? 'Stop' : 'Play Timeline'}
          </button>
          <button
            className="timeline-clear-btn"
            onClick={onClearTimeline}
            disabled={hasNoNotes}
          >
            Effacer la timeline
          </button>
          <button
            className="timeline-export-btn"
            onClick={exportWav}
            disabled={hasNoNotes || isExporting}
          >
            {isExporting ? 'Export…' : 'Exporter WAV'}
          </button>
          <div className="zoom-controls" title="Zoom">
            <button onClick={zoomOut} disabled={measureWidth <= MIN_MEASURE_WIDTH} aria-label="Dézoomer">−</button>
            <span className="zoom-value">{measureWidth}px</span>
            <button onClick={zoomIn} disabled={measureWidth >= MAX_MEASURE_WIDTH} aria-label="Zoomer">+</button>
          </div>
        </div>
      </div>

      {savedSounds.length > 0 && (
        <div className="sound-bank">
          <span className="bank-label">Sons :</span>
          {savedSounds.map((sound) => {
            const usedCount = notes.filter((n) => n.soundId === sound.id).length
            const isEditing = editingSoundId === sound.id
            const handleDelete = (e) => {
              e.stopPropagation()
              if (usedCount > 0) {
                const ok = window.confirm(
                  `Supprimer "${sound.name}" ? Il est utilisé ${usedCount} fois sur la timeline.`,
                )
                if (!ok) return
              }
              onDeleteSound(sound.id)
            }
            return (
              <div
                key={sound.id}
                className="sound-chip"
                style={{ '--chip-color': sound.color }}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, sound.id)}
                onDoubleClick={() => startEdit(sound)}
                title={isEditing ? undefined : 'Double-clic pour renommer'}
              >
                <span className="chip-dot" />
                {isEditing ? (
                  <input
                    autoFocus
                    className="chip-rename-input"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit()
                      else if (e.key === 'Escape') cancelEdit()
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    draggable={false}
                  />
                ) : (
                  <>
                    <span className="chip-name">{sound.name}</span>
                    <span className="chip-info">{sound.frequency.toFixed(1)} Hz</span>
                    <button
                      type="button"
                      className="chip-delete"
                      onClick={handleDelete}
                      onMouseDown={(e) => e.stopPropagation()}
                      draggable={false}
                      title={`Supprimer ${sound.name}`}
                      aria-label={`Supprimer ${sound.name}`}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="timeline-grid-wrapper">
        <div
          className="timeline-grid"
          ref={gridRef}
          style={{
            '--lane-count': laneCount,
            '--measure-width': `${measureWidth}px`,
            '--beat-width': `${beatWidth}px`,
            minWidth: `${NUM_MEASURES * measureWidth}px`,
          }}
        >
          <div className="measure-labels">
            {Array.from({ length: NUM_MEASURES }, (_, i) => (
              <div key={i} className="measure-label">{i + 1}</div>
            ))}
          </div>

          <div
            className="cells-wrapper"
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="measure-cells">
              {Array.from({ length: NUM_MEASURES }, (_, i) => (
                <div
                  key={i}
                  className={`measure-cell ${i % 4 === 0 ? 'bar-start' : ''}`}
                >
                  {Array.from({ length: BEATS_PER_MEASURE }, (_, b) => (
                    <div key={b} className="beat-cell" />
                  ))}
                </div>
              ))}
            </div>

            <div className="placed-sounds-layer">
              {laidOut.map(({ note, sound, lane }) => {
                const start = noteBeatOffset(note)
                const left = (start / TOTAL_BEATS) * 100
                const width = (note.duration / TOTAL_BEATS) * 100
                return (
                  <div
                    key={note.id}
                    className="placed-sound"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      '--lane': lane,
                      backgroundColor: sound.color + '33',
                      borderColor: sound.color,
                    }}
                    title={`${sound.name} — mesure ${note.measure}, beat ${note.beat} — Clic droit pour retirer`}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      onRemoveNote(note.id)
                    }}
                  >
                    <span className="placed-dot" style={{ backgroundColor: sound.color }} />
                    <span className="placed-name">{sound.name}</span>
                    <select
                      className="placed-duration"
                      value={note.duration}
                      onChange={(e) => onUpdateNote(note.id, { duration: parseFloat(e.target.value) })}
                      onMouseDown={(e) => e.stopPropagation()}
                      onContextMenu={(e) => e.stopPropagation()}
                      draggable={false}
                    >
                      {DURATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>

            {isPlaying && (
              <div
                className="playback-cursor"
                style={{ left: `${cursorPos * 100}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {isPlaying && (
        <div className="visualizer">
          <canvas
            ref={visualizerCanvasRef}
            className="visualizer-canvas"
            width={900}
            height={120}
          />
        </div>
      )}

      {savedSounds.length === 0 && (
        <p className="timeline-hint">
          Dessinez une forme d'onde et cliquez "Sauvegarder le son" pour commencer.
        </p>
      )}
      {savedSounds.length > 0 && hasNoNotes && (
        <p className="timeline-hint">
          Glissez-déposez un son sur la grille pour placer une note. Clic droit pour retirer.
        </p>
      )}
    </div>
  )
}

export default Timeline
