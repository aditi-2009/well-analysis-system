// src/pages/Profile.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Edit3, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [actionMessage, setActionMessage] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleEditProfile = () => {
    // Mock — real edit form/API call would go here later
    setActionMessage("Edit profile is not yet connected to a backend. This is a placeholder.");
    setTimeout(() => setActionMessage(""), 4000);
  };

  const handleChangePassword = () => {
    // Mock — real change-password form/API call would go here later
    setActionMessage("Change password is not yet connected to a backend. This is a placeholder.");
    setTimeout(() => setActionMessage(""), 4000);
  };

  return (
    <div className="profile-page">
      <h2 className="page-heading">Profile</h2>
      <p className="page-subheading">Your account information</p>

      {actionMessage && <div className="action-message-banner">{actionMessage}</div>}

      <div className="profile-card">
        <div className="profile-avatar">
          {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
        </div>

        <div className="profile-info">
          <div className="detail-row">
            <span className="detail-label">Full Name</span>
            <span className="detail-value">{user?.fullName || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Email</span>
            <span className="detail-value">{user?.email || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Organization</span>
            <span className="detail-value">{user?.organization || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Mobile</span>
            <span className="detail-value">{user?.mobile || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Role</span>
            <span className="detail-value">Researcher</span>
          </div>
        </div>

        <div className="profile-actions">
          <button className="secondary-btn" onClick={handleEditProfile}>
            <Edit3 size={16} /> Edit Profile
          </button>
          <button className="secondary-btn" onClick={handleChangePassword}>
            <KeyRound size={16} /> Change Password
          </button>
          <button className="logout-danger-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;