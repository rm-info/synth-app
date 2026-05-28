import { useEffect, useState, useCallback, useLayoutEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getAnchoredPosition } from '../lib/getAnchoredPosition'
import { getTour } from '../lib/tours'
import './Tour.css'

// src/components/Tour.jsx — Moteur d'affichage du Tour guidé (iter-L phase-4).
// Troisième consommateur de getAnchoredPosition (après l'overlay raccourcis
// L.1.5 et highlightElement L.3). Rend, par-dessus l'app gelée :
//   - un blocker plein écran qui avale les événements (gel réel) ;
//   - un spotlight (box-shadow) qui assombrit tout sauf l'ancre courante ;
//   - une bulle ancrée (titre + body + compteur + navigation).
//
// Le « gel » est volontairement à deux couches : le box-shadow du spotlight
// ne capture aucun événement (et son trou serait pointer-events:none), donc
// c'est le blocker transparent qui empêche toute interaction avec l'app.

// Borne d'attente du montage différé (bascule d'onglet conditionnel,
// ouverture de sidebar). Aligné sur highlightElement (L.3).
const PROBE_MAX_MS = 800
// Marge lumineuse autour de l'ancre dans le spotlight.
const SPOTLIGHT_PAD = 8
// Écart bulle ↔ ancre, et marge de sécurité au bord du viewport.
const BUBBLE_GAP = 14
const VIEWPORT_MARGIN = 12
// Dimensions de repli avant la première mesure réelle de la bulle.
const BUBBLE_FALLBACK = { w: 320, h: 180 }

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// Ouvre la sidebar nommée si elle est repliée (no-op sinon). Les ids sont la
// convention du champ `sidebar` des déclarations de tours.
function openSidebarIfCollapsed(sidebarId, dispatch, collapse) {
  switch (sidebarId) {
    case 'designer':
      if (collapse.designer) dispatch({ type: 'SET_DESIGNER_SIDEBAR_COLLAPSED', payload: false })
      break
    case 'doc':
      if (collapse.doc) dispatch({ type: 'TOGGLE_DOC_SIDEBAR' })
      break
    case 'composer-bank':
      if (collapse.composerBank) dispatch({ type: 'SET_COMPOSER_SIDEBAR_COLLAPSED', payload: { side: 'bank', collapsed: false } })
      break
    case 'composer-aside':
      if (collapse.composerAside) dispatch({ type: 'SET_COMPOSER_SIDEBAR_COLLAPSED', payload: { side: 'aside', collapsed: false } })
      break
    default:
      break
  }
}

// Disponibilité statique d'une étape : pilote la progress bar et la
// navigation Précédent/Suivant. Une étape est disponible si son ancre existe
// dans le DOM, OU si elle déclare une sidebar (qu'on saura déplier pour la
// révéler). Les ancres absentes sans sidebar (clip témoin inexistant,
// presse-papier vide, bouton conditionnel) sont silencieusement omises.
function isStepAvailable(step) {
  if (step.sidebar) return true
  return !!document.querySelector(`[data-anchor="${step.anchor}"]`)
}

// Place la bulle près de l'ancre : dessous si la place le permet, sinon
// dessus, sinon centrée verticalement à côté. Clampée au viewport.
function placeBubble(rect, bubbleW, bubbleH) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const below = rect.top + rect.height + BUBBLE_GAP
  const above = rect.top - BUBBLE_GAP - bubbleH

  let top
  if (below + bubbleH <= vh - VIEWPORT_MARGIN) {
    top = below
  } else if (above >= VIEWPORT_MARGIN) {
    top = above
  } else {
    top = clamp(rect.top + rect.height / 2 - bubbleH / 2, VIEWPORT_MARGIN, vh - VIEWPORT_MARGIN - bubbleH)
  }
  const left = clamp(
    rect.left + rect.width / 2 - bubbleW / 2,
    VIEWPORT_MARGIN,
    vw - VIEWPORT_MARGIN - bubbleW,
  )
  return { top, left }
}

function Tour({
  tour,
  dispatch,
  designerSidebarCollapsed,
  docSidebarCollapsed,
  composerBankCollapsed,
  composerAsideCollapsed,
}) {
  const [, force] = useState(0)
  const rerender = useCallback(() => force((n) => n + 1), [])
  const bubbleRef = useRef(null)
  const sizeRef = useRef(BUBBLE_FALLBACK)
  const [bubbleSize, setBubbleSize] = useState(BUBBLE_FALLBACK)

  const { active, tabId, stepIndex } = tour
  const steps = getTour(tabId)
  const rawStep = steps[stepIndex]
  const anchorFound = active && rawStep ? getAnchoredPosition(rawStep.anchor).found : false

  // Reposition au resize/scroll (l'ancre peut bouger). Pattern overlay L.1.5.
  useEffect(() => {
    if (!active) return
    window.addEventListener('resize', rerender)
    window.addEventListener('scroll', rerender, true)
    return () => {
      window.removeEventListener('resize', rerender)
      window.removeEventListener('scroll', rerender, true)
    }
  }, [active, rerender])

  // Gel clavier + sortie ESC. Capture phase impératif pour devancer les
  // handlers métier (notes, Ctrl+C/V…) et l'overlay raccourcis : pendant le
  // tour aucune frappe ne doit atteindre l'app. Esc quitte (END_TOUR), tout
  // le reste est absorbé. Les modificateurs seuls passent (ne rien casser si
  // l'utilisateur tient Ctrl/Shift).
  useEffect(() => {
    if (!active) return
    const onKeyDown = (e) => {
      const isModifierOnly = e.key === 'Shift' || e.key === 'Control'
        || e.key === 'Alt' || e.key === 'Meta' || e.key === 'AltGraph'
      if (isModifierOnly) return
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation?.()
      if (e.key === 'Escape') dispatch({ type: 'END_TOUR' })
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active, dispatch])

  // Résolution de l'ancre courante : ouvre la sidebar si besoin, puis sonde le
  // DOM en RAF borné jusqu'à ce que l'ancre soit visible (montage différé). On
  // re-render à chaque frame tant que ce n'est pas résolu, pour refléter la
  // position dès qu'elle apparaît.
  useEffect(() => {
    if (!active || !rawStep) return
    if (rawStep.sidebar) {
      openSidebarIfCollapsed(rawStep.sidebar, dispatch, {
        designer: designerSidebarCollapsed,
        doc: docSidebarCollapsed,
        composerBank: composerBankCollapsed,
        composerAside: composerAsideCollapsed,
      })
    }
    let raf
    let startTs = null
    // requestAnimationFrame fournit un timestamp haute résolution en argument :
    // on s'en sert pour borner l'attente sans appeler performance.now().
    const probe = (ts) => {
      if (startTs === null) startTs = ts
      const pos = getAnchoredPosition(rawStep.anchor)
      rerender()
      if (pos.found) return
      if (ts - startTs < PROBE_MAX_MS) raf = requestAnimationFrame(probe)
    }
    raf = requestAnimationFrame(probe)
    return () => cancelAnimationFrame(raf)
  }, [
    active, tabId, stepIndex, rawStep,
    designerSidebarCollapsed, docSidebarCollapsed,
    composerBankCollapsed, composerAsideCollapsed,
    dispatch, rerender,
  ])

  // Mesure réelle de la bulle pour un placement correct (la hauteur dépend de
  // la longueur du body). Déclenchée au changement d'étape et quand l'ancre
  // devient résolue (la bulle n'est montée qu'à ce moment). Compare via une
  // ref pour ne mettre à jour le state que si la taille change réellement.
  useLayoutEffect(() => {
    const el = bubbleRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (Math.abs(r.width - sizeRef.current.w) > 1 || Math.abs(r.height - sizeRef.current.h) > 1) {
      sizeRef.current = { w: r.width, h: r.height }
      setBubbleSize(sizeRef.current)
    }
  }, [stepIndex, tabId, anchorFound])

  if (!active || !rawStep) return null

  // Séquence effective (étapes disponibles) → progress bar + navigation.
  const availableSteps = steps
    .map((s, i) => ({ step: s, rawIndex: i }))
    .filter(({ step }) => isStepAvailable(step))
  const currentPos = availableSteps.findIndex((s) => s.rawIndex === stepIndex)
  const isLast = currentPos >= 0 && currentPos === availableSteps.length - 1
  const isFirst = currentPos <= 0

  const goPrev = () => {
    if (currentPos > 0) {
      dispatch({ type: 'TOUR_GOTO', payload: availableSteps[currentPos - 1].rawIndex })
    }
  }
  const goNext = () => {
    if (currentPos >= 0 && currentPos < availableSteps.length - 1) {
      dispatch({ type: 'TOUR_GOTO', payload: availableSteps[currentPos + 1].rawIndex })
    }
  }

  const pos = getAnchoredPosition(rawStep.anchor)
  const bubble = pos.found ? placeBubble(pos, bubbleSize.w, bubbleSize.h) : null
  const counter = currentPos >= 0
    ? `${currentPos + 1} / ${availableSteps.length}`
    : ''

  // Progress bar superposée sur la zone des onglets (masquée pendant le tour).
  const tabsZone = getAnchoredPosition('header-tabs-zone')

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Visite guidée">
      {/* Blocker plein écran : gèle l'app (avale clic + molette). */}
      <div
        className="tour-blocker"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        onWheel={(e) => { e.preventDefault() }}
      />

      {tabsZone.found && availableSteps.length > 0 && (
        <div
          className="tour-progress"
          role="tablist"
          aria-label="Étapes de la visite"
          style={{
            top: tabsZone.top,
            left: tabsZone.left,
            width: tabsZone.width,
            height: tabsZone.height,
          }}
        >
          {availableSteps.map((s, i) => (
            <button
              key={s.rawIndex}
              type="button"
              role="tab"
              aria-selected={i === currentPos}
              className={`tour-progress-seg${i === currentPos ? ' is-current' : ''}${i < currentPos ? ' is-done' : ''}`}
              onClick={() => dispatch({ type: 'TOUR_GOTO', payload: s.rawIndex })}
              title={`${i + 1}. ${s.step.title}`}
              aria-label={`Étape ${i + 1} sur ${availableSteps.length} : ${s.step.title}`}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        className="tour-close"
        onClick={() => dispatch({ type: 'END_TOUR' })}
        aria-label="Quitter la visite guidée (Échap)"
        title="Quitter (Échap)"
      >
        <X size={20} strokeWidth={2.4} />
      </button>

      {pos.found && (
        <div
          className="tour-spotlight"
          style={{
            top: pos.top - SPOTLIGHT_PAD,
            left: pos.left - SPOTLIGHT_PAD,
            width: pos.width + SPOTLIGHT_PAD * 2,
            height: pos.height + SPOTLIGHT_PAD * 2,
          }}
        />
      )}

      {bubble && (
        <div
          ref={bubbleRef}
          className="tour-bubble"
          style={{ top: bubble.top, left: bubble.left }}
        >
          <div className="tour-bubble-body">
            <h3 className="tour-bubble-title">{rawStep.title}</h3>
            <p className="tour-bubble-text">{rawStep.body}</p>
          </div>
          <div className="tour-bubble-footer">
            <span className="tour-bubble-counter">{counter}</span>
            <div className="tour-bubble-nav">
              <button
                type="button"
                className="tour-nav-btn"
                onClick={goPrev}
                disabled={isFirst}
              >
                <ChevronLeft size={15} strokeWidth={2.2} /> Précédent
              </button>
              <button
                type="button"
                className="tour-nav-btn tour-nav-next"
                onClick={goNext}
                disabled={isLast}
              >
                Suivant <ChevronRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tour
