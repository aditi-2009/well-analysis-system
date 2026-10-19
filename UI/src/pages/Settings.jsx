// src/pages/Settings.jsx
// Preferences are saved in this browser (settingsStore). Rows marked "Coming soon" are
// disabled until the feature behind them exists.
import { useState } from "react";
import { Bell, Map as MapIcon, Palette, RotateCcw, Save } from "lucide-react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../utils/settingsStore";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";

const MAP_LAYERS = ["OpenStreetMap", "Satellite", "Terrain"];
const PAGE_SIZES = ["10", "25", "50", "100"];

function Row({ title, description, soon = false, children }) {
  return (
    <div className="ds-setting">
      <div>
        <p className="ds-setting-title">
          {title}
          {soon && <span className="ds-soon">Coming soon</span>}
        </p>
        <p className="ds-setting-desc">{description}</p>
      </div>
      <div className="ds-setting-control">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`ds-switch ${disabled ? "is-disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ds-switch-track" />
    </label>
  );
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="ds-card">
      <div className="ds-card-head">
        <div className="ds-card-head-main">
          <span className="ds-section-icon" aria-hidden="true">
            <Icon size={18} />
          </span>
          <div>
            <h2 className="ds-card-title">{title}</h2>
            <p className="ds-card-sub">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function Settings() {
  useDocumentTitle("Settings");
  const toast = useToast();

  const [saved, setSaved] = useState(() => loadSettings());
  const [draft, setDraft] = useState(() => loadSettings());
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const update = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const persist = (next, message) => {
    try {
      saveSettings(next);
      setSaved(next);
      setDraft(next);
      toast.success(message);
    } catch {
      toast.error("Could not save preferences in this browser.");
    }
  };

  return (
    <div className="ds-page">
      <PageHeader title="Settings" description="Preferences for this computer" />

      <div className="ds-stack" style={{ maxWidth: 820 }}>
        <Section icon={MapIcon} title="Map and tables" description="How maps and result tables open.">
          <Row title="Default map layer" description="The layer a map shows when it opens.">
            <select
              className="ds-select ds-select-compact"
              aria-label="Default map layer"
              value={draft.mapLayer}
              onChange={(event) => update("mapLayer", event.target.value)}
            >
              {MAP_LAYERS.map((layer) => (
                <option key={layer} value={layer}>
                  {layer}
                </option>
              ))}
            </select>
          </Row>
          <Row title="Results per page" description="Rows shown per page in well tables.">
            <select
              className="ds-select ds-select-compact"
              aria-label="Results per page"
              value={String(draft.resultsPerPage)}
              onChange={(event) => update("resultsPerPage", event.target.value)}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </Row>
        </Section>

        <Section icon={Palette} title="Appearance and language" description="How the application looks and reads.">
          <Row title="Theme" description="Colour theme of the application." soon>
            <select className="ds-select ds-select-compact" aria-label="Theme" value="Light" disabled>
              <option value="Light">Light</option>
            </select>
          </Row>
          <Row title="Language" description="Interface language." soon>
            <select className="ds-select ds-select-compact" aria-label="Language" value="English" disabled>
              <option value="English">English</option>
            </select>
          </Row>
        </Section>

        <Section icon={Bell} title="Notifications and refresh" description="What happens while you work.">
          <Row title="Auto-refresh dashboard" description="Refresh the dashboard numbers every 5 minutes.">
            <Switch
              label="Auto-refresh dashboard"
              checked={Boolean(draft.autoRefreshDashboard)}
              onChange={(value) => update("autoRefreshDashboard", value)}
            />
          </Row>
          <Row title="Email notifications" description="Get an email when a detection run finishes." soon>
            <Switch label="Email notifications" checked={false} disabled onChange={() => {}} />
          </Row>
          <Row title="Sound alerts" description="Play a sound when processing finishes." soon>
            <Switch label="Sound alerts" checked={false} disabled onChange={() => {}} />
          </Row>
        </Section>
      </div>

      <div className="ds-savebar">
        <span>{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        <div className="ds-page-actions">
          <Button
            variant="onDark"
            icon={RotateCcw}
            onClick={() => persist({ ...DEFAULT_SETTINGS }, "Preferences reset to default.")}
          >
            Reset to default
          </Button>
          <Button
            variant="light"
            icon={Save}
            disabled={!dirty}
            onClick={() => persist(draft, "Preferences saved.")}
          >
            Save preferences
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
