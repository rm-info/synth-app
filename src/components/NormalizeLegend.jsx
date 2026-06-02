// M.r.4 — légende discrète de la zone Forme d'onde : rappelle ce que montrent
// les deux tracés quand la canonical n'est pas normalisée (bleu = forme
// actuelle, gris = forme telle qu'elle serait après normalisation). Rendue en
// overlay dans le canvas (mode Libre comme mode Ancres), uniquement quand la
// courbe grise est visible. Purement informative (aria-hidden).
function NormalizeLegend() {
  return (
    <div className="we-normalize-legend" aria-hidden="true">
      <span className="we-legend-item">
        <span className="we-legend-swatch swatch-current" /> actuelle
      </span>
      <span className="we-legend-item">
        <span className="we-legend-swatch swatch-normalized" /> si normalisée
      </span>
    </div>
  )
}

export default NormalizeLegend
