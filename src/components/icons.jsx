// iter-M phase-r.2.6.2 : SVG custom dans le style Lucide (stroke 2,
// currentColor, viewBox 24×24, pas de fill, line cap/join arrondis). Convention
// du projet : Lucide en priorité, SVG style Lucide en fallback quand rien dans
// le catalogue ne convient sémantiquement — jamais de caractères Unicode comme
// icônes. Regroupe ici tout SVG custom à venir.

// Props communes alignées sur l'API des composants lucide-react (size → côté du
// carré, color → currentColor par défaut). On accepte `...rest` pour laisser
// passer aria-hidden, className, etc.
function lucideProps({ size = 24, color = 'currentColor', ...rest }) {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest,
  }
}

// Doux : une sinusoïde lisse (bosse haute puis bosse basse) — courbure
// continue, raccord à l'interpolation Catmull-Rom.
export function IconDoux(props) {
  return (
    <svg {...lucideProps(props)}>
      <path d="M2 12 Q 7 2 12 12 T 22 12" />
    </svg>
  )
}

// Anguleux : le même profil rendu en zigzag triangulaire (segments droits) —
// pic en haut, creux en bas. La différence de courbure avec IconDoux est
// l'indice visuel voulu.
export function IconAnguleux(props) {
  return (
    <svg {...lucideProps(props)}>
      <path d="M2 12 L 7 4 L 12 12 L 17 20 L 22 12" />
    </svg>
  )
}
