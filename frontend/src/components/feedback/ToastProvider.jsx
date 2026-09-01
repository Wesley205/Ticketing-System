import { createContext, useCallback, useContext, useMemo, useState } from 'react';

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
          <div key={toast.id} className={`ui-toast ui-toast-${toast.tone || 'info'}`}>
            <div>
              <strong>{toast.title || 'Notice'}</strong>
              {toast.message ? <p>{toast.message}</p> : null}
            </div>
            <button type="button" className="ui-toast-close" onClick={() => dismissToast(toast.id)}>
              Close
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  return useContext(ToastContext);
}
