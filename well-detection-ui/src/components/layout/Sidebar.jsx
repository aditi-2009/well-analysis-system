import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Brain, CircleHelp, LayoutDashboard, FileText, Map as MapIcon, Satellite, Settings, Table2, UserCog } from "lucide-react";
import { getActiveModel } from "../../services/detectionService";

const main = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/detection", label: "Well Detection", icon: Satellite },
  { to: "/app/map", label: "Interactive Map", icon: MapIcon },
  { to: "/app/results", label: "Detection Results", icon: Table2 },
  { to: "/app/reports", label: "Reports & Exports", icon: FileText },
];
const system = [
  { to: "/app/account", label: "My Account", icon: UserCog },
  { to: "/app/settings", label: "Settings", icon: Settings },
  { to: "/app/help", label: "Help Center", icon: CircleHelp },
];

function Item({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} onClick={onNavigate}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-emerald-50 font-bold text-emerald-800 shadow-sm" : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"}`}>
      <Icon className="h-[18px] w-[18px] shrink-0 text-emerald-600" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function ModelCard() {
  const [model, setModel] = useState(null);
  useEffect(() => {
    let alive = true;
    getActiveModel().then((m) => alive && setModel(m)).catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-emerald-900"><Brain className="h-4 w-4 text-emerald-600" /> AI model active</div>
      {model ? (
        <p className="text-[11px] leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">{model.model_name}</span> {model.model_version} ({model.architecture}).
          {model.accuracy_metric != null && <> {model.metric_name || "Metric"}: {(model.accuracy_metric * 100).toFixed(1)}%.</>}
        </p>
      ) : (
        <p className="text-[11px] leading-relaxed text-slate-500">Model details load once the backend is reachable.</p>
      )}
    </div>
  );
}

export default function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Main navigation</div>
      <nav className="space-y-1" aria-label="Main">{main.map((i) => <Item key={i.to} item={i} onNavigate={onNavigate} />)}</nav>
      <div className="mb-3 mt-6 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">User &amp; system</div>
      <nav className="space-y-1" aria-label="User">{system.map((i) => <Item key={i.to} item={i} onNavigate={onNavigate} />)}</nav>
      <ModelCard />
    </div>
  );
}
