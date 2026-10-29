import { RotateCcw } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Card, PageHeader, btn, inputCls, labelCls } from "../../components/common/ui";
import { Switch } from "../../components/layout/GovStrip";
import { usePrefs } from "../../context/PrefsContext";
import { useToast } from "../../context/ToastContext";
import { API_BASE_URL } from "../../services/api";
import { DETECTION_LIMITS } from "../../config/constants";
import { formatCoord } from "../../utils/geo";

function Row({ title, desc, children }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-md"><h4 className="text-sm font-semibold text-slate-900">{title}</h4><p className="text-xs text-slate-500">{desc}</p></div>
      <div className="sm:w-60">{children}</div>
    </div>
  );
}

export default function Settings() {
  useDocumentTitle("Settings");
  const { prefs, update, reset } = usePrefs();
  const toast = useToast();
  const t = prefs.thresholds;

  const setThreshold = (key, val) => {
    const v = Math.round(Math.min(0.99, Math.max(0.05, val)) * 100) / 100;
    const next = { ...t, [key]: v };
    if (next.medium >= next.high) { toast.warning("Medium must stay below High."); return; }
    update({ thresholds: next });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Preferences for this browser. Changes are saved automatically.">
        <button className={btn.secondary} onClick={() => { reset(); toast.success("Preferences reset to defaults."); }}><RotateCcw className="h-4 w-4" /> Reset to defaults</button>
      </PageHeader>

      <Card title="Confidence levels" subtitle="How well markers are coloured everywhere in the app">
        <Row title={`High confidence: ${Math.round(t.high * 100)}% and above`} desc="Green markers. Accept with light review.">
          <input type="range" min="0.1" max="0.99" step="0.01" value={t.high} onChange={(e) => setThreshold("high", Number(e.target.value))} className="w-full accent-emerald-700" aria-label="High threshold" />
        </Row>
        <Row title={`Medium confidence: ${Math.round(t.medium * 100)}% and above`} desc="Amber markers. Review on imagery. Anything lower is Low (red): send for field check.">
          <input type="range" min="0.05" max="0.95" step="0.01" value={t.medium} onChange={(e) => setThreshold("medium", Number(e.target.value))} className="w-full accent-amber-500" aria-label="Medium threshold" />
        </Row>
      </Card>

      <Card title="Map & units">
        <Row title="Default map layer" desc="Layer used when a map opens.">
          <select className={inputCls} value={prefs.mapLayer} onChange={(e) => update({ mapLayer: e.target.value })}>
            <option value="satellite">Satellite</option><option value="hybrid">Hybrid (satellite + labels)</option><option value="roadmap">Roadmap</option>
          </select>
        </Row>
        <Row title="Coordinate format" desc={`Example: ${formatCoord(20.565123, 78.410456, prefs.coordFormat, 5)}`}>
          <select className={inputCls} value={prefs.coordFormat} onChange={(e) => update({ coordFormat: e.target.value })}>
            <option value="decimal">Decimal degrees</option><option value="dms">Degrees, minutes, seconds</option>
          </select>
        </Row>
        <Row title="Area unit" desc="For boundary area.">
          <select className={inputCls} value={prefs.areaUnit} onChange={(e) => update({ areaUnit: e.target.value })}>
            <option value="ha">Hectares / km²</option><option value="acre">Acres</option>
          </select>
        </Row>
      </Card>

      <Card title="Detection defaults" subtitle="Used as the starting values on the Well Detection page">
        <Row title={`Minimum confidence: ${prefs.detectConfidence == null ? "server default" : Math.round(prefs.detectConfidence * 100) + "%"}`} desc="Lower finds more wells and more false ones.">
          <div className="space-y-1">
            <input type="range" min={DETECTION_LIMITS.confidenceMin} max={DETECTION_LIMITS.confidenceMax} step="0.01" value={prefs.detectConfidence ?? 0.25} onChange={(e) => update({ detectConfidence: Number(e.target.value) })} className="w-full accent-emerald-700" aria-label="Default confidence" />
            <button className="text-[11px] font-semibold text-emerald-700 hover:underline" onClick={() => update({ detectConfidence: null })}>Use server default</button>
          </div>
        </Row>
        <Row title="Tile size" desc="Server default is best unless you tested otherwise.">
          <select className={inputCls} value={prefs.detectTileSize ?? ""} onChange={(e) => update({ detectTileSize: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Server default</option>{DETECTION_LIMITS.tileSizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Row>
      </Card>

      <Card title="Accessibility & layout">
        <Row title="Text size" desc="Scales the whole interface.">
          <select className={inputCls} value={prefs.fontSize} onChange={(e) => update({ fontSize: e.target.value })}>
            <option value="sm">Small</option><option value="md">Normal</option><option value="lg">Large</option>
          </select>
        </Row>
        <Row title="High contrast" desc="Stronger colour contrast."><Switch checked={prefs.highContrast} onChange={(v) => update({ highContrast: v })} label="High contrast" /></Row>
        <Row title="Grayscale" desc="Remove colour."><Switch checked={prefs.grayscale} onChange={(v) => update({ grayscale: v })} label="Grayscale" /></Row>
        <Row title="Show sidebar" desc="Also toggled with the button in the top bar or Ctrl+B."><Switch checked={prefs.sidebarOpen} onChange={(v) => update({ sidebarOpen: v })} label="Show sidebar" /></Row>
      </Card>

      <Card title="Connection">
        <label className={labelCls} htmlFor="api-url">Backend API address</label>
        <input id="api-url" className={inputCls} value={API_BASE_URL} readOnly />
        <Alert className="mt-3">Change it in the <code>.env</code> file (<code>VITE_API_BASE_URL</code>) and restart <code>npm run dev</code>.</Alert>
      </Card>
    </div>
  );
}
