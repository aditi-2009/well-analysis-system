// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "leaflet/dist/leaflet.css"; 
import "./utils/leafletIconFix";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);