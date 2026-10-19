// src/context/ToastContext.jsx
// Short messages that fade on their own ("CSV downloaded"). Anything the user must act on
// belongs in <Alert> instead.
// Use: const toast = useToast(); toast.success("Saved."); toast.error("Upload failed.");
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const CLASSES = { success: "ds-toast", error: "ds-toast ds-toast-error", info: "ds-toast ds-toast-info" };
// Errors stay longer, because they take longer to read and act on.
const DURATION_MS = { success: 4000, info: 4000, error: 8000 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, variant = "success") => {
      const type = ICONS[variant] ? variant : "info";
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, variant: type }]);
      timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS[type]));
      return id;
    },
    [dismiss]
  );

  // When the provider unmounts, stop every pending timer.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error"),
      info: (message) => show(message, "info"),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ds-toasts" aria-live="polite">
        {toasts.map(({ id, message, variant }) => {
          const Icon = ICONS[variant];
          return (
            <div key={id} className={CLASSES[variant]} role={variant === "error" ? "alert" : "status"}>
              <Icon size={18} aria-hidden="true" />
              <span>{message}</span>
              <button type="button" className="ds-toast-close" onClick={() => dismiss(id)} aria-label="Dismiss message">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
