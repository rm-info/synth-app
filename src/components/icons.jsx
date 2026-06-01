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

// Aperçu de répartition des 3 colonnes du Designer : un rectangle 48×16 avec
// deux séparateurs verticaux placés aux proportions `widths` ([a, b, c], somme 1).
// Remplace les anciens libellés Unicode ⅓⅓⅓ · ½¼¼ · ¼½¼ · ¼¼½ (r.2.6.6).
export function IconColumnLayout({ widths, ...rest }) {
  const W = 48
  const H = 16
  const x1 = Math.round(W * widths[0])
  const x2 = Math.round(W * (widths[0] + widths[1]))
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      {...rest}
    >
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="2" />
      <line x1={x1} y1="1" x2={x1} y2={H - 1} />
      <line x1={x2} y1="1" x2={x2} y2={H - 1} />
    </svg>
  )
}

// Crête (peak hold du spectrogramme) : un mini-spectre de barres verticales de
// hauteurs variées, chacune coiffée d'un court rectangle horizontal détaché — la
// « crête maintenue » au-dessus de la barre courante. Visuellement une série de
// « i » de tailles différentes. Barres et crêtes partagent la MÊME largeur `w`
// (rectangles pleins, pas des traits). Rien d'approprié dans Lucide (r.2.6.6).
export function IconCrete({ size = 24, color = 'currentColor', ...rest }) {
  const w = 3
  const baseY = 21
  const capH = 1.6
  // x = bord gauche du rectangle ; top = haut de la barre. La crête est posée
  // 2,4 px au-dessus du haut de barre (rectangle d'épaisseur capH détaché).
  const bars = [
    { x: 2.5, top: 13 },
    { x: 8, top: 6 },
    { x: 13.5, top: 10 },
    { x: 19, top: 15 },
  ]
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      stroke="none"
      {...rest}
    >
      {bars.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={b.top} width={w} height={baseY - b.top} rx="0.6" />
          <rect x={b.x} y={b.top - 4} width={w} height={capH} rx="0.6" />
        </g>
      ))}
    </svg>
  )
}
