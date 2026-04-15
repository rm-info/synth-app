import './MiniPlayer.css'

/**
 * Mini-player pour l'onglet Designer (sidebar bas).
 * Joue la timeline complète. Contrôles épurés : play/stop, barre de
 * progression simple (juste un trait qui avance), temps courant/total.
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
  return (
    <div className="mini-player">
      <div className="mini-player-row">
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
        <span className="mini-time">
          {currentTime.toFixed(1)}s / {totalDurationSec.toFixed(1)}s
        </span>
      </div>
      <div className="mini-progress" aria-hidden={!hasClips}>
        <div className="mini-progress-track">
          {isPlaying && (
            <div
              className="mini-cursor"
              style={{ left: `${cursorPos * 100}%` }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default MiniPlayer
