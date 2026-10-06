import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppIcon } from '../icons/AppIcon.jsx';

const DEFAULT_TOAST_DURATION_MS = 6000;
const DANGER_TOAST_DURATION_MS = 10000;

function toastDuration(toast) {
  if (toast.persistent) return 0;
  const requested = Number(toast.durationMs);
  if (Number.isFinite(requested) && requested > 0) {
    return Math.min(30000, Math.max(1500, requested));
  }
  return toast.tone === 'danger' || toast.tone === 'error'
    ? DANGER_TOAST_DURATION_MS
    : DEFAULT_TOAST_DURATION_MS;
}

function ToastItem({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const duration = toastDuration(toast);

  useEffect(() => {
    if (!duration || paused) return undefined;
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, onDismiss, paused, toast.id]);

  return (
    <div
      className={`ui-toast ui-toast-${toast.tone || 'info'}`}
      role={toast.tone === 'danger' || toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div>
        <strong>{toast.title || 'Notice'}</strong>
        {toast.message ? <p>{toast.message}</p> : null}
      </div>
      <button
        type="button"
        className="ui-toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        title="Dismiss"
      >
        <AppIcon name="close" size={17} />
      </button>
    </div>
  );
}

const ToastContext = createContext({
  toasts: [],
  showToast: () => {},
  dismissToast: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast) => {
    const id = toast.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => current.concat({ tone: 'info', ...toast, id }));
    return id;
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast, toasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  return useContext(ToastContext);
}
