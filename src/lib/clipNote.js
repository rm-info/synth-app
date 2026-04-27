// Helpers de formatage de la hauteur d'un clip. Source de vérité partagée
// par Timeline, PropertiesPanel, PianoKeyboard.

import { DEFAULT_X_EDO_N, getNoteNames, getTuningSystem } from './tuningSystems'

// Re-export des noms 12-TET pour les call-sites qui affichent des labels de
// touches du clavier (PianoKeyboard) ou du feedback visuel clavier physique
// (Toolbar/App). Source de vérité unique : le registre.
export const NOTE_NAMES = getTuningSystem('12-TET').noteNames

// Label court d'une hauteur : "A4", "C♯3", ou "440.0 Hz" en mode libre.
// `xEdoN` n'est consulté que si `clip.tuningSystem === 'x-edo'` (factory de
// noteNames). Défaut DEFAULT_X_EDO_N pour rester appelable par des
// call-sites qui n'ont pas encore propagé l'état global (ex. pré-F.8.3).
export function formatClipNote(clip, xEdoN = DEFAULT_X_EDO_N) {
  if (clip.tuningSystem === 'free') {
    const hz = clip.frequency ?? 440
    return `${hz.toFixed(1)} Hz`
  }
  const sys = getTuningSystem(clip.tuningSystem)
  const names = getNoteNames(sys, xEdoN) ?? NOTE_NAMES
  return `${names[clip.noteIndex ?? 9]}${clip.octave ?? 4}`
}
