// src/components/common/Sidebar.jsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Map,
  ListChecks,
  FileText,
  User,
  Settings as SettingsIcon,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
  { label: "Well Detection", path: "/app/detection", icon: Search },
  { label: "Map", path: "/app/map", icon: Map },
  { label: "Results", path: "/app/results", icon: ListChecks },
  { label: "Reports", path: "/app/reports", icon: FileText },
  { label: "Profile", path: "/app/profile", icon: User },
  { label: "Settings", path: "/app/settings", icon: SettingsIcon },
];

function Sidebar({ isMobileOpen, isDesktopVisible, onMobileClose }) {
  const sidebarClasses = [
    "sidebar",
    isMobileOpen ? "sidebar-open" : "",
    !isDesktopVisible ? "sidebar-collapsed" : "",
  ].join(" ");

  return (
    <>
      {isMobileOpen && <div className="sidebar-overlay" onClick={onMobileClose} />}

      <aside className={sidebarClasses}>
        <div className="sidebar-header">
          <span className="sidebar-title">Menu</span>
          <button className="sidebar-close-btn" onClick={onMobileClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
              }
              onClick={onMobileClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;