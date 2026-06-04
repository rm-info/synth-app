import { useMemo } from 'react'

// Mini-SVG d'une waveform (sample 60 points sur les 600 du buffer).
// Pure : même input → même output. Memoizé sur points + dims.
export default function PatchThumbnail({ points, color = '#00d4ff', width = 60, height = 30 }) {
  const pathData = useMemo(() => {
    if (!points || points.length === 0) return ''
    const ymid = height / 2
    const lastIdx = points.length - 1
    const idxAt = (x) => Math.round((x / (width - 1)) * lastIdx)
    // Auto-fit Y au pic réel, uniquement vers le bas (floor à 1) : les formes
    // ≤ ±1 sont inchangées, celles qui dépassent (band-limitées, tracés non
    // clampés) sont réduites pour afficher la forme entière au lieu d'être
    // tronquées. Le floor garantit peak ≥ 1 → pas de division par 0.
    const peak = Math.max(1, ...points.map(Math.abs))
    const scale = (ymid * 0.9) / peak
    let d = `M 0 ${ymid - points[0] * scale}`
    for (let x = 1; x < width; x++) {
      const y = ymid - points[idxAt(x)] * scale
      d += ` L ${x} ${y}`
    }
    return d
  }, [points, width, height])

  return (
    <svg
      className="patch-thumbnail"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width={width}
      height={height}
    >
      <path d={pathData} stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  )
}
