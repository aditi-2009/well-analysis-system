// src/layouts/MainLayout.jsx
// The layout for logged-in pages. The navbar and sidebar stay on screen even when one page fails.
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import ErrorBoundary from "../components/common/ErrorBoundary";

// The same width the stylesheet uses for phones. One number, so CSS and code cannot disagree.
const PHONE_QUERY = "(max-width: 768px)";

function MainLayout() {
  const location = useLocation();
  // Phones: the sidebar slides over the page. Larger screens: it is shown or hidden in place.
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    if (window.matchMedia(PHONE_QUERY).matches) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsDesktopSidebarVisible((prev) => !prev);
    }
  };

  return (
    <div className="app-layout">
      <Navbar onMenuClick={toggleSidebar} />
      <div className="app-body">
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          isDesktopVisible={isDesktopSidebarVisible}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
        <main className="main-content">
          {/* Keyed by path: a failed page is replaced when the user opens another one */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
