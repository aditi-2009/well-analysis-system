import { NavLink } from "react-router-dom";
import { CircleHelp, FileText, LayoutDashboard, Map as MapIcon, Satellite, Settings, Table2, UserCog } from "lucide-react";

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

export default function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Main navigation</div>
      <nav className="space-y-1" aria-label="Main">{main.map((i) => <Item key={i.to} item={i} onNavigate={onNavigate} />)}</nav>
      <div className="mb-3 mt-6 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Account &amp; help</div>
      <nav className="space-y-1" aria-label="Account">{system.map((i) => <Item key={i.to} item={i} onNavigate={onNavigate} />)}</nav>
    </div>
  );
}
