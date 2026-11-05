// Settings. Everyone can change how the screens look. Only administrators change the system settings
// (confidence levels, detection defaults, learning).
import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Card, PageHeader, Spinner, btn, inputCls, labelCls } from "../../components/common/ui";
import { Switch } from "../../components/layout/GovStrip";
import { usePrefs } from "../../context/PrefsContext";
import { useSystem } from "../../context/SystemContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { isAdmin } from "../../utils/permissions";
import { DETECTION_LIMITS } from "../../config/constants";
import { formatCoord } from "../../utils/geo";
import { activateSavedVersion, getLearningStatus, startLearningRound } from "../../services/learningService";
import { formatDate } from "../../utils/format";

function Row({ title, desc, children }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-md">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <div className="sm:w-64">{children}</div>
    </div>
  );
}

function LearningPanel() {
  const toast = useToast();
  const { system, saveSetting } = useSystem();
  const cfg = system.learning;
  const [draft, setDraft] = useState(cfg);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setDraft(cfg); }, [cfg]);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getLearningStatus());
    } catch (e) {
      toast.error(e.message);
    }
  }, [toast]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!status?.busy) return undefined;
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [status?.busy, refresh]);

  const save = async () => {
    setBusy(true);
    try {
      await saveSetting("learning", draft);
      toast.success("Learning settings saved.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    try {
      await startLearningRound(false);
      toast.success("Learning round started. It runs in the background.");
      await refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const activate = async () => {
    setBusy(true);
    try {
      const res = await activateSavedVersion();
      toast.success(res.message);
      await refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const last = status?.last_round;

  return (
    <Card title="Learning from detections" subtitle="Confident wells are kept as examples to improve future detection. Administrators only.">
      <Row title="Learn from detections" desc="Keep wells above the confidence level below as examples.">
        <Switch checked={Boolean(draft.enabled)} onChange={(v) => setDraft({ ...draft, enabled: v })} label="Learn from detections" />
      </Row>
      <Row title={`Confidence from ${Math.round(draft.min_confidence * 100)}%`} desc="Only wells above this confidence are kept. Default 70%.">
        <input type="range" min="0.05" max="0.99" step="0.01" value={draft.min_confidence} className="w-full accent-emerald-700"
          onChange={(e) => setDraft({ ...draft, min_confidence: Number(e.target.value) })} aria-label="Learning confidence" />
      </Row>
      <Row title="Start a round automatically" desc="A round starts after this many new examples have built up.">
        <input type="number" min="0" step="50" className={inputCls} value={draft.auto_train_samples} aria-label="Examples before automatic round"
          onChange={(e) => setDraft({ ...draft, auto_train_samples: Math.max(0, Number(e.target.value) || 0) })} />
      </Row>
      <div className="mt-2 flex justify-end">
        <button type="button" className={btn.primary} onClick={save} disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save learning settings</button>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-700 sm:grid-cols-2">
        <p>Examples waiting: <b>{status?.pending_samples ?? "-"}</b></p>
        <p>Wells marked by administrators: <b>{status?.verified_wells ?? "-"}</b></p>
        <p className="sm:col-span-2">
          Last round: <b>{last ? (last.result || "-") : "none yet"}</b>
          {last?.finished_at ? `, ${formatDate(last.finished_at, true)}` : ""}
          {last?.message ? `. ${last.message}` : ""}
        </p>
        <p className="sm:col-span-2">Saved version waiting for activation: <b>{status?.candidate_available ? "yes" : "no"}</b></p>
      </div>
      <Alert tone="info" className="mt-3">
        A new version replaces the current one only when it is not worse on the wells marked by administrators. Without marked wells, the new version is saved but not used until you activate it.
      </Alert>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {status?.candidate_available && <button type="button" className={btn.secondary} onClick={activate} disabled={busy || status?.busy}>Activate saved version</button>}
        <button type="button" className={btn.primary} onClick={start} disabled={busy || status?.busy}>Start learning round</button>
      </div>
    </Card>
  );
}

export default function Settings() {
  useDocumentTitle("Settings");
  const { prefs, update, reset } = usePrefs();
  const { system, saveSetting } = useSystem();
  const { user } = useAuth();
  const toast = useToast();
  const admin = isAdmin(user);
  const [levels, setLevels] = useState(system.confidence_thresholds);
  const [defaults, setDefaults] = useState(system.detection_defaults);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLevels(system.confidence_thresholds);
    setDefaults(system.detection_defaults);
  }, [system]);

  const saveLevels = async () => {
    if (levels.medium >= levels.high) {
      toast.warning("Medium must stay below High.");
      return;
    }
    setBusy(true);
    try {
      await saveSetting("confidence_thresholds", levels);
      toast.success("Confidence levels saved for everyone.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveDefaults = async () => {
    setBusy(true);
    try {
      await saveSetting("detection_defaults", defaults);
      toast.success("Detection defaults saved.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Display settings are saved in this browser. System settings apply to every account." />

      <Card title="Display" subtitle="How the screens look and read. Saved in this browser.">
        <Row title="Text size" desc="Scales the whole interface.">
          <select className={inputCls} value={prefs.fontSize} onChange={(e) => update({ fontSize: e.target.value })} aria-label="Text size">
            <option value="sm">Small</option><option value="md">Normal</option><option value="lg">Large</option>
          </select>
        </Row>
        <Row title="High contrast" desc="Stronger colour contrast."><Switch checked={prefs.highContrast} onChange={(v) => update({ highContrast: v })} label="High contrast" /></Row>
        <Row title="Grayscale" desc="Remove colour."><Switch checked={prefs.grayscale} onChange={(v) => update({ grayscale: v })} label="Grayscale" /></Row>
        <Row title="Show sidebar" desc="Also toggled with the button in the top bar, or Ctrl+B."><Switch checked={prefs.sidebarOpen} onChange={(v) => update({ sidebarOpen: v })} label="Show sidebar" /></Row>
        <Row title="Default map layer" desc="Layer used when a map opens.">
          <select className={inputCls} value={prefs.mapLayer} onChange={(e) => update({ mapLayer: e.target.value })} aria-label="Default map layer">
            <option value="satellite">Satellite</option><option value="hybrid">Hybrid (satellite and labels)</option><option value="roadmap">Roadmap</option>
          </select>
        </Row>
        <Row title="Coordinate format" desc={`Example: ${formatCoord(20.565123, 78.410456, prefs.coordFormat, 5)}`}>
          <select className={inputCls} value={prefs.coordFormat} onChange={(e) => update({ coordFormat: e.target.value })} aria-label="Coordinate format">
            <option value="decimal">Decimal degrees</option><option value="dms">Degrees, minutes, seconds</option>
          </select>
        </Row>
        <Row title="Area unit" desc="For the area of a boundary.">
          <select className={inputCls} value={prefs.areaUnit} onChange={(e) => update({ areaUnit: e.target.value })} aria-label="Area unit">
            <option value="ha">Hectares and km²</option><option value="acre">Acres</option>
          </select>
        </Row>
        <div className="mt-3 flex justify-end">
          <button type="button" className={btn.secondary} onClick={() => { reset(); toast.success("Display settings reset."); }}>
            <RotateCcw className="h-4 w-4" /> Reset display settings
          </button>
        </div>
      </Card>

      {admin ? (
        <>
          <Card title="Confidence levels" subtitle="How wells are coloured and grouped for every account (administrator)">
            <Row title={`High from ${Math.round(levels.high * 100)}%`} desc="Green. Accept with light review.">
              <input type="range" min="0.1" max="0.99" step="0.01" value={levels.high} className="w-full accent-emerald-700" aria-label="High threshold"
                onChange={(e) => setLevels({ ...levels, high: Number(e.target.value) })} />
            </Row>
            <Row title={`Medium from ${Math.round(levels.medium * 100)}%`} desc="Amber. Review on imagery. Below this is Low (red): send for field check.">
              <input type="range" min="0.05" max="0.95" step="0.01" value={levels.medium} className="w-full accent-amber-500" aria-label="Medium threshold"
                onChange={(e) => setLevels({ ...levels, medium: Number(e.target.value) })} />
            </Row>
            <div className="mt-3 flex justify-end">
              <button type="button" className={btn.primary} onClick={saveLevels} disabled={busy}>Save confidence levels</button>
            </div>
          </Card>

          <Card title="Detection defaults" subtitle="Used by every run unless a run changes them (administrator)">
            <Row title={`Minimum confidence: ${Math.round(defaults.confidence * 100)}%`} desc="Lower finds more wells, and more false ones.">
              <input type="range" min={DETECTION_LIMITS.confidenceMin} max={DETECTION_LIMITS.confidenceMax} step="0.01" value={defaults.confidence}
                className="w-full accent-emerald-700" aria-label="Default confidence" onChange={(e) => setDefaults({ ...defaults, confidence: Number(e.target.value) })} />
            </Row>
            <Row title="Tile size" desc="Size of each piece of the image that is scanned.">
              <select className={inputCls} value={defaults.tile_size} onChange={(e) => setDefaults({ ...defaults, tile_size: Number(e.target.value) })} aria-label="Default tile size">
                {DETECTION_LIMITS.tileSizes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Row>
            <Row title="Colour stretch" desc="Use for 16-bit or very dark images.">
              <select className={inputCls} value={defaults.normalize} onChange={(e) => setDefaults({ ...defaults, normalize: e.target.value })} aria-label="Default colour stretch">
                <option value="none">None (8-bit images)</option>
                <option value="stretch">Stretch</option>
              </select>
            </Row>
            <div className="mt-3 flex justify-end">
              <button type="button" className={btn.primary} onClick={saveDefaults} disabled={busy}>Save detection defaults</button>
            </div>
          </Card>

          <LearningPanel />
        </>
      ) : (
        <Card title="System settings" subtitle="Applies to every account">
          <Row title="Confidence levels" desc="How wells are coloured and grouped.">
            <p className="text-sm font-semibold text-slate-800">High from {Math.round(system.confidence_thresholds.high * 100)}%, medium from {Math.round(system.confidence_thresholds.medium * 100)}%</p>
          </Row>
          <Row title="Detection defaults" desc="Confidence, tile size and colour stretch for new runs.">
            <p className="text-sm font-semibold text-slate-800">{Math.round(system.detection_defaults.confidence * 100)}% confidence, tile {system.detection_defaults.tile_size} px</p>
          </Row>
          <Alert tone="info" className="mt-3">These values are set by the administrator. Ask them if you need a change.</Alert>
        </Card>
      )}
    </div>
  );
}
