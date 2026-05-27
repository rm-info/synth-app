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

// Mesure réelle de la largeur d'un texte via canvas, en matchant la font
// de .shortcuts-overlay-fit-text (bold 0.85rem ≈ 13.6px, system-ui).
// Plus fiable qu'une estimation char-count (les majuscules P/U/D/W sont
// très larges, les chiffres et lettres minces le sont beaucoup moins).
// Singleton de contexte 2d (canvas off-DOM) pour éviter recréation.
let _measureCtx = null
function getMeasureCtx() {
  if (!_measureCtx) {
    _measureCtx = document.createElement('canvas').getContext('2d')
  }
  // Mesure dans la font effective. 13.6px ≈ 0.85rem à root-em=16px (défaut
  // navigateur). Les variations à 14/15px (utilisateurs ayant ajusté leur
  // taille de police par défaut) introduisent une sur/sous-mesure de
  // ~5-10%, marge absorbée par TEXT_PADDING_X et le cap hoverScale.
  _measureCtx.font = '700 13.6px system-ui, -apple-system, sans-serif'
  return _measureCtx
}
function measureTextWidth(display) {
  if (!display) return 8
  return getMeasureCtx().measureText(display).width
}

// Padding interne (gauche + droite) déduit de la largeur disponible avant
// scale. 8px de chaque côté pour respirer un peu sans coller au bord.
const TEXT_PADDING_X = 8

// Calcule (textScale, hoverScale) pour qu'un libellé tienne dans un rect
// donné, le hover restaurant ~la taille naturelle.
function computeFitScales(rect, display) {
  const naturalW = Math.max(8, measureTextWidth(display))
  const targetW = Math.max(1, rect.width - TEXT_PADDING_X * 2)
  const textScale = Math.min(1, targetW / naturalW)
  const hoverScale = Math.min(5, Math.max(1.5, 1 / textScale))
  return { textScale, hoverScale }
}

// Calcule transform-origin pour le hover scale de façon que la boîte
// zoomée ne sorte pas du viewport. Si le centre du bouton est à moins
// de half-expanded-size du bord, on bascule l'origine vers ce bord —
// la boîte s'étend alors uniquement vers l'intérieur de l'écran.
const EDGE_MARGIN = 8
function computeTransformOrigin(rect, hoverScale) {
  const expandedHalfW = (rect.width * hoverScale) / 2
  const expandedHalfH = (rect.height * hoverScale) / 2
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const vw = window.innerWidth
  const vh = window.innerHeight

  let originX = 'center'
  if (centerX - expandedHalfW < EDGE_MARGIN) originX = 'left'
  else if (centerX + expandedHalfW > vw - EDGE_MARGIN) originX = 'right'

  let originY = 'center'
  if (centerY - expandedHalfH < EDGE_MARGIN) originY = 'top'
  else if (centerY + expandedHalfH > vh - EDGE_MARGIN) originY = 'bottom'

  return `${originX} ${originY}`
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
    // Détection raccourci inactif : si l'élément ancre est un bouton avec
    // attribut `disabled`, on grise l'étiquette. Source de vérité = DOM
    // (évite de dupliquer dans shortcuts.js des conditions complexes
    // comme canMerge / canSplit / canUndo).
    const isDisabled = pos.element?.disabled === true
      || pos.element?.getAttribute?.('aria-disabled') === 'true'
    labels.push({ key: anchorId, display, rect: pos, disabled: isDisabled })
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
      {allLabels.map(({ key, display, rect, disabled }) => {
        const { textScale, hoverScale } = computeFitScales(rect, display)
        const transformOrigin = computeTransformOrigin(rect, hoverScale)
        return (
          <div
            key={key}
            className={`shortcuts-overlay-fit${disabled ? ' is-disabled' : ''}`}
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              transformOrigin,
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
