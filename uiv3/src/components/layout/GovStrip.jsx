import { useState } from "react";
import { Contrast, Droplets, RotateCcw, ShieldCheck } from "lucide-react";
import { usePrefs } from "../../context/PrefsContext";
import { Modal, btn } from "../common/ui";
import { ORG_SHORT } from "../../config/constants";
import { Link } from "react-router-dom";

export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-emerald-600" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function AccessibilityModal({ open, onClose }) {
  const { prefs, update } = usePrefs();
  return (
    <Modal open={open} onClose={onClose} title="Accessibility settings" icon={ShieldCheck}>
      <p className="-mt-2 mb-5 text-xs text-slate-500">Adjust the interface for easier reading. Saved in this browser.</p>
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-semibold text-slate-800">Text size</h4>
          <div className="mt-2 flex gap-2">
            {[["sm", "A-  Small"], ["md", "A  Normal"], ["lg", "A+  Large"]].map(([k, l]) => (
              <button key={k} onClick={() => update({ fontSize: k })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${prefs.fontSize === k ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div><h4 className="text-sm font-semibold text-slate-800">High contrast</h4><p className="text-xs text-slate-500">Stronger colour contrast</p></div>
          <Switch checked={prefs.highContrast} onChange={(v) => update({ highContrast: v })} label="High contrast" />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div><h4 className="text-sm font-semibold text-slate-800">Grayscale</h4><p className="text-xs text-slate-500">Remove colour distractions</p></div>
          <Switch checked={prefs.grayscale} onChange={(v) => update({ grayscale: v })} label="Grayscale" />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button className={`${btn.secondary} flex-1`} onClick={() => update({ fontSize: "md", highContrast: false, grayscale: false })}><RotateCcw className="h-4 w-4" /> Reset</button>
        <button className={`${btn.primary} flex-1`} onClick={onClose}>Done</button>
      </div>
      <p className="mt-4 text-center text-[11px] text-slate-500">See the <Link to="/policies/accessibility" onClick={onClose} className="font-semibold text-emerald-700 hover:underline">accessibility statement</Link>.</p>
    </Modal>
  );
}

export default function GovStrip() {
  const { prefs, update } = usePrefs();
  const [open, setOpen] = useState(false);
  return (
    <header className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900 bg-emerald-950 px-4 py-1.5 text-xs text-emerald-100 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <span className="font-medium tracking-wide">Government of India | {ORG_SHORT} Portal</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="mr-1 font-semibold text-emerald-300">Text size:</span>
          {[["sm", "A-"], ["md", "A"], ["lg", "A+"]].map(([k, l]) => (
            <button key={k} onClick={() => update({ fontSize: k })} aria-label={`Text size ${l}`} aria-pressed={prefs.fontSize === k}
              className={`rounded px-1.5 py-0.5 text-[11px] font-bold transition ${prefs.fontSize === k ? "bg-emerald-600 text-white" : "bg-emerald-900 hover:bg-emerald-800"}`}>{l}</button>
          ))}
        </div>
        <span className="hidden h-3 w-px bg-emerald-800 sm:block" />
        <button onClick={() => update({ highContrast: !prefs.highContrast })} className="hidden items-center gap-1 transition hover:text-white sm:flex" aria-pressed={prefs.highContrast}>
          <Contrast className="h-3.5 w-3.5" /> Contrast
        </button>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 transition hover:text-white">
          <Droplets className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Accessibility</span>
        </button>
      </div>
      <AccessibilityModal open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
