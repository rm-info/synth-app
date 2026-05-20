import { useState, useEffect } from 'react'

// Hook utilitaire : retourne la taille courante de la fenêtre `{w, h}`,
// mise à jour à chaque resize. Utile pour les breakpoints UI qui exigent
// un changement structurel (re-render React, pas juste un display:none
// CSS).
//
// Pour les bascules visuelles simples (hide/show un mot, retailler une
// font), préférer une media query CSS — pas besoin de ce hook.
//
// Cas d'usage actuels (v1.2.0) :
//   - WaveformEditor : breakpoint 950 px pour collapser la row de
//     contrôles Instrument en un bouton + modale centrée (v1.1.0).
//   - App.jsx : breakpoints 924 px / 668 px pour basculer le Designer
//     en mode accordéon mobile (v1.2.0).
export default function useWindowSize() {
  const [size, setSize] = useState(() =>
    typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 1920, h: 1080 }
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}
