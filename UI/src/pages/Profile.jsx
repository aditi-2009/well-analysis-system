// src/pages/Profile.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import PageHeader from "../components/common/PageHeader";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Button from "../components/common/Button";

function Profile() {
  useDocumentTitle("Profile");

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const details = [
    ["Full name", user?.fullName],
    ["Email", user?.email],
    ["Organization", user?.organization],
    ["Mobile", user?.mobile],
  ];

  const securityItems = [
    ["Change password", "Update your account password."],
    ["Two-factor authentication", "Add an extra step when you sign in."],
    ["Login activity", "See where your account was used."],
  ];

  return (
    <div className="ds-page">
      <PageHeader title="Profile" description="Your account information" />

      <div className="ds-hero">
        <div className="ds-avatar" aria-hidden="true">
          {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
        </div>
        <div className="ds-hero-body">
          <h2 className="ds-hero-name">{user?.fullName || "User"}</h2>
          <p className="ds-hero-meta">{user?.email || ""}</p>
          {user?.organization && (
            <div className="ds-chip-row">
              <span className="ds-chip ds-chip-onDark">{user.organization}</span>
            </div>
          )}
        </div>
        <div className="ds-hero-actions">
          <Button variant="onDark" icon={LogOut} onClick={() => setConfirmOpen(true)}>
            Log out
          </Button>
        </div>
      </div>

      <div className="ds-grid-2">
        <section className="ds-card">
          <div className="ds-card-head">
            <h2 className="ds-card-title">Account details</h2>
          </div>
          <dl className="ds-kv ds-kv-rows">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "Not provided"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="ds-card">
          <div className="ds-card-head">
            <h2 className="ds-card-title">Security</h2>
          </div>
          {securityItems.map(([title, description]) => (
            <div className="ds-setting" key={title}>
              <div>
                <p className="ds-setting-title">
                  {title} <span className="ds-soon">Coming soon</span>
                </p>
                <p className="ds-setting-desc">{description}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Log out?"
        confirmLabel="Log out"
        tone="danger"
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      >
        You will need to sign in again to use the system.
      </ConfirmDialog>
    </div>
  );
}

export default Profile;
