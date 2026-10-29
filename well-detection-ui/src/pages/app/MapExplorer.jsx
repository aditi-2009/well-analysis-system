import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, RefreshCw, Search } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AreaMap from "../../components/map/AreaMap";
import { Alert, Card, ConfidenceBadge, EmptyState, PageHeader, PageLoader, btn, inputCls } from "../../components/common/ui";
import { usePrefs } from "../../context/PrefsContext";
import { listKnownWells, listWells } from "../../services/wellService";
import { areaSqMeters, bboxOfGeometry, filterWellsInBoundary, formatArea } from "../../utils/geo";
import { LEVEL_META } from "../../utils/confidence";
import { Satellite } from "lucide-react";

export default function MapExplorer() {
  useDocumentTitle("Interactive Map");
  const { prefs, update, classify } = usePrefs();
  const [params] = useSearchParams();
  const [wells, setWells] = useState([]);
  const [known, setKnown] = useState([]);
  const [showKnown, setShowKnown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [level, setLevel] = useState("all");
  const [minConf, setMinConf] = useState(0);
  const [query, setQuery] = useState("");
  const [boundary, setBoundary] = useState(null);
  const [selectedId, setSelectedId] = useState(params.get("well"));
  const [focus, setFocus] = useState(null);

  const load = async () => {
    setLoading(true); setError("");
    try { setWells(await listWells({ limit: 20000 })); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!showKnown) { setKnown([]); return; }
    let alive = true;
    listKnownWells({ bbox: boundary ? bboxOfGeometry(boundary) : undefined, limit: 20000 })
      .then((k) => alive && setKnown(filterWellsInBoundary(k, boundary)))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [showKnown, boundary]);

  // Opened from the Results page with ?well=ID&lat=..&lng=..
  useEffect(() => {
    const lat = Number(params.get("lat")), lng = Number(params.get("lng"));
    if (params.get("lat") && Number.isFinite(lat) && Number.isFinite(lng)) setFocus({ lat, lon: lng, zoom: 19, token: Date.now() });
  }, [params]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return filterWellsInBoundary(wells, boundary).filter((w) => {
      if (level !== "all" && classify(w.confidence) !== level) return false;
      if (w.confidence < minConf) return false;
      if (!q) return true;
      return [w.id, w.village, w.taluka, w.district].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [wells, boundary, level, minConf, query, classify]);

  const top = useMemo(() => [...filtered].sort((a, b) => b.confidence - a.confidence).slice(0, 150), [filtered]);

  const pick = (w) => { setSelectedId(w.id); setFocus({ lat: w.latitude, lon: w.longitude, zoom: 19, token: Date.now() }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Interactive GIS Map" subtitle="All detected wells on satellite imagery. Draw a boundary to count wells in any area.">
        <button className={btn.secondary} onClick={() => setShowKnown((s) => !s)}>{showKnown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Verified wells</button>
        <button className={btn.secondary} onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </PageHeader>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex gap-1">
          {[["all", "All"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]].map(([k, l]) => (
            <button key={k} onClick={() => setLevel(k)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${level === k ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{l}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          Min confidence {Math.round(minConf * 100)}%
          <input type="range" min="0" max="0.99" step="0.01" value={minConf} onChange={(e) => setMinConf(Number(e.target.value))} className="w-32 accent-emerald-700" />
        </label>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search well ID, village, taluka..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search wells" />
        </div>
      </div>

      {loading ? <PageLoader label="Loading wells..." /> : !wells.length ? (
        <EmptyState icon={Satellite} title="No wells detected yet" text="Run a detection first. Completed jobs appear here automatically.">
          <Link to="/app/detection" className={btn.primary}>Go to Well Detection</Link>
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card title="Wells" subtitle={`${filtered.length.toLocaleString()} shown${boundary ? " inside boundary" : ""}${filtered.length > 150 ? " (top 150 by confidence)" : ""}`} bodyClass="p-0">
            {boundary && <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-600">Boundary area: {formatArea(areaSqMeters(boundary), prefs.areaUnit)}</p>}
            <ul className="max-h-[560px] divide-y divide-slate-100 overflow-auto custom-scrollbar">
              {top.map((w) => (
                <li key={w.id}>
                  <button onClick={() => pick(w)} className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-emerald-50 ${selectedId === w.id ? "bg-emerald-50" : ""}`}>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <span className="h-2 w-2 rounded-full" style={{ background: LEVEL_META[classify(w.confidence)].color }} /> Well #{w.id}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-slate-500">{w.latitude.toFixed(6)}, {w.longitude.toFixed(6)}</span>
                    </span>
                    <ConfidenceBadge confidence={w.confidence} />
                  </button>
                </li>
              ))}
              {!top.length && <li className="px-4 py-8 text-center text-sm text-slate-500">No wells match the filters.</li>}
            </ul>
          </Card>
          <AreaMap
            className="h-[560px] lg:h-[640px]"
            boundary={boundary} wells={filtered} knownWells={showKnown ? known : []} focus={focus}
            selectedId={selectedId} onSelect={setSelectedId}
            onBoundaryChange={(g) => setBoundary(g)}
            layer={prefs.mapLayer} onLayerChange={(l) => update({ mapLayer: l })}
          />
        </div>
      )}
    </div>
  );
}
