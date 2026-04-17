import { useEffect, useRef, useCallback, useState } from 'react'
import {
  layoutClips,
  computeBounds as computeBoundsRaw,
  SNAP_RESOLUTION,
  MIN_CLIP_DURATION,
} from '../lib/timelineLayout'
import { BEATS_PER_MEASURE, TRACK_COLORS } from '../reducer'
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

function MeasureContextMenu({ measure, canDelete, hasMeasureClipboard, onDelete, onInsert, onCopy, onCut, onPaste, onClose }) {
  const [insertMode, setInsertMode] = useState(null)
  const [insertCount, setInsertCount] = useState('1')
  const inputRef = useRef(null)

  useEffect(() => {
    if (insertMode && inputRef.current) inputRef.current.focus()
  }, [insertMode])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const commitInsert = () => {
    const n = Math.max(1, Math.min(64, parseInt(insertCount, 10) || 1))
    onInsert(insertMode, n)
  }

  if (insertMode) {
    return (
      <div className="measure-insert-form">
        <label>
          {insertMode === 'before' ? `Insérer avant mesure ${measure}` : `Insérer après mesure ${measure}`}
        </label>
        <div className="measure-insert-row">
          <input
            ref={inputRef}
            type="number"
            min="1"
            max="64"
            value={insertCount}
            onChange={(e) => setInsertCount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitInsert() }
              if (e.key === 'Escape') { e.preventDefault(); onClose() }
            }}
          />
          <span>mesure(s)</span>
          <button type="button" onClick={commitInsert}>OK</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <button type="button" disabled={!canDelete} onClick={onDelete}>
        Supprimer cette mesure
      </button>
      <div className="context-menu-separator" />
      <button type="button" onClick={() => setInsertMode('before')}>
        Insérer avant…
      </button>
      <button type="button" onClick={() => setInsertMode('after')}>
        Insérer après…
      </button>
      <div className="context-menu-separator" />
      <button type="button" disabled={!canDelete} onClick={onCut}>Couper</button>
      <button type="button" onClick={onCopy}>Copier</button>
      <button type="button" disabled={!hasMeasureClipboard} onClick={() => onPaste('before')}>
        Coller avant
      </button>
      <button type="button" disabled={!hasMeasureClipboard} onClick={() => onPaste('after')}>
        Coller après
      </button>
    </>
  )
}

/**
 * Timeline grid (Composer). Reçoit zoomH (en %) + trackHeight, calcule
 * pxPerBeat / pxPerMeasure et rend la grille en lignes absolument positionnées.
 */
function Timeline({
  savedSounds,
  clips,
  tracks,
  maxTracks,
  onCreateTrack,
  onRenameTrack,
  onDeleteTrack,
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
  mousePositionRef,
  hasClipboard,
  onPaste,
  onDeleteMeasure,
  onInsertMeasures,
  onCopyMeasure,
  onCutMeasure,
  onPasteMeasures,
  hasMeasureClipboard,
}) {
  const wrapperRef = useRef(null)
  const dropZoneRef = useRef(null)
  const visualizerCanvasRef = useRef(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [dragOverTrackId, setDragOverTrackId] = useState(null)
  const [renamingTrackId, setRenamingTrackId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef(null)

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
  const [zoomRectVisual, setZoomRectVisual] = useState(null)

  // Miroir des clips courants pour lire dans les handlers window (les listeners
  // sont attachés au début de session et closure ne serait pas à jour).
  const clipsRef = useRef(clips)
  useEffect(() => { clipsRef.current = clips }, [clips])

  const pxPerBeat = pxPerBeatFromZoom(zoomH)
  const pxPerMeasure = pxPerBeat * BEATS_PER_MEASURE
  const totalBeats = numMeasures * BEATS_PER_MEASURE
  const gridWidth = pxPerMeasure * numMeasures

  // --- Drag & drop ---
  // Identifie la piste correspondant à une coordonnée Y dans le cells-wrapper.
  // trackLayoutData est défini plus bas dans le composant mais sera initialisé
  // au moment où ces handlers sont appelés (post-render).
  const findTrackAtY = (yInCells) => {
    const layouts = trackLayoutData
    for (const tl of layouts) {
      if (yInCells < tl.yOffset + tl.corridorHeight) return tl.trackId
    }
    return layouts.length > 0 ? layouts[layouts.length - 1].trackId : null
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    const zone = dropZoneRef.current
    if (zone) {
      const rect = zone.getBoundingClientRect()
      const yInCells = e.clientY - rect.top
      setDragOverTrackId(findTrackAtY(yInCells))
    }
  }

  const handleDragLeave = (e) => {
    // Ne clear que si on quitte vraiment la zone (pas un enfant)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTrackId(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOverTrackId(null)
    const soundId = e.dataTransfer.getData('text/plain')
    if (!soundId) return
    const zone = dropZoneRef.current
    if (!zone) return
    const rect = zone.getBoundingClientRect()
    const xInGrid = e.clientX - rect.left
    const yInCells = e.clientY - rect.top
    const rawBeat = xInGrid / pxPerBeat
    const snapped = Math.round(rawBeat / SNAP_RESOLUTION) * SNAP_RESOLUTION
    const clamped = Math.max(0, Math.min(snapped, Math.max(0, totalBeats - SNAP_RESOLUTION)))
    const measure = Math.floor(clamped / BEATS_PER_MEASURE) + 1
    const beat = clamped - (measure - 1) * BEATS_PER_MEASURE
    const trackId = findTrackAtY(yInCells)
    onAddClip(soundId, measure, beat, undefined, trackId)
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
    if (e.altKey) {
      e.preventDefault()
      e.stopPropagation()
      startAltZoom(e)
      return
    }
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
        const sameTrackItems = laidOutItems?.filter(it => it.clip.trackId === c.trackId)
        const b = sameTrackItems?.length
          ? computeBounds(c.id, sameTrackItems, groupIds)
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

  // Ctrl+drag sur zone vide = scroll horizontal (pan).
  // Les curseurs sont gérés dans les handlers window (pas JSX) pour
  // satisfaire react-hooks/immutability.
  const startCtrlScroll = (e) => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    e.preventDefault()
    const startX = e.clientX
    const initialScrollLeft = wrapper.scrollLeft
    let cursorSet = false

    const handleMove = (ev) => {
      if (!cursorSet) {
        cursorSet = true
        document.body.style.cursor = 'grabbing'
        document.body.style.userSelect = 'none'
      }
      wrapper.scrollLeft = initialScrollLeft - (ev.clientX - startX)
    }
    const handleUp = () => {
      if (cursorSet) {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  // Alt+drag = zoom rectangle horizontal
  const ZOOM_RECT_THRESHOLD = 10
  const startAltZoom = (e) => {
    const wrapper = wrapperRef.current
    const zone = dropZoneRef.current
    if (!wrapper || !zone) return
    e.preventDefault()

    const zr = zone.getBoundingClientRect()
    const startX = e.clientX - zr.left
    const pxPerBeatSnap = pxPerBeat
    const zoomSnap = zoomH
    let cursorSet = false

    setZoomRectVisual({ startX, currentX: startX })

    const handleMove = (ev) => {
      if (!cursorSet) {
        cursorSet = true
        document.body.style.cursor = 'zoom-in'
        document.body.style.userSelect = 'none'
      }
      const currentX = ev.clientX - zone.getBoundingClientRect().left
      setZoomRectVisual({ startX, currentX })
    }

    const handleUp = (ev) => {
      if (cursorSet) {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      const endX = ev.clientX - zone.getBoundingClientRect().left
      setZoomRectVisual(null)

      const rectWidth = Math.abs(endX - startX)
      if (rectWidth < ZOOM_RECT_THRESHOLD) return

      const wrapperWidth = wrapper.clientWidth
      const newZoom = Math.max(zoomHMin, Math.min(zoomHMax, zoomSnap * wrapperWidth / rectWidth))
      onSetZoomH(newZoom)

      const rectCenter = (startX + endX) / 2
      const beatCenter = rectCenter / pxPerBeatSnap
      requestAnimationFrame(() => {
        const newPxPerBeat = pxPerBeatFromZoom(newZoom)
        wrapper.scrollLeft = beatCenter * newPxPerBeat - wrapperWidth / 2
      })
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  // Rectangle de sélection confiné au wrapper scrollable de la timeline
  // (phase 2.1, fix 2.6). Auto-scroll horizontal quand la souris sort par
  // la gauche ou la droite (~8 px/frame ≈ 480 px/s à 60 fps).
  const RECT_SCROLL_SPEED = 8

  const startRectSelection = (e) => {
    const zone = dropZoneRef.current
    const wrapper = wrapperRef.current
    if (!zone || !wrapper) return
    e.preventDefault()

    const zr = zone.getBoundingClientRect()
    const startX = e.clientX - zr.left
    const startY = e.clientY - zr.top
    const additive = e.shiftKey
    const pxPerBeatLocal = pxPerBeat
    const trackHeightLocal = trackHeight
    const clipsSnap = clips
    const soundsSnap = savedSounds
    const tracksSnap = tracks
    const curSelected = selectedClipIds ?? []

    let lastClientX = e.clientX
    let lastClientY = e.clientY
    let scrollAnimId = null

    setRectVisual({ startX, startY, currentX: startX, currentY: startY })

    // Convertit la position souris (clampée au wrapper) en espace cells-wrapper.
    const clampedPoint = () => {
      const wr = wrapper.getBoundingClientRect()
      const zoneCur = zone.getBoundingClientRect()
      const cx = Math.max(wr.left, Math.min(wr.right, lastClientX))
      const cy = Math.max(wr.top, Math.min(wr.bottom, lastClientY))
      return { x: cx - zoneCur.left, y: cy - zoneCur.top }
    }

    const updateVisual = () => {
      const { x, y } = clampedPoint()
      setRectVisual({ startX, startY, currentX: x, currentY: y })
    }

    // Auto-scroll : appelé en boucle rAF quand la souris est hors du wrapper.
    const autoScroll = () => {
      const wr = wrapper.getBoundingClientRect()
      if (lastClientX < wr.left) {
        wrapper.scrollLeft = Math.max(0, wrapper.scrollLeft - RECT_SCROLL_SPEED)
      } else if (lastClientX > wr.right) {
        wrapper.scrollLeft += RECT_SCROLL_SPEED
      }
      updateVisual()
      scrollAnimId = requestAnimationFrame(autoScroll)
    }

    const handleMove = (ev) => {
      lastClientX = ev.clientX
      lastClientY = ev.clientY
      updateVisual()

      const wr = wrapper.getBoundingClientRect()
      const outsideX = ev.clientX < wr.left || ev.clientX > wr.right
      if (outsideX && scrollAnimId == null) {
        scrollAnimId = requestAnimationFrame(autoScroll)
      } else if (!outsideX && scrollAnimId != null) {
        cancelAnimationFrame(scrollAnimId)
        scrollAnimId = null
      }
    }

    const handleUp = (ev) => {
      if (scrollAnimId != null) {
        cancelAnimationFrame(scrollAnimId)
        scrollAnimId = null
      }
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)

      lastClientX = ev.clientX
      lastClientY = ev.clientY
      const { x: endX, y: endY } = clampedPoint()
      setRectVisual(null)

      const moved = Math.hypot(endX - startX, endY - startY) >= DRAG_THRESHOLD_PX
      if (!moved) {
        if (!additive) onSetSelection?.([])
        return
      }

      const rectPx = {
        left: Math.min(startX, endX),
        top: Math.min(startY, endY),
        right: Math.max(startX, endX),
        bottom: Math.max(startY, endY),
      }
      const allItems = []
      let yOff = 0
      for (const t of tracksSnap) {
        const tc = clipsSnap.filter(c => c.trackId === t.id)
        const { items, laneCount } = layoutClips(tc, soundsSnap)
        for (const item of items) allItems.push({ ...item, trackYOffset: yOff })
        yOff += Math.max(1, laneCount) * trackHeightLocal
      }
      const intersecting = allItems
        .filter((it) => {
          const clipLeft = it.start * pxPerBeatLocal
          const clipRight = it.end * pxPerBeatLocal
          const clipTop = it.trackYOffset + it.lane * trackHeightLocal + 4
          const clipBottom = it.trackYOffset + (it.lane + 1) * trackHeightLocal - 4
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

  // Per-track lane layout
  const trackLayoutData = []
  let totalClipAreaHeight = 0
  for (const track of tracks) {
    const trackClips = clips.filter(c => c.trackId === track.id)
    const { items, laneCount } = layoutClips(trackClips, savedSounds)
    const corridorHeight = Math.max(1, laneCount) * trackHeight
    trackLayoutData.push({ trackId: track.id, items, laneCount, yOffset: totalClipAreaHeight, corridorHeight })
    totalClipAreaHeight += corridorHeight
  }
  const allLaidOut = trackLayoutData.flatMap(tl =>
    tl.items.map(item => ({ ...item, trackYOffset: tl.yOffset }))
  )
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

  const clipAreaHeight = totalClipAreaHeight

  const canDeleteMeasure = numMeasures > 1

  return (
    <div className="timeline">
      <div
        className="timeline-grid-wrapper"
        ref={wrapperRef}
        onMouseLeave={() => { if (mousePositionRef) mousePositionRef.current = null }}
      >
        <div className="track-headers-column">
          <div className="track-header-spacer" />
          {trackLayoutData.map((tl, i) => {
            const track = tracks[i]
            const color = track.color || TRACK_COLORS[i % TRACK_COLORS.length]
            const isRenaming = renamingTrackId === track.id
            return (
              <div key={tl.trackId} className="track-header" style={{ height: `${tl.corridorHeight}px` }}>
                <span className="track-color-dot" style={{ backgroundColor: color }} />
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    className="track-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => {
                      const trimmed = renameValue.trim()
                      if (trimmed && trimmed !== track.name) onRenameTrack?.(track.id, trimmed)
                      setRenamingTrackId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); e.target.blur() }
                      if (e.key === 'Escape') { e.preventDefault(); setRenamingTrackId(null) }
                    }}
                  />
                ) : (
                  <span
                    className="track-name"
                    onDoubleClick={() => {
                      setRenamingTrackId(track.id)
                      setRenameValue(track.name)
                      requestAnimationFrame(() => renameInputRef.current?.select())
                    }}
                  >
                    {track.name}
                  </span>
                )}
                {tracks.length > 1 && (
                  <button
                    type="button"
                    className="track-delete-btn"
                    onClick={() => onDeleteTrack?.(track.id)}
                    title={`Supprimer ${track.name}`}
                  >×</button>
                )}
              </div>
            )
          })}
          {tracks.length < (maxTracks || 16) && (
            <button
              type="button"
              className="track-add-btn"
              onClick={() => onCreateTrack?.()}
            >
              + Piste
            </button>
          )}
        </div>
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
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setContextMenu({
                      type: 'measure',
                      measure: i + 1,
                      clientX: e.clientX,
                      clientY: e.clientY,
                    })
                  }}
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
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseDown={(e) => {
              // Les clips appellent stopPropagation sur mousedown, donc ce handler
              // ne se déclenche que pour un clic dans une zone vide.
              if (e.button !== 0) return
              setContextMenu(null)
              if (e.altKey) {
                startAltZoom(e)
                return
              }
              if (e.ctrlKey || e.metaKey) {
                startCtrlScroll(e)
                return
              }
              startRectSelection(e)
            }}
            onMouseMove={(e) => {
              if (mousePositionRef && dropZoneRef.current) {
                const rect = dropZoneRef.current.getBoundingClientRect()
                mousePositionRef.current = {
                  absoluteBeat: (e.clientX - rect.left) / pxPerBeat,
                }
              }
            }}
            onMouseLeave={() => {
              if (mousePositionRef) mousePositionRef.current = null
            }}
            onContextMenu={(e) => {
              // Les clips ont leur propre onContextMenu (stopPropagation), donc
              // ce handler ne se déclenche que pour un clic droit sur zone vide.
              e.preventDefault()
              setContextMenu(null)
              if (!hasClipboard) return
              const rect = dropZoneRef.current?.getBoundingClientRect()
              if (!rect) return
              setContextMenu({
                clientX: e.clientX,
                clientY: e.clientY,
                absoluteBeat: (e.clientX - rect.left) / pxPerBeat,
              })
            }}
          >
            <div className="track-corridors-layer">
              {trackLayoutData.map((tl, i) => {
                const track = tracks[i]
                const color = track.color || TRACK_COLORS[i % TRACK_COLORS.length]
                return (
                  <div
                    key={tl.trackId}
                    className={`track-corridor${i % 2 === 1 ? ' track-corridor-odd' : ''}${dragOverTrackId === tl.trackId ? ' track-corridor-hover' : ''}`}
                    style={{
                      top: `${tl.yOffset}px`,
                      height: `${tl.corridorHeight}px`,
                      borderLeftColor: color,
                    }}
                  />
                )
              })}
            </div>
            <div className="grid-lines-layer">{gridLines}</div>

            <div className="placed-sounds-layer">
              {allLaidOut.map(({ clip, sound, lane, trackYOffset }) => {
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
                const top = trackYOffset + lane * trackHeight + 4
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
                      startInteraction(e, clip, 'drag', allLaidOut, {
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
                      onMouseDown={(e) => startInteraction(e, clip, 'resize-left', allLaidOut)}
                    />
                    <span className="placed-dot" style={{ backgroundColor: sound.color }} />
                    <span className="placed-name">{sound.name}</span>
                    <div
                      className="resize-handle resize-handle-right"
                      onMouseDown={(e) => startInteraction(e, clip, 'resize-right', allLaidOut)}
                    />
                  </div>
                )
              })}
            </div>

            {/* Ghost copies pendant Ctrl+drag (duplication) */}
            {interactionVisual?.isDuplicating &&
              typeof interactionVisual.delta === 'number' &&
              allLaidOut
                .filter((it) => interactionVisual.clipIds?.includes(it.clip.id))
                .map(({ clip, sound, lane, trackYOffset }) => {
                  const origStart = (clip.measure - 1) * BEATS_PER_MEASURE + clip.beat
                  const newStart = origStart + interactionVisual.delta
                  const left = (newStart / totalBeats) * 100
                  const width = (clip.duration / totalBeats) * 100
                  const top = trackYOffset + lane * trackHeight + 4
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

            {zoomRectVisual && (
              <div
                className="zoom-rect"
                style={{
                  left: `${Math.min(zoomRectVisual.startX, zoomRectVisual.currentX)}px`,
                  top: 0,
                  width: `${Math.abs(zoomRectVisual.currentX - zoomRectVisual.startX)}px`,
                  bottom: 0,
                }}
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

      {contextMenu && (
        <>
          <div
            className="context-menu-backdrop"
            onMouseDown={() => setContextMenu(null)}
          />
          <div
            className="timeline-context-menu"
            style={{ left: `${contextMenu.clientX}px`, top: `${contextMenu.clientY}px` }}
          >
            {contextMenu.type === 'measure' ? (
              <MeasureContextMenu
                measure={contextMenu.measure}
                canDelete={numMeasures > 1}
                hasMeasureClipboard={hasMeasureClipboard}
                onDelete={() => {
                  onDeleteMeasure?.(contextMenu.measure)
                  setContextMenu(null)
                }}
                onInsert={(position, count) => {
                  onInsertMeasures?.(contextMenu.measure, position, count)
                  setContextMenu(null)
                }}
                onCopy={() => {
                  onCopyMeasure?.(contextMenu.measure)
                  setContextMenu(null)
                }}
                onCut={() => {
                  onCutMeasure?.(contextMenu.measure)
                  setContextMenu(null)
                }}
                onPaste={(position) => {
                  onPasteMeasures?.(contextMenu.measure, position)
                  setContextMenu(null)
                }}
                onClose={() => setContextMenu(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  onPaste?.(contextMenu.absoluteBeat)
                  setContextMenu(null)
                }}
              >
                Coller ici
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Timeline
