// src/components/public/PublicLayout.jsx
import { Outlet } from "react-router-dom";
import UtilityBar from "./UtilityBar";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";

function PublicLayout() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <UtilityBar />
      <PublicHeader />
      <main id="main-content">
        <Outlet />
      </main>
      <PublicFooter />
    </>
  );
}

export default PublicLayout;
