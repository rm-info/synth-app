// src/lib/spline.js
//
// iter-M phase-3 : math des courbes du mode « spline » (éditeur points/courbe).
// Deux variantes périodiques échantillonnées sur RESOLUTION points :
//   - splineSoft : Catmull-Rom périodique (courbe lisse, C¹).
//   - splineHard : polyligne périodique (segments droits).
//
// Convention `points` du projet : index = x ∈ [0..RESOLUTION), valeur ∈ [-1..1]
// (une période complète = le tableau entier). La sortie est clampée à [-1, 1]
// pour rester dans le domaine attendu par la chaîne audio et la validation .osa
// (un dépassement Catmull-Rom serait sinon hors borne).
//
// Pas une moonshot : c'est l'iDFT du modèle « barres » côté harmonic — ici on
// reste dans le domaine temporel, la propreté harmonique vient de la régularité
// de la courbe (peu d'harmoniques hautes par construction, cf. spec §6).

const RESOLUTION = 600

// Pas de tri en place : on ne mute jamais le tableau d'ancres reçu.
function sortedByX(anchors) {
  return [...anchors].sort((a, b) => a.x - b.x)
}

// Échantillonne une courbe périodique passant par `anchors` (≥ 2). `soft`
// sélectionne Catmull-Rom (cubique) vs polyligne (linéaire).
//
// Stratégie de périodicité : on déroule les ancres sur trois copies décalées
// de -600 / 0 / +600 → un tableau d'abscisses strictement croissantes. Chaque
// segment de la copie centrale dispose ainsi de ses 4 points (P0..P3) avec des
// x monotones, y compris au wrap. On parcourt les N segments centraux, ce qui
// recouvre exactement les 600 résidus [0..600) une seule fois (l'écriture se
// fait modulo RESOLUTION pour ramener le segment de bouclage dans le tableau).
function sampleSpline(anchors, soft) {
  const out = new Float32Array(RESOLUTION)
  const pts = sortedByX(anchors)
  const N = pts.length

  const ext = []
  for (let k = -1; k <= 1; k++) {
    for (let m = 0; m < N; m++) {
      ext.push({ x: pts[m].x + k * RESOLUTION, y: pts[m].y })
    }
  }

  for (let i = 0; i < N; i++) {
    const c = N + i // index de P1 dans la copie centrale
    const P0 = ext[c - 1]
    const P1 = ext[c]
    const P2 = ext[c + 1]
    const P3 = ext[c + 2]
    const h = P2.x - P1.x
    if (h <= 0) continue // garde défensif : ancres confondues (ne devrait pas arriver)

    let m1 = 0
    let m2 = 0
    if (soft) {
      // Tangentes Catmull-Rom : pente moyenne vers les voisins. x déroulés
      // (donc dénominateurs > 0) grâce aux copies décalées.
      m1 = (P2.y - P0.y) / (P2.x - P0.x)
      m2 = (P3.y - P1.y) / (P3.x - P1.x)
    }

    const startX = Math.ceil(P1.x)
    for (let xi = startX; xi < P2.x; xi++) {
      const t = (xi - P1.x) / h
      let y
      if (soft) {
        const t2 = t * t
        const t3 = t2 * t
        const hb00 = 2 * t3 - 3 * t2 + 1
        const hb10 = t3 - 2 * t2 + t
        const hb01 = -2 * t3 + 3 * t2
        const hb11 = t3 - t2
        y = hb00 * P1.y + hb10 * h * m1 + hb01 * P2.y + hb11 * h * m2
      } else {
        y = P1.y + (P2.y - P1.y) * t
      }
      const idx = ((xi % RESOLUTION) + RESOLUTION) % RESOLUTION
      out[idx] = y < -1 ? -1 : y > 1 ? 1 : y
    }
  }
  return out
}

// Catmull-Rom périodique. Sortie : Float32Array(600).
export function splineSoft(anchors) {
  return sampleSpline(anchors, true)
}

// Polyligne périodique (le dernier segment anchor[N-1] → anchor[0] ferme la
// boucle). Sortie : Float32Array(600).
export function splineHard(anchors) {
  return sampleSpline(anchors, false)
}

// Dispatcher : 'soft' → Catmull-Rom, sinon polyligne. Point d'entrée unique
// pour le reducer (recalcul de `points` dérivé) et l'éditeur (preview live).
export function splineToPoints(anchors, interpolation) {
  return interpolation === 'hard' ? splineHard(anchors) : splineSoft(anchors)
}

// M rattrapage : ajuste `count` ancres équiréparties sur une courbe canonical
// (x = i·RESOLUTION/count, y = canonical[round(x)]), clampées dans le domaine
// ancres (x ∈ [0, RESOLUTION), y ∈ [-1, 1]). Utilisé par la migration v1→v2
// pour donner une lentille spline exploitable à un tracé/harmonique existant.
export function fitAnchorsToCurve(canonical, count = 8) {
  const n = Math.max(2, Math.round(count))
  const out = []
  for (let i = 0; i < n; i++) {
    const x = (i * RESOLUTION) / n
    const xi = Math.min(RESOLUTION - 1, Math.max(0, Math.round(x)))
    const yRaw = canonical[xi]
    const y = Number.isFinite(yRaw) ? Math.max(-1, Math.min(1, yRaw)) : 0
    out.push({ x: Math.min(RESOLUTION - 1, Math.max(0, x)), y })
  }
  return out
}
