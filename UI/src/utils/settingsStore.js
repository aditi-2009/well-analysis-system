// src/utils/settingsStore.js
// Preferences for this computer. They stay in the browser until the backend has a
// settings endpoint. The keys match the Settings page.
export const SETTINGS_KEY = "agriWellSettings";

export const DEFAULT_SETTINGS = {
  mapLayer: "OpenStreetMap",
  theme: "Light",
  language: "English",
  defaultDistrict: "Nagpur",
  resultsPerPage: "10",
  emailNotifications: false,
  autoRefreshDashboard: false,
  soundAlerts: false,
};

// Saved values win over the defaults. A broken saved value falls back to the defaults.
export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}