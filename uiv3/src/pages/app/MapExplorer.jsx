// Interactive map of detected wells. Personal (my wells) or universal (wells with medium and high confidence).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Eye, EyeOff, FileJson, Globe, RefreshCw, Search } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AreaMap from "../../components/map/AreaMap";
import MarkWellModal from "../../components/map/MarkWellModal";
import WellProfile from "../../components/wells/WellProfile";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import { Alert, Card, ConfidenceBadge, PageHeader, PageLoader, ScopeToggle, btn, inputCls } from "../../components/common/ui";
import { usePrefs } from "../../context/PrefsContext";
import { useSystem } from "../../context/SystemContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { can, isAdmin } from "../../utils/permissions";
import { deleteKnownWell, deleteWell, listKnownWells, listWells } from "../../services/wellService";
import { areaSqMeters, bboxOfGeometry, filterWellsInBoundary, formatArea } from "../../utils/geo";
import { downloadWellsCsv, downloadWellsGeoJson, downloadWellsKml } from "../../utils/exporters";
import { LEVEL_META } from "../../utils/confidence";

export default function MapExplorer() {
  useDocumentTitle("Interactive Map");
  const { prefs, update } = usePrefs();
  const { thresholds, classify } = useSystem();
  const { user } = useAuth();
  const toast = useToast();
  const admin = isAdmin(user);
  const [params] = useSearchParams();

  const [scope, setScope] = useState("mine");
  const [wells, setWells] = useState([]);
  const [known, setKnown] = useState([]);
  const [showKnown, setShowKnown] = useState(false);
  const [knownTick, setKnownTick] = useState(0);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [level, setLevel] = useState("all");
  const [minConf, setMinConf] = useState(0);
  const [query, setQuery] = useState("");
  const [boundary, setBoundary] = useState(null);
  const [selectedId, setSelectedId] = useState(params.get("well"));
  const [focus, setFocus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [markMode, setMarkMode] = useState(false);
  const [markAt, setMarkAt] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const minForScope = scope === "all" ? thresholds.medium : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setWells(await listWells({ scope, minConfidence: minForScope, limit: 20000 }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [scope, minForScope, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showKnown) {
      setKnown([]);
      return undefined;
    }
    let alive = true;
    listKnownWells({ bbox: boundary ? bboxOfGeometry(boundary) : undefined, limit: 20000 })
      .then((k) => { if (alive) setKnown(k); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [showKnown, boundary, knownTick]);

  // Opened from the Results page with ?well=ID&lat=..&lng=..
  useEffect(() => {
    const lat = Number(params.get("lat"));
    const lon = Number(params.get("lng"));
    if (params.get("lat") && Number.isFinite(lat) && Number.isFinite(lon)) {
      setFocus({ lat, lon, zoom: 19, token: Date.now() });
    }
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
  const knownShown = useMemo(() => (showKnown ? filterWellsInBoundary(known, boundary) : []), [known, showKnown, boundary]);

  const openProfile = (id) => {
    setSelectedId(id);
    const det = filtered.find((w) => w.id === id);
    if (det) {
      setProfile({ well: det, kind: "detected" });
      return;
    }
    const k = knownShown.find((x) => x.id === id);
    if (k) setProfile({ well: k, kind: "verified" });
  };

  const pick = (w) => {
    setSelectedId(w.id);
    setFocus({ lat: w.latitude, lon: w.longitude, zoom: 19, token: Date.now() });
    setProfile({ well: w, kind: "detected" });
  };

  const canDeleteWell = (w) => can(user, "results.delete.any") || w.userId === user?.id;
  const canDeleteKnown = (k) => admin && k.source === "admin-manual";

  const confirmDeleteAction = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.type === "well") {
        await deleteWell(pendingDelete.well.numericId);
        setWells((list) => list.filter((x) => x.id !== pendingDelete.well.id));
        toast.success(`Well #${pendingDelete.well.id} deleted.`);
      } else {
        await deleteKnownWell(pendingDelete.known.knownId);
        setKnown((list) => list.filter((x) => x.id !== pendingDelete.known.id));
        toast.success("Verified well removed.");
      }
      setProfile(null);
      setPendingDelete(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const exportName = "wells_map";

  if (loading && !wells.length) return <PageLoader label="Loading wells..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Interactive Map" subtitle={`${filtered.length.toLocaleString()} wells shown${boundary ? " inside the boundary" : ""}. Click a well for its village, district and coordinates.`}>
        <ScopeToggle value={scope} onChange={setScope} />
        <button type="button" className={btn.secondary} onClick={() => setShowKnown((s) => !s)}>
          {showKnown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Verified wells
        </button>
        <button type="button" className={btn.secondary} onClick={() => setTick((t) => t + 1)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </PageHeader>

      {scope === "all" && (
        <Alert tone="info">
          Universal view: wells with medium and high confidence (from {Math.round(thresholds.medium * 100)}%) from every account.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex gap-1">
          {[["all", "All"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setLevel(k)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${level === k ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          Min confidence {Math.round(minConf * 100)}%
          <input type="range" min="0" max="0.99" step="0.01" value={minConf} onChange={(e) => setMinConf(Number(e.target.value))} className="w-32 accent-emerald-700" />
        </label>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search well ID, village, taluka or district" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search wells" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn.small} disabled={!filtered.length} onClick={() => downloadWellsCsv(filtered, thresholds, exportName)}><Download className="h-3.5 w-3.5" /> CSV</button>
          <button type="button" className={btn.small} disabled={!filtered.length} onClick={() => downloadWellsGeoJson(filtered, thresholds, boundary, exportName)}><FileJson className="h-3.5 w-3.5" /> GeoJSON</button>
          <button type="button" className={btn.small} disabled={!filtered.length} onClick={() => downloadWellsKml(filtered, thresholds, boundary, exportName)}><Globe className="h-3.5 w-3.5" /> KML</button>
        </div>
      </div>

      {!wells.length && !loading ? (
        <Alert tone="info">No wells to show yet. Run a detection from Well Detection, or change the view.</Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card title="Wells" subtitle={`${filtered.length.toLocaleString()} shown${filtered.length > 150 ? " (top 150 by confidence)" : ""}`} bodyClass="p-0">
            {boundary && <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-600">Boundary area: {formatArea(areaSqMeters(boundary), prefs.areaUnit)}</p>}
            <ul className="max-h-[560px] divide-y divide-slate-100 overflow-auto custom-scrollbar">
              {top.map((w) => (
                <li key={w.id}>
                  <button type="button" onClick={() => pick(w)} className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-emerald-50 ${selectedId === w.id ? "bg-emerald-50" : ""}`}>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <span className="h-2 w-2 rounded-full" style={{ background: LEVEL_META[classify(w.confidence)].color }} /> Well #{w.id}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">{w.village || "Village not recorded"}{w.district ? `, ${w.district}` : ""}</span>
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
            boundary={boundary}
            wells={filtered}
            knownWells={knownShown}
            focus={focus}
            selectedId={selectedId}
            onSelect={openProfile}
            onBoundaryChange={(g) => setBoundary(g)}
            layer={prefs.mapLayer}
            onLayerChange={(l) => update({ mapLayer: l })}
            markMode={markMode}
            onToggleMark={admin ? () => setMarkMode((m) => !m) : undefined}
            onMarkPoint={(lat, lon) => setMarkAt({ lat, lon })}
          />
        </div>
      )}

      {profile && (
        <WellProfile
          well={profile.well}
          kind={profile.kind}
          canDelete={profile.kind === "verified" ? canDeleteKnown(profile.well) : canDeleteWell(profile.well)}
          onDelete={() => setPendingDelete(profile.kind === "verified" ? { type: "known", known: profile.well } : { type: "well", well: profile.well })}
          onClose={() => setProfile(null)}
        />
      )}

      <MarkWellModal
        at={markAt}
        onClose={() => setMarkAt(null)}
        onSaved={() => { setShowKnown(true); setKnownTick((t) => t + 1); toast.success("Well saved as verified."); }}
      />

      <ConfirmDelete
        open={Boolean(pendingDelete)}
        title="Delete this well?"
        text="This well is removed from the database. This cannot be undone."
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDeleteAction}
      />
    </div>
  );
}
