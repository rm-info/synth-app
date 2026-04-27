// === Layouts physiques X-EDO (F.8) ===
//
// Pour chaque N entre 1 et 53, génère :
//   - Une **table de cellules** (`xEdoLayoutForN`) avec position (col, row),
//     event.code et liste de "halves" (1 par cellule pour N≤43, 1 ou 2 pour
//     N≥44 selon le mode Shift). Consommée par GridXEdoLayout.jsx pour le
//     rendu visuel.
//   - Un mapping `event.code → noteIndex` pour le clavier physique
//     (`xEdoKeyboardMapForN`), qui aplatit les bases. La captation Shift
//     (degrés "shifted") est faite côté call-site (WaveformEditor) via
//     `event.shiftKey`.
//
// Trois modes d'ancrage selon N :
//   - HOME_ANCHOR (N ∈ [1..24]) : pas de rangée bottom. Home démarre à col 1
//     (KeyS = `s` AZERTY), alpha à col 2 (KeyE = `e`), digit à col 3
//     (Digit4 = `'`). Centré sur la home row, schémas N=1..24 du fichier.
//   - BOTTOM_ANCHOR (N ∈ [25..43]) : la rangée du bas existe et démarre à
//     col 1 (IntlBackslash = `<`). Home décale à col 2 (KeyA = `q`), alpha
//     à col 3 (KeyW = `z`), digit à col 4 (Digit3 = `"`). Tient compte de
//     la touche supplémentaire à gauche (`<`).
//   - SHIFT_ANCHOR (N ∈ [44..53]) : variante "Shift-enabled" qui exclut les
//     touches périphériques gauche (IntlBackslash, KeyA, KeyW, KeyQ) et
//     n'utilise PAS la rangée digit (réservée aux raccourcis durées Shift+
//     Digit du Composer). Bottom démarre à col 1 (KeyW = `w`), home à col 2
//     (KeyS = `s`), alpha à col 3 (KeyE = `e`). Chaque touche-position porte
//     2 degrés via Shift, sauf la dernière en N impair (cf. SHIFT_BASE_CELLS).
//
// AZERTY-FR ↔ event.code : event.code est position-based (US QWERTY), donc
// la touche AZERTY 'a' = KeyQ, 'z' = KeyW, 'q' = KeyA, 'w' = KeyZ, 'm' =
// Semicolon, 'ù' = Quote, '<' = IntlBackslash, '!' = Slash, '^' =
// BracketLeft, '$' = BracketRight, etc. (testé Linux/Windows AZERTY-FR).

// F.8.4.1 : OFFSET_*_ANCHOR supprimés. La col logique d'une cellule = i+1
// (1-based dans sa rangée), peu importe la rangée. L'effet "escalier" du
// clavier physique est reproduit côté CSS (subdivisions + offset par
// visualRow), pas dans la numérotation logique. Conséquence : pour N=9
// (home=5, alpha=4), KeyS et KeyE sont tous deux en col logique 1 et
// reçoivent les degrés consécutifs 0 et 1.
const KEYS_HOME_ANCHOR = {
  home:  ['KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'],
  alpha: ['KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
  digit: ['Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus'],
}

const KEYS_BOTTOM_ANCHOR = {
  bottom: ['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
  home:   ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
  alpha:  ['KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
  digit:  ['Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
}

// Distribution [bottom, home, alpha, digit] pour chaque N ∈ [1..43].
// Validée case-par-case contre les schémas du fichier de spec.
const ROW_DIST = [
  // N=1..8 : home seule
  [0, 1, 0, 0], [0, 2, 0, 0], [0, 3, 0, 0], [0, 4, 0, 0],
  [0, 5, 0, 0], [0, 6, 0, 0], [0, 7, 0, 0], [0, 8, 0, 0],
  // N=9..16 : home + alpha
  [0, 5, 4, 0], [0, 5, 5, 0], [0, 6, 5, 0], [0, 6, 6, 0],
  [0, 7, 6, 0], [0, 7, 7, 0], [0, 8, 7, 0], [0, 8, 8, 0],
  // N=17..24 : home + alpha + digit
  [0, 6, 6, 5], [0, 6, 6, 6], [0, 7, 6, 6], [0, 7, 7, 6],
  [0, 7, 7, 7], [0, 8, 7, 7], [0, 8, 8, 7], [0, 8, 8, 8],
  // N=25..43 : bottom + home + alpha + digit
  [7,  6,  6,  6],  [7,  7,  6,  6],  [7,  7,  7,  6],  [7,  7,  7,  7],
  [8,  7,  7,  7],  [8,  8,  7,  7],  [8,  8,  8,  7],  [8,  8,  8,  8],
  [9,  8,  8,  8],  [9,  9,  8,  8],  [9,  9,  9,  8],  [9,  9,  9,  9],
  [10, 9,  9,  9],  [10, 10, 9,  9],  [10, 10, 10, 9],  [10, 10, 10, 10],
  [11, 10, 10, 10], [11, 11, 10, 10], [11, 11, 11, 10],
]

const ROWS_BOTTOM_FIRST = ['bottom', 'home', 'alpha', 'digit']

// === Mode SHIFT (N ∈ [44..53]) ===
//
// Liste maître des cellules N=53 (max), construites en **col-major** depuis
// F.8.4.2 (col 1 = bottom+home+alpha, col 2 = idem, …) suivie des extensions
// progressives par palier impair de N (KeyL en 45, KeyP en 47, Period en 49,
// Semicolon en 51, BracketLeft en 53). L'invariant : la dernière cellule de
// la liste `SHIFT_BASE_CELLS.slice(0, K)` correspond toujours à la "touche
// nouvellement ajoutée" pour le N courant — celle qui devient "sans Shift"
// quand N est impair (cf. spec `archi/layouts_x-edo.txt` "+ Shift sauf X").
//
// `row` ∈ {0=bottom, 1=home, 2=alpha} (digit absent du mode Shift). `col`
// est 1-based dans le repère du layout. F.8.4.2 corrige aussi deux bugs :
//   - bottom commençait par `KeyW` (= AZERTY `z`, rangée alpha) au lieu de
//     `KeyZ` (= AZERTY `w`, rangée bottom). Conséquence : la touche
//     physique `w` AZERTY ne déclenchait pas le degré 0 (bug F.8.1.2).
//   - extension N=49 utilisait `Slash` (= `!` AZERTY) au lieu de `Period`
//     (= `:` AZERTY). La 9ᵉ position de la rangée bottom AZERTY-FR est `:`,
//     pas `!`. event.code Period sur AZERTY-FR Linux/Windows.
const SHIFT_BASE_CELLS = [
  // === Base N=44 : 22 cellules en col-major ===
  // col 1
  { col: 1, row: 0, code: 'KeyZ' },        // bottom: AZERTY `w`
  { col: 1, row: 1, code: 'KeyS' },        // home:   AZERTY `s`
  { col: 1, row: 2, code: 'KeyE' },        // alpha:  AZERTY `e`
  // col 2
  { col: 2, row: 0, code: 'KeyX' },        // `x`
  { col: 2, row: 1, code: 'KeyD' },        // `d`
  { col: 2, row: 2, code: 'KeyR' },        // `r`
  // col 3
  { col: 3, row: 0, code: 'KeyC' },
  { col: 3, row: 1, code: 'KeyF' },
  { col: 3, row: 2, code: 'KeyT' },
  // col 4
  { col: 4, row: 0, code: 'KeyV' },
  { col: 4, row: 1, code: 'KeyG' },
  { col: 4, row: 2, code: 'KeyY' },
  // col 5
  { col: 5, row: 0, code: 'KeyB' },
  { col: 5, row: 1, code: 'KeyH' },
  { col: 5, row: 2, code: 'KeyU' },
  // col 6
  { col: 6, row: 0, code: 'KeyN' },
  { col: 6, row: 1, code: 'KeyJ' },
  { col: 6, row: 2, code: 'KeyI' },
  // col 7
  { col: 7, row: 0, code: 'KeyM' },        // bottom: AZERTY `,`
  { col: 7, row: 1, code: 'KeyK' },
  { col: 7, row: 2, code: 'KeyO' },
  // col 8 : bottom seul (extension naturelle de la bottom row plus longue)
  { col: 8, row: 0, code: 'Comma' },       // bottom: AZERTY `;`
  // === Extensions progressives (1 cellule ajoutée par palier impair) ===
  { col: 8, row: 1, code: 'KeyL' },        // N=45 : home col 8 (`l`)
  { col: 8, row: 2, code: 'KeyP' },        // N=47 : alpha col 8 (`p`)
  { col: 9, row: 0, code: 'Period' },      // N=49 : bottom col 9 (`:` AZERTY = Period)
  { col: 9, row: 1, code: 'Semicolon' },   // N=51 : home col 9 (`m` AZERTY = Semicolon)
  { col: 9, row: 2, code: 'BracketLeft' }, // N=53 : alpha col 9 (`^` AZERTY = BracketLeft)
]

// Nombre de cellules actives selon N (44..53). Pour N pair, K cellules
// contribuent chacune 2 degrés (K = N/2). Pour N impair, K cellules dont
// la dernière contribue 1 seul degré (K = (N+1)/2, total = (K-1)*2 + 1 = N).
function shiftCellCount(N) {
  return Math.ceil(N / 2)
}

export const X_EDO_MIN_LAYOUT = 1
export const X_EDO_MAX_LAYOUT = 53

// `xEdoLayoutForN` retourne une description complète du layout pour un N
// donné, exploitable directement par GridXEdoLayout.jsx :
//
//   {
//     totalDegrees: number,           // = N (sanity check)
//     useShift: boolean,              // true si N ≥ 44 (cellules avec halves)
//     numCols: number,                // largeur de la grille (1-based max col)
//     numRows: number,                // nombre de rangées présentes
//     cells: [{
//       col: number,                  // 1-based, normalisée au layout
//       visualRow: number,            // 0-based depuis le bas (0 = rangée la plus basse)
//       code: string,                 // event.code de la touche-position
//       halves: [{
//         degree: number,             // 0-based
//         shift: boolean,             // false = base (moitié gauche), true = shifted (moitié droite)
//       }],
//     }],
//   }
//
// Pour N hors [1, 53], retourne null (fail-safe).
export function xEdoLayoutForN(N) {
  if (!Number.isInteger(N) || N < X_EDO_MIN_LAYOUT || N > X_EDO_MAX_LAYOUT) return null

  if (N >= 44) return buildShiftLayout(N)
  return buildClassicLayout(N)
}

// Layouts N ∈ [1..43] : 1 cellule = 1 degré (pas de Shift). Numérotation en
// serpentin-colonne ascendant strict (deg 0 = bas-gauche, on monte la
// colonne, puis colonne suivante en repartant du bas). F.8.4.1 : la col
// logique = i+1 (1-based dans la rangée), sans offset par rangée — l'effet
// escalier est reproduit côté CSS via subdivisions + visualRow.
function buildClassicLayout(N) {
  const dist = ROW_DIST[N - 1]
  const useBottom = dist[0] > 0
  const KEYS = useBottom ? KEYS_BOTTOM_ANCHOR : KEYS_HOME_ANCHOR

  const colMap = new Map()
  let minRowIndex = Infinity
  let maxRowIndex = -Infinity
  for (let r = 0; r < ROWS_BOTTOM_FIRST.length; r++) {
    const rowName = ROWS_BOTTOM_FIRST[r]
    const count = dist[r]
    if (count === 0) continue
    if (!KEYS[rowName]) continue
    minRowIndex = Math.min(minRowIndex, r)
    maxRowIndex = Math.max(maxRowIndex, r)
    for (let i = 0; i < count; i++) {
      const col = i + 1 // 1-based, peu importe la rangée
      const code = KEYS[rowName][i]
      if (!colMap.has(col)) colMap.set(col, [])
      colMap.get(col).push({ rowIndex: r, code })
    }
  }

  const sortedCols = [...colMap.keys()].sort((a, b) => a - b)
  const numCols = sortedCols[sortedCols.length - 1]
  const numRows = maxRowIndex - minRowIndex + 1

  const cells = []
  let degree = 0
  for (const col of sortedCols) {
    const cellsInCol = colMap.get(col).sort((a, b) => a.rowIndex - b.rowIndex)
    for (const { rowIndex, code } of cellsInCol) {
      cells.push({
        col,
        visualRow: rowIndex - minRowIndex,
        code,
        halves: [{ degree: degree++, shift: false }],
      })
    }
  }

  return { totalDegrees: degree, useShift: false, numCols, numRows, cells }
}

// Layouts N ∈ [44..53] : SHIFT_BASE_CELLS ordonnée, chaque cellule porte
// 1 ou 2 halves (base + shifted, sauf la dernière en N impair). La
// numérotation des degrés progresse cellule par cellule, half par half
// (base avant shifted), sans trou.
function buildShiftLayout(N) {
  const cellCount = shiftCellCount(N)
  const isOdd = N % 2 === 1
  const baseCells = SHIFT_BASE_CELLS.slice(0, cellCount)

  // numCols / numRows : enveloppe géométrique du layout. Les cellules SHIFT
  // partagent toujours 3 rangées (bottom/home/alpha) ; numCols varie selon
  // les extensions activées.
  const numCols = baseCells.reduce((m, c) => Math.max(m, c.col), 0)
  const numRows = 3

  const cells = []
  let degree = 0
  for (let i = 0; i < baseCells.length; i++) {
    const isLast = i === baseCells.length - 1
    const halves = [{ degree: degree++, shift: false }]
    if (!(isOdd && isLast)) {
      halves.push({ degree: degree++, shift: true })
    }
    cells.push({
      col: baseCells[i].col,
      visualRow: baseCells[i].row, // déjà 0=bottom dans SHIFT_BASE_CELLS
      code: baseCells[i].code,
      halves,
    })
  }

  return { totalDegrees: degree, useShift: true, numCols, numRows, cells }
}

// Mapping `event.code → degree` pour le clavier physique. Pour N ≤ 43, c'est
// exhaustif (1 degré par touche). Pour N ≥ 44, c'est le mapping des **degrés
// base uniquement** — les degrés "shifted" sont récupérés via
// `xEdoShiftedKeyboardMapForN(N)`. Le call-site (WaveformEditor) lit
// `event.shiftKey` pour choisir entre les deux.
export function xEdoKeyboardMapForN(N) {
  const layout = xEdoLayoutForN(N)
  if (!layout) return {}
  const result = {}
  for (const cell of layout.cells) {
    const baseHalf = cell.halves.find((h) => !h.shift)
    if (baseHalf) result[cell.code] = baseHalf.degree
  }
  return result
}

// Mapping `event.code → degree` pour les degrés "shifted" (moitié droite des
// cellules en mode Shift). Vide pour N ≤ 43 ou pour les cellules sans
// shifted (dernière cellule en N impair).
export function xEdoShiftedKeyboardMapForN(N) {
  const layout = xEdoLayoutForN(N)
  if (!layout || !layout.useShift) return {}
  const result = {}
  for (const cell of layout.cells) {
    const shiftedHalf = cell.halves.find((h) => h.shift)
    if (shiftedHalf) result[cell.code] = shiftedHalf.degree
  }
  return result
}
