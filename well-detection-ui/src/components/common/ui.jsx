// Small shared UI pieces.
import { useState } from "react";
import { Check, Copy, Loader2, X } from "lucide-react";
import { LEVEL_META, pct } from "../../utils/confidence";
import { usePrefs } from "../../context/PrefsContext";

export function Spinner({ className = "h-5 w-5" }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function PageLoader({ label = "Loading..." }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner className="h-8 w-8 text-emerald-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, subtitle, action, children, className = "", bodyClass = "p-5" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="truncate text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="truncate text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {Icon && <Icon className="h-10 w-10 text-slate-300" />}
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {text && <p className="max-w-md text-xs text-slate-500">{text}</p>}
      {children && <div className="mt-3 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children, className = "" }) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return <div role={tone === "error" ? "alert" : "note"} className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${tones[tone]} ${className}`}>{children}</div>;
}

export function ConfidenceBadge({ confidence }) {
  const { classify } = usePrefs();
  const level = classify(confidence);
  const m = LEVEL_META[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${m.badge}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {pct(confidence)}
    </span>
  );
}

export function LevelPill({ level }) {
  const m = LEVEL_META[level];
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${m.badge}`}>{m.label}</span>;
}

export function ConfidenceBar({ confidence }) {
  const { classify } = usePrefs();
  const m = LEVEL_META[classify(confidence)];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
      <div className="h-full rounded-full" style={{ width: `${Math.round(confidence * 100)}%`, background: m.color }} />
    </div>
  );
}

export function CopyButton({ text, label = "Copy", className = "" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } finally { ta.remove(); }
    }
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  };
  return (
    <button type="button" onClick={copy} title={label} aria-label={label}
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 ${className}`}>
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copied" : label}
    </button>
  );
}

export function Modal({ open, onClose, title, children, icon: Icon }) {
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-[1500] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-fade-in" onMouseDown={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
          {Icon && <Icon className="h-5 w-5 text-emerald-700" />} {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50",
  secondary: "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50",
  ghost: "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50",
  small: "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50",
  danger: "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700",
};

export const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-50 disabled:text-slate-400";
export const labelCls = "mb-1 block text-xs font-semibold text-slate-700";
