// Helpers de formatage de la hauteur d'un clip. Source de vérité partagée
// par Timeline, PropertiesPanel, PianoKeyboard.

export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

// Label court d'une hauteur : "A4", "C♯3", ou "440.0 Hz" en mode libre.
export function formatClipNote(clip) {
  if (clip.tuningSystem === 'free') {
    const hz = clip.frequency ?? 440
    return `${hz.toFixed(1)} Hz`
  }
  return `${NOTE_NAMES[clip.noteIndex ?? 9]}${clip.octave ?? 4}`
}
