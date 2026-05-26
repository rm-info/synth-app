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

export function themeColor(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim()
}
