import { Radio } from 'lucide-react'
import { STRINGS } from '../lib/strings'
import { IconCrete } from './icons'

// iter-O phase-6.2 : les 3 toggles (live / dB / peak) sont les items d'un
// OverflowToolbar — c'est le header de module le plus susceptible de déborder.
// iter-R phase-1.3a : helper EXTRAIT dans son propre module (donnée, pas un
// composant) pour que Spectrogram (header in-body desktop) ET App (relogement
// dans la toolbar mobile) tirent des mêmes items sans dupliquer icônes/STRINGS.
// Fichier séparé : éviter le mélange export-composant / export-fonction qui
// casse le Fast Refresh (react-refresh/only-export-components).
// is-active/aria-pressed conservés dans bar ET tray.
export function buildSpectrogramHeaderItems({ mode, dbScale, peakHold, onToggleMode, onToggleDbScale, onTogglePeakHold }) {
  const trayLabel = (txt) => <span className="overflow-toolbar-tray-label">{txt}</span>
  const liveBtn = (
    <button
      type="button"
      onClick={onToggleMode}
      className={`spectrogram-toggle spectrogram-toggle-icon${mode === 'live' ? ' is-active' : ''}`}
      title="Mode Direct (analyse temps réel)"
      aria-label={STRINGS.spectro.live}
      aria-pressed={mode === 'live'}
    ><Radio size={16} /></button>
  )
  const dbBtn = (
    <button
      type="button"
      onClick={onToggleDbScale}
      className={`spectrogram-toggle${dbScale ? ' is-active' : ''}`}
      title="Échelle décibels"
      aria-pressed={dbScale}
    >dB</button>
  )
  const peakBtn = (
    <button
      type="button"
      onClick={onTogglePeakHold}
      className={`spectrogram-toggle spectrogram-toggle-icon${peakHold ? ' is-active' : ''}`}
      title="Maintenir les crêtes (mode Direct)"
      aria-label={STRINGS.spectro.peak}
      aria-pressed={peakHold}
    ><IconCrete size={16} /></button>
  )
  return [
    { id: 'live', bar: liveBtn, tray: <>{liveBtn}{trayLabel(STRINGS.spectro.live)}</> },
    { id: 'db', bar: dbBtn, tray: <>{dbBtn}{trayLabel('Échelle décibels')}</> },
    { id: 'peak', bar: peakBtn, tray: <>{peakBtn}{trayLabel(STRINGS.spectro.peak)}</> },
  ]
}
