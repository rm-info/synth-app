import { useEffect, useState } from 'react'
import './ResolutionGate.css'

// iter G phase 1.4 + 2.6 : gate de résolution au chargement ET au resize.
//
//   < 924 × 668  : placeholder pleine page (overlay) — l'app reste montée
//                  en arrière-plan, donc localStorage et état mémoire sont
//                  préservés ; visuellement remplacée.
//   < 1740 × 900 : modale d'avertissement dismissible, app utilisable.
//   ≥ 1740 × 900 : passe-plat.
//
// **Pas d'effacement de localStorage** : la transition vers le placeholder
// est purement visuelle (overlay sur le DOM, pas d'unmount). Une manip
// temporaire (réduction de fenêtre pour ranger une autre app par-dessus,
// puis retour) ne perd ni données ni état mémoire (slider en cours de
// drag, ADSR en édition, etc.).
//
// Seuils calibrés sur des résolutions d'écran standards :
//   1024 × 768 → moins ~100 px de chrome navigateur + barre OS → 924 × 668
//   1920 × 1080 → moins ~180 px de chrome navigateur + barre OS → 1740 × 900
export const MIN_USABLE_WIDTH = 924
export const MIN_USABLE_HEIGHT = 668
export const RECOMMENDED_WIDTH = 1740
export const RECOMMENDED_HEIGHT = 900
export const NOMINAL_MIN_WIDTH = 1024
export const NOMINAL_MIN_HEIGHT = 768
export const NOMINAL_RECOMMENDED_WIDTH = 1920
export const NOMINAL_RECOMMENDED_HEIGHT = 1080

function captureViewport() {
  if (typeof window === 'undefined') {
    return { w: RECOMMENDED_WIDTH, h: RECOMMENDED_HEIGHT }
  }
  return { w: window.innerWidth, h: window.innerHeight }
}

export default function ResolutionGate({ children }) {
  const [{ w, h }, setViewport] = useState(captureViewport)
  const [warningDismissed, setWarningDismissed] = useState(false)

  useEffect(() => {
    const onResize = () => setViewport(captureViewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const tooSmall = w < MIN_USABLE_WIDTH || h < MIN_USABLE_HEIGHT
  const belowRecommended = !tooSmall && (w < RECOMMENDED_WIDTH || h < RECOMMENDED_HEIGHT)

  // L'app reste TOUJOURS montée — la transition est purement visuelle via
  // overlay (préservation du state React et de l'éventuel travail en
  // cours côté UI).
  return (
    <>
      {children}
      {tooSmall && (
        <div className="resolution-gate-blocked" role="dialog" aria-modal="true" aria-labelledby="resgate-blocked-title">
          <div className="resolution-gate-blocked-content">
            <h1 id="resgate-blocked-title">Synth App</h1>
            <p>
              Cette application n'est pas utilisable sur mobile ou sur des
              écrans de très petite résolution.
            </p>
            <p>
              Taille de fenêtre actuelle : <strong>{w} × {h}</strong>.
            </p>
            <p>
              Résolution d'écran minimale requise :{' '}
              <strong>{NOMINAL_MIN_WIDTH} × {NOMINAL_MIN_HEIGHT}</strong>{' '}
              — soit une taille de fenêtre d'au moins{' '}
              <strong>{MIN_USABLE_WIDTH} × {MIN_USABLE_HEIGHT}</strong>{' '}
              (la différence est réservée aux barres du navigateur et de
              l'OS).
              <br />
              Résolution conseillée :{' '}
              <strong>{NOMINAL_RECOMMENDED_WIDTH} × {NOMINAL_RECOMMENDED_HEIGHT}</strong>{' '}
              ou plus.
            </p>
            <figure className="resolution-gate-preview">
              <img
                src="/preview-1920x1080.png"
                alt="Aperçu de Synth App à pleine résolution"
                onError={(e) => {
                  // Tant que l'image n'a pas été ajoutée, on cache proprement
                  // la figure plutôt que d'afficher un alt cassé.
                  e.currentTarget.style.display = 'none'
                }}
              />
              <figcaption>Aperçu — Synth App en {NOMINAL_RECOMMENDED_WIDTH} × {NOMINAL_RECOMMENDED_HEIGHT}</figcaption>
            </figure>
          </div>
        </div>
      )}
      {belowRecommended && !warningDismissed && (
        <div className="resolution-gate-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="resgate-title">
          <div className="resolution-gate-modal">
            <h2 id="resgate-title">Résolution non optimale</h2>
            <p>
              Taille de fenêtre actuelle : <strong>{w} × {h}</strong>. Synth
              App est conçu pour une résolution d'écran de{' '}
              <strong>{NOMINAL_RECOMMENDED_WIDTH} × {NOMINAL_RECOMMENDED_HEIGHT}</strong>{' '}
              (≈ <strong>{RECOMMENDED_WIDTH} × {RECOMMENDED_HEIGHT}</strong>{' '}
              une fois les barres navigateur retranchées) — l'interface
              peut paraître à l'étroit (clavier compressé, dropdowns rognés,
              panneaux qui se chevauchent).
            </p>
            <p>
              Vous pouvez continuer en l'état. Une itération future adaptera
              l'UI aux résolutions intermédiaires.
            </p>
            <div className="resolution-gate-modal-actions">
              <button
                type="button"
                className="resolution-gate-modal-confirm"
                onClick={() => setWarningDismissed(true)}
              >
                Compris, continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
