// iter-K phase-3.f15 : helper pour les canvas JS qui doivent suivre le
// thème courant. Les couleurs CSS vivent dans index.css ; ce helper les
// lit en runtime via getComputedStyle pour les composants (Timeline,
// Spectrogram, WaveformEditor) qui peignent directement avec fillStyle/
// strokeStyle et n'ont donc pas accès au cascading CSS.
//
// Pattern d'usage :
//   import { themeColor } from '../lib/themeColor'
//   ctx.fillStyle = themeColor('canvas-bg')
//
// Le caller est responsable de relancer son draw() quand le thème change.
// Convention : écouter `window.addEventListener('themechange', redraw)`
// dans un useEffect — l'event est émis par l'effet thème de App.jsx.

// iter-N phase-1.4.1 : cache module-level. `getComputedStyle().getPropertyValue()`
// est appelé des dizaines de fois par draw (≈9× drawCanvas, 9+2×N_ancres dans
// SplineEditor, ≈13× drawAdsr) sur le hot path de drag, et peut déclencher un
// forced style recalc. Les valeurs lues sont toutes des CSS vars `--accent*` /
// `--canvas-*` / `--playhead-rgb` pilotées par `data-theme` → elles ne changent
// qu'au toggle de thème, signalé par l'event `themechange` (émis sur `window`
// par App.jsx). On vide le cache à ce moment-là. Valeur retournée identique à
// l'ancienne (transparence).
const cache = new Map()
if (typeof window !== 'undefined') {
  window.addEventListener('themechange', () => cache.clear())
}

export function themeColor(name) {
  const hit = cache.get(name)
  if (hit !== undefined) return hit
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim()
  cache.set(name, value)
  return value
}
