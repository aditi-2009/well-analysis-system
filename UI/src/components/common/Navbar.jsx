// src/components/common/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { Menu, LogOut, UserCircle, Settings, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { APP_NAME, ORG_NAME } from "../../utils/constants";

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Close the dropdown when clicking anywhere outside it
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const goToProfile = () => {
    setIsProfileMenuOpen(false);
    navigate("/app/profile");
  };

  const goToSettings = () => {
    setIsProfileMenuOpen(false);
    navigate("/app/settings");
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-menu-btn" onClick={onMenuClick} aria-label="Toggle sidebar" title="Toggle sidebar">
          <Menu size={22} />
        </button>
        <div className="navbar-title">
          <span className="navbar-org">{ORG_NAME}</span>
          <span className="navbar-app-name">{APP_NAME}</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-profile-wrapper" ref={profileMenuRef}>
          <button
            className="navbar-user"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            aria-label="Open profile menu"
          >
            <UserCircle size={22} />
            <span className="navbar-username">{user?.fullName || "User"}</span>
            <ChevronDown size={14} />
          </button>

          {isProfileMenuOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <p className="profile-dropdown-name">{user?.fullName || "User"}</p>
                <p className="profile-dropdown-email">{user?.email || ""}</p>
              </div>
              <button className="profile-dropdown-item" onClick={goToProfile}>
                <UserCircle size={16} /> View Profile
              </button>
              <button className="profile-dropdown-item" onClick={goToSettings}>
                <Settings size={16} /> Settings
              </button>
              <button className="profile-dropdown-item profile-dropdown-logout" onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;