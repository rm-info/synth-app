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
export function withSavedCtx(ctx, fn) {
  ctx.save()
  try {
    return fn(ctx)
  } finally {
    ctx.restore()
  }
}
