import { useRef, useEffect, useCallback } from 'react'
import { pointsToHarmonics } from '../audio'
import { themeColor } from '../lib/themeColor'
import './Spectrogram.css'

const FREQ_MIN = 16
const FREQ_MAX = 32768
const LOG_MIN = Math.log10(FREQ_MIN)
const LOG_MAX = Math.log10(FREQ_MAX)

const PADDING_LEFT = 36  // était 8 — élargi pour les labels Y
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

// Graduations Y : ratio dans le plot (0 = bas, 1 = haut) + label affiché.
// Linéaire : 0..1 par pas de 0.25.
// dB : -80..0 par pas de 20 (note : caractère U+2212 MINUS SIGN, pas U+002D hyphen-minus).
const Y_TICKS_LINEAR = [
  { ratio: 0,    label: '0' },
  { ratio: 0.25, label: '0.25' },
  { ratio: 0.5,  label: '0.5' },
  { ratio: 0.75, label: '0.75' },
  { ratio: 1,    label: '1' },
]
const Y_TICKS_DB = [
  { ratio: 0,    label: '−80' },
  { ratio: 0.25, label: '−60' },
  { ratio: 0.5,  label: '−40' },
  { ratio: 0.75, label: '−20' },
  { ratio: 1,    label: '0' },
]
// Minor ticks (sans labels) entre les majors. Mêmes ratios pour linéaire
// et dB (l'échelle dB est répartie uniformément de -80 à 0 sur les majors,
// donc -70/-50/-30/-10 tombent exactement au milieu de chaque segment).
const Y_TICKS_MINOR_RATIOS = [0.125, 0.375, 0.625, 0.875]

const FFT_SIZE = 2048
const PEAK_DECAY = 0.97  // facteur multiplicatif par frame ; peak décroît visiblement en ~1s @ 60fps

function freqToX(freq, plotW) {
  const clamped = Math.max(FREQ_MIN, Math.min(FREQ_MAX, freq))
  return ((Math.log10(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * plotW
}

function drawYGrid(ctx, plotX, plotY, plotW, plotH, dbScale) {
  const ticks = dbScale ? Y_TICKS_DB : Y_TICKS_LINEAR
  ctx.strokeStyle = themeColor('canvas-grid-secondary')
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.fillStyle = themeColor('canvas-text-primary')
  ctx.font = '10px system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const { ratio, label } of ticks) {
    const y = plotY + plotH - ratio * plotH
    // Ligne pointillée horizontale traversant le plot
    ctx.beginPath()
    ctx.moveTo(plotX, y)
    ctx.lineTo(plotX + plotW, y)
    ctx.stroke()
    // Label à gauche du plot
    ctx.fillText(label, plotX - 4, y)
  }
  ctx.setLineDash([])
  // Minor ticks (sans labels) traversant le plot ; pattern dash plus
  // fin et couleur légèrement plus claire pour rester subordonné aux
  // majors visuellement.
  ctx.strokeStyle = themeColor('canvas-grid-tertiary')
  ctx.setLineDash([2, 4])
  for (const ratio of Y_TICKS_MINOR_RATIOS) {
    const y = plotY + plotH - ratio * plotH
    ctx.beginPath()
    ctx.moveTo(plotX, y)
    ctx.lineTo(plotX + plotW, y)
    ctx.stroke()
  }
  ctx.setLineDash([])
}

/**
 * Spectrogramme du son en cours d'édition Designer — deux modes,
 * basculés explicitement par l'utilisateur via le toggle "Live" dans
 * le header :
 *
 * - **Statique** (défaut) : DFT d'un cycle de l'onde dessinée. Affiche
 *   les magnitudes des harmoniques en barres (axe log fréquence, Y
 *   linéaire ou dB selon `dbScale`).
 *
 * - **Live FFT** : lecture temps réel de l'AnalyserNode du WaveformEditor
 *   pendant les notes test. Trace une ligne continue + aire fill. Option
 *   peak hold (traits persistants qui décroissent en ~1s).
 *
 * Pas d'auto-switch : le mode est piloté entièrement par la prop `mode`
 * (toggle explicite). Au passage live → static, on invalide la cache de
 * détection de changement pour forcer un redraw static immédiat, et on
 * reset le peakBuffer pour éviter les pics fantômes au prochain passage
 * en live.
 *
 * État interne dans `stateRef` (buffers, dernières valeurs de
 * points/frequency/dbScale pour détection de changement static), aucun
 * re-render React à 60fps grâce aux refs.
 *
 * Axe X : log 16 Hz → 32 kHz. Axe Y : linéaire (default) ou dB (toggle).
 */
function Spectrogram({
  points, frequency,
  analyserRef, activeVoicesCountRef,
  dbScale, peakHold, mode,
  onToggleDbScale, onTogglePeakHold, onToggleMode,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const propsRef = useRef({ points, frequency, dbScale, peakHold, mode, analyserRef, activeVoicesCountRef })
  const stateRef = useRef({
    fftDataBuffer: new Float32Array(FFT_SIZE / 2),
    peakBuffer: null,
    valuesBuffer: null,
    // Détection de changement static : on compare la RÉFÉRENCE du buffer
    // points (le reducer crée un nouveau tableau à chaque modif d'onde),
    // plus frequency et dbScale par valeur. Le hash à 3 indices précédent
    // avait un bug : modifier l'onde sans toucher [0]/[300]/[599] ne
    // déclenchait pas de redraw.
    lastPoints: null,
    lastFrequency: 0,
    lastDbScale: false,
  })

  useEffect(() => {
    propsRef.current = { points, frequency, dbScale, peakHold, mode, analyserRef, activeVoicesCountRef }
  }, [points, frequency, dbScale, peakHold, mode, analyserRef, activeVoicesCountRef])

  useEffect(() => {
    if (mode === 'static') {
      // Force redraw static au prochain tick rAF (sinon canvas figé sur l'ancien
      // rendu live), et reset le peakBuffer pour éviter les pics fantômes au
      // prochain passage en live.
      stateRef.current.lastPoints = null
      if (stateRef.current.peakBuffer) stateRef.current.peakBuffer.fill(0)
    }
  }, [mode])

  // iter-K phase-3.f15 : force redraw au changement de thème (sinon la cache
  // static ne déclenche jamais de repaint et le canvas reste figé sur les
  // anciennes couleurs jusqu'à la prochaine édition d'onde).
  useEffect(() => {
    const invalidate = () => { stateRef.current.lastPoints = null }
    window.addEventListener('themechange', invalidate)
    return () => window.removeEventListener('themechange', invalidate)
  }, [])

  const drawStatic = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false
    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return false
    const ctx = canvas.getContext('2d')
    const { points, frequency, dbScale } = propsRef.current

    ctx.fillStyle = themeColor('canvas-bg')
    ctx.fillRect(0, 0, W, H)

    const plotX = PADDING_LEFT
    const plotY = PADDING_TOP
    const plotW = W - PADDING_LEFT - PADDING_RIGHT
    const plotH = H - PADDING_TOP - PADDING_BOTTOM
    if (plotW <= 0 || plotH <= 0) return false

    ctx.strokeStyle = themeColor('canvas-grid-secondary')
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.fillStyle = themeColor('canvas-text-primary')
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

    drawYGrid(ctx, plotX, plotY, plotW, plotH, dbScale)

    ctx.strokeStyle = themeColor('canvas-grid-primary')
    ctx.beginPath()
    ctx.moveTo(plotX, plotY + plotH + 0.5)
    ctx.lineTo(plotX + plotW, plotY + plotH + 0.5)
    ctx.stroke()

    const hasSignal = points.some((v) => v !== 0)
    if (!hasSignal) {
      ctx.fillStyle = themeColor('canvas-text-secondary')
      ctx.font = 'italic 12px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText("Dessinez une onde pour voir le spectre", W / 2, plotY + plotH / 2)
      return true
    }

    const { magnitudes } = pointsToHarmonics(points)
    let maxMag = 0
    for (let k = 1; k < magnitudes.length; k++) {
      if (magnitudes[k] > maxMag) maxMag = magnitudes[k]
    }
    if (maxMag <= 0) return true

    ctx.fillStyle = themeColor('accent')
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
    return true
  }, [])

  const drawLive = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false

    const W = canvas.width
    const H = canvas.height
    if (!W || !H) return false
    const ctx = canvas.getContext('2d')
    const { analyserRef, dbScale, peakHold } = propsRef.current

    ctx.fillStyle = themeColor('canvas-bg')
    ctx.fillRect(0, 0, W, H)

    const plotX = PADDING_LEFT
    const plotY = PADDING_TOP
    const plotW = W - PADDING_LEFT - PADDING_RIGHT
    const plotH = H - PADDING_TOP - PADDING_BOTTOM
    if (plotW <= 0 || plotH <= 0) return false

    ctx.strokeStyle = themeColor('canvas-grid-secondary')
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.fillStyle = themeColor('canvas-text-primary')
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

    drawYGrid(ctx, plotX, plotY, plotW, plotH, dbScale)

    ctx.strokeStyle = themeColor('canvas-grid-primary')
    ctx.beginPath()
    ctx.moveTo(plotX, plotY + plotH + 0.5)
    ctx.lineTo(plotX + plotW, plotY + plotH + 0.5)
    ctx.stroke()

    // Check FFT analyser APRÈS le rendu fond+grilles : si pas encore d'AnalyserNode
    // (aucune note jouée depuis le boot), on trace une ligne plate au floor pour
    // cohérence avec l'état "live actif mais signal silencieux" (qui apparaît
    // après release des notes : l'analyser retourne minDecibels clampé à DB_FLOOR,
    // soit une ligne au bas du plot). Sans ce tracé manuel, le plot serait vide
    // avant la première note alors que l'état logique est identique.
    const analyser = analyserRef?.current
    if (!analyser) {
      ctx.strokeStyle = themeColor('accent')
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(plotX, plotY + plotH)
      ctx.lineTo(plotX + plotW - 1, plotY + plotH)
      ctx.stroke()
      return true
    }

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

    ctx.strokeStyle = themeColor('accent')
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
    ctx.fillStyle = themeColor('accent-bg-overlay')
    ctx.lineTo(plotX + plotW - 1, plotY + plotH)
    ctx.lineTo(plotX, plotY + plotH)
    ctx.closePath()
    ctx.fill()

    if (peakHold) {
      ctx.strokeStyle = themeColor('accent-bright')
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
    return true
  }, [])

  useEffect(() => {
    let rafId = 0
    const loop = () => {
      const { mode, points, frequency, dbScale } = propsRef.current

      if (mode === 'live') {
        drawLive()
      } else {
        // Static : redraw uniquement si points (ref) / frequency / dbScale ont changé
        if (
          points !== stateRef.current.lastPoints ||
          frequency !== stateRef.current.lastFrequency ||
          dbScale !== stateRef.current.lastDbScale
        ) {
          if (drawStatic()) {
            // Cache mise à jour UNIQUEMENT si drawStatic a réussi.
            // Sinon (canvas non-sizé au mount initial), on réessaiera au
            // prochain tick.
            stateRef.current.lastPoints = points
            stateRef.current.lastFrequency = frequency
            stateRef.current.lastDbScale = dbScale
          }
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
          stateRef.current.lastPoints = null
          stateRef.current.peakBuffer = null
          stateRef.current.valuesBuffer = null
        }
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="spectrogram" data-anchor="designer-spectrogram">
      <header className="spectrogram-header">
        <h3>Spectrogramme</h3>
        <div className="spectrogram-controls">
          <button
            type="button"
            onClick={onToggleMode}
            className={`spectrogram-toggle${mode === 'live' ? ' is-active' : ''}`}
            title="Mode Live (analyse temps réel)"
          >Live</button>
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
