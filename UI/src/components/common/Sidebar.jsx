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
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Well Detection", path: "/detection", icon: Search },
  { label: "Map", path: "/map", icon: Map },
  { label: "Results", path: "/results", icon: ListChecks },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Settings", path: "/settings", icon: SettingsIcon },
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