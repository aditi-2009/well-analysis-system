// src/components/common/ScrollToTop.jsx
// Moves the page back to the top whenever the route changes.
// It must be inside <BrowserRouter>, because useLocation() only works there.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
