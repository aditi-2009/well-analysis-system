import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogIn, Menu, Sprout, UserPlus, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ORG_NAME, ORG_TAGLINE } from "../../config/constants";
import { btn } from "../common/ui";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About Us" },
  { to: "/help", label: "Help Center" },
  { to: "/contact", label: "Contact Us" },
];

const linkCls = ({ isActive }) =>
  `border-b-2 pb-1 text-sm font-medium transition ${isActive ? "border-emerald-600 text-emerald-800" : "border-transparent text-slate-600 hover:text-emerald-700"}`;

export default function OrgHeader({ sticky = true }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className={`no-print ${sticky ? "sticky top-0" : ""} z-40 border-b border-slate-200 bg-white shadow-sm`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm">
            <Sprout className="h-7 w-7 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-slate-900 sm:text-base lg:text-lg">{ORG_NAME}</h1>
            <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">{ORG_TAGLINE}</p>
          </div>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>{l.label}</NavLink>)}
          {isAuthenticated ? (
            <Link to="/app/dashboard" className={btn.primary}>Dashboard</Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className={btn.secondary}><LogIn className="h-4 w-4" /> Login</Link>
              <Link to="/register" className={btn.primary}><UserPlus className="h-4 w-4" /> Register</Link>
            </div>
          )}
        </div>

        <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="space-y-1 border-t border-slate-100 bg-white px-4 pb-4 pt-2 lg:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}
              className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50"}`}>{l.label}</NavLink>
          ))}
          <div className="flex gap-2 pt-2">
            {isAuthenticated ? (
              <Link to="/app/dashboard" onClick={() => setOpen(false)} className={`${btn.primary} flex-1`}>Dashboard</Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className={`${btn.secondary} flex-1`}>Login</Link>
                <Link to="/register" onClick={() => setOpen(false)} className={`${btn.primary} flex-1`}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
