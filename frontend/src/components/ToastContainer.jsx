export default function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.level || 'warning'}`}
          onClick={() => onRemove(t.id)}
          role="alert"
        >
          <h4>🚨 {t.type || 'Cảnh báo'}</h4>
          <p>{t.message}</p>
        </div>
      ))}
    </div>
  );
}
