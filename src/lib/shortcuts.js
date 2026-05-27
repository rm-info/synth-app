// src/lib/shortcuts.js — Source de vérité des raccourcis clavier (Iteration L.1).
//
// Une seule table déclarative `SHORTCUTS` consommée par :
//   - les handlers clavier (App.jsx, WaveformEditor.jsx, PatchBank.jsx) via
//     `matchesShortcut(e, id)` pour décider si un évènement déclenche l'action ;
//   - l'overlay « lever le voile » (`ShortcutsOverlay.jsx`, L.1.5) qui rend
//     une étiquette par entrée du contexte actif, positionnée près de son
//     ancre via l'attribut `data-anchor` posé sur l'élément d'UI ;
//   - la page Documentation > Raccourcis (générée en L.5 depuis cette table).
//
// Convention : `id` stable cross-version, `anchor` = même string que la valeur
// `data-anchor` posée sur l'élément cible. Pour les ancres dépendant du
// contexte (boutons Undo/Redo dupliqués par onglet, indicateur Octave divergent
// Designer/Composer), `anchor` est une fonction `(state) => string`.
//
// L'audit L.0 exclut explicitement certaines entrées (cf. archi/L1-prompt.md
// "Hors scope L.1") :
//   - C17 (touche note maintenue pendant drag) : reporté UX
//   - C2, B7, B9 : ergo standard (Esc/Enter)
//   - PatchBank ↑↓ : ergo standard liste
// Touches notes Designer (D6) et placement contigu Composer (C18) sont
// inclus sous forme COMPOSITE (mapping live dépendant de testTuningSystem /
// xEdoN, rendu spécial dans l'overlay L.1.5).

// ----- Helpers internes du parser de combo -----

// Sépare un combo "Ctrl/Cmd+Shift+Z" en { mods: Set, key: 'Z' }. La key est
// le dernier segment, les modifiers sont les précédents. Tolère espaces.
function parseCombo(combo) {
  const parts = combo.split('+').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return { mods: new Set(), key: '' }
  const key = parts[parts.length - 1]
  const mods = new Set(parts.slice(0, -1))
  return { mods, key }
}

// Vrai si tous les modifiers requis par `mods` sont présents dans l'évènement
// ET que les modifiers absents de `mods` sont OFF. Ctrl/Cmd = exactement un
// des deux (la posture cross-OS standard).
function matchModifiers(e, mods) {
  const wantCtrl = mods.has('Ctrl')
  const wantCmd = mods.has('Cmd')
  const wantEither = mods.has('Ctrl/Cmd')
  const wantShift = mods.has('Shift')
  const wantAlt = mods.has('Alt')

  if (wantEither) {
    // Exactement un des deux : Ctrl XOR Meta.
    if (!(e.ctrlKey ^ e.metaKey)) return false
  } else {
    if (wantCtrl !== e.ctrlKey) return false
    if (wantCmd !== e.metaKey) return false
  }
  if (wantShift !== e.shiftKey) return false
  if (wantAlt !== e.altKey) return false
  return true
}

// Vrai si la `key` du combo (sans modifiers) matche l'évènement. Supporte :
//   - lettre unique 'A'..'Z'      → e.code === 'KeyX'
//   - 'DigitN' / 'NumpadN'        → e.code === ...
//   - ranges 'Numpad1-7' / 'Digit8-0' (8,9,0) → e.code dans le set
//   - 'PageUp' / 'PageDown' / 'ArrowUp/Down/Left/Right' / 'Space' / 'Escape'
//     / 'Enter' / 'Delete' / 'Backspace' / 'F2' / 'Home' / 'End' / 'Tab' →
//     priorité e.code, fallback e.key.
function matchKey(e, key) {
  if (!key) return false

  // Lettre A-Z (combos type Ctrl+V) → e.key.toLowerCase() (lettre logique
  // de la disposition courante). Volontairement layout-dependent : un AZERTY
  // veut que sa touche "Z" déclenche Ctrl+Z, même si elle est physiquement
  // sur la position QWERTY-W (e.code === 'KeyW'). Convention navigateur
  // standard pour les raccourcis app (≠ touches notes Designer/Composer
  // qui restent layout-independent via getKeyboardMap + e.code).
  if (/^[A-Z]$/.test(key)) return e.key?.toLowerCase() === key.toLowerCase()

  // Range Numpad/Digit (ex. 'Numpad1-7', 'Digit8-0'). Le format est
  // <prefix><start>-<end> avec start/end ∈ [0..9]. Si end < start, on
  // interprète comme cyclique 0-based (8-0 ⇒ 8,9,0).
  const rangeMatch = key.match(/^(Numpad|Digit)(\d)-(\d)$/)
  if (rangeMatch) {
    const prefix = rangeMatch[1]
    const start = Number(rangeMatch[2])
    const end = Number(rangeMatch[3])
    const codeMatch = e.code.match(new RegExp(`^${prefix}(\\d)$`))
    if (!codeMatch) return false
    const n = Number(codeMatch[1])
    if (start <= end) return n >= start && n <= end
    // Range cyclique (ex. 8-0 ⇒ 8,9,0).
    return n >= start || n <= end
  }

  // Numpad/Digit explicite (single).
  if (/^(Numpad|Digit)\d$/.test(key)) return e.code === key

  // Touches spéciales : on match e.code OU e.key (selon ce qui est
  // disponible — PageUp est identique en code et en key, Space code === 'Space'
  // mais e.key === ' ').
  if (key === 'Space') return e.code === 'Space' || e.key === ' '
  if (e.code === key) return true
  if (e.key === key) return true
  return false
}

// ----- API publique -----

// Vrai si l'évènement clavier matche la combinaison primary OU alternative du
// raccourci identifié par `id`. Modifieurs strictement vérifiés (cf.
// matchModifiers). N'évalue PAS `condition` (filtrage runtime laissé aux
// handlers et à l'overlay).
export function matchesShortcut(e, id) {
  const entry = SHORTCUT_INDEX.get(id)
  if (!entry) return false
  return matchOneCombo(e, entry.keys.primary)
    || (entry.keys.alternative != null && matchOneCombo(e, entry.keys.alternative))
}

function matchOneCombo(e, combo) {
  if (!combo) return false
  // Combos composites textuels (touches notes : "(touches du clavier)") :
  // pas de matching ici, c'est le handler dédié qui gère le mapping live.
  if (combo.startsWith('(')) return false
  const { mods, key } = parseCombo(combo)
  if (!matchModifiers(e, mods)) return false
  return matchKey(e, key)
}

// Résout l'ancre (string) d'un raccourci compte tenu du state. Si `anchor`
// est une fonction, on l'invoque ; sinon retourne tel quel.
export function getAnchor(entry, state) {
  if (typeof entry.anchor === 'function') return entry.anchor(state)
  return entry.anchor
}

// Renvoie les raccourcis du contexte `ctx` ('global' | 'library' | 'designer'
// | 'composer'). Les entrées `contexts: ['global', ...]` apparaissent dans
// tous les onglets. Filtrage runtime via `condition(state)` à faire par le
// caller (l'overlay applique cette logique au rendu).
export function listShortcutsForContext(ctx) {
  return SHORTCUTS.filter((s) => s.contexts.includes(ctx) || s.contexts.includes('global'))
}

// Table principale. Ordre : Global → Designer → Composer → Bibliothèque,
// cohérent avec l'audit L.0.
export const SHORTCUTS = [
  // ============================================================
  // Global (multi-onglet)
  // ============================================================
  {
    id: 'global-shortcuts',
    contexts: ['global'],
    label: 'Raccourcis',
    description: "Ouvre l'overlay des raccourcis clavier du contexte actif.",
    keys: { primary: 'Ctrl/Cmd+K', alternative: null, display: 'Ctrl+K' },
    anchor: 'header-shortcuts-button',
  },
  {
    id: 'global-undo',
    contexts: ['global'],
    label: 'Annuler',
    description: "Annule la dernière action de l'onglet actif (Bibliothèque, Designer ou Composer).",
    keys: { primary: 'Ctrl/Cmd+Z', alternative: null, display: 'Ctrl+Z' },
    anchor: (state) => {
      const tab = state.activeTab
      return `global-undo-button-${tab === 'library' ? 'library' : tab === 'designer' ? 'designer' : 'composer'}`
    },
  },
  {
    id: 'global-redo',
    contexts: ['global'],
    label: 'Rétablir',
    description: 'Rejoue la dernière action annulée.',
    keys: { primary: 'Ctrl/Cmd+Shift+Z', alternative: 'Ctrl/Cmd+Y', display: 'Ctrl+Shift+Z' },
    anchor: (state) => {
      const tab = state.activeTab
      return `global-redo-button-${tab === 'library' ? 'library' : tab === 'designer' ? 'designer' : 'composer'}`
    },
  },
  {
    id: 'editor-octave',
    contexts: ['designer', 'composer'],
    label: 'Octave',
    description: "Décale l'octave de référence du clavier (±1, bornes 0-10).",
    keys: { primary: 'PageUp', alternative: 'PageDown', display: 'PageUp/PageDown' },
    anchor: (state) => state.activeTab === 'composer'
      ? 'composer-octave-indicator'
      : 'designer-octave-selector',
  },

  // ============================================================
  // Designer
  // ============================================================
  {
    id: 'designer-save',
    contexts: ['designer'],
    label: 'Sauvegarder',
    description: "Met à jour le patch chargé (ou ouvre la modale Sauvegarder si aucun patch n'est chargé).",
    keys: { primary: 'Ctrl/Cmd+S', alternative: null, display: 'Ctrl+S' },
    anchor: 'designer-save-button',
  },
  {
    id: 'designer-save-as',
    contexts: ['designer'],
    label: 'Sauvegarder comme nouveau',
    description: 'Force la création d\'un nouveau patch (fork du patch courant).',
    keys: { primary: 'Ctrl/Cmd+Alt+S', alternative: null, display: 'Ctrl+Alt+S' },
    anchor: 'designer-save-as-button',
  },
  {
    id: 'designer-new',
    contexts: ['designer'],
    label: 'Nouveau patch',
    description: "Vide l'éditeur pour démarrer un nouveau patch (avec confirmation si modifications non sauvegardées).",
    keys: { primary: 'Ctrl/Cmd+Alt+N', alternative: null, display: 'Ctrl+Alt+N' },
    anchor: 'designer-new-button',
  },
  {
    id: 'designer-sustain',
    contexts: ['designer'],
    label: 'Sustain',
    description: 'Pédale de sustain temporaire (touches maintenues = release différé jusqu\'au relâchement).',
    keys: { primary: 'Space', alternative: null, display: 'Espace' },
    anchor: 'designer-sustain-pastille',
  },
  {
    id: 'designer-test-free',
    contexts: ['designer'],
    label: 'Test mode Libre',
    description: 'Joue la note de test en mode Libre (équivalent du bouton Test, mousedown/mouseup).',
    keys: { primary: 'S', alternative: null, display: 's' },
    anchor: 'designer-test-free-button',
    condition: (state) => state.editor?.testTuningSystem === 'free',
  },
  {
    id: 'designer-notes',
    contexts: ['designer'],
    label: 'Touches notes',
    description: 'Joue les notes du système musical actif. Le mapping QWERTY varie selon le système et la valeur N (X-EDO).',
    keys: { primary: '(touches du clavier)', alternative: null, display: '— mapping live —' },
    anchor: 'designer-keyboard',
    composite: 'per-key',
  },

  // ============================================================
  // Composer
  // ============================================================
  {
    id: 'composer-delete',
    contexts: ['composer'],
    label: 'Supprimer la sélection',
    description: 'Supprime les clips sélectionnés.',
    keys: { primary: 'Delete', alternative: 'Backspace', display: 'Suppr' },
    anchor: 'composer-delete-button',
    condition: (state) => (state.selectedClipIds?.length ?? 0) > 0,
  },
  {
    id: 'composer-pitch-arrow',
    contexts: ['composer'],
    label: 'Hauteur ± demi-ton',
    description: "Décale la hauteur des clips sélectionnés (12-TET uniquement) de ±1 demi-ton.",
    keys: { primary: 'ArrowUp', alternative: 'ArrowDown', display: '↑/↓' },
    anchor: 'composer-anchor-clip',
    condition: (state) => (state.selectedClipIds?.length ?? 0) > 0,
  },
  {
    id: 'composer-pitch-shift',
    contexts: ['composer'],
    label: 'Hauteur ± octave',
    description: 'Décale la hauteur des clips sélectionnés de ±1 octave.',
    keys: { primary: 'Shift+ArrowUp', alternative: 'Shift+ArrowDown', display: 'Shift+↑/↓' },
    anchor: 'composer-anchor-clip',
    condition: (state) => (state.selectedClipIds?.length ?? 0) > 0,
  },
  {
    id: 'composer-pos-arrow',
    contexts: ['composer'],
    label: 'Position ± triple croche',
    description: 'Décale les clips sélectionnés sur la timeline de ±0.125 beat (triple croche).',
    keys: { primary: 'ArrowLeft', alternative: 'ArrowRight', display: '←/→' },
    anchor: 'composer-anchor-clip',
    condition: (state) => (state.selectedClipIds?.length ?? 0) > 0,
  },
  {
    id: 'composer-pos-shift',
    contexts: ['composer'],
    label: 'Position ± beat',
    description: 'Décale les clips sélectionnés sur la timeline de ±1 beat.',
    keys: { primary: 'Shift+ArrowLeft', alternative: 'Shift+ArrowRight', display: 'Shift+←/→' },
    anchor: 'composer-anchor-clip',
    condition: (state) => (state.selectedClipIds?.length ?? 0) > 0,
  },
  {
    id: 'composer-duration-base',
    contexts: ['composer'],
    label: 'Durée — base',
    description: "Définit la base de durée par défaut (1 = ronde → 7 = triple croche).",
    keys: { primary: 'Numpad1-7', alternative: 'Shift+Digit1-7', display: '1-7 (Numpad ou Shift+Digit)' },
    anchor: 'composer-duration-buttons',
  },
  {
    id: 'composer-duration-coef',
    contexts: ['composer'],
    label: 'Durée — coefficient',
    description: 'Applique un coefficient à la durée par défaut (8 = ×1.25, 9 = pointé, 0 = double-pointé).',
    keys: { primary: 'Numpad8-0', alternative: 'Shift+Digit8-0', display: '8/9/0 (Numpad ou Shift+Digit)' },
    anchor: 'composer-duration-buttons',
  },
  {
    id: 'composer-copy',
    contexts: ['composer'],
    label: 'Copier',
    description: 'Copie les clips sélectionnés dans le presse-papier.',
    keys: { primary: 'Ctrl/Cmd+C', alternative: null, display: 'Ctrl+C' },
    anchor: 'composer-copy-button',
    condition: (state) => (state.selectedClipIds?.length ?? 0) > 0,
  },
  {
    id: 'composer-cut',
    contexts: ['composer'],
    label: 'Couper',
    description: 'Coupe les clips sélectionnés (copie + suppression).',
    keys: { primary: 'Ctrl/Cmd+X', alternative: null, display: 'Ctrl+X' },
    anchor: 'composer-cut-button',
    condition: (state) => (state.selectedClipIds?.length ?? 0) > 0,
  },
  {
    id: 'composer-paste',
    contexts: ['composer'],
    label: 'Coller',
    description: 'Colle le contenu du presse-papier (à la position de la souris via raccourci, ou via le bouton selon les règles d\'ancre / piste sélectionnée).',
    keys: { primary: 'Ctrl/Cmd+V', alternative: null, display: 'Ctrl+V' },
    anchor: 'composer-paste-button',
    condition: (state) => state.clipboard != null,
  },
  {
    id: 'composer-merge',
    contexts: ['composer'],
    label: 'Fusionner',
    description: 'Fusionne ≥ 2 clips sélectionnés contigus (même patch / même piste).',
    keys: { primary: 'Ctrl/Cmd+M', alternative: null, display: 'Ctrl+M' },
    anchor: 'composer-merge-button',
    condition: (state) => (state.selectedClipIds?.length ?? 0) >= 2,
  },
  {
    id: 'composer-split2',
    contexts: ['composer'],
    label: 'Diviser par 2',
    description: 'Divise les clips sélectionnés en 2 parts égales.',
    keys: { primary: 'Ctrl/Cmd+D', alternative: null, display: 'Ctrl+D' },
    anchor: 'composer-split2-button',
    condition: (state) => (state.selectedClipIds?.length ?? 0) > 0,
  },
  {
    id: 'composer-split3',
    contexts: ['composer'],
    label: 'Diviser par 3',
    description: 'Divise les clips sélectionnés en 3 parts égales.',
    keys: { primary: 'Ctrl/Cmd+Shift+D', alternative: null, display: 'Ctrl+Shift+D' },
    anchor: 'composer-split3-button',
    condition: (state) => (state.selectedClipIds?.length ?? 0) > 0,
  },
  {
    id: 'composer-notes-contiguous',
    contexts: ['composer'],
    label: 'Placement contigu',
    description: "Place un clip après l'ancre (dernier clip touché), à la note pressée, dans son système musical.",
    keys: { primary: '(touches du clavier au relâchement)', alternative: null, display: 'touches notes' },
    anchor: 'composer-anchor-clip',
    composite: 'live',
  },

  // ============================================================
  // Bibliothèque (raccourcis gatés par focus dans l'aside library,
  // capture phase — cf. PatchBank.jsx)
  // ============================================================
  {
    id: 'library-copy',
    contexts: ['library'],
    label: 'Copier',
    description: 'Copie les items sélectionnés (patches + dossiers) dans le presse-papier bibliothèque.',
    keys: { primary: 'Ctrl/Cmd+C', alternative: null, display: 'Ctrl+C' },
    anchor: 'library-copy-button',
  },
  {
    id: 'library-cut',
    contexts: ['library'],
    label: 'Couper',
    description: 'Coupe les items sélectionnés (passage en mode "ghost" en attendant le coller).',
    keys: { primary: 'Ctrl/Cmd+X', alternative: null, display: 'Ctrl+X' },
    anchor: 'library-cut-button',
  },
  {
    id: 'library-paste',
    contexts: ['library'],
    label: 'Coller',
    description: 'Colle le contenu du presse-papier bibliothèque dans le dossier courant.',
    keys: { primary: 'Ctrl/Cmd+V', alternative: null, display: 'Ctrl+V' },
    anchor: 'library-paste-button',
  },
  {
    id: 'library-rename',
    contexts: ['library'],
    label: 'Renommer',
    description: 'Renomme l\'item sélectionné (mode édition inline).',
    keys: { primary: 'F2', alternative: null, display: 'F2' },
    anchor: 'library-rename-button',
  },
  {
    id: 'library-delete',
    contexts: ['library'],
    label: 'Supprimer',
    description: 'Supprime les items sélectionnés (avertissement modal si patches utilisés en Composer).',
    keys: { primary: 'Delete', alternative: 'Backspace', display: 'Suppr' },
    anchor: 'library-delete-button',
  },
  {
    id: 'library-select-all',
    contexts: ['library'],
    label: 'Sélectionner tout',
    description: 'Sélectionne tous les items visibles du mode courant.',
    keys: { primary: 'Ctrl/Cmd+A', alternative: null, display: 'Ctrl+A' },
    anchor: 'library-select-all-button',
  },
  {
    id: 'library-clear-clipboard',
    contexts: ['library'],
    label: 'Vider le presse-papier',
    description: 'Vide le presse-papier bibliothèque (la sélection est conservée — second appui sur Esc pour la vider).',
    keys: { primary: 'Escape', alternative: null, display: 'Esc' },
    anchor: 'library-clipboard-chip',
    condition: (state) => (state.bibClipboard?.items?.length ?? 0) > 0,
  },
]

// Index par id pour le matcher (O(1) au lieu de O(n) à chaque keydown).
const SHORTCUT_INDEX = new Map(SHORTCUTS.map((s) => [s.id, s]))

// ----- Tests mentaux (le projet n'a pas de Vitest installé) -----
//
// matchesShortcut(e, 'global-undo')
//   - { ctrlKey:true, key:'z', code:'KeyZ' }                → true
//   - { metaKey:true, key:'z', code:'KeyZ' }                → true (Cmd+Z)
//   - { ctrlKey:true, shiftKey:true, key:'Z', code:'KeyZ' } → false (Shift bloqué)
//   - { ctrlKey:true, altKey:true, key:'z', code:'KeyZ' }   → false (Alt présent)
//   - { key:'z', code:'KeyZ' }                              → false (pas de ctrl)
//
// matchesShortcut(e, 'global-redo')
//   - { ctrlKey:true, shiftKey:true, key:'Z', code:'KeyZ' } → true (primary)
//   - { ctrlKey:true, key:'y', code:'KeyY' }                → true (alternative)
//   - { metaKey:true, key:'y', code:'KeyY' }                → true (Cmd+Y)
//   - { ctrlKey:true, key:'z', code:'KeyZ' }                → false (matche undo, pas redo)
//
// matchesShortcut(e, 'designer-save')
//   - { ctrlKey:true, key:'s', code:'KeyS' }                → true
//   - { ctrlKey:true, altKey:true, key:'s', code:'KeyS' }   → false (Alt empêche, c'est save-as)
//
// matchesShortcut(e, 'designer-save-as')
//   - { ctrlKey:true, altKey:true, key:'s', code:'KeyS' }   → true
//
// matchesShortcut(e, 'composer-duration-base')
//   - { code:'Numpad1' }                                    → true
//   - { code:'Numpad7' }                                    → true
//   - { code:'Numpad8' }                                    → false (hors range 1-7)
//   - { shiftKey:true, code:'Digit3' }                      → true (alternative)
//   - { shiftKey:true, code:'Digit8' }                      → false (hors range)
//   - { code:'Digit3' }                                     → false (shift requis pour alt)
//
// matchesShortcut(e, 'composer-duration-coef')
//   - { code:'Numpad8' }                                    → true
//   - { code:'Numpad0' }                                    → true (range cyclique 8-0)
//   - { code:'Numpad1' }                                    → false
//
// matchesShortcut(e, 'editor-octave')
//   - { key:'PageUp', code:'PageUp' }                       → true
//   - { key:'PageDown', code:'PageDown' }                   → true (alternative)
//   - { ctrlKey:true, key:'PageUp', code:'PageUp' }         → false (Ctrl non spécifié → must be off)
//
// matchesShortcut(e, 'designer-sustain')
//   - { code:'Space', key:' ' }                             → true
//   - { code:'Space', key:' ', shiftKey:true }              → false
//
// matchesShortcut(e, 'composer-pitch-arrow')
//   - { key:'ArrowUp', code:'ArrowUp' }                     → true
//   - { shiftKey:true, key:'ArrowUp', code:'ArrowUp' }      → false (matche pitch-shift, pas pitch-arrow)
//
// getAnchor(SHORTCUT_INDEX.get('global-undo'), { activeTab:'designer' })
//   → 'global-undo-button-designer'
//
// listShortcutsForContext('composer')
//   → inclut composer-* + global-* + editor-octave (multi-contextes)
