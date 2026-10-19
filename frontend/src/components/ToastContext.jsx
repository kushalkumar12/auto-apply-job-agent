import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_LIMIT = 4;
const TOAST_DURATION = 3500;

let toastIdCounter = 0;

function toastReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const next = [action.toast, ...state];
      return next.slice(0, TOAST_LIMIT);
    }
    case 'DISMISS': {
      return state.filter(t => t.id !== action.id);
    }
    case 'CLEAR_ALL': {
      return [];
    }
    default:
      return state;
  }
}

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const showToast = useCallback((message, type = 'success', duration = TOAST_DURATION) => {
    const id = `toast-${++toastIdCounter}`;
    dispatch({ type: 'ADD', toast: { id, message, type } });
    if (duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'DISMISS', id });
      }, duration);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    dispatch({ type: 'DISMISS', id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, clearAll }}>
      {children}

      {/* Toast Stack Renderer */}
      {toasts.length > 0 && (
        <div className="toast-stack-container" role="log" aria-live="polite" aria-label="Notifications">
          {toasts.map((toast, index) => {
            const Icon = TOAST_ICONS[toast.type] || CheckCircle2;
            return (
              <div
                key={toast.id}
                className={`toast-item toast-${toast.type}`}
                style={{ '--toast-index': index }}
                role="status"
              >
                <Icon size={16} className="toast-item-icon" />
                <span className="toast-item-message">{toast.message}</span>
                <button
                  className="toast-dismiss-btn"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export default ToastProvider;
