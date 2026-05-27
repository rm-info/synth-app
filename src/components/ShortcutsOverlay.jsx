import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { SHORTCUTS, getAnchor } from '../lib/shortcuts'
import { getAnchoredPosition, getAnchoredKeyPositions } from '../lib/getAnchoredPosition'
import { getKeyboardMap, getTuningSystem } from '../lib/tuningSystems'
import { xEdoShiftedKeyboardMapForN } from '../lib/xEdoLayouts'
import './ShortcutsOverlay.css'

// Petit décodeur QWERTY pour les composite "touches notes Designer".
// Suffit pour les codes effectivement présents dans les mappings courants.
function keyCodeLabel(code) {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return `N${code.slice(6)}`
  const SPECIAL = {
    Slash: '/', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Quote: "'", Backquote: '`', Comma: ',', Period: '.', Semicolon: ';',
    Minus: '-', Equal: '=', Space: '⎵',
  }
  return SPECIAL[code] ?? code
}

// Composant overlay "lever le voile" (iter-L phase 1.5). Couche transparente
// plein écran ; étiquettes flottantes positionnées via data-anchor → rect
// viewport. Hors-scope L.1 : algo sophistiqué d'anti-collision (le naturel
// suffit pour ce premier jet). Composite : touches notes Designer rendues
// par touche du clavier visuel ; touche contigu Composer rendue sur le
// halo anchor (ou en fallback haut-gauche si pas d'ancre).
function ShortcutsOverlay({ isOpen, onClose, state }) {
  const [, force] = useState(0)
  const rerender = useCallback(() => force((n) => n + 1), [])

  // Re-render au resize / scroll pour suivre les éléments qui bougent.
  // Capture-phase pour le scroll afin de capter les scrolls nested
  // (sidebar Bibliothèque, timeline, etc.).
  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', rerender)
    window.addEventListener('scroll', rerender, true)
    return () => {
      window.removeEventListener('resize', rerender)
      window.removeEventListener('scroll', rerender, true)
    }
  }, [isOpen, rerender])

  // Premier rendu après mount : un tick pour que les data-anchor cibles
  // soient présents dans le DOM (cas d'ouverture rapide via Ctrl+K avant
  // que React n'ait commit les éléments dépendants).
  useEffect(() => {
    if (!isOpen) return
    const t = requestAnimationFrame(rerender)
    return () => cancelAnimationFrame(t)
  }, [isOpen, rerender])

  // Esc → fermeture (priorité capture pour devancer les listeners
  // métier — typiquement Esc-clipboard Bibliothèque).
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const activeTab = state.activeTab
  // Sélectionne les entrées du contexte actif + global ; applique condition.
  const visible = SHORTCUTS.filter((s) => {
    const ctxMatch = s.contexts.includes('global') || s.contexts.includes(activeTab)
    if (!ctxMatch) return false
    if (s.condition && !s.condition(state)) return false
    return true
  })

  // Groupe par anchor id pour combiner plusieurs raccourcis sur la même
  // ancre (ex. ↑↓ + Shift+↑↓ sur composer-anchor-clip).
  const groups = new Map()
  for (const s of visible) {
    if (s.composite) continue
    const anchorId = getAnchor(s, state)
    if (!anchorId) continue
    if (!groups.has(anchorId)) groups.set(anchorId, [])
    groups.get(anchorId).push(s)
  }

  const positioned = []
  for (const [anchorId, items] of groups.entries()) {
    const pos = getAnchoredPosition(anchorId)
    if (!pos.found) continue
    const display = items.map((s) => s.keys.display).filter(Boolean).join(' / ')
    positioned.push({ key: anchorId, display, pos })
  }

  // Composite : touches notes Designer (mapping live).
  const compositeLabels = []
  for (const s of visible.filter((x) => x.composite)) {
    if (s.id === 'designer-notes' && activeTab === 'designer') {
      const sys = getTuningSystem(state.editor?.testTuningSystem ?? '12-TET')
      const xEdoN = state.xEdoN
      const useShift = state.editor?.testTuningSystem === 'x-edo' && xEdoN >= 44
      const keyboardMap = useShift
        ? xEdoShiftedKeyboardMapForN(xEdoN)
        : getKeyboardMap(sys, xEdoN)
      const positions = getAnchoredKeyPositions('designer-keyboard')
      if (keyboardMap) {
        for (const [code, idx] of Object.entries(keyboardMap)) {
          const p = positions[String(idx)]
          if (!p) continue
          compositeLabels.push({
            key: `designer-notes-${code}`,
            display: keyCodeLabel(code),
            pos: p,
            small: true,
          })
        }
      }
    } else if (s.id === 'composer-notes-contiguous' && activeTab === 'composer') {
      const pos = getAnchoredPosition('composer-anchor-clip')
      if (pos.found) {
        positioned.push({
          key: 'composer-notes-contiguous',
          display: 'touches notes = placement contigu',
          pos,
        })
      } else {
        // Pas d'ancre : libellé en bandeau supérieur explicatif.
        compositeLabels.push({
          key: 'composer-notes-contiguous-fallback',
          display: 'touches notes = placement contigu (sélectionne un clip pour amorcer)',
          pos: { found: true, top: 60, left: window.innerWidth / 2, width: 0, height: 24 },
          fixed: true,
        })
      }
    }
  }

  return (
    <div
      className="shortcuts-overlay"
      role="dialog"
      aria-label="Raccourcis clavier"
      onClick={onClose}
    >
      <button
        type="button"
        className="shortcuts-overlay-close"
        onClick={onClose}
        aria-label="Fermer les raccourcis (Échap)"
        title="Fermer (Échap)"
      >
        <X size={20} strokeWidth={2.4} />
      </button>
      {positioned.map(({ key, display, pos }) => {
        // Au-dessus par défaut ; en-dessous si l'ancre est trop haute.
        const placeBelow = pos.top < 50
        const top = placeBelow ? pos.top + pos.height + 4 : pos.top - 26
        const left = pos.left + pos.width / 2
        return (
          <div
            key={key}
            className="shortcuts-overlay-label"
            style={{ top, left }}
            onClick={(e) => e.stopPropagation()}
          >
            <kbd>{display}</kbd>
          </div>
        )
      })}
      {compositeLabels.map(({ key, display, pos, small, fixed }) => {
        const top = fixed ? pos.top : pos.top + pos.height / 2
        const left = pos.left + pos.width / 2
        return (
          <div
            key={key}
            className={`shortcuts-overlay-label shortcuts-overlay-label-composite${small ? ' shortcuts-overlay-label-small' : ''}`}
            style={{ top, left }}
            onClick={(e) => e.stopPropagation()}
          >
            <kbd>{display}</kbd>
          </div>
        )
      })}
    </div>
  )
}

export default ShortcutsOverlay
