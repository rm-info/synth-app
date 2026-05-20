import useWindowSize from '../hooks/useWindowSize'
import './TooSmallGate.css'

// v1.2.4 : seuil remonté à 700 × 500 (était 350 × 500). Les bugs
// d'affichage purs en dessous de 700 px sont corrigés (claviers,
// popover library), mais l'**interaction tactile** sur smartphone
// (canvas dessin au doigt, handles ADSR draggables, sliders fins)
// reste inadaptée. Plutôt que livrer une UX cassée, on bloque ce
// que les smartphones standard portrait atteignent (~360-414 px de
// largeur). Backlog : adapter pointer events / agrandir les
// surfaces tactiles pour réouvrir aux smartphones.
//
// Overlay z-index 10000 — l'App reste montée en arrière-plan, donc
// pas de perte de state ni de localStorage si l'utilisateur redimensionne
// la fenêtre brièvement. Réactif au resize via useWindowSize.
export const MIN_USABLE_WIDTH = 700
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
