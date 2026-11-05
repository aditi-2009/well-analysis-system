import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import AuthShell from "./AuthShell";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Spinner, btn, inputCls, labelCls } from "../../components/common/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  useDocumentTitle("Login");
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [f, setF] = useState({ email: "", password: "", remember: true });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const from = location.state?.from?.pathname || "/app/dashboard";
  if (isAuthenticated) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!EMAIL_RE.test(f.email.trim())) er.email = "Enter a valid email address.";
    if (f.password.length < 8) er.password = "Password must be at least 8 characters.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true); setServerError("");
    try {
      const u = await login({ email: f.email, password: f.password, remember: f.remember });
      toast.success(`Welcome, ${u.fullName}.`);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Researcher Portal Login" subtitle="Access secure well detection and spatial analytics tools."
      footer={<>Don't have an account? <Link to="/register" className="font-semibold text-emerald-700 hover:underline">Register</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {location.state?.from && <Alert tone="info">Please sign in to continue.</Alert>}
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <div>
          <label className={labelCls} htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" aria-invalid={Boolean(errors.email)} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" type={show ? "text" : "password"} autoComplete="current-password" className={`${inputCls} pr-10`} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} aria-invalid={Boolean(errors.password)} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>
        <div className="flex items-center justify-between text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-slate-600">
            <input type="checkbox" className="rounded accent-emerald-700" checked={f.remember} onChange={(e) => setF({ ...f, remember: e.target.checked })} /> Remember me on this device
          </label>
          <Link to="/forgot-password" className="font-semibold text-emerald-700 hover:underline">Forgot password?</Link>
        </div>
        <button className={`${btn.primary} w-full py-3`} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />} Sign in to portal</button>
      </form>
    </AuthShell>
  );
}
