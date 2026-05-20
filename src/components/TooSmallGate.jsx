import useWindowSize from '../hooks/useWindowSize'
import './TooSmallGate.css'

// v1.2.2 : dernier rempart responsive. En dessous de 350 × 500 px,
// l'app est vraiment inutilisable même en mode accordéon — on bloque
// avec un message simple. Au-dessus, l'app reste accessible via les
// adaptations v1.1.0 (modale Instrument <950) et v1.2.0 (accordéon
// Designer <924×668).
//
// Overlay z-index 10000 — l'App reste montée en arrière-plan, donc
// pas de perte de state ni de localStorage si l'utilisateur redimensionne
// la fenêtre brièvement. Réactif au resize via useWindowSize.
export const MIN_USABLE_WIDTH = 350
export const MIN_USABLE_HEIGHT = 500

export default function TooSmallGate({ children }) {
  const { w, h } = useWindowSize()
  const tooSmall = w < MIN_USABLE_WIDTH || h < MIN_USABLE_HEIGHT

  return (
    <>
      {children}
      {tooSmall && (
        <div className="too-small-gate" role="dialog" aria-modal="true" aria-labelledby="too-small-title">
          <div className="too-small-gate-content">
            <h1 id="too-small-title">Désolé !</h1>
            <p>
              Votre écran est trop petit pour utiliser On_Synth_App.
            </p>
            <p>
              Taille de fenêtre actuelle : <strong>{w} × {h}</strong>.
              <br />
              Minimum requis : <strong>{MIN_USABLE_WIDTH} × {MIN_USABLE_HEIGHT}</strong>.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
