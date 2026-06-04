import { useEffect, useMemo, useState } from 'react'
import { STRINGS } from '../lib/strings'
import { TIMBRE_PRESETS, PRESET_CATEGORIES } from '../lib/presets'
import { BASE_WAVEFORMS, snapN, idealWaveform, bandlimitedWaveform } from '../lib/waveforms'
import { harmonicsToPoints } from '../audio'
import PatchThumbnail from './PatchThumbnail'
import NumberInput from './NumberInput'
import './PresetPicker.css'

// iter-N phase-5c : la modale Presets, point d'entrée unique des sons
// pré-fabriqués. Trois sections :
//  - Formes de base : sinus (1 vue) + carré/scie/triangle (2 vignettes — idéale
//    statique + band-limitée qui se redessine en live quand N change).
//  - Timbres conçus (évocateurs) et Inattendus : grille, 1 vignette par preset.
// La modale résout elle-même la canonical (elle a le moteur waveforms.js +
// harmonicsToPoints) et passe au parent un payload prêt à charger via `onPick` ;
// le parent applique le garde-fou dirty + dispatch LOAD_PRESET. Escape / clic
// backdrop ferment.
export default function PresetPicker({ onPick, onClose }) {
  // N courant des formes band-limitées (une valeur par forme à deux vues).
  const [ns, setNs] = useState(() =>
    Object.fromEntries(BASE_WAVEFORMS.filter((w) => w.twoViews).map((w) => [w.id, w.defaultN])),
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  // Vignettes des formes de base : l'idéale est statique, la band-limitée suit N.
  // Recalcul global au changement de N (sub-ms par forme, négligeable).
  const baseViews = useMemo(
    () => BASE_WAVEFORMS.map((w) => ({
      w,
      ideal: idealWaveform(w.type),
      band: w.twoViews ? bandlimitedWaveform(w.type, ns[w.id]) : null,
    })),
    [ns],
  )

  // Vignettes des timbres conçus (statiques — reconstruction iDFT de leur recette).
  const timbreThumbs = useMemo(
    () => Object.fromEntries(
      TIMBRE_PRESETS.map((p) => [p.id, harmonicsToPoints(p.patch.amplitudes, p.patch.N)]),
    ),
    [],
  )

  const pickBaseIdeal = (w) => onPick({
    canonical: idealWaveform(w.type),
    cap: 256,
    anchorCount: w.anchorCount,
    canonicalNormalized: w.type === 'sine', // seul le sinus brut est à phase canonique
    preset: w.type,
  })

  const pickBaseBandlimited = (w) => onPick({
    canonical: bandlimitedWaveform(w.type, ns[w.id]),
    cap: ns[w.id],
    anchorCount: w.anchorCount,
    canonicalNormalized: false,
    preset: w.type,
  })

  const pickTimbre = (p) => onPick({
    canonical: harmonicsToPoints(p.patch.amplitudes, p.patch.N),
    cap: p.patch.N,
    anchorCount: p.anchorCount,
    canonicalNormalized: true, // iDFT d'amplitudes définies = phase canonique
    preset: null,
  })

  const S = STRINGS.baseWaveforms

  return (
    <>
      <div className="preset-picker-backdrop" onClick={onClose} />
      <div className="preset-picker" role="dialog" aria-label={STRINGS.timbrePresets.pickerTitle}>
        <header className="preset-picker-header">
          <h4>{STRINGS.timbrePresets.pickerTitle}</h4>
          <button
            type="button"
            className="preset-picker-close"
            onClick={onClose}
            aria-label="Fermer"
          >×</button>
        </header>
        <div className="preset-picker-body">
          <section className="preset-picker-group">
            <h5 className="preset-picker-group-title">{S.sectionTitle}</h5>
            <div className="pp-base-list">
              {baseViews.map(({ w, ideal, band }) => (
                <div key={w.id} className="pp-base-row">
                  <span className="pp-base-name">{STRINGS.presets[w.type]}</span>
                  <div className="pp-base-views">
                    <button
                      type="button"
                      className="pp-thumb-btn"
                      onClick={() => pickBaseIdeal(w)}
                      title={`${STRINGS.presets[w.type]} — ${S.viewIdeal}`}
                    >
                      <PatchThumbnail points={ideal} />
                      <span className="pp-view-label">{S.viewIdeal}</span>
                    </button>
                    {w.twoViews && (
                      <button
                        type="button"
                        className="pp-thumb-btn"
                        onClick={() => pickBaseBandlimited(w)}
                        title={`${STRINGS.presets[w.type]} — ${S.viewBandlimited} (N=${ns[w.id]})`}
                      >
                        <PatchThumbnail points={band} />
                        <span className="pp-view-label">{S.viewBandlimited}</span>
                      </button>
                    )}
                  </div>
                  <div className="pp-base-n">
                    {w.twoViews ? (
                      <label className="pp-n-field">
                        <span>{S.nLabel}</span>
                        <NumberInput
                          value={ns[w.id]}
                          onChange={(v) => setNs((prev) => ({ ...prev, [w.id]: snapN(v, w.snap) }))}
                          min={1}
                          max={256}
                          className="pp-n-input"
                          ariaLabel={`${S.nLabel} ${STRINGS.presets[w.type]}`}
                        />
                      </label>
                    ) : (
                      <span className="pp-n-fixed">{S.nLabel} : 1 ({S.nFixed})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {PRESET_CATEGORIES.map((cat) => {
            const items = TIMBRE_PRESETS.filter((p) => p.category === cat.id)
            if (!items.length) return null
            return (
              <section key={cat.id} className="preset-picker-group">
                <h5 className="preset-picker-group-title">{cat.label}</h5>
                <div className="pp-timbre-grid">
                  {items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="pp-thumb-btn pp-timbre-btn"
                      onClick={() => pickTimbre(p)}
                      title={p.description}
                    >
                      <PatchThumbnail points={timbreThumbs[p.id]} />
                      <span className="pp-view-label">{p.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}
