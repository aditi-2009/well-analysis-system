// src/pages/auth/ForgotPassword.jsx
import { Link } from "react-router-dom";

function ForgotPassword() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h3 className="auth-form-title">Forgot Password</h3>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", textAlign: "center" }}>
          Password reset via backend is not yet connected. This is a placeholder screen.
        </p>
        <Link to="/login" className="auth-link-small">← Back to Login</Link>
      </div>
    </div>
  );
}

export default ForgotPassword;