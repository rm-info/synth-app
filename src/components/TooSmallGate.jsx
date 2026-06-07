import useWindowSize from '../hooks/useWindowSize'
import './TooSmallGate.css'

// iter-R phase-3.1 : plancher abaissé à 300/500, **orientation-aware** — utilisable
// si le côté court ≥ 300 ET le côté long ≥ 500 (donc 300×500 portrait ET 500×300
// paysage passent ; 300×300 ou 400×400 bloqués car côté long < 500). Le seuil ne
// porte plus que sur ce qui empêche l'affichage/l'atteignabilité (densifié en R.3.2).
//
// Limitation connue ASSUMÉE : sous ~700 px, l'**interaction tactile fine** (dessin
// au doigt, poignées AHDSR/LFO, sliders) reste inadaptée sur smartphone. Ce n'est
// PAS bloqué : à la souris (fenêtre desktop rétrécie) c'est le cas d'usage visé.
// Le travail pointer-events / agrandissement des surfaces tactiles reste backlog.
//
// Overlay z-index 10000 — l'App reste montée en arrière-plan, donc pas de perte de
// state ni de localStorage si l'utilisateur redimensionne la fenêtre brièvement.
// Réactif au resize via useWindowSize.
export const MIN_USABLE_SHORT = 300
export const MIN_USABLE_LONG = 500

export default function TooSmallGate({ children }) {
  const { w, h } = useWindowSize()
  const shorter = Math.min(w, h)
  const longer = Math.max(w, h)
  const tooSmall = shorter < MIN_USABLE_SHORT || longer < MIN_USABLE_LONG

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
              Minimum requis : <strong>{MIN_USABLE_SHORT} × {MIN_USABLE_LONG}</strong> (ou {MIN_USABLE_LONG} × {MIN_USABLE_SHORT}).
            </p>
          </div>
        </div>
      )}
    </>
  )
}
