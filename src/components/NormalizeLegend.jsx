// M.r.4 → étendue M.r.5.bis.2 — légende discrète de la zone Forme d'onde :
// rappelle ce que montrent les courbes empilées. « actuelle » (bleu = canonical,
// vérité audio) est toujours présente ; les deux autres entrées sont
// conditionnelles — « si normalisée » (gris) quand la canonical n'est pas
// normalisée, « spline des ancres » (orange) quand la spline parfaite est
// visible (résidu non négligeable). Le caller ne monte la légende que si au
// moins une entrée conditionnelle est active (sinon « actuelle » seule
// n'apporte rien). Purement informative (aria-hidden).
function NormalizeLegend({ showNormalized = true, showSpline = false }) {
  return (
    <div className="we-normalize-legend" aria-hidden="true">
      <span className="we-legend-item">
        <span className="we-legend-swatch swatch-current" /> actuelle
      </span>
      {showNormalized && (
        <span className="we-legend-item">
          <span className="we-legend-swatch swatch-normalized" /> si normalisée
        </span>
      )}
      {showSpline && (
        <span className="we-legend-item">
          <span className="we-legend-swatch swatch-spline" /> spline des ancres
        </span>
      )}
    </div>
  )
}

export default NormalizeLegend
