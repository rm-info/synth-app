import { useState } from 'react'
import './ResolutionGate.css'

// iter G phase 1.4 : gate de résolution au chargement.
//
//   < 924 × 668  : placeholder pleine page, app non chargée
//   < 1740 × 900 : modale d'avertissement dismissible, app utilisable
//   ≥ 1740 × 900 : passe-plat
//
// La détection est faite UNE SEULE FOIS au mount (le useState lit
// `window.innerWidth/innerHeight` à l'init). Si l'utilisateur redimensionne
// la fenêtre après chargement, l'état du gate ne change pas — décision
// délibérée pour ne pas interrompre une session en cours. Une itération
// future adaptera l'UI aux résolutions intermédiaires (cf. CONTEXT.md
// backlog).
export const MIN_USABLE_WIDTH = 924
export const MIN_USABLE_HEIGHT = 668
export const RECOMMENDED_WIDTH = 1740
export const RECOMMENDED_HEIGHT = 900

function captureViewportAtMount() {
  // Lecture synchrone côté navigateur : valeurs immédiatement disponibles
  // (pas de SSR ici). En cas d'environnement sans window (tests), on
  // retombe sur des valeurs "OK" pour ne rien bloquer.
  if (typeof window === 'undefined') {
    return { w: RECOMMENDED_WIDTH, h: RECOMMENDED_HEIGHT }
  }
  return { w: window.innerWidth, h: window.innerHeight }
}

export default function ResolutionGate({ children }) {
  // Capture initiale figée au mount. `useState(init)` n'exécute init qu'une fois.
  const [{ w, h }] = useState(captureViewportAtMount)
  const [warningDismissed, setWarningDismissed] = useState(false)

  const tooSmall = w < MIN_USABLE_WIDTH || h < MIN_USABLE_HEIGHT
  const belowRecommended = !tooSmall && (w < RECOMMENDED_WIDTH || h < RECOMMENDED_HEIGHT)

  if (tooSmall) {
    return (
      <div className="resolution-gate-blocked">
        <div className="resolution-gate-blocked-content">
          <h1>Synth App</h1>
          <p>
            Cette application n'est pas utilisable sur mobile ou sur des
            écrans de très petite résolution.
          </p>
          <p>
            Résolution minimale requise : <strong>{MIN_USABLE_WIDTH} × {MIN_USABLE_HEIGHT}</strong>{' '}
            (votre écran : {w} × {h}). Résolution conseillée :{' '}
            <strong>{RECOMMENDED_WIDTH} × {RECOMMENDED_HEIGHT}</strong> ou plus.
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
            <figcaption>Aperçu — Synth App en 1920 × 1080</figcaption>
          </figure>
        </div>
      </div>
    )
  }

  return (
    <>
      {children}
      {belowRecommended && !warningDismissed && (
        <div className="resolution-gate-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="resgate-title">
          <div className="resolution-gate-modal">
            <h2 id="resgate-title">Résolution non optimale</h2>
            <p>
              Votre écran est de <strong>{w} × {h}</strong>. Synth App est
              conçu pour <strong>{RECOMMENDED_WIDTH} × {RECOMMENDED_HEIGHT}</strong> ou
              plus — l'interface peut paraître à l'étroit (clavier compressé,
              dropdowns rognés, panneaux qui se chevauchent).
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
