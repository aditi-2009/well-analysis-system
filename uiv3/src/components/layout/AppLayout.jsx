import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, CircleHelp, LogOut, PanelLeftClose, PanelLeftOpen, Settings, UserCog, Waves, X } from "lucide-react";
import GovStrip from "./GovStrip";
import OrgHeader from "./OrgHeader";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import ScrollToTop from "../common/ScrollToTop";
import ErrorBoundary from "../common/ErrorBoundary";
import { useAuth } from "../../context/AuthContext";
import { usePrefs } from "../../context/PrefsContext";
import { useToast } from "../../context/ToastContext";
import useApiHealth from "../../hooks/useApiHealth";
import { APP_NAME } from "../../config/constants";

const HEALTH = {
  checking: { dot: "bg-slate-400", text: "Checking API..." },
  online: { dot: "bg-emerald-400", text: "API online" },
  degraded: { dot: "bg-amber-400", text: "API up, database down" },
  offline: { dot: "bg-red-500", text: "API offline" },
};

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950/80 px-3 py-1 text-xs">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="max-w-[140px] truncate font-medium text-emerald-100">{user?.fullName}</span>
        <ChevronDown className="h-3 w-3 text-emerald-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <Link to="/app/account" onClick={() => setOpen(false)} className={item}><UserCog className="h-4 w-4 text-emerald-600" /> My account</Link>
          <Link to="/app/settings" onClick={() => setOpen(false)} className={item}><Settings className="h-4 w-4 text-emerald-600" /> Settings</Link>
          <Link to="/app/help" onClick={() => setOpen(false)} className={item}><CircleHelp className="h-4 w-4 text-emerald-600" /> Help center</Link>
          <button className={`${item} border-t border-slate-100 text-red-600 hover:bg-red-50`}
            onClick={() => { logout(); toast.info("You have been signed out."); navigate("/", { replace: true }); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { prefs, toggleSidebar } = usePrefs();
  const [drawer, setDrawer] = useState(false);
  const health = HEALTH[useApiHealth()];
  const location = useLocation();

  useEffect(() => { setDrawer(false); }, [location.pathname]);

  // The same button hides the sidebar on desktop and opens a drawer on phones / tablets.
  const onToggle = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) toggleSidebar();
    else setDrawer((d) => !d);
  };

  // Ctrl + B hides / shows the sidebar
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); onToggle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const hidden = !prefs.sidebarOpen;

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <GovStrip />
      <OrgHeader sticky={false} />

      {/* Sub-header: sidebar toggle, system name, API status, user */}
      <div className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 bg-emerald-900 px-4 py-2.5 text-white shadow-inner sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onToggle} aria-label={hidden ? "Show sidebar" : "Hide sidebar"} title="Show / hide sidebar (Ctrl+B)"
            className="rounded-lg p-1.5 text-emerald-200 transition hover:bg-emerald-800 hover:text-white">
            {hidden ? <PanelLeftOpen className="h-5 w-5 max-lg:hidden" /> : <PanelLeftClose className="h-5 w-5 max-lg:hidden" />}
            <PanelLeftOpen className="h-5 w-5 lg:hidden" />
          </button>
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-wide">
            <Waves className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="truncate">{APP_NAME}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[11px] text-emerald-200 md:flex" title="Backend connection">
            <span className={`h-2 w-2 rounded-full ${health.dot}`} /> {health.text}
          </span>
          <UserMenu />
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-[1600px] flex-1 items-start gap-6 px-4 py-6 sm:px-8">
        {/* Desktop sidebar (can be hidden) */}
        <aside aria-label="Sidebar" className={`no-print sticky top-[76px] max-h-[calc(100vh-96px)] w-64 shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm custom-scrollbar max-lg:hidden ${hidden ? "lg:hidden" : ""}`}>
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="no-print fixed inset-0 z-[1200] lg:hidden">
            <div className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawer(false)} />
            <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-4 shadow-2xl animate-fade-in">
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="mb-3 ml-auto block rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              <Sidebar onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 animate-fade-in"><ErrorBoundary key={location.pathname}><Outlet /></ErrorBoundary></main>
      </div>
      <Footer />
    </div>
  );
}
