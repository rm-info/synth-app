import './Toast.css'

function Toast({ message, type = 'info', onDismiss }) {
  return (
    <div className={`toast toast-${type}`} role="status">
      <span className="toast-message">{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="toast-dismiss"
          onClick={onDismiss}
          aria-label="Fermer"
          title="Fermer"
        >×</button>
      )}
    </div>
  )
}

export default Toast
