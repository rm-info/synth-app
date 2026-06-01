import { useRef, useState, useEffect, useCallback } from 'react'
import { splineToPoints } from '../lib/spline'
import { themeColor } from '../lib/themeColor'
import { withSavedCtx } from '../lib/canvas'
import { STRINGS } from '../lib/strings'
import './SplineEditor.css'

// iter-M phase-3 : éditeur du mode « spline » (points d'ancrage + courbe
// interpolée). Réutilise le pattern visuel des poignées ADSR (cercles
// draggables, courbe recalculée à chaque drag) appliqué à la colonne Forme
// d'onde. La courbe est l'ombre `points` (vérité éditable = les ancres).
//
// Interactions :
//   - drag d'une poignée  → onMoveAnchor (X clampé entre voisins, Y ∈ [-1,1]) ;
//   - clic hors poignée    → onAddAnchor à ce point ;
//   - poignée + Suppr/⌫    → onRemoveAnchor (refusé au minimum, géré reducer) ;
//   - clic droit poignée   → menu contextuel « Supprimer ».

const RESOLUTION = 600
const HANDLE_RADIUS = 5
const HANDLE_HIT_RADIUS = 11
// Garde anti-segment-nul, aligné sur SPLINE_MIN_GAP du reducer.
const MIN_GAP = 1

function isFormField(target) {
  const tag = target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return !!target?.isContentEditable
}

function SplineEditor({
  points,
  anchors,
  interpolation,
  onMoveAnchor,
  onAddAnchor,
  onRemoveAnchor,
  onSetInterpolation,
  autoSizing,
  autoSizeFocusGuardRef,
  convertButtons,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  const [draftAnchors, setDraftAnchors] = useState(null)
  const draggingIdxRef = useRef(null)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [menu, setMenu] = useState(null) // { index, px, py } | null

  // Ancres et courbe affichées : draft pendant le drag, valeurs committées sinon.
  const liveAnchors = draftAnchors ?? anchors
  const liveCurve = draftAnchors
    ? splineToPoints(draftAnchors, interpolation)
    : points

  // Réf miroir pour le repaint hors-render (ResizeObserver, themechange).
  // Mise à jour dans un effet (jamais pendant le render — cf. react-hooks/refs).
  const drawStateRef = useRef({ curve: points, anchors, selectedIdx: null, hoverIdx: null })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return
    const ctx = canvas.getContext('2d')
    const midY = H / 2
    const { curve, anchors: pts, selectedIdx: sel, hoverIdx: hov } = drawStateRef.current

    withSavedCtx(ctx, () => {
    ctx.fillStyle = themeColor('canvas-bg')
    ctx.fillRect(0, 0, W, H)

    // Lignes de repère (0, ±0.5) — identiques au canvas freehand.
    ctx.strokeStyle = themeColor('canvas-grid-secondary')
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

    // Courbe (underlay doux + trait accent), comme le canvas freehand.
    const strokeCurve = () => {
      ctx.beginPath()
      for (let x = 0; x < W; x++) {
        const ptFloat = (x / W) * RESOLUTION
        const ptIdx = Math.min(Math.floor(ptFloat), RESOLUTION - 1)
        const y = midY - (curve[ptIdx] ?? 0) * (H / 2)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.strokeStyle = themeColor('accent-bg-soft')
    ctx.lineWidth = 6
    strokeCurve()
    ctx.strokeStyle = themeColor('accent')
    ctx.lineWidth = 2
    strokeCurve()

    // Poignées d'ancres (par-dessus). Sélectionnée/survolée = pleine + plus
    // grande ; au repos = pastille claire cerclée d'accent (pattern ADSR).
    for (let i = 0; i < pts.length; i++) {
      const px = (pts[i].x / RESOLUTION) * W
      const py = midY - pts[i].y * (H / 2)
      const active = i === sel || i === hov
      ctx.beginPath()
      ctx.arc(px, py, active ? HANDLE_RADIUS + 1.5 : HANDLE_RADIUS, 0, 2 * Math.PI)
      ctx.fillStyle = active ? themeColor('accent') : themeColor('canvas-marker')
      ctx.fill()
      ctx.strokeStyle = themeColor('accent')
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    })
  }, [])

  useEffect(() => {
    drawStateRef.current = { curve: liveCurve, anchors: liveAnchors, selectedIdx, hoverIdx }
    draw()
  }, [draw, liveCurve, liveAnchors, selectedIdx, hoverIdx])

  // Sync buffer canvas ↔ container (double rAF — cf. WaveformEditor pour le
  // contournement Firefox du backing store invalidé après canvas.width = N).
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas || typeof ResizeObserver === 'undefined') return
    let raf1 = 0
    let raf2 = 0
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        const h = Math.floor(entry.contentRect.height)
        if (!w || !h) continue
        if (w !== canvas.width || h !== canvas.height) {
          canvas.width = w
          canvas.height = h
          draw()
          cancelAnimationFrame(raf1)
          cancelAnimationFrame(raf2)
          raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => draw())
          })
        }
      }
    })
    ro.observe(container)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      ro.disconnect()
    }
  }, [draw])

  useEffect(() => {
    const repaint = () => draw()
    window.addEventListener('themechange', repaint)
    return () => window.removeEventListener('themechange', repaint)
  }, [draw])

  // --- Conversion coords ---
  const eventToData = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const xPct = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
    const yPct = (e.clientY - rect.top) / rect.height
    return {
      x: xPct * RESOLUTION,
      y: Math.max(-1, Math.min(1, -(yPct * 2 - 1))),
    }
  }
  const hitTest = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    let picked = null
    let minDist = HANDLE_HIT_RADIUS
    for (let i = 0; i < liveAnchors.length; i++) {
      const px = (liveAnchors[i].x / RESOLUTION) * rect.width
      const py = (rect.height / 2) - liveAnchors[i].y * (rect.height / 2)
      const d = Math.hypot(mx - px, my - py)
      if (d < minDist) { minDist = d; picked = i }
    }
    return picked
  }

  // --- Interactions souris ---
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // clic gauche seulement (le droit ouvre le menu)
    // AS.3.2 : si ce mousedown vient de donner le focus à la colonne (auto-sizing),
    // il ne fait que focuser — pas d'édition.
    if (autoSizing && autoSizeFocusGuardRef?.current) return
    setMenu(null)
    const idx = hitTest(e)
    if (idx !== null) {
      setSelectedIdx(idx)
      draggingIdxRef.current = idx
      setDraftAnchors(anchors.slice())
      return
    }
    // Clic hors poignée → ajout d'une ancre à ce point.
    const { x, y } = eventToData(e)
    setSelectedIdx(null)
    onAddAnchor(x, y)
  }

  const handleMouseMove = (e) => {
    if (draggingIdxRef.current === null) {
      const idx = hitTest(e)
      if (idx !== hoverIdx) setHoverIdx(idx)
      return
    }
    const idx = draggingIdxRef.current
    const base = draftAnchors ?? anchors
    const { x, y } = eventToData(e)
    const lower = idx > 0 ? base[idx - 1].x + MIN_GAP : 0
    const upper = idx < base.length - 1 ? base[idx + 1].x - MIN_GAP : RESOLUTION - MIN_GAP
    const next = base.slice()
    next[idx] = { x: Math.max(lower, Math.min(upper, x)), y }
    setDraftAnchors(next)
  }

  const commitDrag = () => {
    const idx = draggingIdxRef.current
    if (idx === null) return
    draggingIdxRef.current = null
    if (draftAnchors) {
      const a = draftAnchors[idx]
      const orig = anchors[idx]
      if (!orig || a.x !== orig.x || a.y !== orig.y) onMoveAnchor(idx, a.x, a.y)
    }
    setDraftAnchors(null)
  }

  const handleMouseUp = () => commitDrag()
  const handleMouseLeave = () => {
    setHoverIdx(null)
    commitDrag()
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    const idx = hitTest(e)
    if (idx === null) { setMenu(null); return }
    const rect = containerRef.current.getBoundingClientRect()
    // Clamp dans le conteneur (overflow:hidden) pour que le menu reste visible
    // même quand on clique droit près du bord droit/bas.
    const px = Math.max(0, Math.min(rect.width - 150, e.clientX - rect.left))
    const py = Math.max(0, Math.min(rect.height - 44, e.clientY - rect.top))
    setSelectedIdx(idx)
    setMenu({ index: idx, px, py })
  }

  // Suppr / Backspace retirent l'ancre sélectionnée (refus au minimum géré par
  // le reducer). Inactif quand le focus est dans un champ de saisie.
  useEffect(() => {
    if (selectedIdx === null) return
    const onKey = (e) => {
      if (isFormField(e.target)) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onRemoveAnchor(selectedIdx)
        setSelectedIdx(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIdx, onRemoveAnchor])

  // Ferme le menu contextuel au clic ailleurs / Escape.
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e) => { if (e.key === 'Escape') setMenu(null) }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  // draftAnchors n'est posé que pendant un drag de poignée → signal « grabbing »
  // sans lire de ref pendant le render.
  const cursor = draftAnchors ? 'grabbing' : (hoverIdx !== null ? 'grab' : 'crosshair')

  return (
    <div className="we-canvas-area" data-anchor="designer-waveform">
      <header className="we-area-header">
        <div className="we-header-left">
          <h3 className="we-area-title">{STRINGS.editor.waveformTitle}</h3>
        </div>
        <div className="spline-header-controls">
          <div className="spline-interp-toggle" role="group" aria-label={STRINGS.editor.splineInterpolation}>
            <button
              type="button"
              className={`spline-interp-btn${interpolation !== 'hard' ? ' is-active' : ''}`}
              onClick={() => onSetInterpolation('soft')}
              title={STRINGS.editor.splineSoftTitle}
              aria-pressed={interpolation !== 'hard'}
            >{STRINGS.editor.splineSoft}</button>
            <button
              type="button"
              className={`spline-interp-btn${interpolation === 'hard' ? ' is-active' : ''}`}
              onClick={() => onSetInterpolation('hard')}
              title={STRINGS.editor.splineHardTitle}
              aria-pressed={interpolation === 'hard'}
            >{STRINGS.editor.splineHard}</button>
          </div>
          {convertButtons}
        </div>
      </header>
      <p className="spline-hint">{STRINGS.editor.splineAddHint}</p>
      <div className="canvas-container spline-canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          style={{ cursor }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
        />
        <span className="label top">+1</span>
        <span className="label middle">0</span>
        <span className="label bottom">-1</span>
        {menu && (
          <div
            className="spline-context-menu"
            style={{ left: `${menu.px}px`, top: `${menu.py}px` }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="spline-context-menu-item"
              onClick={() => { onRemoveAnchor(menu.index); setMenu(null); setSelectedIdx(null) }}
            >{STRINGS.editor.splineRemove}</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SplineEditor
