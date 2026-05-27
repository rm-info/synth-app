import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { SHORTCUTS, getAnchor } from '../lib/shortcuts'
import { getAnchoredPosition, getAnchoredKeyPositions } from '../lib/getAnchoredPosition'
import { getKeyboardMap, getTuningSystem } from '../lib/tuningSystems'
import { xEdoShiftedKeyboardMapForN } from '../lib/xEdoLayouts'
import './ShortcutsOverlay.css'

// Décodeur QWERTY pour les composite per-key (touches notes Designer).
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

// Estimation naturelle de la largeur du texte à font 0.85rem (≈ 13.6px).
// ~7.5 px par caractère + petite marge (padding interne minimal).
const NATURAL_CHAR_W = 7.5
const TEXT_PADDING_X = 4
function estimateTextWidth(display) {
  return Math.max(8, (display?.length ?? 1) * NATURAL_CHAR_W)
}

// Calcule le couple (textScale, hoverScale) pour qu'un libellé tienne dans
// un rect donné, et que le hover restaure ~la taille naturelle.
//   textScale  = facteur de réduction du texte pour qu'il tienne dans le rect
//   hoverScale = facteur d'agrandissement de la boîte au survol
// Caps de sécurité : hoverScale ∈ [1.5, 5] pour éviter les explosions sur
// les ancres minuscules (clip ghost étroit) ou les emphases excessives sur
// les ancres déjà larges.
function computeFitScales(rect, display) {
  const naturalW = estimateTextWidth(display)
  const targetW = Math.max(1, rect.width - TEXT_PADDING_X * 2)
  const textScale = Math.min(1, targetW / naturalW)
  const hoverScale = Math.min(5, Math.max(1.5, 1 / textScale))
  return { textScale, hoverScale }
}

// Composant overlay "lever le voile" (iter-L phase 1.5, révisé post-feedback).
// Chaque libellé occupe exactement le rect de son ancre via data-anchor.
// Texte réduit (scale CSS) pour tenir dans la boîte ; au survol, la boîte
// elle-même scale → texte à taille naturelle, lisible. Pas de collision
// possible par construction (les boîtes ne dépassent jamais leur ancre).
function ShortcutsOverlay({ isOpen, onClose, state }) {
  const [, force] = useState(0)
  const rerender = useCallback(() => force((n) => n + 1), [])

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', rerender)
    window.addEventListener('scroll', rerender, true)
    return () => {
      window.removeEventListener('resize', rerender)
      window.removeEventListener('scroll', rerender, true)
    }
  }, [isOpen, rerender])

  useEffect(() => {
    if (!isOpen) return
    const t = requestAnimationFrame(rerender)
    return () => cancelAnimationFrame(t)
  }, [isOpen, rerender])

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
  // Entrées visibles : contexte actif + global, filtre condition.
  const visible = SHORTCUTS.filter((s) => {
    const ctxMatch = s.contexts.includes('global') || s.contexts.includes(activeTab)
    if (!ctxMatch) return false
    if (s.condition && !s.condition(state)) return false
    return true
  })

  // Groupe par anchor id, hors composite 'per-key' (designer-notes rendu par
  // touche, plus bas). composer-notes-contiguous (composite 'live') est
  // inclus comme une entrée régulière, son display textuel "touches notes"
  // s'ajoute à la combinaison sur composer-anchor-clip.
  const groups = new Map()
  for (const s of visible) {
    if (s.composite === 'per-key') continue
    const anchorId = getAnchor(s, state)
    if (!anchorId) continue
    if (!groups.has(anchorId)) groups.set(anchorId, [])
    groups.get(anchorId).push(s)
  }

  const labels = []
  for (const [anchorId, items] of groups.entries()) {
    const pos = getAnchoredPosition(anchorId)
    if (!pos.found) continue
    const display = items.map((s) => s.keys.display).filter(Boolean).join(' / ')
    if (!display) continue
    labels.push({ key: anchorId, display, rect: pos })
  }

  // Per-key composite : touches notes Designer. Loop sur le keyboardMap
  // du système actif, une étiquette mini par touche QWERTY mappée.
  const perKeyLabels = []
  if (activeTab === 'designer') {
    const hasDesignerNotes = visible.some((s) => s.id === 'designer-notes')
    if (hasDesignerNotes) {
      const sys = getTuningSystem(state.editor?.testTuningSystem ?? '12-TET')
      const xEdoN = state.xEdoN
      const useShift = state.editor?.testTuningSystem === 'x-edo' && xEdoN >= 44
      const keyboardMap = useShift
        ? xEdoShiftedKeyboardMapForN(xEdoN)
        : getKeyboardMap(sys, xEdoN)
      if (keyboardMap) {
        const positions = getAnchoredKeyPositions('designer-keyboard')
        for (const [code, idx] of Object.entries(keyboardMap)) {
          const p = positions[String(idx)]
          if (!p) continue
          perKeyLabels.push({
            key: `designer-notes-${code}`,
            display: keyCodeLabel(code),
            rect: p,
          })
        }
      }
    }
  }

  // Fallback bandeau quand composer-notes-contiguous a une ancre dynamique
  // introuvable (pas de lastAnchorClipId → pas de ghost rendu → pas
  // d'élément data-anchor="composer-anchor-clip"). Hint pédagogique pour
  // l'utilisateur qui ouvre l'overlay sans avoir interagi avec un clip.
  let banner = null
  if (activeTab === 'composer') {
    const cnc = visible.find((s) => s.id === 'composer-notes-contiguous')
    if (cnc) {
      const pos = getAnchoredPosition(getAnchor(cnc, state))
      if (!pos.found) {
        banner = "touches notes = placement contigu (clique d'abord sur un clip pour amorcer)"
      }
    }
  }

  const allLabels = [...labels, ...perKeyLabels]

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
      {banner && (
        <div className="shortcuts-overlay-banner" role="status">{banner}</div>
      )}
      {allLabels.map(({ key, display, rect }) => {
        const { textScale, hoverScale } = computeFitScales(rect, display)
        return (
          <div
            key={key}
            className="shortcuts-overlay-fit"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              '--text-scale': textScale,
              '--hover-scale': hoverScale,
            }}
            onClick={(e) => { e.stopPropagation(); onClose?.() }}
          >
            <span className="shortcuts-overlay-fit-text">{display}</span>
          </div>
        )
      })}
    </div>
  )
}

export default ShortcutsOverlay
