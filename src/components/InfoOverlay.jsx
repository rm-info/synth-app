import { useEffect, useState, useCallback } from 'react'
import { X, Info } from 'lucide-react'
import { DOC_TARGETS, getTargetAnchor, splitDocTarget } from '../lib/docTargets'
import { getAnchoredPosition } from '../lib/getAnchoredPosition'
import { matchesShortcut } from '../lib/shortcuts'
import { STRINGS } from '../lib/strings'
import './InfoOverlay.css'

// Marge (px) à partir d'un bord du viewport en deçà de laquelle un badge
// s'ancre sur ce bord et déploie son libellé vers l'INTÉRIEUR (au lieu de
// grandir symétriquement et déborder). ≳ demi-largeur d'une pastille déployée.
const EDGE_REGION = 140

// Mode « Documentation interactive » (Info / Ctrl+I, iter-U phase-2.2).
// Calqué sur ShortcutsOverlay : backdrop plein écran, badges positionnés sur
// les ancres via getAnchoredPosition. Différences : identité bleue (≠ jaune
// raccourcis), badges = vrais <button> (Tab/Entrée gratuits), clic = navigation
// vers le paragraphe doc dédié (navigateToDoc, machinerie U.1). Pas de mécanique
// rest→hover (un badge à taille naturelle centré sur l'ancre suffit ici).
function InfoOverlay({ isOpen, onClose, onNavigate, state }) {
  const [, force] = useState(0)
  const rerender = useCallback(() => force((n) => n + 1), [])

  // Repositionnement des badges sur resize / scroll (les ancres bougent).
  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', rerender)
    window.addEventListener('scroll', rerender, true)
    return () => {
      window.removeEventListener('resize', rerender)
      window.removeEventListener('scroll', rerender, true)
    }
  }, [isOpen, rerender])

  // Une frame après l'ouverture : les ancres sont montées/mesurables.
  useEffect(() => {
    if (!isOpen) return
    const t = requestAnimationFrame(rerender)
    return () => cancelAnimationFrame(t)
  }, [isOpen, rerender])

  // Fermeture clavier (capture, comme ShortcutsOverlay) : toute touche
  // non-modifier ferme, SAUF Ctrl+K (global-shortcuts) qu'on laisse buller
  // vers App → bascule vers le mode Raccourcis (le reducer ferme Info).
  // Ctrl+I, lui, n'est PAS exempté → il ferme (toggle).
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      const isModifierOnly = e.key === 'Shift' || e.key === 'Control'
        || e.key === 'Alt' || e.key === 'Meta' || e.key === 'AltGraph'
      if (isModifierOnly) return
      if (matchesShortcut(e, 'global-shortcuts')) return
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation?.()
      onClose?.()
    }
    const onKeyUp = (e) => {
      e.stopPropagation()
      e.stopImmediatePropagation?.()
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const activeTab = state.activeTab

  // Badges : entrées dont le contexte matche l'onglet actif ET dont l'ancre est
  // résolue visible. La visibilité conditionnelle (module replié, tiroir ⋯,
  // mobile) est déjà donnée par le filtre de getAnchoredPosition — rien à
  // réinventer. Plusieurs entrées peuvent viser le même paragraphe (ex. plusieurs
  // contrôles → une section) : ce sont des badges distincts, c'est voulu.
  const badges = []
  for (const entry of DOC_TARGETS) {
    if (!entry.contexts.includes(activeTab)) continue
    const anchorId = getTargetAnchor(entry, state)
    if (!anchorId) continue
    const pos = getAnchoredPosition(anchorId)
    if (!pos.found) continue
    badges.push({
      id: entry.id,
      label: entry.label,
      doc: entry.doc,
      cx: pos.left + pos.width / 2,
      cy: pos.top + pos.height / 2,
    })
  }

  const handleBadgeClick = (e, doc) => {
    e.stopPropagation()
    onClose?.()
    const [articleId, fragment] = splitDocTarget(doc)
    onNavigate?.(articleId, fragment)
  }

  // La pastille (icône au repos) est TOUJOURS centrée sur le contrôle : on fixe le
  // côté qui ne bouge pas et le CSS décale d'un demi-bouton pour que le centre de
  // l'icône tombe sur (cx, cy). Seul le SENS de déploiement du libellé au
  // survol/focus dépend de la proximité d'un bord — près du bord droit il s'ouvre
  // vers la gauche (le bouton grandit côté intérieur sans pousser l'icône),
  // ailleurs vers la droite. `EDGE_REGION` ne sert plus qu'à ce choix.
  const vw = window.innerWidth
  const placeBadge = (cx, cy) => {
    if (cx > vw - EDGE_REGION) return { dir: 'left', style: { right: `${vw - cx}px`, top: `${cy}px` } }
    return { dir: 'right', style: { left: `${cx}px`, top: `${cy}px` } }
  }

  return (
    <div
      className="info-overlay"
      role="dialog"
      aria-label="Documentation interactive"
      onClick={onClose}
    >
      <button
        type="button"
        className="info-overlay-close"
        onClick={onClose}
        aria-label="Fermer la documentation interactive (Échap)"
        title="Fermer (Échap)"
      >
        <X size={20} strokeWidth={2.4} />
      </button>

      {badges.length === 0 ? (
        <div className="info-overlay-empty" role="status">
          {STRINGS.infoMode.comingSoon}
        </div>
      ) : (
        badges.map(({ id, label, doc, cx, cy }) => {
          const { dir, style } = placeBadge(cx, cy)
          return (
            <button
              type="button"
              key={id}
              className={`info-overlay-badge info-overlay-badge--open-${dir}`}
              style={style}
              onClick={(e) => handleBadgeClick(e, doc)}
              aria-label={`Documentation : ${label}`}
              title={label}
            >
              <Info className="info-overlay-badge-icon" size={14} strokeWidth={2.2} aria-hidden="true" />
              <span className="info-overlay-badge-label">{label}</span>
            </button>
          )
        })
      )}
    </div>
  )
}

export default InfoOverlay
