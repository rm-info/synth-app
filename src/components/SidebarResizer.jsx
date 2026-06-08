import { useCallback, useRef } from 'react'
import './SidebarResizer.css'

// Poignée de drag verticale placée sur un bord de sidebar.
// - side='right' : on est sur le bord droit d'une sidebar à gauche (drag
//   vers la droite élargit la sidebar).
// - side='left'  : on est sur le bord gauche d'une sidebar à droite (drag
//   vers la gauche élargit la sidebar).
// Le parent doit être `position: relative`.
export default function SidebarResizer({ side, width, minWidth, onChange, ariaLabel }) {
  const startRef = useRef(null)

  // S.3.3 — Pointer Events (souris + tactile + stylet). Pattern à listeners
  // window : pas de setPointerCapture (les listeners window captent tout) ;
  // pointercancel ajouté → fin de drag propre sur interruption tactile.
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return
    e.preventDefault()
    startRef.current = { x: e.clientX, w: width }
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev) => {
      const dx = ev.clientX - startRef.current.x
      const delta = side === 'right' ? dx : -dx
      const next = Math.max(minWidth, startRef.current.w + delta)
      onChange(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [side, width, minWidth, onChange])

  return (
    <div
      className={`sidebar-resizer sidebar-resizer-${side}`}
      onPointerDown={handlePointerDown}
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
    />
  )
}
