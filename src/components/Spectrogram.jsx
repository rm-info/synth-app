import { useRef, useEffect, useCallback } from 'react'
import { pointsToHarmonics } from '../audio'
import './Spectrogram.css'

const FREQ_MIN = 16
const FREQ_MAX = 32768
const LOG_MIN = Math.log10(FREQ_MIN)
const LOG_MAX = Math.log10(FREQ_MAX)

const PADDING_LEFT = 8
const PADDING_RIGHT = 8
const PADDING_TOP = 8
const PADDING_BOTTOM = 20

const BAR_WIDTH_PX = 2
const GRID_LABELS = [
  { hz: 100, label: '100 Hz' },
  { hz: 1000, label: '1 kHz' },
  { hz: 10000, label: '10 kHz' },
]

function freqToX(freq, plotW) {
  const clamped = Math.max(FREQ_MIN, Math.min(FREQ_MAX, freq))
  return ((Math.log10(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * plotW
}

/**
 * Spectrogramme statique du son en cours d'édition.
 *
 * Affiche les magnitudes des harmoniques issues de la DFT (même
 * décomposition que celle utilisée par `pointsToPeriodicWave` pour
 * la lecture audio). Lecture seule — aucun état interne, aucune
 * interaction utilisateur. Se redessine à chaque changement de
 * `points` ou `frequency` (drafts locaux absorbent les gestes continus).
 *
 * Axe X : log 20 Hz → 20 kHz. Axe Y : magnitude linéaire, normalisée
 * par le max courant (le volume global / amplitude n'entre pas en jeu,
 * on veut voir la "forme" du spectre).
 */
function Spectrogram({ points, frequency }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const propsRef = useRef({ points, frequency })

  useEffect(() => {
    propsRef.current = { points, frequency }
  }, [points, frequency])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return
    const ctx = canvas.getContext('2d')
    const { points, frequency } = propsRef.current

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, W, H)

    const plotX = PADDING_LEFT
    const plotY = PADDING_TOP
    const plotW = W - PADDING_LEFT - PADDING_RIGHT
    const plotH = H - PADDING_TOP - PADDING_BOTTOM
    if (plotW <= 0 || plotH <= 0) return

    ctx.strokeStyle = '#2a2a4a'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.fillStyle = '#8a8fa8'
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const { hz, label } of GRID_LABELS) {
      const x = plotX + freqToX(hz, plotW)
      ctx.beginPath()
      ctx.moveTo(x, plotY)
      ctx.lineTo(x, plotY + plotH)
      ctx.stroke()
      ctx.fillText(label, x, plotY + plotH + 4)
    }
    ctx.setLineDash([])

    ctx.strokeStyle = '#3a3a5a'
    ctx.beginPath()
    ctx.moveTo(plotX, plotY + plotH + 0.5)
    ctx.lineTo(plotX + plotW, plotY + plotH + 0.5)
    ctx.stroke()

    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      ctx.fillStyle = '#7a7e96'
      ctx.font = 'italic 12px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText("Dessinez une onde pour voir le spectre", W / 2, plotY + plotH / 2)
      return
    }

    const { magnitudes } = pointsToHarmonics(points)
    let maxMag = 0
    for (let k = 1; k < magnitudes.length; k++) {
      if (magnitudes[k] > maxMag) maxMag = magnitudes[k]
    }
    if (maxMag <= 0) return

    ctx.fillStyle = '#00d4ff'
    for (let k = 1; k < magnitudes.length; k++) {
      const f = k * frequency
      if (f > FREQ_MAX) break
      if (f < FREQ_MIN) continue
      const relMag = magnitudes[k] / maxMag
      if (relMag <= 0) continue
      const x = plotX + freqToX(f, plotW)
      const barH = relMag * plotH
      ctx.fillRect(x - BAR_WIDTH_PX / 2, plotY + plotH - barH, BAR_WIDTH_PX, barH)
    }
  }, [])

  useEffect(() => {
    draw()
  }, [points, frequency, draw])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        const h = Math.floor(entry.contentRect.height)
        if (!w || !h) continue
        if (w !== canvas.width || h !== canvas.height) {
          canvas.width = w
          canvas.height = h
          draw()
        }
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [draw])

  return (
    <div className="spectrogram">
      <header className="spectrogram-header">
        <h3>Spectrogramme</h3>
      </header>
      <div className="spectrogram-canvas-container" ref={containerRef}>
        <canvas ref={canvasRef} className="spectrogram-canvas" />
      </div>
    </div>
  )
}

export default Spectrogram
