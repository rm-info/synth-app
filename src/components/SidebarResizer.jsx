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

  const handleMouseDown = useCallback((e) => {
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
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [side, width, minWidth, onChange])

  return (
    <div
      className={`sidebar-resizer sidebar-resizer-${side}`}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
    />
  )
}
