import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { SHORTCUTS, getAnchor } from '../lib/shortcuts'
import { getAnchoredPosition, getAnchoredKeyPositions } from '../lib/getAnchoredPosition'
import { getKeyboardMap, getTuningSystem } from '../lib/tuningSystems'
import { xEdoShiftedKeyboardMapForN } from '../lib/xEdoLayouts'
import './ShortcutsOverlay.css'

// Transforme un libellé "Ctrl+Shift+Z" en forme compacte "⌃⇧Z" pour le
// rendering overlay. La table SHORTCUTS garde la forme verbose pour la
// future page Documentation (lisibilité hors-contexte). Symboles
// conventionnels macOS — reconnus universellement par les apps modernes
// (Figma, VSCode, Notion, etc.).
const COMPACT_MODIFIERS = [
  [/Ctrl\+/g, '⌃'],
  [/Cmd\+/g, '⌘'],
  [/Alt\+/g, '⌥'],
  [/Shift\+/g, '⇧'],
]
function compactDisplay(display) {
  if (!display) return display
  // Les libellés composite genre "(touches du clavier)" ou "— mapping live —"
  // restent intacts (ils ne suivent pas la forme Modifier+Key).
  if (display.startsWith('(') || display.startsWith('—')) return display
  let out = display
  for (const [re, sym] of COMPACT_MODIFIERS) out = out.replace(re, sym)
  return out
}

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

// --- Smart placement 4-quadrants pour les étiquettes ancre ---
// Estimation grossière de la boîte d'une étiquette : largeur ≈ 7.5 px par
// caractère (font 0.72rem, padding 8px chaque côté), hauteur fixe 22 px
// (line-height + padding 3px haut/bas). Pré-calcul pour collision check
// sans double-render. Imprécis sur les fonts non monospace, mais suffisant
// pour le clustering qui nous intéresse (la zone est sur-estimée).
function estimateLabelSize(display) {
  const len = display ? display.length : 0
  return { w: Math.max(28, len * 7.5 + 16), h: 22 }
}

// Calcule la boîte candidate pour une direction donnée autour de l'ancre.
const PLACEMENT_MARGIN = 6
function candidateRect(anchorRect, labelSize, direction) {
  switch (direction) {
    case 'above':
      return {
        left: anchorRect.left + anchorRect.width / 2 - labelSize.w / 2,
        top: anchorRect.top - labelSize.h - PLACEMENT_MARGIN,
        w: labelSize.w,
        h: labelSize.h,
      }
    case 'below':
      return {
        left: anchorRect.left + anchorRect.width / 2 - labelSize.w / 2,
        top: anchorRect.top + anchorRect.height + PLACEMENT_MARGIN,
        w: labelSize.w,
        h: labelSize.h,
      }
    case 'right':
      return {
        left: anchorRect.left + anchorRect.width + PLACEMENT_MARGIN,
        top: anchorRect.top + anchorRect.height / 2 - labelSize.h / 2,
        w: labelSize.w,
        h: labelSize.h,
      }
    case 'left':
      return {
        left: anchorRect.left - labelSize.w - PLACEMENT_MARGIN,
        top: anchorRect.top + anchorRect.height / 2 - labelSize.h / 2,
        w: labelSize.w,
        h: labelSize.h,
      }
    default:
      return null
  }
}

function rectsOverlap(a, b) {
  return !(a.left + a.w <= b.left || b.left + b.w <= a.left
        || a.top + a.h <= b.top || b.top + b.h <= a.top)
}

function inViewport(r) {
  return r.left >= 4 && r.top >= 4
      && r.left + r.w <= window.innerWidth - 4
      && r.top + r.h <= window.innerHeight - 4
}

// Décide la position finale de l'étiquette en testant 4 directions.
// Ordre de priorité : above → below → right → left. Pour chaque direction,
// rejette si hors viewport OU collision avec une étiquette déjà placée.
// Fallback : empile sous la dernière étiquette en collision, sortant
// du viewport au besoin (mieux que rien).
function pickPlacement(anchorRect, labelSize, placedRects) {
  const directions = ['above', 'below', 'right', 'left']
  for (const d of directions) {
    const cand = candidateRect(anchorRect, labelSize, d)
    if (!cand) continue
    if (!inViewport(cand)) continue
    if (placedRects.some((r) => rectsOverlap(cand, r))) continue
    return { rect: cand, direction: d }
  }
  // Fallback : prend `above` même si hors viewport ; décale en Y tant qu'il
  // y a collision. Limite à 6 stacks pour éviter la dérive infinie.
  const base = candidateRect(anchorRect, labelSize, 'above')
  for (let i = 0; i < 6; i++) {
    if (!placedRects.some((r) => rectsOverlap(base, r))) break
    base.top -= (labelSize.h + 2)
  }
  return { rect: base, direction: 'above-stacked' }
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
    const display = items.map((s) => compactDisplay(s.keys.display)).filter(Boolean).join(' / ')
    positioned.push({ key: anchorId, display, pos })
  }

  // Smart placement : pour chaque étiquette, choisit la première position
  // 4-quadrants sans collision (above → below → right → left). Fallback
  // empilement vertical si zone trop dense.
  const placedRects = []
  const placedLabels = []
  // Ordre stable des items pour que le placement soit déterministe :
  // priorité aux ancres avec le rect le plus haut (top le plus petit) pour
  // que les "above" du haut ne soient pas perturbés par ceux du bas.
  const ordered = [...positioned].sort((a, b) => a.pos.top - b.pos.top)
  for (const item of ordered) {
    const size = estimateLabelSize(item.display)
    const { rect, direction } = pickPlacement(item.pos, size, placedRects)
    placedRects.push(rect)
    placedLabels.push({ ...item, rect, direction })
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
      {placedLabels.map(({ key, display, rect }) => (
        <div
          key={key}
          className="shortcuts-overlay-label"
          style={{ top: rect.top, left: rect.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <kbd>{display}</kbd>
        </div>
      ))}
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
