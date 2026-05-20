import { useState, useEffect } from 'react'

// Hook utilitaire : retourne la largeur courante de la fenêtre, mise à
// jour à chaque resize. Utile pour les breakpoints UI qui exigent un
// changement structurel (re-render React, pas juste un display:none CSS).
//
// Pour les bascules visuelles simples (hide/show un mot, retailler une
// font), préférer une media query CSS — pas besoin de ce hook.
//
// Cas d'usage actuels :
//   - WaveformEditor (G/v1.1.0) : breakpoint 950 px pour collapser la
//     row de contrôles Instrument en un bouton + modale centrée.
//   - ResolutionGate (G.2.6) : utilise sa propre logique avec un state
//     {w, h} (besoin de la hauteur aussi). Pas factorisé ici pour ne
//     pas mêler les contrats.
export default function useWindowWidth() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1920
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}
