// src/layouts/MainLayout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";

function MainLayout() {
  // Controls the mobile off-canvas sidebar (slide-in overlay on small screens)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Controls whether the sidebar is shown/hidden on desktop/tablet
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);

  // Single toggle button in the navbar drives both behaviors depending on screen size
  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;