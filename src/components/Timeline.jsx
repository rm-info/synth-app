import { useEffect, useRef, useCallback, useState } from 'react'
import './Timeline.css'

const BEATS_PER_MEASURE = 4
const SNAP_RESOLUTION = 0.25 // 16th-note snap
const DRAG_THRESHOLD_PX = 5
const MIN_CLIP_DURATION = 0.25

// Conversions zoom — centralisées ici.
//   100% = 50px par triple croche (1/8 noire).
//   pxPerBeat = (zoomH/100) * 50 * 8
const PX_PER_TRIPLE_AT_100 = 50

function pxPerBeatFromZoom(zoomH) {
  return (zoomH / 100) * PX_PER_TRIPLE_AT_100 * 8
}

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
 * Décide combien de subdivisions par beat afficher selon le zoom.
 *  - noire toujours
 *  - croches si pxPerBeat ≥ 40
 *  - doubles si pxPerBeat ≥ 80
 *  - triples si pxPerBeat ≥ 160
 */
function subdivPerBeat(pxPerBeat) {
  if (pxPerBeat >= 160) return 8
  if (pxPerBeat >= 80) return 4
  if (pxPerBeat >= 40) return 2
  return 1
}

function gridLineLevel(i, subdiv) {
  const beatStep = subdiv
  const measureStep = BEATS_PER_MEASURE * beatStep
  if (i % measureStep === 0) return 'measure'
  if (i % beatStep === 0) return 'beat'
  const subIndex = i % beatStep
  if (subdiv === 2) return 'croche'
  if (subdiv === 4) return subIndex === 2 ? 'croche' : 'double'
  // subdiv === 8
  if (subIndex === 4) return 'croche'
  if (subIndex % 2 === 0) return 'double'
  return 'triple'
}

/**
 * Timeline grid (Composer). Reçoit zoomH (en %) + trackHeight, calcule
 * pxPerBeat / pxPerMeasure et rend la grille en lignes absolument positionnées.
 */
function Timeline({
  savedSounds,
  clips,
  numMeasures,
  zoomH,
  onSetZoomH,
  zoomHMin,
  zoomHMax,
  trackHeight,
  cursorPos,
  isPlaying,
  analyserRef,
  onAddClip,
  onRemoveClip,
  onUpdateClip,
  selectedClipIds,
  onSelectClip,
  onDeselectAll,
}) {
  const wrapperRef = useRef(null)
  const dropZoneRef = useRef(null)
  const visualizerCanvasRef = useRef(null)

  // --- Interaction clip (drag / resize-left / resize-right) ---
  // interactionRef : mutable, contient l'état live pendant l'interaction
  // (évite les fermetures périmées). interactionVisual : state React pour
  // l'aperçu visuel du clip manipulé. clipId dans les deps de l'effet pour
  // ré-attachement au début/fin de chaque session, pas à chaque mousemove.
  const interactionRef = useRef(null)
  const [interactionVisual, setInteractionVisual] = useState(null)

  const pxPerBeat = pxPerBeatFromZoom(zoomH)
  const pxPerMeasure = pxPerBeat * BEATS_PER_MEASURE
  const totalBeats = numMeasures * BEATS_PER_MEASURE
  const gridWidth = pxPerMeasure * numMeasures

  // --- Drag & drop ---
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
    const xInGrid = e.clientX - rect.left
    const rawBeat = xInGrid / pxPerBeat
    const snapped = Math.round(rawBeat / SNAP_RESOLUTION) * SNAP_RESOLUTION
    const clamped = Math.max(0, Math.min(snapped, Math.max(0, totalBeats - SNAP_RESOLUTION)))
    const measure = Math.floor(clamped / BEATS_PER_MEASURE) + 1
    const beat = clamped - (measure - 1) * BEATS_PER_MEASURE
    // duration = undefined → App utilise defaultClipDuration
    onAddClip(soundId, measure, beat)
  }

  // --- Ctrl+molette : zoom centré sur la position de la souris ---
  const handleWheel = useCallback(
    (e) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const wrapper = wrapperRef.current
      if (!wrapper) return

      const delta = e.deltaY > 0 ? -5 : 5
      const oldZoom = zoomH
      const newZoom = Math.max(zoomHMin, Math.min(zoomHMax, oldZoom + delta))
      if (newZoom === oldZoom) return

      // Position musicale (en beats) sous la souris avant zoom
      const rect = wrapper.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const targetX = wrapper.scrollLeft + mouseX
      const oldPxPerBeat = pxPerBeatFromZoom(oldZoom)
      const beatPos = targetX / oldPxPerBeat

      onSetZoomH(newZoom)

      // Re-centrer après re-render pour conserver la position musicale sous la souris
      requestAnimationFrame(() => {
        const newPxPerBeat = pxPerBeatFromZoom(newZoom)
        wrapper.scrollLeft = beatPos * newPxPerBeat - mouseX
      })
    },
    [zoomH, zoomHMin, zoomHMax, onSetZoomH],
  )

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    // passive:false pour pouvoir preventDefault sur Ctrl+wheel
    wrapper.addEventListener('wheel', handleWheel, { passive: false })
    return () => wrapper.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Listeners window pour la session d'interaction active. Re-attachement
  // uniquement quand la session commence/se termine (deps = clipId+mode).
  const activeClipId = interactionVisual?.clipId ?? null
  const activeMode = interactionVisual?.mode ?? null
  useEffect(() => {
    if (!activeClipId) return

    const commitCursor = (mode) => {
      if (mode === 'drag') {
        document.body.style.cursor = 'grabbing'
      } else {
        document.body.style.cursor = 'ew-resize'
      }
      document.body.style.userSelect = 'none'
    }

    const handleMove = (e) => {
      const s = interactionRef.current
      if (!s) return
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      const dxBeats = dx / s.pxPerBeat
      const dxSnapped = Math.round(dxBeats / SNAP_RESOLUTION) * SNAP_RESOLUTION

      if (s.mode === 'drag') {
        const dist = Math.hypot(dx, dy)
        const justStarted = !s.isActive && dist >= DRAG_THRESHOLD_PX
        if (!s.isActive && !justStarted) return
        if (justStarted) {
          s.isActive = true
          commitCursor('drag')
        }
        const startTotal = s.originalStart
        const maxStart = Math.max(0, s.totalBeats - s.originalDuration)
        const newStart = Math.max(0, Math.min(maxStart, startTotal + dxSnapped))
        const measure = Math.floor(newStart / BEATS_PER_MEASURE) + 1
        const beat = newStart - (measure - 1) * BEATS_PER_MEASURE
        s.visual = { measure, beat, duration: s.originalDuration }
        setInteractionVisual({ clipId: s.clipId, mode: s.mode, ...s.visual })
        return
      }

      // Resize : actif immédiatement, pas de seuil
      s.isActive = true
      if (!s.cursorSet) {
        commitCursor(s.mode)
        s.cursorSet = true
      }

      if (s.mode === 'resize-right') {
        // Bord droit bouge ; bord gauche fixe.
        let newDuration = s.originalDuration + dxSnapped
        newDuration = Math.max(MIN_CLIP_DURATION, Math.min(s.maxDurationRight, newDuration))
        newDuration = Math.round(newDuration / SNAP_RESOLUTION) * SNAP_RESOLUTION
        s.visual = {
          measure: s.originalMeasure,
          beat: s.originalBeat,
          duration: newDuration,
        }
      } else {
        // resize-left : bord gauche bouge ; bord droit fixe.
        const originalEnd = s.originalStart + s.originalDuration
        let newStart = s.originalStart + dxSnapped
        // Min = borne gauche (clip précédent ou 0). Max = originalEnd - MIN_DURATION.
        newStart = Math.max(s.minStartLeft, Math.min(originalEnd - MIN_CLIP_DURATION, newStart))
        newStart = Math.round(newStart / SNAP_RESOLUTION) * SNAP_RESOLUTION
        const newDuration = originalEnd - newStart
        const measure = Math.floor(newStart / BEATS_PER_MEASURE) + 1
        const beat = newStart - (measure - 1) * BEATS_PER_MEASURE
        s.visual = { measure, beat, duration: newDuration }
      }
      setInteractionVisual({ clipId: s.clipId, mode: s.mode, ...s.visual })
    }

    const handleUp = () => {
      const s = interactionRef.current
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (!s) {
        setInteractionVisual(null)
        return
      }
      if (!s.isActive) {
        // Drag sous le seuil = clic → sélection
        onSelectClip?.(s.clipId)
      } else if (s.visual) {
        onUpdateClip(s.clipId, { ...s.visual })
      }
      interactionRef.current = null
      setInteractionVisual(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [activeClipId, activeMode, onUpdateClip, onSelectClip])

  const startInteraction = (e, clip, mode, bounds) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const originalStart = (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat
    interactionRef.current = {
      clipId: clip.id,
      mode, // 'drag' | 'resize-left' | 'resize-right'
      startX: e.clientX,
      startY: e.clientY,
      pxPerBeat,
      totalBeats,
      originalStart,
      originalMeasure: clip.measure,
      originalBeat: clip.beat,
      originalDuration: clip.duration,
      // Bornes de resize calculées au début de la session selon la lane courante.
      minStartLeft: bounds?.minStartLeft ?? 0,
      maxDurationRight: bounds?.maxDurationRight ?? (totalBeats - originalStart),
      isActive: mode !== 'drag',
      cursorSet: false,
      visual: null,
    }
    setInteractionVisual({
      clipId: clip.id,
      mode,
      measure: clip.measure,
      beat: clip.beat,
      duration: clip.duration,
    })
  }

  // Bornes de resize pour un clip donné selon la lane courante :
  //  - minStartLeft : fin du clip précédent dans la même lane (ou 0)
  //  - maxDurationRight : espace disponible jusqu'au clip suivant (ou fin)
  const computeBounds = (targetClipId, laidOutItems) => {
    const target = laidOutItems.find((it) => it.clip.id === targetClipId)
    if (!target) return { minStartLeft: 0, maxDurationRight: totalBeats }
    const { lane, start, clip } = target
    let minStartLeft = 0
    let maxEnd = totalBeats
    for (const it of laidOutItems) {
      if (it.clip.id === targetClipId) continue
      if (it.lane !== lane) continue
      if (it.end <= start && it.end > minStartLeft) minStartLeft = it.end
      if (it.start >= start + clip.duration && it.start < maxEnd) maxEnd = it.start
    }
    return {
      minStartLeft,
      maxDurationRight: Math.max(MIN_CLIP_DURATION, maxEnd - start),
    }
  }

  // --- Visualiseur persistant avec fade ---
  // intensity ∈ [0,1] : 0 = ligne plate seule ; 1 = signal pleine intensité.
  // Ramp : +0.15/frame en play (montée rapide), -0.04/frame en stop (descente douce).
  // lastDataRef garde la dernière capture du signal pour pouvoir l'afficher
  // pendant le fade-out après stop.
  const intensityRef = useRef(0)
  const lastDataRef = useRef(null)
  useEffect(() => {
    const canvas = visualizerCanvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    let frameId

    const draw = () => {
      // Ramp intensity
      if (isPlaying) {
        intensityRef.current = Math.min(1, intensityRef.current + 0.15)
      } else {
        intensityRef.current = Math.max(0, intensityRef.current - 0.04)
      }

      // Capture du buffer si en lecture
      const analyser = analyserRef?.current
      if (analyser && isPlaying) {
        const len = analyser.fftSize
        if (!lastDataRef.current || lastDataRef.current.length !== len) {
          lastDataRef.current = new Uint8Array(len)
        }
        analyser.getByteTimeDomainData(lastDataRef.current)
      }

      const W = canvas.width
      const H = canvas.height
      ctx2d.fillStyle = '#0a0a1a'
      ctx2d.fillRect(0, 0, W, H)

      // Ligne plate toujours visible (faded)
      ctx2d.strokeStyle = 'rgba(74, 222, 128, 0.3)'
      ctx2d.lineWidth = 2
      ctx2d.beginPath()
      ctx2d.moveTo(0, H / 2)
      ctx2d.lineTo(W, H / 2)
      ctx2d.stroke()

      // Signal en overlay si intensity > 0
      const intensity = intensityRef.current
      if (intensity > 0 && lastDataRef.current) {
        ctx2d.strokeStyle = `rgba(74, 222, 128, ${intensity})`
        ctx2d.lineWidth = 2
        ctx2d.beginPath()
        const data = lastDataRef.current
        const sliceWidth = W / data.length
        let x = 0
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128.0
          const y = (v * H) / 2
          if (i === 0) ctx2d.moveTo(x, y)
          else ctx2d.lineTo(x, y)
          x += sliceWidth
        }
        ctx2d.stroke()
      }

      frameId = requestAnimationFrame(draw)
    }

    frameId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameId)
  }, [isPlaying, analyserRef])

  const { items: laidOut, laneCount } = layoutClips(clips, savedSounds)
  const hasNoClips = clips.length === 0

  // Grille : génération des lignes
  const subdiv = subdivPerBeat(pxPerBeat)
  const totalSubs = totalBeats * subdiv
  const pxPerSub = pxPerBeat / subdiv
  const gridLines = []
  for (let i = 0; i <= totalSubs; i++) {
    const level = gridLineLevel(i, subdiv)
    const x = i * pxPerSub
    gridLines.push(
      <div
        key={i}
        className={`grid-line grid-line-${level}`}
        style={{ left: `${x}px` }}
      />,
    )
  }

  const clipAreaHeight = laneCount * trackHeight

  return (
    <div className="timeline">
      <div
        className="timeline-grid-wrapper"
        ref={wrapperRef}
      >
        <div
          className="timeline-grid"
          style={{
            width: `${gridWidth}px`,
            minWidth: `${gridWidth}px`,
          }}
        >
          <div className="measure-labels">
            {Array.from({ length: numMeasures }, (_, i) => (
              <div
                key={i}
                className="measure-label"
                style={{ width: `${pxPerMeasure}px` }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <div
            className="cells-wrapper"
            ref={dropZoneRef}
            style={{ minHeight: `${clipAreaHeight}px` }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMouseDown={(e) => {
              // Les clips appellent stopPropagation sur mousedown, donc ce handler
              // ne se déclenche que pour un clic dans une zone vide.
              if (e.button !== 0) return
              onDeselectAll?.()
            }}
          >
            <div className="grid-lines-layer">{gridLines}</div>

            <div className="placed-sounds-layer">
              {laidOut.map(({ clip, sound, lane }) => {
                const isActive = interactionVisual?.clipId === clip.id
                const mode = isActive ? interactionVisual.mode : null
                // Position/durée visuelle : si interaction active, on utilise
                // les valeurs live du snapshot (mesure/beat/durée courantes).
                const visualMeasure = isActive ? interactionVisual.measure : clip.measure
                const visualBeat = isActive ? interactionVisual.beat : clip.beat
                const visualDuration = isActive ? interactionVisual.duration : clip.duration
                const visualStart = (visualMeasure - 1) * BEATS_PER_MEASURE + visualBeat
                const left = (visualStart / totalBeats) * 100
                const width = (visualDuration / totalBeats) * 100
                const top = lane * trackHeight + 4
                const height = trackHeight - 8
                const isSelected = selectedClipIds?.includes(clip.id)
                const classNames = [
                  'placed-sound',
                  isSelected && 'is-selected',
                  mode === 'drag' && 'is-dragging',
                  (mode === 'resize-left' || mode === 'resize-right') && 'is-resizing',
                ].filter(Boolean).join(' ')
                return (
                  <div
                    key={clip.id}
                    className={classNames}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: sound.color + '33',
                      borderColor: sound.color,
                    }}
                    title={`${sound.name} — mesure ${clip.measure}, beat ${clip.beat} — Clic droit pour retirer`}
                    onMouseDown={(e) => startInteraction(e, clip, 'drag', null)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onRemoveClip(clip.id)
                    }}
                  >
                    <div
                      className="resize-handle resize-handle-left"
                      onMouseDown={(e) => startInteraction(e, clip, 'resize-left', computeBounds(clip.id, laidOut))}
                    />
                    <span className="placed-dot" style={{ backgroundColor: sound.color }} />
                    <span className="placed-name">{sound.name}</span>
                    <div
                      className="resize-handle resize-handle-right"
                      onMouseDown={(e) => startInteraction(e, clip, 'resize-right', computeBounds(clip.id, laidOut))}
                    />
                  </div>
                )
              })}
            </div>

            {(isPlaying || cursorPos > 0) && (
              <div
                className="playback-cursor"
                style={{ left: `${cursorPos * 100}%` }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="visualizer">
        <canvas
          ref={visualizerCanvasRef}
          className="visualizer-canvas"
          width={1200}
          height={120}
        />
      </div>

      {savedSounds.length === 0 && (
        <p className="timeline-hint">
          Allez dans Designer pour dessiner votre premier son.
        </p>
      )}
      {savedSounds.length > 0 && hasNoClips && (
        <p className="timeline-hint">
          Glissez-déposez un son depuis la banque pour placer un clip. Clic droit pour retirer.
          Ctrl + molette pour zoomer.
        </p>
      )}
    </div>
  )
}

export default Timeline
