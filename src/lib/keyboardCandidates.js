// Touches qui PEUVENT être mappées comme note-trigger dans au moins un
// système du registre, plus les ponctuations connues pour déclencher des
// raccourcis navigateur surprenants (Firefox QuickFind sur ' et /,
// raccourcis variés sur ` ; [ ] \).
//
// Posture mode note (F.7.5) : `e.preventDefault()` s'applique à TOUTES ces
// touches dès qu'on est en mode note (Designer / Composer hors form-field,
// sans Ctrl/Alt/Meta), même si la touche n'est pas dans le `keyboardMap`
// du système courant. F.3.6 avait fixé le QuickFind pour les touches
// mappées, mais en 12-TET (par exemple) un Digit4 (= ' AZERTY) reste
// non-mappé et faisait toujours apparaître la barre de recherche Firefox.
//
// La liste est volontairement statique : les `keyboardMap` du registre
// utilisent un sous-ensemble strict de ces codes. Si un nouveau système
// mappe une touche absente d'ici, l'ajouter explicitement (préférable à
// dériver dynamiquement depuis `TUNING_SYSTEMS` — la liste inclut des
// codes intentionnellement hors registre, comme Slash/Quote/Backquote).
//
// Hors liste (laissés passer) : touches modificateurs seules, F1-F12,
// Tab, Escape, Enter, flèches — leurs raccourcis navigateur sont
// soit légitimes (focus, soumission de form) soit absents.
export const NOTE_GUARD_KEYS = new Set([
  // Chiffres haut de clavier
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
  'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0',
  // Lettres rangée Q-P
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT',
  'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP',
  // Lettres rangée A-L
  'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG',
  'KeyH', 'KeyJ', 'KeyK', 'KeyL',
  // Lettres rangée Z-M + virgule
  'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB',
  'KeyN', 'KeyM', 'Comma',
  // Ponctuations à risque navigateur (QuickFind, etc.)
  'Slash', 'Quote', 'Backquote', 'Period', 'Semicolon',
  'BracketLeft', 'BracketRight', 'Backslash',
])
