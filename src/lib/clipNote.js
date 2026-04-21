// Helpers de formatage de la hauteur d'un clip. Source de vérité partagée
// par Timeline, PropertiesPanel, PianoKeyboard.

import { getTuningSystem } from './tuningSystems'

// Re-export des noms 12-TET pour les call-sites qui affichent des labels de
// touches du clavier (PianoKeyboard) ou du feedback visuel clavier physique
// (Toolbar/App). Source de vérité unique : le registre.
export const NOTE_NAMES = getTuningSystem('12-TET').noteNames

// Label court d'une hauteur : "A4", "C♯3", ou "440.0 Hz" en mode libre.
export function formatClipNote(clip) {
  if (clip.tuningSystem === 'free') {
    const hz = clip.frequency ?? 440
    return `${hz.toFixed(1)} Hz`
  }
  const names = getTuningSystem(clip.tuningSystem).noteNames ?? NOTE_NAMES
  return `${names[clip.noteIndex ?? 9]}${clip.octave ?? 4}`
}
