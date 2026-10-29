import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, CalendarClock, Clock, KeyRound, LogOut, Mail, Phone, Settings, ShieldCheck, User } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Card, PageHeader, btn } from "../../components/common/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { tokenExpiry } from "../../services/authService";
import { formatDate } from "../../utils/format";

export default function Account() {
  useDocumentTitle("My Account");
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const expiry = useMemo(() => tokenExpiry(), []);

  const rows = [
    [User, "Full name", user.fullName],
    [Mail, "Email", user.email],
    [Phone, "Mobile", user.mobile || "Not provided"],
    [Building2, "Organization", user.organization || "Not provided"],
    [CalendarClock, "Member since", user.createdAt ? formatDate(user.createdAt) : "-"],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My Account" subtitle="Your profile and sign-in session.">
        <Link to="/app/settings" className={btn.secondary}><Settings className="h-4 w-4" /> Settings</Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 p-6 text-white shadow-sm lg:col-span-1">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-3xl font-bold">{user.fullName.charAt(0).toUpperCase()}</div>
          <h3 className="mt-4 text-xl font-bold">{user.fullName}</h3>
          <p className="break-all text-sm text-emerald-100">{user.email}</p>
          {user.organization && <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{user.organization}</p>}
          <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
            onClick={() => { logout(); toast.info("You have been signed out."); navigate("/", { replace: true }); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Profile details">
            <dl className="divide-y divide-slate-100">
              {rows.map(([Icon, l, v]) => (
                <div key={l} className="flex items-center gap-3 py-3 text-sm">
                  <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <dt className="w-32 shrink-0 text-slate-500">{l}</dt>
                  <dd className="min-w-0 break-words font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <Alert className="mt-3">Profile editing and password change are not available yet because the backend has no endpoint for them. Contact the administrator to change these details.</Alert>
          </Card>

          <Card title="Session & security">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Account status: <b>{user.isActive ? "Active" : "Inactive"}</b></li>
              <li className="flex items-center gap-3"><Clock className="h-4 w-4 text-emerald-600" /> Session expires: <b>{expiry ? formatDate(expiry, true) : "unknown"}</b></li>
              <li className="flex items-center gap-3"><KeyRound className="h-4 w-4 text-emerald-600" /> Sign-in token is kept in this browser only. Sign out on shared computers.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
