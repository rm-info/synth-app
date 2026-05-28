import { useEffect, useState, useCallback, useLayoutEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getAnchoredPosition } from '../lib/getAnchoredPosition'
import { getTour, TOUR_TABS } from '../lib/tours'
import { DOC_TOC } from '../docs/index.js'
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
  // Navigation courante exposée au handler clavier (qui reste abonné une seule
  // fois) : évite de capturer un `currentPos` périmé dans la closure.
  const navRef = useRef({ goPrev: () => {}, goNext: () => {} })
  const [bubbleSize, setBubbleSize] = useState(BUBBLE_FALLBACK)
  // Panneau de fin (chaînage) : présentationnel. On mémorise l'étape sur
  // laquelle « Suivant » a basculé en mode fin ; `atEnd` en est dérivé, donc
  // un changement d'étape/onglet le désactive automatiquement (pas d'effet).
  const [endKey, setEndKey] = useState(null)

  const { active, tabId, stepIndex } = tour
  const steps = getTour(tabId)
  const rawStep = steps[stepIndex]
  const anchorFound = active && rawStep ? getAnchoredPosition(rawStep.anchor).found : false

  const currentKey = `${tabId}:${stepIndex}`
  const atEnd = endKey === currentKey

  // Séquence effective (étapes disponibles) → progress bar + navigation.
  const availableSteps = active && rawStep
    ? steps.map((s, i) => ({ step: s, rawIndex: i })).filter(({ step }) => isStepAvailable(step))
    : []
  const currentPos = availableSteps.findIndex((s) => s.rawIndex === stepIndex)
  const isFirst = currentPos <= 0

  const goPrev = () => {
    if (currentPos > 0) {
      dispatch({ type: 'TOUR_GOTO', payload: availableSteps[currentPos - 1].rawIndex })
    }
  }
  const goNext = () => {
    if (currentPos < 0) return
    if (currentPos < availableSteps.length - 1) {
      dispatch({ type: 'TOUR_GOTO', payload: availableSteps[currentPos + 1].rawIndex })
    } else {
      // Dernière étape → panneau de chaînage de fin de tour.
      setEndKey(currentKey)
    }
  }

  // Sync de la navigation vers la ref lue par le handler clavier (hors render).
  useEffect(() => { navRef.current = { goPrev, goNext } })

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

  // Gel clavier + navigation. Capture phase impératif pour devancer les
  // handlers métier (notes, Ctrl+C/V…) et l'overlay raccourcis : pendant le
  // tour aucune frappe ne doit atteindre l'app. Esc quitte (END_TOUR), ←/→
  // naviguent entre étapes, tout le reste est absorbé. Les modificateurs
  // seuls passent (ne rien casser si l'utilisateur tient Ctrl/Shift).
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
      else if (e.key === 'ArrowRight') navRef.current.goNext()
      else if (e.key === 'ArrowLeft') navRef.current.goPrev()
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
  }, [stepIndex, tabId, anchorFound, atEnd])

  if (!active || !rawStep) return null

  // « En savoir plus » : visible si l'étape référence un article existant.
  const articleId = rawStep.article
  const hasArticle = !!articleId && DOC_TOC.some((e) => e.id === articleId)
  const goToArticle = () => {
    dispatch({ type: 'END_TOUR_NO_RESTORE' })
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'documentation' })
    dispatch({ type: 'SET_CURRENT_ARTICLE', payload: articleId })
  }

  // Onglets proposés au chaînage (tous sauf celui en cours).
  const chainTabs = TOUR_TABS.filter((t) => t.id !== tabId)

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
          {atEnd ? (
            <div className="tour-end">
              <h3 className="tour-bubble-title">Visite terminée</h3>
              <p className="tour-bubble-text">Continuer la visite vers un autre onglet ?</p>
              <div className="tour-end-options">
                {chainTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="tour-nav-btn"
                    onClick={() => dispatch({ type: 'TOUR_CHAIN', payload: t.id })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="tour-nav-btn tour-end-quit"
                onClick={() => dispatch({ type: 'END_TOUR' })}
              >
                Quitter (Échap)
              </button>
            </div>
          ) : (
            <>
              <div className="tour-bubble-body">
                <h3 className="tour-bubble-title">{rawStep.title}</h3>
                <p className="tour-bubble-text">{rawStep.body}</p>
                {hasArticle && (
                  <button type="button" className="tour-learn-more" onClick={goToArticle}>
                    En savoir plus →
                  </button>
                )}
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
                  >
                    Suivant <ChevronRight size={15} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Tour
