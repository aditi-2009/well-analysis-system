// src/components/public/PublicHeader.jsx
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ORG_NAME } from "../../utils/constants";
import logo from "../../assets/images/image.png";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
];

function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isAuthTabActive = location.pathname === "/login" || location.pathname === "/register";

  return (
    <header className="public-header">
      <div className="public-header-inner">
        <NavLink to="/" className="public-header-logo-link" aria-label="Go to home page">
          <img src={logo} alt={ORG_NAME} className="public-header-logo-img" />
        </NavLink>

        <button
          className="public-header-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="public-navigation"
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`public-header-right ${menuOpen ? "is-open" : ""}`}>
          <nav id="public-navigation" className="public-nav" aria-label="Primary">
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => (isActive ? "is-active" : "")}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}

              {isAuthenticated ? (
                <li>
                  <NavLink
                    to="/app/dashboard"
                    className={({ isActive }) => (isActive ? "is-active" : "")}
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </NavLink>
                </li>
              ) : (
                <li>
                  <NavLink
                    to="/login"
                    className={isAuthTabActive ? "is-active" : ""}
                    onClick={() => setMenuOpen(false)}
                  >
                    Login / Register
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default PublicHeader;
