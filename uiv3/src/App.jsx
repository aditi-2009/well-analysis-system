import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { PageLoader } from "./components/common/ui";

import Home from "./pages/public/Home";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import Help from "./pages/public/Help";
import Policy from "./pages/public/Policy";
import NotFound from "./pages/public/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Heavy pages (maps, charts) load only when opened
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const WellDetection = lazy(() => import("./pages/app/WellDetection"));
const MapExplorer = lazy(() => import("./pages/app/MapExplorer"));
const Results = lazy(() => import("./pages/app/Results"));
const Reports = lazy(() => import("./pages/app/Reports"));
const Account = lazy(() => import("./pages/app/Account"));
const Settings = lazy(() => import("./pages/app/Settings"));

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public site: the app opens on Home */}
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="help" element={<Help />} />
              <Route path="policies/:slug" element={<Policy />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Signed-in application */}
            <Route element={<ProtectedRoute />}>
              <Route path="app" element={<AppLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="detection" element={<WellDetection />} />
                <Route path="map" element={<MapExplorer />} />
                <Route path="results" element={<Results />} />
                <Route path="reports" element={<Reports />} />
                <Route path="account" element={<Account />} />
                <Route path="settings" element={<Settings />} />
                <Route path="help" element={<Help />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
