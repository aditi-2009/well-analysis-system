import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";

const ToastContext = createContext(null);

const STYLES = {
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: CheckCircle2, icon: "text-emerald-600" },
  error:   { box: "border-red-200 bg-red-50 text-red-900", Icon: XCircle, icon: "text-red-600" },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", Icon: TriangleAlert, icon: "text-amber-600" },
  info:    { box: "border-sky-200 bg-sky-50 text-sky-900", Icon: Info, icon: "text-sky-600" },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((type, message, ms = 4500) => {
    const id = ++idRef.current;
    setItems((list) => [...list.slice(-3), { id, type, message }]);
    if (ms) setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m, ms) => push("success", m, ms),
    error: (m, ms) => push("error", m, ms ?? 7000),
    warning: (m, ms) => push("warning", m, ms ?? 6000),
    info: (m, ms) => push("info", m, ms),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="no-print fixed bottom-4 right-4 z-[2000] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const s = STYLES[t.type];
          return (
            <div key={t.id} role="status" className={`animate-fade-in flex items-start gap-3 rounded-xl border p-3 text-sm shadow-lg ${s.box}`}>
              <s.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} />
              <p className="flex-1 leading-snug">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
