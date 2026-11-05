import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App.jsx";
import { PrefsProvider } from "./context/PrefsContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import { SystemProvider } from "./context/SystemContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PrefsProvider>
      <ToastProvider>
        <AuthProvider>
          <SystemProvider>
            <App />
          </SystemProvider>
        </AuthProvider>
      </ToastProvider>
    </PrefsProvider>
  </StrictMode>
);
