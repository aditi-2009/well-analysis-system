// src/main.jsx
// The entry point. Global styles load first, so the design layer's font import
// is the first rule in the bundled stylesheet and every later style can use its tokens.
import "./styles/design.css";
import "./styles/shell.css";
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