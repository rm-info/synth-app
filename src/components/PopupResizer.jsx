import { useEffect, useRef } from 'react'
import './PopupResizer.css'

const MIN_WIDTH = 320

export default function PopupResizer({ currentWidth, onResize }) {
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(currentWidth)

  const onMouseDown = (e) => {
    e.preventDefault()
    draggingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = currentWidth
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!draggingRef.current) return
      const delta = e.clientX - startXRef.current
      const newW = startWidthRef.current + delta
      const max = Math.min(window.innerWidth * 0.8, 1200)
      const clamped = Math.max(MIN_WIDTH, Math.min(newW, max))
      onResize(clamped)
    }
    const onMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onResize])

  return (
    <div
      className="popup-resizer"
      onMouseDown={onMouseDown}
      title="Redimensionner"
    />
  )
}
