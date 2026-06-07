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

// itération P — formes d'onde du LFO (switch sine/triangle/square du module
// Modulation). Les icônes Lucide `Triangle`/`Square` sont des polygones
// géométriques, pas des FORMES D'ONDE : on dessine ici les profils en style
// Lucide (un peu plus d'un cycle, centré sur la médiane y=12).
export function IconSine(props) {
  return (
    <svg {...lucideProps(props)}>
      <path d="M2 12 Q 6 3 10 12 T 18 12 T 22 12" />
    </svg>
  )
}
export function IconTriangleWave(props) {
  return (
    <svg {...lucideProps(props)}>
      <path d="M2 12 L 6 4 L 12 20 L 18 4 L 22 12" />
    </svg>
  )
}
export function IconSquareWave(props) {
  return (
    <svg {...lucideProps(props)}>
      <path d="M2 16 L 2 8 L 8 8 L 8 16 L 14 16 L 14 8 L 20 8 L 20 16 L 22 16" />
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

// iter-O phase-5c.f1 : contrôles de fenêtre façon Windows (style Lucide). Aucun
// équivalent Lucide ne rendait ce vocabulaire « fenêtre » — fabriqués ici.
// Minimiser = trait horizontal ; Maximiser = un rectangle ; Restaurer = deux
// rectangles décalés en diagonale (carré au premier plan + L du carré arrière
// qui dépasse — en stroke-only, on ne dessine du carré arrière que sa partie
// visible, sinon ses traits transparaîtraient dans le carré avant).
export function IconWinMinimize(props) {
  return (
    <svg {...lucideProps(props)}>
      <path d="M6 12 h12" />
    </svg>
  )
}
export function IconWinMaximize(props) {
  return (
    <svg {...lucideProps(props)}>
      <rect x="5" y="5" width="14" height="14" rx="1.5" />
    </svg>
  )
}
export function IconWinRestore(props) {
  return (
    <svg {...lucideProps(props)}>
      <path d="M8 9 V5 H19 V16 H15" />
      <rect x="4" y="9" width="11" height="11" rx="1.5" />
    </svg>
  )
}
