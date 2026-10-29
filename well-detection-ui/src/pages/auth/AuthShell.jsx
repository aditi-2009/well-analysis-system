import { Link } from "react-router-dom";
import { ShieldCheck, Sprout } from "lucide-react";
import { APP_NAME, ORG_SHORT } from "../../config/constants";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[calc(100vh-200px)] lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative z-10 max-w-md">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20"><Sprout className="h-8 w-8 text-emerald-300" /></div>
          <h2 className="text-3xl font-extrabold leading-tight">{APP_NAME}</h2>
          <p className="mt-3 text-sm leading-relaxed text-emerald-100/90">Detect agricultural wells from satellite imagery, mark them inside your chosen boundary and get exact coordinates with confidence scores.</p>
          <p className="mt-8 flex items-center gap-2 text-xs text-emerald-200"><ShieldCheck className="h-4 w-4" /> Secure researcher portal • {ORG_SHORT}</p>
        </div>
      </aside>
      <div className="flex items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-7 shadow-xl animate-fade-in">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 lg:hidden"><Sprout className="h-6 w-6" /></div>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          {children}
          <p className="mt-6 text-center text-xs text-slate-600">{footer}</p>
          <p className="mt-3 text-center text-[11px]"><Link to="/" className="text-slate-400 hover:text-emerald-700">← Back to home</Link></p>
        </div>
      </div>
    </div>
  );
}
