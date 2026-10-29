// Accessibility + user preferences, saved in the browser.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THRESHOLDS, STORAGE } from "../config/constants";
import { levelOf } from "../utils/confidence";

const DEFAULTS = {
  fontSize: "md",            // sm | md | lg
  highContrast: false,
  grayscale: false,
  sidebarOpen: true,         // desktop sidebar visible?
  thresholds: DEFAULT_THRESHOLDS,
  mapLayer: "satellite",     // satellite | hybrid | roadmap
  areaUnit: "ha",            // ha | acre
  coordFormat: "decimal",    // decimal | dms
  detectConfidence: null,    // null = use the server default
  detectTileSize: null,      // null = use the server default
};

const FONT_PX = { sm: 14, md: 16, lg: 18 };
const PrefsContext = createContext(null);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.prefs) || "{}");
    return { ...DEFAULTS, ...saved, thresholds: { ...DEFAULT_THRESHOLDS, ...(saved.thresholds || {}) } };
  } catch {
    return DEFAULTS;
  }
}

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE.prefs, JSON.stringify(prefs)); } catch { /* storage full or blocked */ }
  }, [prefs]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${FONT_PX[prefs.fontSize] || 16}px`;
    const filters = [];
    if (prefs.highContrast) filters.push("contrast(1.3)");
    if (prefs.grayscale) filters.push("grayscale(1)");
    root.style.filter = filters.join(" ");
  }, [prefs.fontSize, prefs.highContrast, prefs.grayscale]);

  const update = useCallback((patch) => setPrefs((p) => ({ ...p, ...patch })), []);
  const reset = useCallback(() => setPrefs({ ...DEFAULTS, sidebarOpen: prefs.sidebarOpen }), [prefs.sidebarOpen]);
  const toggleSidebar = useCallback(() => setPrefs((p) => ({ ...p, sidebarOpen: !p.sidebarOpen })), []);
  const classify = useCallback((c) => levelOf(c, prefs.thresholds), [prefs.thresholds]);

  const value = useMemo(
    () => ({ prefs, update, reset, toggleSidebar, classify }),
    [prefs, update, reset, toggleSidebar, classify]
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);
