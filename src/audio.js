const NUM_SAMPLES = 512
const CANVAS_WIDTH = 600
const HALF_HARMONICS = NUM_SAMPLES / 2 + 1   // = 257 (k=0..256)

export const HARMONIC_COUNT = HALF_HARMONICS - 1   // = 256 (k=1..256)

// Durée minimale (secondes) de la rampe d'attack appliquée au démarrage
// d'une voix. Sans ça, un attack utilisateur de 0 (ou sub-ms) fait sauter
// le gain de 0 à amplitude en un sample-block → discontinuité, clic audible.
// 3 ms est sous le seuil de perception d'attaque (~10 ms) donc inaudible
// comme délai, mais suffit à supprimer le tick.
export const MIN_ATTACK = 0.003

// FFT in-place via Cooley-Tukey radix-2. N doit être une puissance de 2.
// Modifie real[] et imag[] en place. Convention forward (exp(-iθ)) —
// matche bit-pour-bit la convention de la DFT naïve historique (cf. spec).
function fft(real, imag) {
  const N = real.length

  // 1. Permutation par bit-reversal
  let j = 0
  for (let i = 1; i < N; i++) {
    let bit = N >> 1
    while (j & bit) { j ^= bit; bit >>= 1 }
    j ^= bit
    if (i < j) {
      let tmp = real[i]; real[i] = real[j]; real[j] = tmp
      tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp
    }
  }

  // 2. Butterflies par taille de bloc croissante : 2, 4, 8, ..., N
  for (let len = 2; len <= N; len <<= 1) {
    const halfLen = len >> 1
    const angle = -2 * Math.PI / len
    const wReal = Math.cos(angle)
    const wImag = Math.sin(angle)
    for (let i = 0; i < N; i += len) {
      let curReal = 1
      let curImag = 0
      for (let k = 0; k < halfLen; k++) {
        const a = i + k
        const b = a + halfLen
        const tReal = curReal * real[b] - curImag * imag[b]
        const tImag = curReal * imag[b] + curImag * real[b]
        real[b] = real[a] - tReal
        imag[b] = imag[a] - tImag
        real[a] += tReal
        imag[a] += tImag
        const nextReal = curReal * wReal - curImag * wImag
        const nextImag = curReal * wImag + curImag * wReal
        curReal = nextReal
        curImag = nextImag
      }
    }
  }
}

if (import.meta.env.DEV) {
  // Self-test: vérifier que FFT donne les coefficients attendus pour un
  // signal d'entrée connu (sine pure à k=1). Si échec, console.error visible
  // au load. Élimine la classe de bugs "bit-reversal off-by-one, butterfly
  // mal indexé, normalisation oubliée, convention de signe inversée".
  const N = NUM_SAMPLES
  const realTest = new Float32Array(N)
  const imagTest = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    realTest[i] = Math.sin(2 * Math.PI * i / N)
  }
  fft(realTest, imagTest)
  // Pour une sine pure à k=1 après normalisation /N :
  //   imag[1]/N ≈ -0.5 (convention exp(-iθ) → imag négatif)
  //   real[1]/N ≈ 0
  //   tous les autres bins ≈ 0
  // EPS = 1e-5 — au-dessus du floor de précision Float32 (~1e-7 pour valeurs ~1)
  // accumulé sur 8 stages de butterfly. Catche les vrais bugs (sign flip,
  // normalisation manquante, scramble bit-reversal) sans false positive.
  const EPS = 1e-5
  const ok = (
    Math.abs(realTest[1] / N) < EPS &&
    Math.abs(imagTest[1] / N + 0.5) < EPS &&
    Math.abs(realTest[2] / N) < EPS &&
    Math.abs(imagTest[2] / N) < EPS
  )
  if (!ok) {
    console.error('FFT self-test FAIL:', {
      'real[1]/N': realTest[1] / N,
      'imag[1]/N': imagTest[1] / N,
      'real[2]/N': realTest[2] / N,
      'imag[2]/N': imagTest[2] / N,
    })
  }
}

// Cache memoization : keyed par référence du buffer `points`. Le reducer
// crée un nouveau tableau à chaque modif (immutable updates), donc la ref
// change → cache miss → recalcul. WeakMap garantit pas de fuite mémoire
// (entrée GC'd quand le patch est supprimé). Cache partagé entre playback
// audio et Spectrogram statique.
const harmonicsCache = new WeakMap()

// Décomposition spectrale d'une période de l'onde échantillonnée sur `points`
// (longueur CANVAS_WIDTH). Retourne les coefficients `real`/`imag` attendus
// par `createPeriodicWave` (tronqués aux 257 premiers — k=0..256, le reste
// est le mirror conjugué redondant qui causerait des parasites audio).
// Voir spec docs/superpowers/specs/2026-05-24-anti-aliasing-design.md §2.
export function pointsToHarmonics(points) {
  const cached = harmonicsCache.get(points)
  if (cached) return cached

  // Resample 600 → 512 (linear interp)
  const cycle = new Float32Array(NUM_SAMPLES)
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const canvasX = (i / NUM_SAMPLES) * CANVAS_WIDTH
    const x0 = Math.floor(canvasX)
    const x1 = Math.min(x0 + 1, CANVAS_WIDTH - 1)
    const frac = canvasX - x0
    cycle[i] = points[x0] * (1 - frac) + points[x1] * frac
  }

  // FFT in-place : copie cycle dans real, imag reste à zéro
  const real = new Float32Array(NUM_SAMPLES)
  const imag = new Float32Array(NUM_SAMPLES)
  for (let i = 0; i < NUM_SAMPLES; i++) real[i] = cycle[i]
  fft(real, imag)

  // Normalisation /N (convention de la DFT historique préservée)
  for (let i = 0; i < NUM_SAMPLES; i++) {
    real[i] /= NUM_SAMPLES
    imag[i] /= NUM_SAMPLES
  }

  // Truncation aux 257 premiers coefficients (k=0..256). Les k=257..511
  // sont les conjugués miroirs de k=1..255 (information redondante pour un
  // signal réel) — on les drop pour éviter qu'ils deviennent des
  // harmoniques parasites une fois passés à createPeriodicWave.
  const truncReal = real.slice(0, HALF_HARMONICS)
  const truncImag = imag.slice(0, HALF_HARMONICS)
  const magnitudes = new Float32Array(HALF_HARMONICS)
  for (let k = 0; k < HALF_HARMONICS; k++) {
    magnitudes[k] = Math.sqrt(truncReal[k] ** 2 + truncImag[k] ** 2)
  }

  const result = { real: truncReal, imag: truncImag, magnitudes }
  harmonicsCache.set(points, result)
  return result
}

// `definition` (1..HARMONIC_COUNT) tronque le spectre : les harmoniques
// k > definition sont mises à zéro avant createPeriodicWave. La troncature
// est faite ici, en aval du cache `pointsToHarmonics` (mémoïsé par `points`),
// parce qu'elle est cheap (un parcours O(N)) — un cache composite
// points × definition n'apporterait rien. `definition` absente/invalide =
// pas de troncature (spectre complet). On copie real/imag avant de zéroer
// pour ne pas muter les Float32Array partagés du cache.
export function pointsToPeriodicWave(points, audioCtx, definition) {
  const { real, imag } = pointsToHarmonics(points)
  const cut = Number.isFinite(definition) ? definition : HARMONIC_COUNT
  if (cut >= HARMONIC_COUNT) {
    return audioCtx.createPeriodicWave(real, imag, { disableNormalization: false })
  }
  const truncReal = Float32Array.from(real)
  const truncImag = Float32Array.from(imag)
  for (let k = cut + 1; k < truncReal.length; k++) {
    truncReal[k] = 0
    truncImag[k] = 0
  }
  return audioCtx.createPeriodicWave(truncReal, truncImag, { disableNormalization: false })
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
