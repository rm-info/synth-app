// src/lib/highlightElement.js — Halo temporaire sur un élément d'UI ciblé
// par un DocLink (iter-L phase-3.1). Deuxième consommateur de
// getAnchoredPosition après l'overlay raccourcis (L.1.5).
//
// Particularité : l'élément cible peut ne pas exister au moment de
// l'appel. Un DocLink cross-onglet bascule d'abord d'onglet
// (setActiveTab), et l'onglet cible se monte sur une frame ultérieure.
// On sonde donc le DOM via requestAnimationFrame, borné par maxWaitMs,
// jusqu'à ce que l'ancre apparaisse. Résolution gracieuse : ancre jamais
// trouvée (onglet introuvable, panneau replié → rect dégénéré, ancre
// dépendante d'une sélection absente) = no-op + warn en dev.

import { getAnchoredPosition } from './getAnchoredPosition'

const FLASH_CLASS = 'doc-highlight-flash'

// Timer de retrait du flash par élément, pour re-déclencher proprement
// l'animation si un nouveau highlight arrive avant la fin du précédent.
const activeTimers = new WeakMap()

export function highlightElement(anchorId, { duration = 2400, maxWaitMs = 800 } = {}) {
  if (!anchorId) return
  const start = performance.now()

  const attempt = () => {
    const { found, element } = getAnchoredPosition(anchorId)
    if (found && element) {
      flash(element, duration)
      return
    }
    if (performance.now() - start < maxWaitMs) {
      requestAnimationFrame(attempt)
      return
    }
    if (import.meta.env.DEV) console.warn('[DocLink] ancre introuvable:', anchorId)
  }

  requestAnimationFrame(attempt)
}

function flash(element, duration) {
  // Re-trigger propre : si un flash est déjà actif, on l'efface et on
  // force un reflow pour que l'animation reparte de zéro.
  const existing = activeTimers.get(element)
  if (existing) {
    clearTimeout(existing)
    element.classList.remove(FLASH_CLASS)
    void element.offsetWidth // reflow forcé → redémarre l'animation CSS
  }

  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  // La durée pilote l'animation CSS via une variable, pour garder le
  // retrait de classe et la fin du pulse synchronisés même si un caller
  // override `duration`.
  element.style.setProperty('--doc-highlight-duration', `${duration}ms`)
  element.classList.add(FLASH_CLASS)

  const timer = setTimeout(() => {
    element.classList.remove(FLASH_CLASS)
    element.style.removeProperty('--doc-highlight-duration')
    activeTimers.delete(element)
  }, duration)
  activeTimers.set(element, timer)
}
