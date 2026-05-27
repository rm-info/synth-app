import { useMemo } from 'react'
import { SHORTCUTS } from '../lib/shortcuts'
import './ShortcutsReference.css'

// Article "Raccourcis clavier" généré depuis `SHORTCUTS` (iter-L
// phase-2.4). Consomme la table de vérité posée en L.1 et la rend
// groupée par contexte. Style aligné sur MarkdownRenderer pour que le
// passage d'un article rédigé à cet article généré ne soit pas
// visuellement disruptif.
//
// Composite entries (notes, durées) : on affiche le `display` tel quel
// — il est déjà rédigé pour ce cas ("— mapping live —", "touches notes",
// "1-7 (Numpad ou Shift+Digit)", etc.). Pour les notes l'utilisateur
// est renvoyé à l'overlay raccourcis (Ctrl+K) qui dessine le mapping
// live de la touche.
const SECTIONS_ORDER = ['Global', 'Designer', 'Composer', 'Bibliothèque']
const SECTION_INTRO = {
  Global: 'Disponibles dans tous les onglets éditeur (Designer et Composer). L\'overlay (Ctrl+K) en haut à droite affiche les raccourcis du contexte actif.',
  Designer: 'Actifs quand l\'onglet Designer est ouvert et que le focus n\'est pas dans un champ de saisie.',
  Composer: 'Actifs quand l\'onglet Composer est ouvert et que le focus n\'est pas dans un champ de saisie. Plusieurs raccourcis s\'appliquent à la sélection courante (cf. condition).',
  Bibliothèque: 'Actifs uniquement quand le focus est dans l\'onglet Bibliothèque (sélection ou navigation TOC). Permet de manipuler patches et dossiers.',
}

export default function ShortcutsReference() {
  const grouped = useMemo(() => {
    const map = new Map(SECTIONS_ORDER.map((name) => [name, []]))
    for (const entry of SHORTCUTS) {
      const section = primarySection(entry)
      if (!map.has(section)) map.set(section, [])
      map.get(section).push(entry)
    }
    return Array.from(map.entries()).filter(([, items]) => items.length > 0)
  }, [])

  return (
    <div className="shortcuts-reference markdown-renderer">
      <h1 className="md-h md-h1">Raccourcis clavier</h1>
      <p className="md-p">
        Cette page est générée automatiquement depuis la table de
        référence des raccourcis. Elle reste donc toujours à jour avec
        le code livré.
      </p>

      {grouped.map(([section, entries]) => (
        <section key={section} className="shortcuts-section">
          <h2 className="md-h md-h2">{section}</h2>
          {SECTION_INTRO[section] && (
            <p className="md-p shortcuts-section-intro">{SECTION_INTRO[section]}</p>
          )}
          <dl className="shortcuts-list">
            {entries.map((entry) => (
              <div key={entry.id} className="shortcuts-row">
                <dt className="shortcuts-combo">
                  <kbd>{entry.keys.display}</kbd>
                </dt>
                <dd className="shortcuts-meta">
                  <div className="shortcuts-label">{entry.label}</div>
                  <div className="shortcuts-description">{entry.description}</div>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

// Stratégie d'assignation à une section :
//   - contexts inclut 'global'           → Global
//   - multi-contexte non-global          → Global (entrée transverse)
//   - mono-contexte (designer/composer/library) → section correspondante
function primarySection(entry) {
  if (entry.contexts.includes('global')) return 'Global'
  if (entry.contexts.length > 1) return 'Global'
  const c = entry.contexts[0]
  return { designer: 'Designer', composer: 'Composer', library: 'Bibliothèque' }[c] ?? c
}
