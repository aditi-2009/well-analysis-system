import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import AuthShell from "./AuthShell";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Spinner, btn, inputCls, labelCls } from "../../components/common/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  useDocumentTitle("Register");
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ fullName: "", email: "", mobile: "", organization: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.fullName.trim()) er.fullName = "Full name is required.";
    if (!EMAIL_RE.test(f.email.trim())) er.email = "Enter a valid email address.";
    if (f.mobile && !/^[6-9]\d{9}$/.test(f.mobile.trim())) er.mobile = "Enter a 10-digit Indian mobile number, or leave it empty.";
    if (f.password.length < 8) er.password = "Use at least 8 characters.";
    else if (f.password.length > 72) er.password = "Use at most 72 characters.";
    if (f.confirm !== f.password) er.confirm = "Passwords do not match.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true); setServerError("");
    try {
      const u = await register(f);
      toast.success(`Account created. Welcome, ${u.fullName}.`);
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally { setBusy(false); }
  };

  const field = (id, label, props = {}) => (
    <div>
      <label className={labelCls} htmlFor={id}>{label}</label>
      <input id={id} className={inputCls} value={f[id]} onChange={set(id)} aria-invalid={Boolean(errors[id])} {...props} />
      {errors[id] && <p className="mt-1 text-xs text-red-600">{errors[id]}</p>}
    </div>
  );

  return (
    <AuthShell title="Create your account" subtitle="Register to use well detection, maps and reports."
      footer={<>Already registered? <Link to="/login" className="font-semibold text-emerald-700 hover:underline">Login</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-3.5">
        {serverError && <Alert tone="error">{serverError}</Alert>}
        {field("fullName", "Full name", { autoComplete: "name", placeholder: "Your full name" })}
        {field("email", "Email address", { type: "email", autoComplete: "email", placeholder: "you@example.com" })}
        <div className="grid gap-3.5 sm:grid-cols-2">
          {field("mobile", "Mobile (optional)", { type: "tel", autoComplete: "tel", placeholder: "10-digit number" })}
          {field("organization", "Organization (optional)", { autoComplete: "organization", placeholder: "e.g. ICAR-NBSS&LUP" })}
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={show ? "text" : "password"} autoComplete="new-password" className={`${inputCls} pr-10`} value={f.password} onChange={set("password")} aria-invalid={Boolean(errors.password)} />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>
          {field("confirm", "Confirm password", { type: show ? "text" : "password", autoComplete: "new-password" })}
        </div>
        <button className={`${btn.primary} w-full py-3`} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} Create account</button>
        <p className="text-center text-[11px] text-slate-500">By registering you accept the <Link className="font-semibold text-emerald-700 hover:underline" to="/policies/terms">Terms</Link> and <Link className="font-semibold text-emerald-700 hover:underline" to="/policies/privacy">Privacy Policy</Link>.</p>
      </form>
    </AuthShell>
  );
}
