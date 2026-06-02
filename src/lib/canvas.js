// src/lib/canvas.js
//
// M rattrapage (spec §8) — hygiène canvas. `withSavedCtx(ctx, fn)` exécute la
// fonction de rendu `fn` entre un `ctx.save()` et un `ctx.restore()` garantis
// (le `restore` passe même si `fn` lève). Aucune propriété de contexte
// (lineWidth, strokeStyle, fillStyle, globalAlpha, transform…) ne fuit alors
// d'un rendu au suivant — c'est ce qui produisait les artefacts visuels après
// changement de lentille / variation de cap observés en M.3.
// Renvoie la valeur de `fn` (utile pour les rendus qui retournent un drapeau,
// p.ex. le Spectrogramme qui signale s'il a effectivement dessiné).
// M.r.5.bis — marge de sécurité (px) à chaque bord des canvas d'édition Forme
// d'onde (libre + ancres). Le tracé est confiné à l'intérieur (il ne « sort »
// pas), tandis que l'élément capteur garde sa taille pleine : la souris dispose
// d'une bande tampon de DRAW_MARGIN px avant de quitter l'élément et de perdre le
// geste en cours (esprit du lasso de la bibliothèque). Partagé entre les deux
// composants canvas pour qu'ils restent à la MÊME échelle (zéro saut au switch).
export const DRAW_MARGIN = 12

// M.r.5.bis (passe d'usage) — marge VERTICALE des canvas Forme d'onde (libre +
// ancres), plus large que DRAW_MARGIN pour réserver une gouttière haut/bas où
// loger les overlays (légende en haut, hint d'usage en bas) HORS de la zone de
// tracé — ils ne chevauchent plus la courbe. Symétrique (haut == bas) pour que
// l'amplitude 0 reste au centre géométrique (midY = H/2). La zone Harmoniques,
// sans overlay, garde DRAW_MARGIN sur les quatre bords.
export const DRAW_MARGIN_V = 20

export function withSavedCtx(ctx, fn) {
  ctx.save()
  try {
    return fn(ctx)
  } finally {
    ctx.restore()
  }
}

// M.r.5.bis.1 — marqueur ±1 (niveau audio référence) + étiquettes « 1 » / « -1 »,
// partagé entre le canvas Forme d'onde libre (`WaveformEditor.drawCanvas`) et le
// canvas Ancres (`SplineEditor.draw`) pour que l'auto-fit Y soit visuellement
// identique dans les deux lentilles. `valueToY(v)` mappe une amplitude vers une
// ordonnée canvas selon l'échelle auto-fit courante ; les étiquettes sont
// dessinées sur le canvas (pas en DOM) pour suivre cette échelle. À appeler
// dans un `withSavedCtx` (l'appelant restaure le contexte).
export function drawAmplitudeMarker(ctx, W, valueToY, color) {
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(0, valueToY(1))
  ctx.lineTo(W, valueToY(1))
  ctx.moveTo(0, valueToY(-1))
  ctx.lineTo(W, valueToY(-1))
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 0.55
  ctx.fillStyle = color
  ctx.font = '10px monospace'
  ctx.textBaseline = 'top'
  ctx.fillText('1', 6, valueToY(1) + 2)
  ctx.textBaseline = 'bottom'
  ctx.fillText('-1', 6, valueToY(-1) - 2)
  ctx.globalAlpha = 1
}
