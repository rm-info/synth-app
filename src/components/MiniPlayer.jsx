import './MiniPlayer.css'

/**
 * Mini-player pour l'onglet Designer.
 * Joue la timeline complète. Affiche play/stop, temps courant/total, et une barre
 * de progression simplifiée avec marqueurs de mesures (pas la grille complète).
 */
function MiniPlayer({
  isPlaying,
  cursorPos,
  currentTime,
  totalDurationSec,
  numMeasures,
  hasClips,
  onPlay,
  onStop,
}) {
  return (
    <div className="mini-player">
      <button
        type="button"
        className={`mini-play-btn ${isPlaying ? 'playing' : ''}`}
        onClick={isPlaying ? onStop : onPlay}
        disabled={!hasClips}
        title={isPlaying ? 'Arrêter' : 'Lire la composition'}
        aria-label={isPlaying ? 'Stop' : 'Play'}
      >
        {isPlaying ? '■' : '▶'}
      </button>

      <div className="mini-progress" aria-hidden={!hasClips}>
        <div className="mini-progress-track">
          {Array.from({ length: numMeasures + 1 }, (_, i) => (
            <div
              key={i}
              className={`mini-measure-tick ${i % 4 === 0 ? 'bar' : ''}`}
              style={{ left: `${(i / numMeasures) * 100}%` }}
            />
          ))}
          {isPlaying && (
            <div
              className="mini-cursor"
              style={{ left: `${cursorPos * 100}%` }}
            />
          )}
        </div>
      </div>

      <span className="mini-time">
        {currentTime.toFixed(1)}s / {totalDurationSec.toFixed(1)}s
      </span>
    </div>
  )
}

export default MiniPlayer
