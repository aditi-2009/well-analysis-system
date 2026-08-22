// src/pages/Settings.jsx
import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";

const DEFAULT_SETTINGS = {
  mapLayer: "OpenStreetMap",
  theme: "Light",
  language: "English",
  defaultDistrict: "Nagpur",
  resultsPerPage: "10",
  emailNotifications: true,
  autoRefreshDashboard: false,
  soundAlerts: false,
};

function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saveMessage, setSaveMessage] = useState("");

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Mock save — later this becomes: await api.put("/settings", settings)
    setSaveMessage("Preferences saved successfully.");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setSaveMessage("Preferences reset to default.");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  return (
    <div className="settings-page">
      <h2 className="page-heading">Settings</h2>
      <p className="page-subheading">Application preferences</p>

      {saveMessage && <div className="action-message-banner">{saveMessage}</div>}

      <div className="settings-card">
        <h3 className="section-title">Map & Detection</h3>

        <div className="settings-row">
          <div>
            <p className="detail-value">Default Map Layer</p>
            <p className="detail-label">Layer shown by default when opening the map</p>
          </div>
          <select
            className="table-filter-select"
            value={settings.mapLayer}
            onChange={(e) => updateSetting("mapLayer", e.target.value)}
          >
            <option value="OpenStreetMap">OpenStreetMap</option>
            <option value="Satellite">Satellite</option>
          </select>
        </div>

        <div className="settings-row">
          <div>
            <p className="detail-value">Default District</p>
            <p className="detail-label">Pre-filled district when starting a new detection</p>
          </div>
          <select
            className="table-filter-select"
            value={settings.defaultDistrict}
            onChange={(e) => updateSetting("defaultDistrict", e.target.value)}
          >
            <option value="Nagpur">Nagpur</option>
            <option value="Wardha">Wardha</option>
            <option value="Chandrapur">Chandrapur</option>
            <option value="Amravati">Amravati</option>
          </select>
        </div>

        <div className="settings-row">
          <div>
            <p className="detail-value">Results Per Page</p>
            <p className="detail-label">Number of wells shown per page in tables</p>
          </div>
          <select
            className="table-filter-select"
            value={settings.resultsPerPage}
            onChange={(e) => updateSetting("resultsPerPage", e.target.value)}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <div className="settings-card">
        <h3 className="section-title">Appearance & Language</h3>

        <div className="settings-row">
          <div>
            <p className="detail-value">Theme</p>
            <p className="detail-label">Application color theme</p>
          </div>
          <select
            className="table-filter-select"
            value={settings.theme}
            onChange={(e) => updateSetting("theme", e.target.value)}
          >
            <option value="Light">Light</option>
            <option value="Dark">Dark (coming soon)</option>
          </select>
        </div>

        <div className="settings-row">
          <div>
            <p className="detail-value">Language</p>
            <p className="detail-label">Interface display language</p>
          </div>
          <select
            className="table-filter-select"
            value={settings.language}
            onChange={(e) => updateSetting("language", e.target.value)}
          >
            <option value="English">English</option>
            <option value="Hindi">Hindi (coming soon)</option>
            <option value="Marathi">Marathi (coming soon)</option>
          </select>
        </div>
      </div>

      <div className="settings-card">
        <h3 className="section-title">Notifications</h3>

        <div className="settings-row">
          <div>
            <p className="detail-value">Email Notifications</p>
            <p className="detail-label">Get notified when a detection run completes</p>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={() => updateSetting("emailNotifications", !settings.emailNotifications)}
            />
            Enabled
          </label>
        </div>

        <div className="settings-row">
          <div>
            <p className="detail-value">Sound Alerts</p>
            <p className="detail-label">Play a sound when processing finishes</p>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.soundAlerts}
              onChange={() => updateSetting("soundAlerts", !settings.soundAlerts)}
            />
            Enabled
          </label>
        </div>

        <div className="settings-row">
          <div>
            <p className="detail-value">Auto-Refresh Dashboard</p>
            <p className="detail-label">Automatically refresh dashboard stats every few minutes</p>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.autoRefreshDashboard}
              onChange={() => updateSetting("autoRefreshDashboard", !settings.autoRefreshDashboard)}
            />
            Enabled
          </label>
        </div>
      </div>

      <div className="settings-actions-row">
        <button className="start-detection-btn" onClick={handleSave}>
          <Save size={16} /> Save Preferences
        </button>
        <button className="secondary-btn" onClick={handleReset}>
          <RotateCcw size={16} /> Reset to Default
        </button>
      </div>

      <p className="settings-note">
        These preferences are stored locally for now. Once connected to a backend,
        they can be saved per-user via a <code>/settings</code> endpoint.
      </p>
    </div>
  );
}

export default Settings;