import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { SHORTCUTS, getAnchor } from '../lib/shortcuts'
import { getAnchoredPosition, getAnchoredKeyPositions } from '../lib/getAnchoredPosition'
import { getKeyboardMap, getTuningSystem } from '../lib/tuningSystems'
import { xEdoShiftedKeyboardMapForN } from '../lib/xEdoLayouts'
import './ShortcutsOverlay.css'

// Décodeur QWERTY pour les composite per-key (touches notes Designer).
function keyCodeLabel(code) {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return `N${code.slice(6)}`
  const SPECIAL = {
    Slash: '/', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Quote: "'", Backquote: '`', Comma: ',', Period: '.', Semicolon: ';',
    Minus: '-', Equal: '=', Space: '⎵',
  }
  return SPECIAL[code] ?? code
}

// Mesure réelle de la largeur d'un texte via canvas, en matchant la font
// de .shortcuts-overlay-fit-text (bold 0.85rem ≈ 13.6px, system-ui).
// Singleton de contexte 2d (canvas off-DOM) pour éviter recréation.
let _measureCtx = null
function getMeasureCtx() {
  if (!_measureCtx) {
    _measureCtx = document.createElement('canvas').getContext('2d')
  }
  _measureCtx.font = '700 13.6px system-ui, -apple-system, sans-serif'
  return _measureCtx
}

// Hauteur de ligne effective pour la font 0.85rem bold. line-height: 1.15
// en CSS → ~15.6px par ligne. On prend 18px pour absorber les variations
// inter-fontes (system-ui rend différemment selon l'OS) et la baseline-
// height des inline boxes qui peut excéder le `line-height` numérique.
const LINE_HEIGHT_PX = 18
const PADDING_X = 8
const PADDING_Y = 8
// Marge de respiration au bord du viewport quand le hover déplace la boîte.
// Empêche les étiquettes d'être collées au bord (lisibilité + esthétique).
const EDGE_MARGIN = 16

// Mesure les dimensions naturelles d'un display, en gérant le wrapping
// inséré au '\n' (entre combinaisons distinctes, jamais à l'intérieur).
// Retourne { naturalW, naturalH }.
function measureContentBox(display) {
  if (!display) return { naturalW: 8, naturalH: LINE_HEIGHT_PX }
  const ctx = getMeasureCtx()
  const lines = display.split('\n')
  let maxW = 0
  for (const line of lines) {
    const w = ctx.measureText(line).width
    if (w > maxW) maxW = w
  }
  return {
    naturalW: Math.max(8, maxW),
    naturalH: Math.max(LINE_HEIGHT_PX, lines.length * LINE_HEIGHT_PX),
  }
}

// Calcule toutes les dimensions du libellé : taille au repos (= rect de
// l'ancre), taille au hover (= contenu naturel + padding, peut être
// plus petit OU plus grand que le rest selon la longueur du texte), et
// position au hover (en cas de proximité bord du viewport, on ancre
// l'edge le moins spacieux et on étend vers l'edge le plus spacieux).
//   textScale = facteur de scale CSS du texte au repos (≤ 1)
//   Au hover, le texte revient à scale 1.0 (taille naturelle) et la
//   boîte change de width/height (transition explicite, pas un scale
//   uniforme — la forme de la boîte sort de celle de l'ancre).
function computeFitDims(rect, display) {
  const { naturalW, naturalH } = measureContentBox(display)
  const targetW = Math.max(4, rect.width - PADDING_X * 2)
  const targetH = Math.max(4, rect.height - PADDING_Y * 2)
  const scaleX = targetW / naturalW
  const scaleY = targetH / naturalH
  const textScale = Math.min(1, scaleX, scaleY)

  // Dimensions cibles au hover : contenu naturel + padding. Si le rest
  // est déjà plus grand (texte court sur grand bouton), on conserve le
  // rest (pas de rétrécissement à l'hover).
  const hoverW = Math.max(rect.width, Math.ceil(naturalW + PADDING_X * 2))
  const hoverH = Math.max(rect.height, Math.ceil(naturalH + PADDING_Y * 2))

  // Détermine la position cible au hover : si la croissance dans une
  // direction sortirait du viewport, on ancre l'edge opposé. Décision
  // par axe indépendante.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const spaceLeft = rect.left
  const spaceRight = vw - (rect.left + rect.width)
  const spaceUp = rect.top
  const spaceDown = vh - (rect.top + rect.height)
  const deltaW = hoverW - rect.width
  const deltaH = hoverH - rect.height

  // Par défaut : centrer la croissance (gauche/droite et haut/bas
  // répartis également). Si l'un des côtés n'a pas la place, on bascule
  // sur l'autre.
  let hoverLeft = rect.left - deltaW / 2
  if (hoverLeft < EDGE_MARGIN) hoverLeft = EDGE_MARGIN
  else if (hoverLeft + hoverW > vw - EDGE_MARGIN) hoverLeft = vw - EDGE_MARGIN - hoverW

  let hoverTop = rect.top - deltaH / 2
  if (hoverTop < EDGE_MARGIN) hoverTop = EDGE_MARGIN
  else if (hoverTop + hoverH > vh - EDGE_MARGIN) hoverTop = vh - EDGE_MARGIN - hoverH

  // Évite spaceLeft / spaceRight / spaceUp / spaceDown unused warnings :
  // ces variables sont utiles si on veut un placement plus subtil à
  // l'avenir (privilégier le côté avec le plus d'espace plutôt que
  // recentrer puis clamper).
  void spaceLeft; void spaceRight; void spaceUp; void spaceDown

  return { textScale, hoverW, hoverH, hoverLeft, hoverTop }
}

// Composant overlay "lever le voile" (iter-L phase 1.5, révisé post-feedback).
// Chaque libellé occupe exactement le rect de son ancre via data-anchor.
// Texte réduit (scale CSS) pour tenir dans la boîte ; au survol, la boîte
// elle-même scale → texte à taille naturelle, lisible. Pas de collision
// possible par construction (les boîtes ne dépassent jamais leur ancre).
function ShortcutsOverlay({ isOpen, onClose, state }) {
  const [, force] = useState(0)
  const rerender = useCallback(() => force((n) => n + 1), [])

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', rerender)
    window.addEventListener('scroll', rerender, true)
    return () => {
      window.removeEventListener('resize', rerender)
      window.removeEventListener('scroll', rerender, true)
    }
  }, [isOpen, rerender])

  useEffect(() => {
    if (!isOpen) return
    const t = requestAnimationFrame(rerender)
    return () => cancelAnimationFrame(t)
  }, [isOpen, rerender])

  // Pendant l'overlay : capture TOUS les keydown, ferme sur toute action
  // clavier non-modifier (Esc, lettre, espace, flèches, etc.). Capture
  // phase impératif pour devancer les handlers métier (notes Designer,
  // Ctrl+K toggle, Ctrl+CXVMD Composer…) qui sinon happent l'événement.
  // Les modificateurs seuls (Shift/Ctrl/Alt/Meta press) sont laissés
  // passer pour ne pas fermer si l'utilisateur tient Ctrl en visant
  // Ctrl+K (qui ferme via la capture au K). Symétrie keyup : on absorbe
  // aussi le keyup pour éviter qu'un sustain ou une note tenue lors de
  // l'ouverture ne fasse de bruit après fermeture.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      const isModifierOnly = e.key === 'Shift' || e.key === 'Control'
        || e.key === 'Alt' || e.key === 'Meta' || e.key === 'AltGraph'
      if (isModifierOnly) return
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation?.()
      onClose?.()
    }
    const onKeyUp = (e) => {
      e.stopPropagation()
      e.stopImmediatePropagation?.()
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const activeTab = state.activeTab
  // Entrées visibles : tous les raccourcis du contexte actif + globaux.
  // Le champ `condition` de SHORTCUTS n'est PAS appliqué ici : on veut
  // afficher tous les libellés pour que l'utilisateur sache que le
  // raccourci existe (même quand le bouton sous-jacent est disabled).
  // L'absence de la cible DOM (ex. composer-merge-button qui n'apparaît
  // qu'avec une multi-sélection) suffit à masquer naturellement le
  // libellé.
  const visible = SHORTCUTS.filter((s) =>
    s.contexts.includes('global') || s.contexts.includes(activeTab)
  )

  // Groupe par anchor id, hors composite 'per-key' (designer-notes rendu par
  // touche, plus bas). composer-notes-contiguous (composite 'live') est
  // inclus comme une entrée régulière, son display textuel "touches notes"
  // s'ajoute à la combinaison sur composer-anchor-clip.
  const groups = new Map()
  for (const s of visible) {
    if (s.composite === 'per-key') continue
    const anchorId = getAnchor(s, state)
    if (!anchorId) continue
    if (!groups.has(anchorId)) groups.set(anchorId, [])
    groups.get(anchorId).push(s)
  }

  const labels = []
  for (const [anchorId, items] of groups.entries()) {
    const pos = getAnchoredPosition(anchorId)
    if (!pos.found) continue
    // Wrap entre combinaisons (jamais à l'intérieur d'une combo unique).
    // Multi-shortcut sur même ancre = lignes séparées au rendering ; au
    // hover, le box prend les dimensions naturelles du contenu multi-ligne
    // plutôt qu'un long flux horizontal de 250px+ qui forcerait un scale
    // disproportionné.
    const display = items.map((s) => s.keys.display).filter(Boolean).join('\n')
    if (!display) continue
    labels.push({ key: anchorId, display, rect: pos })
  }

  // Per-key composite : une étiquette par enfant [data-anchor-key] du
  // conteneur anchored. Dispatch selon l'id pour gérer les deux variantes :
  //   - designer-notes : mapping QWERTY system-dependent (data-anchor-key
  //     = noteIndex, on traduit en code clavier via getKeyboardMap)
  //   - composer-duration-base/coef : data-anchor-key directement le digit
  //     du raccourci (1..7 pour bases, 8/9/0 pour coefs) — display = key.
  // Dédup par parent anchor pour éviter de re-itérer le même conteneur
  // (composer-duration-base et -coef partagent composer-duration-buttons).
  const perKeyLabels = []
  const processedAnchors = new Set()
  for (const s of visible) {
    if (s.composite !== 'per-key') continue
    const anchorId = getAnchor(s, state)
    if (!anchorId || processedAnchors.has(anchorId)) continue
    processedAnchors.add(anchorId)
    const positions = getAnchoredKeyPositions(anchorId)

    if (s.id === 'designer-notes') {
      const sys = getTuningSystem(state.editor?.testTuningSystem ?? '12-TET')
      const xEdoN = state.xEdoN
      const useShift = state.editor?.testTuningSystem === 'x-edo' && xEdoN >= 44
      const keyboardMap = useShift
        ? xEdoShiftedKeyboardMapForN(xEdoN)
        : getKeyboardMap(sys, xEdoN)
      if (!keyboardMap) continue
      for (const [code, idx] of Object.entries(keyboardMap)) {
        const p = positions[String(idx)]
        if (!p) continue
        perKeyLabels.push({
          key: `${s.id}-${code}`,
          display: keyCodeLabel(code),
          rect: p,
        })
      }
    } else {
      // Cas générique : le data-anchor-key value est aussi le display.
      // Couvre composer-duration-base/coef ; extensible à de futurs
      // composites per-key où chaque touche a sa propre étiquette.
      for (const [k, p] of Object.entries(positions)) {
        perKeyLabels.push({
          key: `${anchorId}-${k}`,
          display: k,
          rect: p,
        })
      }
    }
  }

  // Fallback bandeau quand composer-notes-contiguous a une ancre dynamique
  // introuvable (pas de lastAnchorClipId → pas de ghost rendu → pas
  // d'élément data-anchor="composer-anchor-clip"). Hint pédagogique pour
  // l'utilisateur qui ouvre l'overlay sans avoir interagi avec un clip.
  let banner = null
  if (activeTab === 'composer') {
    const cnc = visible.find((s) => s.id === 'composer-notes-contiguous')
    if (cnc) {
      const pos = getAnchoredPosition(getAnchor(cnc, state))
      if (!pos.found) {
        banner = "touches notes = placement contigu (clique d'abord sur un clip pour amorcer)"
      }
    }
  }

  const allLabels = [...labels, ...perKeyLabels]

  return (
    <div
      className="shortcuts-overlay"
      role="dialog"
      aria-label="Raccourcis clavier"
      onClick={onClose}
    >
      <button
        type="button"
        className="shortcuts-overlay-close"
        onClick={onClose}
        aria-label="Fermer les raccourcis (Échap)"
        title="Fermer (Échap)"
      >
        <X size={20} strokeWidth={2.4} />
      </button>
      {banner && (
        <div className="shortcuts-overlay-banner" role="status">{banner}</div>
      )}
      {allLabels.map(({ key, display, rect }) => {
        const { textScale, hoverW, hoverH, hoverLeft, hoverTop } =
          computeFitDims(rect, display)
        return (
          <div
            key={key}
            className="shortcuts-overlay-fit"
            style={{
              '--rest-left': `${rect.left}px`,
              '--rest-top': `${rect.top}px`,
              '--rest-w': `${rect.width}px`,
              '--rest-h': `${rect.height}px`,
              '--hover-left': `${hoverLeft}px`,
              '--hover-top': `${hoverTop}px`,
              '--hover-w': `${hoverW}px`,
              '--hover-h': `${hoverH}px`,
              '--text-scale': textScale,
            }}
            onClick={(e) => { e.stopPropagation(); onClose?.() }}
          >
            <span className="shortcuts-overlay-fit-text">{display}</span>
          </div>
        )
      })}
    </div>
  )
}

export default ShortcutsOverlay
