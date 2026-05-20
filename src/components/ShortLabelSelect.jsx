import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import './ShortLabelSelect.css'

// iter G phase 2.3 / 2.8 : sélecteur custom — affiche un libellé court dans
// le trigger (densité visuelle, juste assez pour identifier l'option
// active) et le libellé complet dans la liste ouverte (lisibilité au
// moment du choix).
//
// Pourquoi pas un <select> natif : impossible d'afficher deux textes
// distincts (trigger vs options) avec une balise native.
//
// A11y / navigation clavier (G.2.8) :
//  - Le trigger reçoit le focus.
//  - À l'ouverture, l'option courante est mise en surbrillance via
//    `highlightedIndex` et `aria-activedescendant` sur le listbox.
//  - ArrowDown / ArrowUp : déplace la surbrillance (cyclique).
//  - Home / End : première / dernière option.
//  - Enter / Espace : sélectionne l'option surbrillée et ferme.
//  - Escape : ferme sans sélectionner.
//  - Tab : ferme et laisse le navigateur faire son focus suivant.
//  - L'auto-scroll garde l'option highlightée visible.
//
// Props :
//   value : id de l'option sélectionnée
//   options : Array<{ id, label, shortLabel }>
//   onChange : (id) => void
//   className : classes additionnelles sur le wrapper
//   ariaLabel : aria-label du trigger (recommandé)
//   minTriggerWidth : taille minimale du trigger en px (défaut auto)
export default function ShortLabelSelect({
  value,
  options,
  onChange,
  className = '',
  ariaLabel,
  minTriggerWidth,
}) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const wrapperRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const baseId = useId()

  const currentIndex = Math.max(0, options.findIndex((o) => o.id === value))

  // Sync local en cas d'ouverture : on initialise highlightedIndex à
  // l'option courante. Pas en useEffect (cascading render rule) — fait
  // depuis l'évènement qui ouvre la liste.
  const openDropdown = useCallback(() => {
    setHighlightedIndex(currentIndex)
    setOpen(true)
  }, [currentIndex])

  // Click extérieur global pour fermer (le keydown local du trigger
  // gère aussi Escape, mais on garde le global pour les cas où le
  // focus a fui).
  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Scroll l'option highlightée dans la vue. scrollIntoView avec block:
  // 'nearest' évite de re-scroller si déjà visible (UX moins erratique).
  useEffect(() => {
    if (!open) return
    const optEl = listRef.current?.querySelector(`#${CSS.escape(baseId)}-opt-${highlightedIndex}`)
    optEl?.scrollIntoView({ block: 'nearest' })
  }, [open, highlightedIndex, baseId])

  const handleSelect = useCallback((id) => {
    onChange(id)
    setOpen(false)
    // Restaure le focus sur le trigger après sélection — comportement
    // attendu (le focus ne doit pas être perdu dans le DOM après une
    // interaction clavier).
    triggerRef.current?.focus()
  }, [onChange])

  const onKeyDown = useCallback((e) => {
    // À l'état fermé, ArrowDown/Up/Enter/Espace ouvrent.
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openDropdown()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((i) => (i + 1) % options.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((i) => (i - 1 + options.length) % options.length)
        break
      case 'Home':
        e.preventDefault()
        setHighlightedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setHighlightedIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        handleSelect(options[highlightedIndex].id)
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break
      case 'Tab':
        // Pas de preventDefault : on laisse le focus sortir naturellement,
        // mais on ferme la liste pour ne pas la laisser orpheline.
        setOpen(false)
        break
      default:
        break
    }
  }, [open, options, highlightedIndex, handleSelect, openDropdown])

  const selected = options.find((o) => o.id === value) ?? options[0]
  const triggerText = selected?.shortLabel ?? selected?.label ?? ''
  const triggerTitle = selected?.label ?? triggerText

  const style = minTriggerWidth ? { minWidth: `${minTriggerWidth}px` } : undefined
  const activeDescendantId = open ? `${baseId}-opt-${highlightedIndex}` : undefined

  return (
    <div className={`short-select ${className}`} ref={wrapperRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`short-select-trigger${open ? ' is-open' : ''}`}
        onClick={() => { if (open) setOpen(false); else openDropdown() }}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={activeDescendantId}
        aria-label={ariaLabel}
        title={triggerTitle}
        style={style}
      >
        <span className="short-select-trigger-label">{triggerText}</span>
        <ChevronDown size={12} strokeWidth={2.2} className="short-select-chevron" />
      </button>
      {open && (
        <ul
          ref={listRef}
          className="short-select-menu"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${baseId}-opt-${i}`}
              className={`short-select-option${o.id === value ? ' is-selected' : ''}${i === highlightedIndex ? ' is-highlighted' : ''}`}
              role="option"
              aria-selected={o.id === value}
              onMouseEnter={() => setHighlightedIndex(i)}
              onClick={() => handleSelect(o.id)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
