// Catalogue des durées musicales supportées par l'UI (E.6.1).
// Le snap est à 0.125 beat (triple croche). Un coef (×1.25, ×1.5, ×1.75) est
// "valide" sur une base si base × coef est multiple de 0.125.

const SNAP = 0.125

export const DURATION_BASES = [
  // Ordre du bouton 1 au bouton 7. `fraction` prend la noire comme référence
  // (= 1 beat), cohérent avec la formule `seconds = beats * 60 / bpm` du moteur.
  { rank: 1, value: 8,     name: 'Carrée',        solfège: '𝅜',   fraction: '8'   },
  { rank: 2, value: 4,     name: 'Ronde',         solfège: '𝅝',   fraction: '4'   },
  { rank: 3, value: 2,     name: 'Blanche',       solfège: '𝅗𝅥',   fraction: '2'   },
  { rank: 4, value: 1,     name: 'Noire',         solfège: '♩',   fraction: '1'   },
  { rank: 5, value: 0.5,   name: 'Croche',        solfège: '♪',   fraction: '1/2' },
  { rank: 6, value: 0.25,  name: 'Double croche', solfège: '𝅘𝅥𝅯',  fraction: '1/4' },
  { rank: 7, value: 0.125, name: 'Triple croche', solfège: '𝅘𝅥𝅰',  fraction: '1/8' },
]

export const DURATION_COEFS = [
  // Ordre du bouton 8 au bouton 10.
  { rank: 8,  value: 1.25, name: '×1.25',         solfège: '×1.25', fraction: '×1.25' },
  { rank: 9,  value: 1.5,  name: 'Pointé',        solfège: '•',     fraction: '×1.5'  },
  { rank: 10, value: 1.75, name: 'Double-pointé', solfège: '••',    fraction: '×1.75' },
]

// Durée effective d'une paire (base, coef).
export function effectiveDuration(base, coef) {
  return base * (coef ?? 1)
}

// Un coef est valide sur une base si base × coef atterrit pile sur la grille.
export function isValidCoef(base, coef) {
  if (coef == null) return true
  const ratio = effectiveDuration(base, coef) / SNAP
  return Math.abs(ratio - Math.round(ratio)) < 1e-9
}

// Retrouve (base, coef) qui produit `duration` parmi les 7×4 combinaisons
// possibles (7 bases × {null, 1.25, 1.5, 1.75}). Retourne { base, coef } si
// trouvé, sinon { base: null, coef: null } (durée "custom", aucun bouton actif).
export function deriveBaseAndCoef(duration) {
  const EPS = 1e-9
  for (const { value: base } of DURATION_BASES) {
    if (Math.abs(base - duration) < EPS) return { base, coef: null }
    for (const { value: coef } of DURATION_COEFS) {
      if (Math.abs(effectiveDuration(base, coef) - duration) < EPS) {
        return { base, coef }
      }
    }
  }
  return { base: null, coef: null }
}

// Nom humain lisible d'une durée (utilisé dans les tooltips, les flashes).
// Mode "solfège" : "Noire", "Noire pointée". Mode "fraction" : "1", "1 ×1.5"
// (référence = noire = 1 beat).
export function durationName(duration, mode = 'solfège') {
  const { base, coef } = deriveBaseAndCoef(duration)
  if (base == null) return `${duration} beats`
  const baseMeta = DURATION_BASES.find((b) => b.value === base)
  if (!baseMeta) return `${duration} beats`
  if (coef == null) {
    return mode === 'fraction' ? baseMeta.fraction : baseMeta.name
  }
  const coefMeta = DURATION_COEFS.find((c) => c.value === coef)
  if (!coefMeta) return mode === 'fraction' ? baseMeta.fraction : baseMeta.name
  if (mode === 'fraction') return `${baseMeta.fraction} ${coefMeta.fraction}`
  // Mode solfège : "Noire pointée" / "Blanche pointée" ; pour ×1.25 et ××,
  // on garde une forme compacte.
  if (coef === 1.5) return `${baseMeta.name} pointée`
  if (coef === 1.75) return `${baseMeta.name} double-pointée`
  return `${baseMeta.name} ×1.25`
}
