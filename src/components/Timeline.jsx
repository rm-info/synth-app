import { useEffect, useRef, useCallback, useState } from 'react'
import {
  layoutClips,
  computeBounds as computeBoundsRaw,
  SNAP_RESOLUTION,
  MIN_CLIP_DURATION,
} from '../lib/timelineLayout'
import { BEATS_PER_MEASURE } from '../reducer'
import './Timeline.css'

const DRAG_THRESHOLD_PX = 5

// Conversions zoom — centralisées ici.
//   100% = 50px par triple croche (1/8 noire).
//   pxPerBeat = (zoomH/100) * 50 * 8
const PX_PER_TRIPLE_AT_100 = 50

function pxPerBeatFromZoom(zoomH) {
  return (zoomH / 100) * PX_PER_TRIPLE_AT_100 * 8
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
  onMoveClips,
  onResizeClips,
  onDuplicateClips,
  selectedClipIds,
  onSetSelection,
  onAddMeasures,
  onRemoveLastMeasure,
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

  // --- Rectangle de sélection (phase 2.1) ---
  // Session indépendante du clip drag : démarrée sur mousedown dans une zone
  // vide, pilotée par des listeners window attachés dynamiquement par
  // `startRectSelection`.
  const [rectVisual, setRectVisual] = useState(null)

  // Miroir des clips courants pour lire dans les handlers window (les listeners
  // sont attachés au début de session et closure ne serait pas à jour).
  const clipsRef = useRef(clips)
  useEffect(() => { clipsRef.current = clips }, [clips])

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

      const delta = e.deltaY > 0 ? -2 : 2
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

    const commitCursor = (mode, duplicating = false) => {
      if (duplicating) {
        document.body.style.cursor = 'copy'
      } else if (mode === 'drag') {
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
          commitCursor('drag', s.ctrlAtStart)
        }
        // Delta groupe : tous les membres prennent le même offset. Bornes
        // pré-calculées au mousedown → le groupe s'arrête dès que le membre
        // le plus contraignant atteint sa limite.
        const clampedDelta = Math.max(s.minDelta, Math.min(s.maxDelta, dxSnapped))
        const newLeaderStart = s.originalStart + clampedDelta
        const measure = Math.floor(newLeaderStart / BEATS_PER_MEASURE) + 1
        const beat = newLeaderStart - (measure - 1) * BEATS_PER_MEASURE
        s.visual = { measure, beat, duration: s.originalDuration, delta: clampedDelta }
        setInteractionVisual({
          clipId: s.clipId,
          mode: s.mode,
          measure,
          beat,
          duration: s.originalDuration,
          delta: clampedDelta,
          clipIds: s.clipIds,
          isDuplicating: s.ctrlAtStart,
        })
        return
      }

      // Resize : actif immédiatement, pas de seuil
      s.isActive = true
      if (!s.cursorSet) {
        commitCursor(s.mode)
        s.cursorSet = true
      }

      if (s.mode === 'resize-right') {
        // Delta groupe borné par le membre le plus contraint (pré-calculé).
        const clampedDelta = Math.max(s.resizeMinDelta, Math.min(s.resizeMaxDelta, dxSnapped))
        const newDuration = s.originalDuration + clampedDelta
        s.visual = {
          measure: s.originalMeasure,
          beat: s.originalBeat,
          duration: newDuration,
          delta: clampedDelta,
        }
      } else {
        // resize-left : delta = change of start position ; bord droit fixe.
        const clampedDelta = Math.max(s.resizeMinDelta, Math.min(s.resizeMaxDelta, dxSnapped))
        const newStart = s.originalStart + clampedDelta
        const newDuration = s.originalDuration - clampedDelta
        const measure = Math.floor(newStart / BEATS_PER_MEASURE) + 1
        const beat = newStart - (measure - 1) * BEATS_PER_MEASURE
        s.visual = { measure, beat, duration: newDuration, delta: clampedDelta }
      }
      setInteractionVisual({
        clipId: s.clipId,
        mode: s.mode,
        measure: s.visual.measure,
        beat: s.visual.beat,
        duration: s.visual.duration,
        delta: s.visual.delta,
        clipIds: s.clipIds,
      })
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
        // Drag sous le seuil = clic
        if (s.ctrlAtStart) {
          // Ctrl+clic : toggle de la sélection (à partir de l'état pré-mouseup)
          const pre = s.preselectionIds
          const next = pre.includes(s.clipId)
            ? pre.filter((id) => id !== s.clipId)
            : [...pre, s.clipId]
          onSetSelection?.(next)
        } else {
          // Clic simple : remplace la sélection par ce clip
          onSetSelection?.([s.clipId])
        }
      } else if (s.visual) {
        const isResize = s.mode === 'resize-left' || s.mode === 'resize-right'
        if (s.mode === 'drag' && s.ctrlAtStart) {
          // Ctrl+drag : duplication des clipsBeingMoved à l'offset
          const delta = s.visual.delta ?? 0
          if (delta !== 0) {
            const datas = s.clipsBeingMoved
              .map((cm) => {
                const src = clipsRef.current.find((c) => c.id === cm.id)
                if (!src) return null
                const newStart = cm.originalStart + delta
                const m = Math.floor(newStart / BEATS_PER_MEASURE) + 1
                const b = newStart - (m - 1) * BEATS_PER_MEASURE
                return {
                  trackId: src.trackId,
                  soundId: src.soundId,
                  measure: m,
                  beat: b,
                  duration: cm.originalDuration,
                }
              })
              .filter(Boolean)
            if (datas.length > 0) onDuplicateClips?.(datas)
          }
        } else if (s.mode === 'drag' && s.isMulti) {
          // Multi-drag : dispatcher MOVE_CLIPS avec toutes les nouvelles positions.
          const delta = s.visual.delta ?? 0
          if (delta !== 0) {
            const moves = s.clipsBeingMoved.map((cm) => {
              const newStart = cm.originalStart + delta
              const m = Math.floor(newStart / BEATS_PER_MEASURE) + 1
              const b = newStart - (m - 1) * BEATS_PER_MEASURE
              return { id: cm.id, measure: m, beat: b }
            })
            onMoveClips?.(moves)
          }
        } else if (isResize && s.isMulti) {
          // Multi-resize : RESIZE_CLIPS avec nouvelles mesure/beat/durée.
          const delta = s.visual.delta ?? 0
          if (delta !== 0) {
            const updates = s.clipsBeingResized.map((cr) => {
              if (s.mode === 'resize-right') {
                return {
                  id: cr.id,
                  measure: cr.originalMeasure,
                  beat: cr.originalBeat,
                  duration: cr.originalDuration + delta,
                }
              }
              const newStart = cr.originalStart + delta
              const m = Math.floor(newStart / BEATS_PER_MEASURE) + 1
              const b = newStart - (m - 1) * BEATS_PER_MEASURE
              return {
                id: cr.id,
                measure: m,
                beat: b,
                duration: cr.originalDuration - delta,
              }
            })
            onResizeClips?.(updates)
          }
        } else {
          onUpdateClip(s.clipId, {
            measure: s.visual.measure,
            beat: s.visual.beat,
            duration: s.visual.duration,
          })
        }
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
  }, [activeClipId, activeMode, onUpdateClip, onMoveClips, onResizeClips, onDuplicateClips, onSetSelection])

  const startInteraction = (e, clip, mode, laidOutItems, opts = {}) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const { ctrlAtStart = false } = opts
    const originalStart = (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat

    // Multi : si le clip cible est dans une multi-sélection (et mode drag ou
    // resize), on prépare le groupe. Sinon (drag d'un clip non sélectionné),
    // on remplace la sélection par ce clip (sauf en Ctrl+drag, voir 2.4).
    const curSel = selectedClipIds ?? []
    const isInSelection = curSel.includes(clip.id)
    const isMulti = isInSelection && curSel.length > 1

    // --- Membres du groupe ---
    let clipsInGroup
    if (isMulti) {
      clipsInGroup = clips.filter((c) => curSel.includes(c.id))
    } else {
      // Remplace la sélection pour drag simple (pas pour Ctrl+drag, qui
      // pourrait devenir un toggle au mouseup sous seuil — on ne préjuge pas).
      if (mode === 'drag' && !isInSelection && !ctrlAtStart) {
        onSetSelection?.([clip.id])
      }
      clipsInGroup = [clip]
    }
    const groupIds = new Set(clipsInGroup.map((c) => c.id))

    // --- Drag : delta de position groupé ---
    let clipsBeingMoved = clipsInGroup.map((c) => ({
      id: c.id,
      originalMeasure: c.measure,
      originalBeat: c.beat,
      originalDuration: c.duration,
      originalStart: (c.measure - 1) * BEATS_PER_MEASURE + c.beat,
    }))
    let dragMinDelta = -Infinity
    let dragMaxDelta = Infinity
    for (const cm of clipsBeingMoved) {
      dragMinDelta = Math.max(dragMinDelta, -cm.originalStart)
      dragMaxDelta = Math.min(dragMaxDelta, totalBeats - cm.originalStart - cm.originalDuration)
    }

    // --- Resize : bornes individuelles (hors groupe) pour chaque membre ---
    let clipsBeingResized = null
    let resizeMinDelta = -Infinity
    let resizeMaxDelta = Infinity
    if (mode === 'resize-left' || mode === 'resize-right') {
      clipsBeingResized = clipsInGroup.map((c) => {
        const b = laidOutItems
          ? computeBounds(c.id, laidOutItems, groupIds)
          : { minStartLeft: 0, maxDurationRight: totalBeats }
        const cStart = (c.measure - 1) * BEATS_PER_MEASURE + c.beat
        return {
          id: c.id,
          originalMeasure: c.measure,
          originalBeat: c.beat,
          originalStart: cStart,
          originalDuration: c.duration,
          originalEnd: cStart + c.duration,
          minStartLeft: b.minStartLeft,
          maxDurationRight: b.maxDurationRight,
        }
      })
      if (mode === 'resize-right') {
        // delta = change in duration
        for (const cr of clipsBeingResized) {
          resizeMinDelta = Math.max(resizeMinDelta, MIN_CLIP_DURATION - cr.originalDuration)
          resizeMaxDelta = Math.min(resizeMaxDelta, cr.maxDurationRight - cr.originalDuration)
        }
      } else {
        // resize-left : delta = change in start (negative = earlier)
        for (const cr of clipsBeingResized) {
          resizeMinDelta = Math.max(resizeMinDelta, cr.minStartLeft - cr.originalStart)
          resizeMaxDelta = Math.min(resizeMaxDelta, cr.originalDuration - MIN_CLIP_DURATION)
        }
      }
    }

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
      // Multi
      clipsBeingMoved,
      clipsBeingResized,
      clipIds: clipsInGroup.map((c) => c.id),
      isMulti,
      minDelta: dragMinDelta,
      maxDelta: dragMaxDelta,
      resizeMinDelta,
      resizeMaxDelta,
      // Ctrl+drag : décidé au mouseup (toggle si < seuil, dup si drag)
      ctrlAtStart,
      preselectionIds: curSel,
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
      clipIds: clipsInGroup.map((c) => c.id),
    })
  }

  // Rectangle de sélection : démarré sur mousedown dans une zone vide (sans
  // modificateur ou avec Shift pour additif). Attaches ses propres listeners
  // window. Ctrl/Cmd+mousedown sur zone vide est réservé (futur scroll B.2.6)
  // → géré dans le handler onMouseDown de .cells-wrapper.
  const startRectSelection = (e) => {
    const zone = dropZoneRef.current
    if (!zone) return
    e.preventDefault()
    const zoneRect = zone.getBoundingClientRect()
    const startX = e.clientX - zoneRect.left
    const startY = e.clientY - zoneRect.top
    const additive = e.shiftKey
    const pxPerBeatLocal = pxPerBeat
    const trackHeightLocal = trackHeight
    const clipsSnap = clips
    const soundsSnap = savedSounds
    const curSelected = selectedClipIds ?? []

    setRectVisual({ startX, startY, currentX: startX, currentY: startY })

    const handleMove = (ev) => {
      const r = zone.getBoundingClientRect()
      const currentX = ev.clientX - r.left
      const currentY = ev.clientY - r.top
      setRectVisual({ startX, startY, currentX, currentY })
    }

    const handleUp = (ev) => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      const r = zone.getBoundingClientRect()
      const endX = ev.clientX - r.left
      const endY = ev.clientY - r.top
      setRectVisual(null)

      const moved = Math.hypot(endX - startX, endY - startY) >= DRAG_THRESHOLD_PX
      if (!moved) {
        // Clic sur zone vide : simple clic → vide, Shift+clic → no-op
        if (!additive) onSetSelection?.([])
        return
      }

      const rectPx = {
        left: Math.min(startX, endX),
        top: Math.min(startY, endY),
        right: Math.max(startX, endX),
        bottom: Math.max(startY, endY),
      }
      const { items } = layoutClips(clipsSnap, soundsSnap)
      const intersecting = items
        .filter((it) => {
          const clipLeft = it.start * pxPerBeatLocal
          const clipRight = it.end * pxPerBeatLocal
          const clipTop = it.lane * trackHeightLocal + 4
          const clipBottom = (it.lane + 1) * trackHeightLocal - 4
          return (
            clipLeft < rectPx.right &&
            clipRight > rectPx.left &&
            clipTop < rectPx.bottom &&
            clipBottom > rectPx.top
          )
        })
        .map((it) => it.clip.id)
      const finalIds = additive
        ? [...new Set([...curSelected, ...intersecting])]
        : intersecting
      onSetSelection?.(finalIds)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  // Wrapper de computeBounds avec totalBeats fermé pour éviter de le repasser.
  const computeBounds = (targetClipId, laidOutItems, excludeIds = null) =>
    computeBoundsRaw(targetClipId, laidOutItems, totalBeats, excludeIds)

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

  const canDeleteMeasure = numMeasures > 1

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
            {Array.from({ length: numMeasures }, (_, i) => {
              const isLast = i === numMeasures - 1
              return (
                <div
                  key={i}
                  className={`measure-label ${isLast ? 'is-last-measure' : ''}`}
                  style={{ width: `${pxPerMeasure}px` }}
                >
                  <span className="measure-number">{i + 1}</span>
                  {isLast && canDeleteMeasure && (
                    <button
                      type="button"
                      className="delete-measure-btn"
                      onClick={onRemoveLastMeasure}
                      aria-label="Retirer la dernière mesure"
                      title="Retirer la dernière mesure"
                    >×</button>
                  )}
                </div>
              )
            })}
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
              // Ctrl/Cmd+drag sur zone vide réservé (futur scroll horizontal B.2.6).
              if (e.ctrlKey || e.metaKey) return
              startRectSelection(e)
            }}
          >
            <div className="grid-lines-layer">{gridLines}</div>

            <div className="placed-sounds-layer">
              {laidOut.map(({ clip, sound, lane }) => {
                const isLeader = interactionVisual?.clipId === clip.id
                const isDuplicating = interactionVisual?.isDuplicating
                // Membre non-leader d'un multi-drag/resize : suit l'offset du leader.
                const isGroupMember =
                  !isLeader &&
                  !isDuplicating &&
                  typeof interactionVisual?.delta === 'number' &&
                  interactionVisual?.clipIds?.includes(clip.id)
                // En Ctrl+drag (duplication), les originaux restent immobiles ;
                // seul le leader s'efface un peu (is-dragging), les copies
                // sont rendues en ghosts dans un second passage.
                const isActive = !isDuplicating && (isLeader || isGroupMember)
                const mode = isActive ? interactionVisual.mode : null
                // Position/durée visuelle : si interaction active, on utilise
                // les valeurs live du snapshot (mesure/beat/durée courantes).
                let visualMeasure, visualBeat, visualDuration
                if (isActive && isLeader) {
                  visualMeasure = interactionVisual.measure
                  visualBeat = interactionVisual.beat
                  visualDuration = interactionVisual.duration
                } else if (isGroupMember) {
                  const delta = interactionVisual.delta
                  if (interactionVisual.mode === 'drag') {
                    const shifted =
                      (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat + delta
                    visualMeasure = Math.floor(shifted / BEATS_PER_MEASURE) + 1
                    visualBeat = shifted - (visualMeasure - 1) * BEATS_PER_MEASURE
                    visualDuration = clip.duration
                  } else if (interactionVisual.mode === 'resize-right') {
                    visualMeasure = clip.measure
                    visualBeat = clip.beat
                    visualDuration = clip.duration + delta
                  } else {
                    // resize-left : start décalé de delta, durée compensée
                    const clipStart = (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat
                    const newStart = clipStart + delta
                    visualMeasure = Math.floor(newStart / BEATS_PER_MEASURE) + 1
                    visualBeat = newStart - (visualMeasure - 1) * BEATS_PER_MEASURE
                    visualDuration = clip.duration - delta
                  }
                } else {
                  visualMeasure = clip.measure
                  visualBeat = clip.beat
                  visualDuration = clip.duration
                }
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
                    onMouseDown={(e) => {
                      if (e.button !== 0) return
                      // Ctrl/Cmd+mousedown démarre une session : devient
                      // duplication si l'utilisateur drag au-delà du seuil,
                      // sinon toggle de sélection au mouseup.
                      startInteraction(e, clip, 'drag', laidOut, {
                        ctrlAtStart: e.ctrlKey || e.metaKey,
                      })
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onRemoveClip(clip.id)
                    }}
                  >
                    <div
                      className="resize-handle resize-handle-left"
                      onMouseDown={(e) => startInteraction(e, clip, 'resize-left', laidOut)}
                    />
                    <span className="placed-dot" style={{ backgroundColor: sound.color }} />
                    <span className="placed-name">{sound.name}</span>
                    <div
                      className="resize-handle resize-handle-right"
                      onMouseDown={(e) => startInteraction(e, clip, 'resize-right', laidOut)}
                    />
                  </div>
                )
              })}
            </div>

            {/* Ghost copies pendant Ctrl+drag (duplication) */}
            {interactionVisual?.isDuplicating &&
              typeof interactionVisual.delta === 'number' &&
              laidOut
                .filter((it) => interactionVisual.clipIds?.includes(it.clip.id))
                .map(({ clip, sound, lane }) => {
                  const origStart = (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat
                  const newStart = origStart + interactionVisual.delta
                  const left = (newStart / totalBeats) * 100
                  const width = (clip.duration / totalBeats) * 100
                  const top = lane * trackHeight + 4
                  const height = trackHeight - 8
                  return (
                    <div
                      key={`ghost-${clip.id}`}
                      className="placed-sound is-ghost"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: sound.color + '33',
                        borderColor: sound.color,
                      }}
                    >
                      <span className="placed-dot" style={{ backgroundColor: sound.color }} />
                      <span className="placed-name">{sound.name}</span>
                    </div>
                  )
                })}

            {(isPlaying || cursorPos > 0) && (
              <div
                className="playback-cursor"
                style={{ left: `${cursorPos * 100}%` }}
              />
            )}

            {rectVisual && (
              <div
                className="selection-rect"
                style={{
                  left: `${Math.min(rectVisual.startX, rectVisual.currentX)}px`,
                  top: `${Math.min(rectVisual.startY, rectVisual.currentY)}px`,
                  width: `${Math.abs(rectVisual.currentX - rectVisual.startX)}px`,
                  height: `${Math.abs(rectVisual.currentY - rectVisual.startY)}px`,
                }}
              />
            )}
          </div>
        </div>

        <div className="timeline-extension" aria-label="Ajouter des mesures">
          <button
            type="button"
            className="extension-btn"
            onClick={() => onAddMeasures?.(1)}
            title="Ajouter 1 mesure"
          >+1</button>
          <button
            type="button"
            className="extension-btn"
            onClick={() => onAddMeasures?.(4)}
            title="Ajouter 4 mesures"
          >+4</button>
          <button
            type="button"
            className="extension-btn"
            onClick={() => onAddMeasures?.(16)}
            title="Ajouter 16 mesures"
          >+16</button>
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
