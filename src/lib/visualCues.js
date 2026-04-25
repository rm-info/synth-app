// Catalogue universel de patterns mélodiques/harmoniques (gammes & accords)
// pour la feature "repères visuels sur le clavier" (F.4.4, saveur A passive).
//
// Choix architectural : chaque pattern est défini par une liste d'intervalles
// EN CENTS depuis la tonique, sans référence à un système particulier.
// Avantage : une seule définition par pattern, qui produit des résultats
// différents selon le système courant via `frequencyToNearestIn` — la même
// "triade majeure" snappe à [0, 4, 7] en 12-TET et [0, 10, 18] en 31-EDO.
// C'est précisément l'intérêt pédagogique : voir comment un même objet
// musical s'incarne dans des grilles différentes.
//
// Référence numérique : ratios purs 5-limit (Ellis) pour la majorité,
// 7-limit pour la septième de dominante (968.826¢ = 7/4 harmonique).
// La "gamme par tons" est un cas particulier — strictement 12-TET (200¢
// par pas) — pour montrer comment 31-EDO ne la "ferme" pas.

import { getTuningSystem, frequencyToNearestIn } from './tuningSystems'

export const VISUAL_CUE_PATTERNS = {
  none: { label: 'Aucun', intervals: [] },

  // Accords
  'major-triad': { label: 'Triade majeure', intervals: [0, 386.314, 701.955] },
  'minor-triad': { label: 'Triade mineure', intervals: [0, 315.641, 701.955] },
  'dom7':        { label: 'Septième de dominante', intervals: [0, 386.314, 701.955, 968.826] },

  // Gammes
  'major-scale':      { label: 'Gamme majeure',           intervals: [0, 203.910, 386.314, 498.045, 701.955, 884.359, 1088.269] },
  'minor-scale':      { label: 'Gamme mineure naturelle', intervals: [0, 203.910, 315.641, 498.045, 701.955, 813.687, 1017.596] },
  'pentatonic-major': { label: 'Pentatonique majeure',    intervals: [0, 203.910, 386.314, 701.955, 884.359] },
  'whole-tone':       { label: 'Gamme par tons',          intervals: [0, 200, 400, 600, 800, 1000] },
}

// Systèmes pour lesquels les visual cues sont activés. 5-TET produit des
// approximations trop éloignées (errs > 90¢ sur la triade majeure) pour que
// les patterns harmoniques classiques aient un sens pédagogique. Libre n'a
// pas de degrés. Tout autre système non-libre du registre est éligible.
export const VISUAL_CUE_SUPPORTED_SYSTEMS = new Set([
  '12-TET', 'pythagorean-12', 'just-major-c',
  'meantone-quarter-comma', 'werckmeister-iii',
  '24-tet-equal', '24-tet-cairo-1932', '31-edo',
])

export function systemSupportsVisualCues(sysId) {
  return VISUAL_CUE_SUPPORTED_SYSTEMS.has(sysId)
}

// Calcule l'ensemble des `noteIndex` à surligner sur le clavier pour un
// pattern donné, dans le système courant, ancré sur le degré tonique
// choisi. Octave de calcul fixée à 4 (la grille du clavier n'affiche
// qu'une octave : seuls les indices intra-octave nous intéressent).
//
// Dédup via Set : plusieurs intervalles peuvent snapper sur le même degré
// dans des systèmes peu résolus (ex. 12-TET, où 813.687¢ et 884.359¢
// pourraient théoriquement collisionner — pas dans nos patterns actuels,
// mais le Set évite tout doublon par construction).
//
// Renvoie un Set vide pour pattern 'none', système libre, ou pattern
// inconnu — appelable sans guard côté UI.
export function cuedNoteIndices(patternId, tonicDegree, sysId, a4Ref) {
  const pattern = VISUAL_CUE_PATTERNS[patternId]
  if (!pattern || pattern.intervals.length === 0) return new Set()
  const sys = getTuningSystem(sysId)
  if (sys.freq === null) return new Set()

  const tonicFreq = sys.freq(tonicDegree, 4, a4Ref)
  const result = new Set()
  for (const cents of pattern.intervals) {
    const targetFreq = tonicFreq * Math.pow(2, cents / 1200)
    const { noteIndex } = frequencyToNearestIn(targetFreq, sysId, a4Ref)
    result.add(noteIndex)
  }
  return result
}
