import { AudioWaveform, BarChart3, Grid2x2, Piano, AudioLines } from 'lucide-react'
import { STRINGS } from './strings'

// iter-O phase-5c : table partagée des 5 modules du Designer (identité visuelle).
// Source unique réutilisée par les headers (icône devant le titre) et la bande
// repliée (icône + titre en rotation). `Icon` = composant Lucide (pas d'Unicode,
// cf. iconographie projet). `label` = libellé court (aligné sur STRINGS).
//
// AHDSR : `AudioLines` (et non `Activity`, déjà pris par le toggle Graphe d'O.4 ;
// `Spline` est l'icône de la lentille interpolée). Spectro : `Grid2x2` (pas
// d'icône spectrogramme native dans Lucide).
export const MODULE_META = {
  canvas:      { label: STRINGS.editor.waveformTitle,  Icon: AudioWaveform },
  harmonics:   { label: STRINGS.editor.harmonicsTitle, Icon: BarChart3 },
  spectrogram: { label: 'Spectrogramme',               Icon: Grid2x2 },
  params:      { label: 'Instrument',                  Icon: Piano },
  adsr:        { label: 'Enveloppe AHDSR',             Icon: AudioLines },
}

// iter-O phase-5d : rangées du layout Designer (haut = 3 colonnes, bas = 2
// cellules). Source unique de la politique d'auto-réduction « accordéon par
// rangée » : ouvrir un module replié réduit ses siblings de rangée ouverts.
export const DESIGNER_ROWS = {
  top: ['canvas', 'harmonics', 'spectrogram'],
  bottom: ['params', 'adsr'],
}
export const rowSiblings = (id) =>
  (Object.values(DESIGNER_ROWS).find((r) => r.includes(id)) ?? []).filter((m) => m !== id)
