// Mapping event.code → noteIndex (12-TET). Utilise la position physique
// de la touche (event.code) plutôt que le caractère produit (event.key) :
// le mapping fonctionne identiquement sur QWERTY / AZERTY / DVORAK.
//
// Rangée du milieu (blanches, façon clavier diatonique) :
//   S  D  F  G  H  J  K
//   C  D  E  F  G  A  B
// Rangée du haut (noires) :
//   E  R   ·  Y  U  I   ·
//   C♯ D♯  ·  F♯ G♯ A♯  ·
// (positions T et O sans correspondance — demi-tons E-F et B-C sans noire)
export const KEY_CODE_TO_NOTE_INDEX = {
  KeyS: 0,  // C
  KeyD: 2,  // D
  KeyF: 4,  // E
  KeyG: 5,  // F
  KeyH: 7,  // G
  KeyJ: 9,  // A
  KeyK: 11, // B
  KeyE: 1,  // C♯
  KeyR: 3,  // D♯
  KeyY: 6,  // F♯
  KeyU: 8,  // G♯
  KeyI: 10, // A♯
}
