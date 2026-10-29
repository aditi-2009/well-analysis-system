import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Download, ExternalLink, FileJson, MapPin, Satellite, Search } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Card, ConfidenceBadge, CopyButton, EmptyState, LevelPill, PageHeader, PageLoader, btn, inputCls } from "../../components/common/ui";
import { usePrefs } from "../../context/PrefsContext";
import { listWells } from "../../services/wellService";
import { listJobs } from "../../services/detectionService";
import { downloadWellsCsv, downloadWellsGeoJson } from "../../utils/exporters";
import { formatCoord, googleMapsUrl } from "../../utils/geo";
import { formatDate } from "../../utils/format";

const PAGE = 25;
const COLS = [
  ["id", "Well ID"], ["latitude", "Latitude"], ["longitude", "Longitude"], ["confidence", "Confidence"],
  ["village", "Village"], ["taluka", "Taluka"], ["detectedOn", "Detected"],
];

export default function Results() {
  useDocumentTitle("Detection Results");
  const { prefs, classify } = usePrefs();
  const [wells, setWells] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [job, setJob] = useState("all");
  const [sort, setSort] = useState({ key: "confidence", dir: "desc" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([listWells({ limit: 20000 }), listJobs(100)])
      .then(([w, j]) => { setWells(w); setJobs(j.filter((x) => x.status === "completed")); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const text = q.trim().toLowerCase();
    const list = wells.filter((w) => {
      if (job !== "all" && w.jobId !== job) return false;
      if (level !== "all" && classify(w.confidence) !== level) return false;
      return !text || [w.id, w.village, w.taluka, w.district].some((v) => String(v || "").toLowerCase().includes(text));
    });
    const f = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      return f * (typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true }));
    });
  }, [wells, q, level, job, sort, classify]);

  useEffect(() => { setPage(1); }, [q, level, job]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages);
  const visible = rows.slice((cur - 1) * PAGE, cur * PAGE);
  const toggle = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  if (loading) return <PageLoader label="Loading results..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Detection Results" subtitle="Every well found by completed detection runs, with exact coordinates and confidence.">
        <button className={btn.secondary} disabled={!rows.length} onClick={() => downloadWellsCsv(rows, prefs.thresholds, "well-detection-results")}><Download className="h-4 w-4" /> CSV</button>
        <button className={btn.secondary} disabled={!rows.length} onClick={() => downloadWellsGeoJson(rows, prefs.thresholds, null, "well-detection-results")}><FileJson className="h-4 w-4" /> GeoJSON</button>
        <Link to="/app/reports" className={btn.primary}>Reports</Link>
      </PageHeader>
      {error && <Alert tone="error">{error}</Alert>}

      {!wells.length && !error ? (
        <EmptyState icon={Satellite} title="No detection results yet" text="Run a detection and the wells will be listed here.">
          <Link to="/app/detection" className={btn.primary}>Go to Well Detection</Link>
        </EmptyState>
      ) : (
        <Card bodyClass="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} pl-9`} placeholder="Search by well ID, village, taluka..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
            </div>
            <select className={`${inputCls} w-auto`} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Confidence level">
              <option value="all">All confidence levels</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <select className={`${inputCls} w-auto max-w-[260px]`} value={job} onChange={(e) => setJob(e.target.value)} aria-label="Detection run">
              <option value="all">All detection runs</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{formatDate(j.completed_at || j.created_at, true)} - {j.village || j.taluka || j.district || "no area"} ({j.total_detections})</option>)}
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  {COLS.map(([k, l]) => (
                    <th key={k} className="px-3 py-2.5" aria-sort={sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                      <button className="inline-flex items-center gap-1 hover:text-emerald-700" onClick={() => toggle(k)}>
                        {l}{sort.key === k && (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2.5">Level</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((w) => (
                  <tr key={w.id} className="hover:bg-emerald-50/50">
                    <td className="px-3 py-2 font-semibold text-slate-800">#{w.id}</td>
                    <td className="px-3 py-2 font-mono text-xs">{w.latitude.toFixed(7)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{w.longitude.toFixed(7)}</td>
                    <td className="px-3 py-2"><ConfidenceBadge confidence={w.confidence} /></td>
                    <td className="px-3 py-2 text-slate-600">{w.village || "-"}</td>
                    <td className="px-3 py-2 text-slate-600">{w.taluka || "-"}</td>
                    <td className="px-3 py-2 text-slate-600">{formatDate(w.detectedOn)}</td>
                    <td className="px-3 py-2"><LevelPill level={classify(w.confidence)} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700" title="Show on map" aria-label="Show on map"
                          to={`/app/map?well=${w.id}&lat=${w.latitude}&lng=${w.longitude}`}><MapPin className="h-3.5 w-3.5" /></Link>
                        <CopyButton text={formatCoord(w.latitude, w.longitude, "decimal", 7)} label="Copy" />
                        <a className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700" href={googleMapsUrl(w.latitude, w.longitude)} target="_blank" rel="noreferrer" title="Google Maps" aria-label="Google Maps"><ExternalLink className="h-3.5 w-3.5" /></a>
                      </div>
                    </td>
                  </tr>
                ))}
                {!visible.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-slate-500">No wells match your filters.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>{rows.length ? `Showing ${(cur - 1) * PAGE + 1}-${Math.min(cur * PAGE, rows.length)} of ${rows.length.toLocaleString()} wells` : "No wells"}</span>
            <div className="flex items-center gap-2">
              <button className={btn.small} disabled={cur <= 1} onClick={() => setPage(cur - 1)}>Previous</button>
              <span>Page {cur} of {pages}</span>
              <button className={btn.small} disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next</button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
