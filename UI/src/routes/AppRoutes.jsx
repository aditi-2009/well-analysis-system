// src/routes/AppRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import PublicLayout from "../components/public/PublicLayout";
import Home from "../pages/public/Home";
import About from "../pages/public/About";
import Contact from "../pages/public/Contact";
import NotFound from "../pages/NotFound";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";

import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard";
import WellDetection from "../pages/WellDetection";
import MapView from "../pages/MapView";
import Results from "../pages/Results";
import Reports from "../pages/Reports";
import Profile from "../pages/Profile";
import Settings from "../pages/Settings";

// Wrapper that blocks access to a page unless the user is logged in
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null; // could show a loader here later
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Everything — public site AND the internal app — shares the
          UtilityBar / PublicHeader / PublicFooter via PublicLayout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Auth pages — also share the public header/footer */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected internal application — MainLayout (navbar + sidebar)
            now renders inside PublicLayout's <main>, so the dashboard,
            well detection, map, results, reports, settings and profile
            pages all get the public header/footer/utility bar too */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="detection" element={<WellDetection />} />
          <Route path="map" element={<MapView />} />
          <Route path="results" element={<Results />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all: unknown paths get a 404 with the public header/footer */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
