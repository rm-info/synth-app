import { useEffect, useRef } from 'react'
import './Timeline.css'

const BEATS_PER_MEASURE = 4
const SNAP_RESOLUTION = 0.25 // 16th-note snap

const DURATION_OPTIONS = [
  { label: 'Ronde', value: 4 },
  { label: 'Blanche', value: 2 },
  { label: 'Noire pointée', value: 1.5 },
  { label: 'Noire', value: 1 },
  { label: 'Croche pointée', value: 0.75 },
  { label: 'Croche', value: 0.5 },
  { label: 'Double croche', value: 0.25 },
]

function clipBeatOffset(clip) {
  return (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat
}

function layoutClips(clips, savedSounds) {
  const enriched = clips
    .map((clip) => {
      const sound = savedSounds.find((s) => s.id === clip.soundId)
      if (!sound) return null
      const start = clipBeatOffset(clip)
      const end = start + clip.duration
      return { clip, sound, start, end }
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

/**
 * Timeline grid (Composer). Header & sound bank ont été déplacés (Toolbar / SoundBank).
 * Reçoit le moteur de lecture via props (cursorPos, isPlaying, analyserRef) — tout
 * vient du hook usePlayback partagé dans App.
 */
function Timeline({
  savedSounds,
  clips,
  numMeasures,
  measureWidth,
  cursorPos,
  isPlaying,
  analyserRef,
  onAddClip,
  onRemoveClip,
  onUpdateClip,
}) {
  const dropZoneRef = useRef(null)
  const visualizerCanvasRef = useRef(null)
  const visualizerFrameRef = useRef(null)

  const totalBeats = numMeasures * BEATS_PER_MEASURE
  const beatWidth = measureWidth / BEATS_PER_MEASURE

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
    const rawBeat = frac * totalBeats
    const snapped = Math.round(rawBeat / SNAP_RESOLUTION) * SNAP_RESOLUTION
    const defaultDuration = 1
    const maxStart = Math.max(0, totalBeats - defaultDuration)
    const clamped = Math.max(0, Math.min(snapped, maxStart))
    const measure = Math.floor(clamped / BEATS_PER_MEASURE) + 1
    const beat = clamped - (measure - 1) * BEATS_PER_MEASURE
    onAddClip(soundId, measure, beat, defaultDuration)
  }

  // Visualizer
  useEffect(() => {
    if (!isPlaying) return
    const canvas = visualizerCanvasRef.current
    const analyser = analyserRef?.current
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
  }, [isPlaying, analyserRef])

  const { items: laidOut, laneCount } = layoutClips(clips, savedSounds)
  const hasNoClips = clips.length === 0

  return (
    <div className="timeline">
      <div className="timeline-grid-wrapper">
        <div
          className="timeline-grid"
          style={{
            '--lane-count': laneCount,
            '--measure-width': `${measureWidth}px`,
            '--beat-width': `${beatWidth}px`,
            minWidth: `${numMeasures * measureWidth}px`,
          }}
        >
          <div className="measure-labels">
            {Array.from({ length: numMeasures }, (_, i) => (
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
              {Array.from({ length: numMeasures }, (_, i) => (
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
              {laidOut.map(({ clip, sound, lane }) => {
                const start = clipBeatOffset(clip)
                const left = (start / totalBeats) * 100
                const width = (clip.duration / totalBeats) * 100
                return (
                  <div
                    key={clip.id}
                    className="placed-sound"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      '--lane': lane,
                      backgroundColor: sound.color + '33',
                      borderColor: sound.color,
                    }}
                    title={`${sound.name} — mesure ${clip.measure}, beat ${clip.beat} — Clic droit pour retirer`}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      onRemoveClip(clip.id)
                    }}
                  >
                    <span className="placed-dot" style={{ backgroundColor: sound.color }} />
                    <span className="placed-name">{sound.name}</span>
                    <select
                      className="placed-duration"
                      value={clip.duration}
                      onChange={(e) => onUpdateClip(clip.id, { duration: parseFloat(e.target.value) })}
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
          Allez dans Designer pour dessiner votre premier son.
        </p>
      )}
      {savedSounds.length > 0 && hasNoClips && (
        <p className="timeline-hint">
          Glissez-déposez un son depuis la banque pour placer un clip. Clic droit pour retirer.
        </p>
      )}
    </div>
  )
}

export default Timeline
