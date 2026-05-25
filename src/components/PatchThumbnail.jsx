import { useMemo } from 'react'

// Mini-SVG d'une waveform (sample 60 points sur les 600 du buffer).
// Pure : même input → même output. Memoizé sur points + dims.
export default function PatchThumbnail({ points, color = '#00d4ff', width = 60, height = 30 }) {
  const pathData = useMemo(() => {
    if (!points || points.length === 0) return ''
    const ymid = height / 2
    const lastIdx = points.length - 1
    const idxAt = (x) => Math.round((x / (width - 1)) * lastIdx)
    let d = `M 0 ${ymid - points[0] * ymid * 0.9}`
    for (let x = 1; x < width; x++) {
      const y = ymid - points[idxAt(x)] * ymid * 0.9
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
