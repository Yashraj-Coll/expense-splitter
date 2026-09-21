function ErrorMessage({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="error-box">
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-small" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
