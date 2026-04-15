import './MiniPlayer.css'

/**
 * Mini-player Designer (sidebar bas).
 * Layout :
 *   [▶] [ ═══════ X.Xs / Y.Ys ═══════ ]
 * Le fond de la zone texte est un linear-gradient piloté par --progress
 * (0..100), qui donne visuellement l'avancement sans barre séparée.
 */
function MiniPlayer({
  isPlaying,
  cursorPos,
  currentTime,
  totalDurationSec,
  hasClips,
  onPlay,
  onStop,
}) {
  const progress = Math.max(0, Math.min(100, cursorPos * 100))

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
      <div
        className="mini-progress-bar"
        style={{ '--progress': `${progress}%` }}
        aria-hidden={!hasClips}
      >
        <span className="mini-progress-text">
          {currentTime.toFixed(1)}s / {totalDurationSec.toFixed(1)}s
        </span>
      </div>
    </div>
  )
}

export default MiniPlayer
