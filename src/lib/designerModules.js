import { AudioWaveform, BarChart3, Grid2x2, Piano, AudioLines, Vibrate } from 'lucide-react'
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
  // itération P : 6ᵉ module. `Vibrate` (Lucide) — évocateur de la modulation,
  // libre (pas d'autre usage), pas d'Unicode. iter-T : libellé « Effets » (le
  // module accueille désormais une famille d'effets, pas seulement les LFO ;
  // l'id reste 'modulation' — clés persistées intactes, pas de migration).
  modulation:  { label: 'Effets',                      Icon: Vibrate },
}

// iter-O phase-5d : rangées du layout Designer (haut = 3 colonnes, bas = N
// cellules). Source unique de la politique d'auto-réduction « accordéon par
// rangée » : ouvrir un module replié réduit ses siblings de rangée ouverts.
// itération P : la rangée du bas passe à 3 cellules (params / adsr / modulation) ;
// rowSiblings, l'auto-réduction (O.5d), collapse/maximize (O.5a/b) et
// l'OverflowToolbar des headers (O.6.2) fonctionnent génériquement sur ce 3ᵉ membre.
export const DESIGNER_ROWS = {
  top: ['canvas', 'harmonics', 'spectrogram'],
  bottom: ['params', 'adsr', 'modulation'],
}
export const rowSiblings = (id) =>
  (Object.values(DESIGNER_ROWS).find((r) => r.includes(id)) ?? []).filter((m) => m !== id)

// iter-R phase-1 : ordre du switcher de modules en petit écran (< 924×668).
// Reprend l'ordre établi P.6.3 de l'ancien accordéon : Forme d'onde, Harmoniques,
// Spectro, Enveloppe, Modulation, **Instrument en dernier** (le plus accessible
// au pouce en bas). Distinct de DESIGNER_ROWS (layout desktop, params avant adsr).
// Source unique de la rangée d'icônes (DesignerToolbar) ET de l'empilement des
// corps (App.jsx).
export const DESIGNER_MOBILE_ORDER = ['canvas', 'harmonics', 'spectrogram', 'adsr', 'modulation', 'params']
