const NUM_SAMPLES = 256
const CANVAS_WIDTH = 600

export const HARMONIC_COUNT = NUM_SAMPLES

// Décomposition DFT d'une période de l'onde échantillonnée sur `points`
// (longueur CANVAS_WIDTH). Retourne les coefficients `real`/`imag` attendus
// par `createPeriodicWave`, ainsi que les magnitudes `sqrt(real²+imag²)` —
// utilisées pour l'affichage spectrogramme.
export function pointsToHarmonics(points) {
  const cycle = new Float32Array(NUM_SAMPLES)
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const canvasX = (i / NUM_SAMPLES) * CANVAS_WIDTH
    const x0 = Math.floor(canvasX)
    const x1 = Math.min(x0 + 1, CANVAS_WIDTH - 1)
    const frac = canvasX - x0
    cycle[i] = points[x0] * (1 - frac) + points[x1] * frac
  }

  const real = new Float32Array(NUM_SAMPLES)
  const imag = new Float32Array(NUM_SAMPLES)
  for (let k = 1; k < NUM_SAMPLES; k++) {
    let re = 0
    let im = 0
    for (let n = 0; n < NUM_SAMPLES; n++) {
      const angle = (2 * Math.PI * k * n) / NUM_SAMPLES
      re += cycle[n] * Math.cos(angle)
      im -= cycle[n] * Math.sin(angle)
    }
    real[k] = re / NUM_SAMPLES
    imag[k] = im / NUM_SAMPLES
  }

  const magnitudes = new Float32Array(NUM_SAMPLES)
  for (let k = 0; k < NUM_SAMPLES; k++) {
    magnitudes[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k])
  }

  return { real, imag, magnitudes }
}

export function pointsToPeriodicWave(points, audioCtx) {
  const { real, imag } = pointsToHarmonics(points)
  return audioCtx.createPeriodicWave(real, imag, { disableNormalization: false })
}

export const SOUND_COLORS = [
  '#00d4ff', '#ff6b9d', '#c084fc', '#4ade80',
  '#fb923c', '#f472b6', '#22d3ee', '#a78bfa',
  '#34d399', '#fbbf24', '#f87171', '#60a5fa',
]

// Encodes an AudioBuffer as a PCM 16-bit stereo WAV ArrayBuffer.
// Mono buffers are duplicated into L+R.
export function audioBufferToWav(buffer) {
  const sampleRate = buffer.sampleRate
  const numChannels = 2
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const length = buffer.length
  const dataSize = length * blockAlign
  const bufferSize = 44 + dataSize

  const ab = new ArrayBuffer(bufferSize)
  const view = new DataView(ab)
  let offset = 0
  const writeStr = (s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i))
  }
  const writeU32 = (v) => { view.setUint32(offset, v, true); offset += 4 }
  const writeU16 = (v) => { view.setUint16(offset, v, true); offset += 2 }

  writeStr('RIFF')
  writeU32(bufferSize - 8)
  writeStr('WAVE')
  writeStr('fmt ')
  writeU32(16)
  writeU16(1) // PCM
  writeU16(numChannels)
  writeU32(sampleRate)
  writeU32(byteRate)
  writeU16(blockAlign)
  writeU16(bitDepth)
  writeStr('data')
  writeU32(dataSize)

  const left = buffer.getChannelData(0)
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left

  for (let i = 0; i < length; i++) {
    for (const channel of [left, right]) {
      let s = Math.max(-1, Math.min(1, channel[i]))
      s = s < 0 ? s * 0x8000 : s * 0x7fff
      view.setInt16(offset, s, true)
      offset += 2
    }
  }

  return ab
}

export function downloadWav(arrayBuffer, filename) {
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
