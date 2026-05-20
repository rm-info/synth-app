import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import './ShortLabelSelect.css'

// iter G phase 2.3 : sélecteur custom — affiche un libellé court dans
// le trigger (densité visuelle, juste assez pour identifier l'option
// active) et le libellé complet dans la liste ouverte (lisibilité au
// moment du choix).
//
// Pourquoi pas un <select> natif : impossible d'afficher deux textes
// distincts (trigger vs options) avec une balise native. Implémentation
// custom minimale :
//  - Trigger = button avec aria-haspopup
//  - Menu = ul avec role=listbox / role=option
//  - Fermeture : clic-en-dehors, Escape, sélection
//  - Tooltip natif (title) sur le trigger = label complet de l'option
//    courante (utile aussi pour l'accessibilité reader).
//
// Pas de gestion fléchée/PageUp-Down (a11y partielle) — on garde
// l'implémentation minimale, à étoffer si besoin.
//
// Props :
//   value : id de l'option sélectionnée
//   options : Array<{ id, label, shortLabel }>
//     - shortLabel facultatif (fallback label)
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
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false)
    }
    const onEscape = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        // Restaure le focus sur le trigger (le button reste DOM-actif).
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const selected = options.find((o) => o.id === value) ?? options[0]
  const triggerText = selected?.shortLabel ?? selected?.label ?? ''
  const triggerTitle = selected?.label ?? triggerText

  const handleSelect = useCallback((id) => {
    onChange(id)
    setOpen(false)
  }, [onChange])

  const style = minTriggerWidth ? { minWidth: `${minTriggerWidth}px` } : undefined

  return (
    <div className={`short-select ${className}`} ref={wrapperRef}>
      <button
        type="button"
        className={`short-select-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={triggerTitle}
        style={style}
      >
        <span className="short-select-trigger-label">{triggerText}</span>
        <ChevronDown size={12} strokeWidth={2.2} className="short-select-chevron" />
      </button>
      {open && (
        <ul className="short-select-menu" role="listbox">
          {options.map((o) => (
            <li
              key={o.id}
              className={`short-select-option${o.id === value ? ' is-selected' : ''}`}
              role="option"
              aria-selected={o.id === value}
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
