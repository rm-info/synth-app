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

const DB_FLOOR = -80
const DB_CEIL = 0

const GRACE_MS = 1000
const FFT_SIZE = 2048
const PEAK_DECAY = 0.97  // facteur multiplicatif par frame ; peak décroît visiblement en ~1s @ 60fps

function freqToX(freq, plotW) {
  const clamped = Math.max(FREQ_MIN, Math.min(FREQ_MAX, freq))
  return ((Math.log10(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * plotW
}

/**
 * Spectrogramme du son en cours d'édition Designer — deux modes :
 *
 * - **Statique** : DFT d'un cycle de l'onde dessinée. Affiche les
 *   magnitudes des harmoniques en barres (axe log fréquence, Y linéaire
 *   ou dB selon `dbScale`). Vue par défaut.
 *
 * - **Live FFT** : lecture temps réel de l'AnalyserNode du WaveformEditor
 *   pendant les notes test. Trace une ligne continue + aire fill. Option
 *   peak hold (traits persistants qui décroissent en ~1s).
 *
 * Auto-switch vers Live quand une voix joue (compteur
 * `activeVoicesCountRef`), retour à Static après une grace period de
 * 1 seconde sans note (évite le flicker en jeu rapide).
 *
 * État interne dans `stateRef` (mode courant, buffers, hash de détection
 * de changement static), aucun re-render React à 60fps grâce aux refs.
 *
 * Axe X : log 16 Hz → 32 kHz. Axe Y : linéaire (default) ou dB (toggle).
 */
function Spectrogram({
  points,
  frequency,
  analyserRef,
  activeVoicesCountRef,
  dbScale,
  peakHold,
  onToggleDbScale,
  onTogglePeakHold,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const propsRef = useRef({ points, frequency, dbScale, peakHold, analyserRef, activeVoicesCountRef })
  const stateRef = useRef({
    mode: 'static',
    lastActivityTime: 0,
    fftDataBuffer: new Float32Array(FFT_SIZE / 2),
    peakBuffer: null,
    valuesBuffer: null,  // alloué/redimensionné à la largeur plotW
    lastPointsKey: '',
  })

  useEffect(() => {
    propsRef.current = { points, frequency, dbScale, peakHold, analyserRef, activeVoicesCountRef }
  }, [points, frequency, dbScale, peakHold, analyserRef, activeVoicesCountRef])

  const drawStatic = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return
    const ctx = canvas.getContext('2d')
    const { points, frequency, dbScale } = propsRef.current

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
      const ratio = magnitudes[k] / maxMag
      if (ratio <= 0) continue
      let barH
      if (dbScale) {
        const db = 20 * Math.log10(ratio)
        if (db < DB_FLOOR) continue
        barH = ((db - DB_FLOOR) / (DB_CEIL - DB_FLOOR)) * plotH
      } else {
        barH = ratio * plotH
      }
      const x = plotX + freqToX(f, plotW)
      ctx.fillRect(x - BAR_WIDTH_PX / 2, plotY + plotH - barH, BAR_WIDTH_PX, barH)
    }
  }, [])

  const drawLive = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { analyserRef, dbScale, peakHold } = propsRef.current
    const analyser = analyserRef?.current
    if (!analyser) return

    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return
    const ctx = canvas.getContext('2d')

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

    analyser.getFloatFrequencyData(stateRef.current.fftDataBuffer)
    const fft = stateRef.current.fftDataBuffer
    const numBins = fft.length
    const sampleRate = analyser.context.sampleRate
    const binHz = sampleRate / (numBins * 2)

    if (!stateRef.current.peakBuffer || stateRef.current.peakBuffer.length !== plotW) {
      stateRef.current.peakBuffer = new Float32Array(plotW)
    }
    const peakBuffer = stateRef.current.peakBuffer

    if (!stateRef.current.valuesBuffer || stateRef.current.valuesBuffer.length !== plotW) {
      stateRef.current.valuesBuffer = new Float32Array(plotW)
    }
    const values = stateRef.current.valuesBuffer
    for (let x = 0; x < plotW; x++) {
      const t = x / plotW
      const f = Math.pow(10, LOG_MIN + t * (LOG_MAX - LOG_MIN))
      const binF = f / binHz
      const bin0 = Math.floor(binF)
      const bin1 = Math.min(bin0 + 1, numBins - 1)
      const frac = binF - bin0
      if (bin0 < 0 || bin0 >= numBins) {
        values[x] = DB_FLOOR
      } else {
        values[x] = fft[bin0] * (1 - frac) + fft[bin1] * frac
      }
    }

    function dbToY(db) {
      let v = db
      if (v < DB_FLOOR) v = DB_FLOOR
      if (v > DB_CEIL) v = DB_CEIL
      if (dbScale) {
        return plotY + plotH - ((v - DB_FLOOR) / (DB_CEIL - DB_FLOOR)) * plotH
      } else {
        const lin = Math.pow(10, v / 20)
        return plotY + plotH - lin * plotH
      }
    }

    ctx.strokeStyle = '#00d4ff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x < plotW; x++) {
      const y = dbToY(values[x])
      if (x === 0) ctx.moveTo(plotX + x, y)
      else ctx.lineTo(plotX + x, y)
    }
    ctx.stroke()

    // L'aire sous la courbe est dessinée en réutilisant le path tracé pour
    // stroke() ci-dessus (Canvas2D ne clear pas le path après stroke).
    // On le ferme manuellement vers les coins bas pour former un polygone
    // fermé, puis on fill.
    ctx.fillStyle = 'rgba(0, 212, 255, 0.2)'
    ctx.lineTo(plotX + plotW - 1, plotY + plotH)
    ctx.lineTo(plotX, plotY + plotH)
    ctx.closePath()
    ctx.fill()

    if (peakHold) {
      ctx.strokeStyle = '#80efff'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x < plotW; x++) {
        const current = values[x]
        const linCurrent = Math.pow(10, current / 20)
        peakBuffer[x] = Math.max(linCurrent, peakBuffer[x] * PEAK_DECAY)
        const linToDb = peakBuffer[x] <= 0 ? DB_FLOOR : 20 * Math.log10(peakBuffer[x])
        const y = dbToY(linToDb)
        if (x === 0) ctx.moveTo(plotX + x, y)
        else ctx.lineTo(plotX + x, y)
      }
      ctx.stroke()
    }
  }, [])

  useEffect(() => {
    let rafId = 0
    const loop = (now) => {
      const { activeVoicesCountRef } = propsRef.current

      if (activeVoicesCountRef?.current < 0) activeVoicesCountRef.current = 0

      const voicesActive = (activeVoicesCountRef?.current ?? 0) > 0

      if (voicesActive) {
        stateRef.current.lastActivityTime = now
        stateRef.current.mode = 'live'
      } else if (now - stateRef.current.lastActivityTime > GRACE_MS) {
        if (stateRef.current.mode === 'live') {
          if (stateRef.current.peakBuffer) stateRef.current.peakBuffer.fill(0)
        }
        stateRef.current.mode = 'static'
      }

      if (stateRef.current.mode === 'live') {
        drawLive()
      } else {
        const { points, frequency, dbScale } = propsRef.current
        const key = `${points.length}:${points[0]}:${points[300]}:${points[599]}:${frequency}:${dbScale}`
        if (key !== stateRef.current.lastPointsKey) {
          stateRef.current.lastPointsKey = key
          drawStatic()
        }
      }

      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [drawStatic, drawLive])

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
          // Force redraw au prochain tick rAF : invalide la cache static
          // et réinitialise les buffers width-dependent (réalloués à la
          // nouvelle largeur au prochain drawLive).
          stateRef.current.lastPointsKey = ''
          stateRef.current.peakBuffer = null
          stateRef.current.valuesBuffer = null
        }
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="spectrogram">
      <header className="spectrogram-header">
        <h3>Spectrogramme</h3>
        <div className="spectrogram-controls">
          <button
            type="button"
            onClick={onToggleDbScale}
            className={`spectrogram-toggle${dbScale ? ' is-active' : ''}`}
            title="Échelle décibels"
          >dB</button>
          <button
            type="button"
            onClick={onTogglePeakHold}
            className={`spectrogram-toggle${peakHold ? ' is-active' : ''}`}
            title="Tenir les pics (mode Live)"
          >Peak</button>
        </div>
      </header>
      <div className="spectrogram-canvas-container" ref={containerRef}>
        <canvas ref={canvasRef} className="spectrogram-canvas" />
      </div>
    </div>
  )
}

export default Spectrogram
