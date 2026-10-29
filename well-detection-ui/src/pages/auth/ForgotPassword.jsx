import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import AuthShell from "./AuthShell";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, btn } from "../../components/common/ui";
import { CONTACT } from "../../config/constants";

export default function ForgotPassword() {
  useDocumentTitle("Forgot password");
  return (
    <AuthShell title="Forgot your password?" subtitle="Online reset is not available yet."
      footer={<Link to="/login" className="font-semibold text-emerald-700 hover:underline">← Back to login</Link>}>
      <Alert tone="info">The backend has no password-reset service yet. Email the administrator from your registered address and they will reset it for you.</Alert>
      <a className={`${btn.primary} mt-5 w-full`} href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Password reset request - Well Detection System")}`}>
        <Mail className="h-4 w-4" /> Email {CONTACT.email}
      </a>
    </AuthShell>
  );
}
