// src/lib/spline.js
//
// iter-M phase-3 : math des courbes du mode « spline » (éditeur points/courbe).
// Deux variantes périodiques échantillonnées sur RESOLUTION points :
//   - splineSoft : Catmull-Rom périodique (courbe lisse, C¹).
//   - splineHard : polyligne périodique (segments droits).
//
// Convention `points` du projet : index = x ∈ [0..RESOLUTION), valeur centrée sur
// [-1..1] (une période complète = le tableau entier). M.r.5.bis : la sortie n'est
// PLUS clampée à ±1 (alignement non-clamp sur le tracé libre) — un overshoot
// Catmull-Rom ou des ancres hautes peuvent dépasser ; l'audio est normalisé à la
// lecture, et la persistance .osa tolère [-10, 10] (borne défensive).
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
      // M.r.5.bis (passe d'usage) — plus de clamp à ±1 : aligné sur le tracé
      // libre, la courbe spline peut dépasser ±1 (overshoot Catmull-Rom, ancres
      // hautes). L'audio est normalisé à la lecture (disableNormalization: false),
      // le marqueur ±1 sert de repère pédagogique. Garde anti-NaN seulement.
      out[idx] = Number.isFinite(y) ? y : 0
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

// iter-N phase-2 : pose `N = max(2, round(count))` ancres aux points qui
// comptent par simplification Douglas-Peucker à compte fixe (plus d'ancres
// équiréparties — celles-ci tombaient au plat des créneaux et manquaient les
// transitions). La déviation est VERTICALE (la courbe est une fonction y(x)) et
// le nombre d'ancres FIXE : on scinde toujours le segment dont le pire point
// intérieur dévie le plus, jusqu'à atteindre N.
//
// Périodicité : la courbe reboucle modulo RESOLUTION (cf. sampleSpline). On
// traite donc la polyligne ouverte [0 … RESOLUTION] dont la borne x=RESOLUTION
// reboucle sur x=0 (même y) — borne VIRTUELLE (non stockée), x=0 servant
// d'ancre de référence de boucle (stable, comportement historique).
//
// Contrat INCHANGÉ : renvoie exactement N ancres {x, y}, triées par x croissant,
// x ∈ [0, RESOLUTION) entiers distincts, y = canonical[x] clampé [-1, 1]. La
// déviation est mesurée sur la canonical BRUTE (non clampée) pour bien choisir
// les points. Aucune mutation de `canonical`.
export function fitAnchorsToCurve(canonical, count = 8) {
  // RESOLUTION positions entières distinctes (0..599) → borne défensive du N.
  const N = Math.min(RESOLUTION, Math.max(2, Math.round(count)))
  const EPS = 1e-6

  // Valeur brute au point x ; x=RESOLUTION reboucle sur 0. Garde anti-NaN.
  const cval = (x) => {
    const v = x >= RESOLUTION ? canonical[0] : canonical[x]
    return Number.isFinite(v) ? v : 0
  }

  // Pire point intérieur d'un segment [xa, xb] : x entier maximisant l'écart à
  // la corde. x négatif si le segment n'a pas de point intérieur (largeur 1).
  const bestSplit = (xa, xb) => {
    const ya = cval(xa)
    const yb = cval(xb)
    const span = xb - xa
    let bestX = -1
    let bestDev = -1
    for (let x = xa + 1; x < xb; x++) {
      const chord = ya + ((yb - ya) * (x - xa)) / span
      const dev = Math.abs(cval(x) - chord)
      if (dev > bestDev) {
        bestDev = dev
        bestX = x
      }
    }
    return { x: bestX, dev: bestDev }
  }

  // Segments toujours triés par xa (splice in-place préserve l'ordre). Leurs
  // bornes xa SONT les ancres réelles ; x=RESOLUTION est la borne virtuelle.
  const segments = [{ xa: 0, xb: RESOLUTION, split: bestSplit(0, RESOLUTION) }]

  const splitAt = (idx, x) => {
    const seg = segments[idx]
    segments.splice(
      idx,
      1,
      { xa: seg.xa, xb: x, split: bestSplit(seg.xa, x) },
      { xa: x, xb: seg.xb, split: bestSplit(x, seg.xb) },
    )
  }

  // Phase 1 — Douglas-Peucker : scinde au point de plus grande déviation tant
  // qu'il en reste une significative (> EPS) et qu'on n'a pas atteint N.
  while (segments.length < N) {
    let best = -1
    let bestDev = EPS
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      if (s.split.x >= 0 && s.split.dev > bestDev) {
        bestDev = s.split.dev
        best = i
      }
    }
    if (best < 0) break // courbe (quasi) plate : plus rien de significatif
    splitAt(best, segments[best].split.x)
  }

  // Phase 2 — complétion géométrique : si la déviation s'est tarie avant N
  // (courbe plate/quasi), scinde le segment le plus large en son milieu. Borne
  // garantie : N ≤ RESOLUTION ⇒ il reste toujours un segment scindable.
  while (segments.length < N) {
    let best = -1
    let bestSpan = 1 // span ≥ 2 requis pour un point intérieur
    for (let i = 0; i < segments.length; i++) {
      const span = segments[i].xb - segments[i].xa
      if (span > bestSpan) {
        bestSpan = span
        best = i
      }
    }
    if (best < 0) break // défensif : plus aucun segment scindable
    const seg = segments[best]
    splitAt(best, Math.round((seg.xa + seg.xb) / 2))
  }

  // Sortie : les xa (ancres réelles, sans la borne virtuelle), y clampé [-1, 1].
  return segments.map((s) => {
    const yRaw = canonical[s.xa]
    const y = Number.isFinite(yRaw) ? Math.max(-1, Math.min(1, yRaw)) : 0
    return { x: s.xa, y }
  })
}
