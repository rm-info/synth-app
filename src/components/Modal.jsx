// src/components/Modal.jsx
//
// Primitive modale réutilisable : backdrop fixed, Escape close, focus trap
// basique (premier focusable au mount), prévention du scroll body.
// Pas de framework UI — manuscrit dans l'esprit du projet.

import { useEffect, useRef } from 'react'
import './Modal.css'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)

    // Focus le premier élément focusable du dialog au mount
    const firstFocusable = dialogRef.current?.querySelector(
      'input, button, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-dialog modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
