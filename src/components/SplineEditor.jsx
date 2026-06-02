import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { splineToPoints } from '../lib/spline'
import { themeColor } from '../lib/themeColor'
import { withSavedCtx, drawAmplitudeMarker, DRAW_MARGIN } from '../lib/canvas'
import { STRINGS } from '../lib/strings'
import NormalizeLegend from './NormalizeLegend'
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
  normalizedBg = null,
  anchors,
  interpolation,
  onMoveAnchor,
  onAddAnchor,
  onRemoveAnchor,
  autoSizing,
  autoSizeFocusGuardRef,
  headerControls,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  const [draftAnchors, setDraftAnchors] = useState(null)
  const draggingIdxRef = useRef(null)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [menu, setMenu] = useState(null) // { index, px, py } | null

  // Ancres affichées : draft pendant le drag, committées sinon.
  const liveAnchors = draftAnchors ?? anchors
  // Spline committée (squelette des ancres validées) — sert à isoler le résidu.
  const committedSpline = useMemo(
    () => Array.from(splineToPoints(anchors, interpolation)),
    [anchors, interpolation],
  )
  // Résidu = canonical committée − spline committée. Invariant pendant un drag
  // d'ancre (le reducer le préserve : canonical = spline(ancres) + résidu).
  const residual = useMemo(() => {
    const r = new Array(points.length)
    for (let i = 0; i < points.length; i++) r[i] = (points[i] ?? 0) - (committedSpline[i] ?? 0)
    return r
  }, [points, committedSpline])
  // M.r.5.bis.2 — spline parfaite (orange) = squelette des ancres AFFICHÉES (draft
  // pendant un drag, committées sinon).
  const splinePerfect = useMemo(
    () => (draftAnchors ? Array.from(splineToPoints(draftAnchors, interpolation)) : committedSpline),
    [draftAnchors, interpolation, committedSpline],
  )
  // Courbe principale (bleu = canonical) : committée au repos ; pendant un drag,
  // on PRÉVISUALISE spline(draft) + résidu (clampé ±1) — exactement ce que
  // produira le reducer au commit. Conséquence : le tracé bleu reste visible
  // pendant le drag (au lieu de devenir la spline pure) et ne saute pas au
  // relâchement ; bleu, gris et orange coexistent avec leur rôle habituel.
  const liveCurve = useMemo(() => {
    if (!draftAnchors) return points
    const c = new Array(splinePerfect.length)
    for (let i = 0; i < splinePerfect.length; i++) {
      const v = (splinePerfect[i] ?? 0) + (residual[i] ?? 0)
      c[i] = v < -1 ? -1 : v > 1 ? 1 : v
    }
    return c
  }, [draftAnchors, splinePerfect, residual, points])
  const showSplinePerfect = useMemo(() => {
    let m = 0
    for (let i = 0; i < liveCurve.length; i++) {
      const d = Math.abs((liveCurve[i] ?? 0) - (splinePerfect[i] ?? 0))
      if (d > m) m = d
    }
    return m > 0.01
  }, [liveCurve, splinePerfect])

  // M.r.5.bis.1 — auto-fit Y aligné sur WaveformEditor : même échelle dynamique
  // `[-peak, +peak]` (peak = max(|courbe|, |normalizedBg|, |spline si affichée|,
  // 1)) + transition douce par lerp rAF, pour qu'aucun saut visuel n'apparaisse
  // au switch Libre↔Ancres.
  const peakTarget = useMemo(() => {
    const pc = liveCurve.reduce((m, v) => Math.max(m, Math.abs(v ?? 0)), 0)
    const pb = normalizedBg ? normalizedBg.reduce((m, v) => Math.max(m, Math.abs(v)), 0) : 0
    const ps = showSplinePerfect ? splinePerfect.reduce((m, v) => Math.max(m, Math.abs(v)), 0) : 0
    return Math.max(pc, pb, ps, 1)
  }, [liveCurve, normalizedBg, showSplinePerfect, splinePerfect])
  // Lazy-init à la cible (pas 1) : au montage du composant (switch depuis Libre)
  // l'échelle est déjà correcte, pas d'animation parasite depuis 1.
  const peakDisplayedRef = useRef(null)
  if (peakDisplayedRef.current === null) peakDisplayedRef.current = peakTarget

  // Réf miroir pour le repaint hors-render (ResizeObserver, themechange).
  // Mise à jour dans un effet (jamais pendant le render — cf. react-hooks/refs).
  const drawStateRef = useRef({ curve: points, anchors, selectedIdx: null, hoverIdx: null, bg: normalizedBg, sp: null })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return
    const ctx = canvas.getContext('2d')
    const midY = H / 2
    const { curve, anchors: pts, selectedIdx: sel, hoverIdx: hov, bg, sp } = drawStateRef.current
    // M.r.5.bis.1 — échelle Y auto-fit (cf. WaveformEditor.drawCanvas).
    // M.r.5.bis — marge DRAW_MARGIN : courbe et poignées confinées à
    // [M, W−M]×[M, H−M] ; lignes de repère pleine largeur.
    const peak = peakDisplayedRef.current
    const M = DRAW_MARGIN
    const innerW = W - 2 * M
    const valueToY = (v) => midY - (v / peak) * ((H - 2 * M) / 2)
    const strokeWave = (arr) => {
      ctx.beginPath()
      for (let x = M; x <= W - M; x++) {
        const ptFloat = ((x - M) / innerW) * RESOLUTION
        const ptIdx = Math.min(Math.floor(ptFloat), RESOLUTION - 1)
        const y = valueToY(arr[ptIdx] ?? 0)
        if (x === M) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    withSavedCtx(ctx, () => {
    ctx.fillStyle = themeColor('canvas-bg')
    ctx.fillRect(0, 0, W, H)

    // Lignes de repère (0, ±0.5) — suivent l'échelle auto-fit comme le freehand.
    ctx.strokeStyle = themeColor('canvas-grid-secondary')
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, midY)
    ctx.lineTo(W, midY)
    ctx.stroke()
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, valueToY(0.5))
    ctx.lineTo(W, valueToY(0.5))
    ctx.moveTo(0, valueToY(-0.5))
    ctx.lineTo(W, valueToY(-0.5))
    ctx.stroke()
    ctx.setLineDash([])

    // M.r.4 — aperçu « phase canonique » en gris discret, sous la courbe
    // (présent seulement quand `bg` est fourni = canonical non normalisée).
    if (bg) {
      ctx.strokeStyle = themeColor('canvas-text-primary')
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 1
      strokeWave(bg)
      ctx.globalAlpha = 1
    }

    // M.r.5.bis.2 — spline parfaite (squelette des ancres) en orange, après le
    // gris normalisé et avant la canonical. Présente seulement quand `sp` fourni.
    if (sp) {
      ctx.strokeStyle = themeColor('canvas-spline-perfect')
      ctx.globalAlpha = 0.55
      ctx.lineWidth = 1
      strokeWave(sp)
      ctx.globalAlpha = 1
    }

    // Courbe (underlay doux + trait accent), comme le canvas freehand.
    ctx.strokeStyle = themeColor('accent-bg-soft')
    ctx.lineWidth = 6
    strokeWave(curve)
    ctx.strokeStyle = themeColor('accent')
    ctx.lineWidth = 2
    strokeWave(curve)

    // M.r.5.bis.1 — marqueur ±1 (primitive partagée), par-dessus la courbe.
    drawAmplitudeMarker(ctx, W, valueToY, themeColor('accent'))

    // Poignées d'ancres (par-dessus). Sélectionnée/survolée = pleine + plus
    // grande ; au repos = pastille claire cerclée d'accent (pattern ADSR).
    for (let i = 0; i < pts.length; i++) {
      const px = M + (pts[i].x / RESOLUTION) * innerW
      const py = valueToY(pts[i].y)
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
    drawStateRef.current = {
      curve: liveCurve, anchors: liveAnchors, selectedIdx, hoverIdx,
      bg: normalizedBg, sp: showSplinePerfect ? splinePerfect : null,
    }
    draw()
  }, [draw, liveCurve, liveAnchors, selectedIdx, hoverIdx, normalizedBg, showSplinePerfect, splinePerfect])

  // M.r.5.bis.1 — transition douce du zoom Y (cf. WaveformEditor) : lerp
  // `peakDisplayed` vers la cible dans une boucle rAF, repeint à chaque frame.
  useEffect(() => {
    if (Math.abs(peakTarget - peakDisplayedRef.current) < 0.01) {
      peakDisplayedRef.current = peakTarget
      return
    }
    let raf = 0
    const tick = () => {
      const cur = peakDisplayedRef.current
      const next = cur + (peakTarget - cur) * 0.15
      peakDisplayedRef.current = Math.abs(peakTarget - next) < 0.01 ? peakTarget : next
      draw()
      if (peakDisplayedRef.current !== peakTarget) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [peakTarget, draw])

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
    // M.r.5.bis — mapping insetté de DRAW_MARGIN (cohérent avec draw) : extrêmes
    // atteints à M px du bord, bande tampon avant le mouseleave.
    const M = DRAW_MARGIN
    const xPct = Math.max(0, Math.min(0.9999, (e.clientX - rect.left - M) / (rect.width - 2 * M)))
    const yFrac = Math.max(0, Math.min(1, (e.clientY - rect.top - M) / (rect.height - 2 * M)))
    // M.r.5.bis.1 — l'échelle d'affichage est [-peak, +peak] ; on dé-projette via
    // peak puis on clampe à ±1 (domaine des ancres, MOVE/ADD_SPLINE_ANCHOR borne
    // y à [-1, 1] côté reducer).
    const peak = peakDisplayedRef.current
    return {
      x: xPct * RESOLUTION,
      y: Math.max(-1, Math.min(1, -(yFrac * 2 - 1) * peak)),
    }
  }
  const hitTest = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const peak = peakDisplayedRef.current
    const M = DRAW_MARGIN
    const innerW = rect.width - 2 * M
    const innerH = rect.height - 2 * M
    let picked = null
    let minDist = HANDLE_HIT_RADIUS
    for (let i = 0; i < liveAnchors.length; i++) {
      const px = M + (liveAnchors[i].x / RESOLUTION) * innerW
      const py = (rect.height / 2) - (liveAnchors[i].y / peak) * (innerH / 2)
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
        {/* iter-M phase-r.2.4 : le switch Libre/Ancres + le toggle
            Doux/Anguleux + le nombre d'ancres sont remontés dans WaveformEditor
            (header partagé) et passés ici via `headerControls`. */}
        <div className="spline-header-controls">
          {headerControls}
        </div>
      </header>
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
        {/* M.r.5.bis.1 — bornes ±1 portées par le marqueur canvas (suit l'auto-fit
            Y) ; seul le « 0 » médian reste un label DOM fixe. */}
        <span className="label middle">0</span>
        {/* Hint d'usage en overlay bas du canvas (comme la légende, mais en bas). */}
        <span className="spline-hint">{STRINGS.editor.splineAddHint}</span>
        {(normalizedBg || showSplinePerfect) && (
          <NormalizeLegend showNormalized={!!normalizedBg} showSpline={showSplinePerfect} />
        )}
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
