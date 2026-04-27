// === Layouts physiques X-EDO (F.8) ===
//
// Génère le mapping `event.code → noteIndex` (0-based) pour chaque N entre 1
// et 43 selon la spec visuelle `archi/layouts_x-edo.txt`. La règle générale
// est :
//
//   1. Chaque rangée du clavier physique (bas/home/alpha/digit) est utilisée
//      progressivement à mesure que N croît. Cycles :
//        N ∈ [1..8]   → home seule
//        N ∈ [9..16]  → home + alpha (4 touches alpha au pas 9, etc.)
//        N ∈ [17..24] → home + alpha + digit
//        N ∈ [25..43] → bottom + home + alpha + digit
//   2. Les rangées plus hautes sont décalées d'+1 colonne par rapport à
//      celle du dessous (effet "escalier" — équivalent à la géométrie
//      physique du clavier QWERTY/AZERTY où chaque rangée est décalée
//      d'1/2 touche à droite).
//   3. Numérotation **serpentin-colonne ascendant** : deg 0 = bas-gauche
//      (col 1, rangée la plus basse présente), on monte la colonne, puis
//      colonne suivante en repartant du bas.
//
// AZERTY-FR ↔ event.code : event.code est position-based (US QWERTY), donc
// la touche AZERTY 'a' = KeyQ, 'z' = KeyW, 'q' = KeyA, 'w' = KeyZ, 'm' =
// Semicolon, 'ù' = Quote, '<' = IntlBackslash, '!' = Slash, '^' =
// BracketLeft, '$' = BracketRight, etc. (testé Linux/Windows AZERTY-FR).
//
// **Hors scope F.8.1.2** : la logique Shift pour les layouts N=44..53 (où
// chaque touche-position porte deux degrés via Shift) vient en F.8.2 avec
// le composant GridXEdoLayout. La table actuelle s'arrête à N=43, et
// `xEdoKeyboardMapForN` retourne `{}` pour N > 43 (fail-safe — aucune
// touche ne déclenche, l'utilisateur est limité au clic souris à venir).

// Ordre des touches gauche-droite par rangée. Deux modes selon que la
// rangée du bas est utilisée :
//
//  - HOME_ANCHOR (N ≤ 24) : pas de rangée bottom. Home démarre à col 1
//    (KeyS = `s` AZERTY), alpha à col 2 (KeyE = `e`), digit à col 3
//    (Digit4 = `'`). C'est la position visuellement "centrée" sur la
//    home row, telle que les schémas N=1..24 l'illustrent.
//
//  - BOTTOM_ANCHOR (N ≥ 25) : la rangée du bas existe et démarre à col 1
//    (IntlBackslash = `<`). Home décale à col 2 (KeyA = `q`), alpha à
//    col 3 (KeyW = `z`), digit à col 4 (Digit3 = `"`). Le décalage tient
//    compte de la touche supplémentaire à gauche (`<`).
const KEYS_HOME_ANCHOR = {
  home:  ['KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'],
  alpha: ['KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
  digit: ['Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus'],
}
const OFFSET_HOME_ANCHOR = { home: 1, alpha: 2, digit: 3 }

const KEYS_BOTTOM_ANCHOR = {
  bottom: ['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
  home:   ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
  alpha:  ['KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
  digit:  ['Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
}
const OFFSET_BOTTOM_ANCHOR = { bottom: 1, home: 2, alpha: 3, digit: 4 }

// Distribution [bottom, home, alpha, digit] pour chaque N (index 0 = N=1).
// Validée case-par-case contre les schémas du fichier de spec :
//   - N ∈ [1..8]   : home N + 0 + 0 + 0
//   - N ∈ [9..16]  : alterne home/alpha en partant de [5,4]
//   - N ∈ [17..24] : ajoute digit en partant de [6,6,5]
//   - N ∈ [25..43] : ajoute bottom, cycle bottom→home→alpha→digit en
//     partant de [7,6,6,6] et incrémentant tour à tour.
const ROW_DIST = [
  // N=1..8
  [0, 1, 0, 0], [0, 2, 0, 0], [0, 3, 0, 0], [0, 4, 0, 0],
  [0, 5, 0, 0], [0, 6, 0, 0], [0, 7, 0, 0], [0, 8, 0, 0],
  // N=9..16
  [0, 5, 4, 0], [0, 5, 5, 0], [0, 6, 5, 0], [0, 6, 6, 0],
  [0, 7, 6, 0], [0, 7, 7, 0], [0, 8, 7, 0], [0, 8, 8, 0],
  // N=17..24
  [0, 6, 6, 5], [0, 6, 6, 6], [0, 7, 6, 6], [0, 7, 7, 6],
  [0, 7, 7, 7], [0, 8, 7, 7], [0, 8, 8, 7], [0, 8, 8, 8],
  // N=25..43
  [7,  6,  6,  6],  [7,  7,  6,  6],  [7,  7,  7,  6],  [7,  7,  7,  7],
  [8,  7,  7,  7],  [8,  8,  7,  7],  [8,  8,  8,  7],  [8,  8,  8,  8],
  [9,  8,  8,  8],  [9,  9,  8,  8],  [9,  9,  9,  8],  [9,  9,  9,  9],
  [10, 9,  9,  9],  [10, 10, 9,  9],  [10, 10, 10, 9],  [10, 10, 10, 10],
  [11, 10, 10, 10], [11, 11, 10, 10], [11, 11, 11, 10],
]

const ROWS_BOTTOM_FIRST = ['bottom', 'home', 'alpha', 'digit']
export const X_EDO_MAX_LAYOUT = ROW_DIST.length // 43 en F.8.1.2

// Construit le mapping `event.code → noteIndex` pour un N donné. Renvoie un
// objet vide pour N hors [1, X_EDO_MAX_LAYOUT] (fail-safe). L'algorithme :
//
//  1. Choisir le mode d'ancrage selon que la rangée bottom est utilisée.
//  2. Indexer chaque touche par sa colonne physique selon les offsets.
//  3. Lire colonne par colonne (gauche→droite), au sein de chaque colonne
//     bas→haut (bottom < home < alpha < digit).
export function xEdoKeyboardMapForN(N) {
  if (!Number.isInteger(N) || N < 1 || N > X_EDO_MAX_LAYOUT) return {}

  const dist = ROW_DIST[N - 1]
  const useBottom = dist[0] > 0
  const KEYS = useBottom ? KEYS_BOTTOM_ANCHOR : KEYS_HOME_ANCHOR
  const OFFSET = useBottom ? OFFSET_BOTTOM_ANCHOR : OFFSET_HOME_ANCHOR

  // colMap : col(int) → array of { rowIndex, code } trié implicitement par
  // rowIndex (insertion dans l'ordre bottom→home→alpha→digit).
  const colMap = new Map()
  for (let r = 0; r < ROWS_BOTTOM_FIRST.length; r++) {
    const rowName = ROWS_BOTTOM_FIRST[r]
    const count = dist[r]
    if (count === 0) continue
    const offset = OFFSET[rowName]
    if (offset === undefined) continue
    for (let i = 0; i < count; i++) {
      const col = offset + i
      const code = KEYS[rowName][i]
      if (!colMap.has(col)) colMap.set(col, [])
      colMap.get(col).push({ rowIndex: r, code })
    }
  }

  const result = {}
  let degree = 0
  const sortedCols = [...colMap.keys()].sort((a, b) => a - b)
  for (const col of sortedCols) {
    const cells = colMap.get(col).sort((a, b) => a.rowIndex - b.rowIndex)
    for (const { code } of cells) {
      result[code] = degree++
    }
  }
  return result
}
