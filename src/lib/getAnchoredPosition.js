// src/lib/getAnchoredPosition.js — Utilitaire de positionnement viewport
// pour les éléments d'UI portant un attribut data-anchor (cf. iter-L
// convention overlay raccourcis).
//
// Réutilisé par :
//   - ShortcutsOverlay (L.1.5) — positionne les étiquettes flottantes.
//   - <DocLink> highlight (L.3) — halo temporaire sur l'élément ciblé.
//   - Tour positioning (L.4) — info-bulles ancrées sur l'élément courant.
//
// Design intentions :
//   - Stateless, pas de cache : un anchor peut bouger (resize fenêtre, scroll,
//     toggle sidebar, etc.). Le caller appelle à la demande.
//   - Plusieurs éléments peuvent matcher le même data-anchor (ex.
//     designer-save-button posé sur les boutons open ET collapsed du Actions
//     panel, dont un seul est visible). On retourne le premier "visible"
//     selon un critère de bounding rect non-dégénéré ET overlap viewport.
//   - Si rien n'est trouvé, found:false avec rect zéro — le caller affichera
//     en position fallback (centre haut de la zone, par exemple).

// Vrai si le rect est visible dans le viewport (au moins partiellement).
// Critère : rect non-dégénéré (width/height > 0) ET overlap avec
// [0, innerWidth] × [0, innerHeight].
function rectIsVisible(rect) {
  if (rect.width <= 0 || rect.height <= 0) return false
  if (rect.bottom <= 0 || rect.right <= 0) return false
  if (rect.top >= window.innerHeight) return false
  if (rect.left >= window.innerWidth) return false
  return true
}

function emptyResult() {
  return { found: false, top: 0, left: 0, width: 0, height: 0, element: null }
}

// Renvoie la position viewport de l'élément `[data-anchor="<id>"]`.
// Si plusieurs candidats existent, prend le premier visible (cf.
// rectIsVisible). Sinon, retourne le rect du premier candidat même s'il
// est hors viewport (utile pour les éléments scrollables — le caller
// peut décider de scroller vers eux).
//
// Retourne { found, top, left, width, height } ; tous les champs en
// coordonnées viewport (CSS pixels, pas client area scrollée).
export function getAnchoredPosition(anchorId) {
  if (!anchorId) return emptyResult()
  // Escape minimal pour les sélecteurs CSS — les ids dans SHORTCUTS sont
  // alphanumériques + tirets, mais on s'autorise un fallback robuste si
  // un caller passe une string arbitraire.
  const safeId = anchorId.replace(/"/g, '\\"')
  const all = document.querySelectorAll(`[data-anchor="${safeId}"]`)
  if (all.length === 0) return emptyResult()

  // iter-O phase-6.2 : ignorer les clones inertes des *ghost rows* d'OverflowToolbar
  // (visibility:hidden → getBoundingClientRect renvoie un rect NON nul mais
  // l'élément n'est pas vu ; sans ce filtre, l'ancre se résout sur le ghost,
  // mal placé). Désormais 5 headers passent leurs contrôles dans un OverflowToolbar,
  // donc un data-anchor peut s'y retrouver dupliqué.
  const visible = [...all].filter((el) => window.getComputedStyle(el).visibility !== 'hidden')
  const candidates = visible.length ? visible : [...all]

  for (const el of candidates) {
    const rect = el.getBoundingClientRect()
    if (rectIsVisible(rect)) {
      return {
        found: true,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        element: el,
      }
    }
  }

  // Aucun visible — on retourne quand même le premier rect, signalé
  // par found: true si non-dégénéré (le caller décide quoi en faire).
  const fallback = candidates[0]
  const fallbackRect = fallback.getBoundingClientRect()
  return {
    found: fallbackRect.width > 0 || fallbackRect.height > 0,
    top: fallbackRect.top,
    left: fallbackRect.left,
    width: fallbackRect.width,
    height: fallbackRect.height,
    element: fallback,
  }
}

// Pour les raccourcis composite (designer-notes : étiquettes ancrées sur
// chaque touche du clavier visuel), retourne la position des éléments
// `[data-anchor-key="<keyIdx>"]` contenus dans le conteneur identifié par
// `parentAnchorId`. La clé est la noteIndex (pas le keyboard code), car
// la mapping QWERTY → noteIndex dépend du système actif et change à
// runtime ; les layouts annotent en noteIndex (stable) et le caller fait
// le mapping depuis getKeyboardMap.
//
// Retourne un objet { '<keyIdx>': { found, top, left, width, height } }.
export function getAnchoredKeyPositions(parentAnchorId) {
  const parent = document.querySelector(`[data-anchor="${parentAnchorId.replace(/"/g, '\\"')}"]`)
  if (!parent) return {}
  const out = {}
  for (const el of parent.querySelectorAll('[data-anchor-key]')) {
    const key = el.getAttribute('data-anchor-key')
    if (key == null) continue
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    out[key] = {
      found: true,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    }
  }
  return out
}
