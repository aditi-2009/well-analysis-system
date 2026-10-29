import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Database, Download, FileJson, FileSpreadsheet, Printer } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Card, PageHeader, PageLoader, Spinner, btn, inputCls, labelCls } from "../../components/common/ui";
import { usePrefs } from "../../context/PrefsContext";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { exportWellsCsv, listWells } from "../../services/wellService";
import { listJobs } from "../../services/detectionService";
import { downloadBlob, downloadWellsCsv, downloadWellsGeoJson } from "../../utils/exporters";
import { LEVEL_META, countByLevel, pct } from "../../utils/confidence";
import { formatDate } from "../../utils/format";
import { APP_NAME, ORG_NAME } from "../../config/constants";

export default function Reports() {
  useDocumentTitle("Reports & Exports");
  const { prefs } = usePrefs();
  const toast = useToast();
  const { user } = useAuth();
  const [wells, setWells] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [job, setJob] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([listWells({ limit: 20000 }), listJobs(100)])
      .then(([w, j]) => { setWells(w); setJobs(j.filter((x) => x.status === "completed")); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const scoped = useMemo(() => (job === "all" ? wells : wells.filter((w) => w.jobId === job)), [wells, job]);
  const counts = useMemo(() => countByLevel(scoped, prefs.thresholds), [scoped, prefs.thresholds]);
  const avg = scoped.length ? scoped.reduce((s, w) => s + w.confidence, 0) / scoped.length : 0;
  const selectedJob = jobs.find((j) => j.id === job);
  const areaName = selectedJob ? [selectedJob.village, selectedJob.taluka, selectedJob.district].filter(Boolean).join(", ") || "No area label" : "All detection runs";
  const topRows = useMemo(() => [...scoped].sort((a, b) => b.confidence - a.confidence).slice(0, 25), [scoped]);

  const serverCsv = async () => {
    if (job === "all") { toast.warning("Choose one detection run to use the server export."); return; }
    setBusy(true);
    try {
      downloadBlob(`wells_${job.slice(0, 8)}.csv`, await exportWellsCsv({ jobId: job }));
      toast.success("Server CSV downloaded.");
    } catch (e) { toast.error(e.message || "Export failed."); }
    finally { setBusy(false); }
  };

  if (loading) return <PageLoader label="Loading report data..." />;

  return (
    <div className="space-y-6">
      <div className="no-print"><PageHeader title="Reports & Exports" subtitle="Download datasets or print a summary report for a detection run.">
        <Link to="/app/results" className={btn.secondary}>View results</Link>
      </PageHeader></div>
      {error && <Alert tone="error">{error}</Alert>}

      <div className="no-print grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: FileSpreadsheet, title: "CSV dataset", text: "Latitude, longitude, confidence and area for every well.", action: () => downloadWellsCsv(scoped, prefs.thresholds, "wells"), label: "Download CSV" },
          { icon: FileJson, title: "GeoJSON", text: "Open directly in QGIS, ArcGIS or any web map.", action: () => downloadWellsGeoJson(scoped, prefs.thresholds, null, "wells"), label: "Download GeoJSON" },
          { icon: Printer, title: "PDF report", text: "Print the summary below and choose “Save as PDF”.", action: () => window.print(), label: "Print / Save PDF" },
        ].map((c) => (
          <div key={c.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><c.icon className="h-5 w-5" /></div>
            <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
            <p className="mt-1 flex-1 text-xs text-slate-500">{c.text}</p>
            <button className={`${btn.secondary} mt-4`} disabled={!scoped.length} onClick={c.action}><Download className="h-4 w-4" /> {c.label}</button>
          </div>
        ))}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Database className="h-5 w-5" /></div>
          <h3 className="text-sm font-bold text-slate-900">Server CSV (no row limit)</h3>
          <p className="mt-1 flex-1 text-xs text-slate-500">Streamed by the backend for one detection run. Best for very large runs.</p>
          <button className={`${btn.secondary} mt-4`} disabled={busy || job === "all"} onClick={serverCsv}>{busy ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Download from server</button>
        </div>
      </div>

      <div className="no-print max-w-md">
        <label className={labelCls} htmlFor="rep-job">Report scope</label>
        <select id="rep-job" className={inputCls} value={job} onChange={(e) => setJob(e.target.value)}>
          <option value="all">All detection runs ({wells.length.toLocaleString()} wells)</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{formatDate(j.completed_at || j.created_at, true)} - {[j.village, j.taluka, j.district].filter(Boolean).join(", ") || "no area"} ({j.total_detections})</option>)}
        </select>
      </div>

      {/* Printable report */}
      <article className="print-area rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{ORG_NAME}</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Agricultural Well Detection Report</h2>
          <p className="text-xs text-slate-500">{APP_NAME}</p>
          <dl className="mt-3 grid gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
            <div className="flex gap-2"><dt className="text-slate-500">Scope:</dt><dd className="font-semibold">{areaName}</dd></div>
            <div className="flex gap-2"><dt className="text-slate-500">Generated:</dt><dd className="font-semibold">{formatDate(new Date(), true)}</dd></div>
            <div className="flex gap-2"><dt className="text-slate-500">Prepared by:</dt><dd className="font-semibold">{user?.fullName}</dd></div>
            {selectedJob && <div className="flex gap-2"><dt className="text-slate-500">Model:</dt><dd className="font-semibold">{selectedJob.model_version}</dd></div>}
          </dl>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-4">
          {[["Total wells", scoped.length.toLocaleString()], ["High confidence", counts.high], ["Medium confidence", counts.medium], ["Low confidence", counts.low]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">{l}</p><p className="text-xl font-bold text-slate-900">{v}</p></div>
          ))}
        </section>
        <p className="mt-3 text-xs text-slate-600">Average model confidence {scoped.length ? pct(avg) : "-"}. High ≥ {Math.round(prefs.thresholds.high * 100)}%, Medium ≥ {Math.round(prefs.thresholds.medium * 100)}%. Confidence is the model's own score and is not a measured accuracy.</p>

        <h3 className="mb-2 mt-6 text-sm font-bold text-slate-900">Top {topRows.length} wells by confidence</h3>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-300 text-[10px] font-bold uppercase text-slate-500">
            <tr><th className="py-1.5 pr-3">Well</th><th className="pr-3">Latitude</th><th className="pr-3">Longitude</th><th className="pr-3">Confidence</th><th className="pr-3">Level</th><th>Village</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topRows.map((w) => {
              const lv = w.confidence >= prefs.thresholds.high ? "high" : w.confidence >= prefs.thresholds.medium ? "medium" : "low";
              return (
                <tr key={w.id}><td className="py-1.5 pr-3 font-semibold">#{w.id}</td><td className="pr-3 font-mono">{w.latitude.toFixed(6)}</td><td className="pr-3 font-mono">{w.longitude.toFixed(6)}</td><td className="pr-3">{pct(w.confidence)}</td><td className="pr-3">{LEVEL_META[lv].label}</td><td>{w.village || "-"}</td></tr>
              );
            })}
            {!topRows.length && <tr><td colSpan={6} className="py-6 text-center text-slate-500">No wells in this scope.</td></tr>}
          </tbody>
        </table>
        <p className="mt-6 border-t border-slate-200 pt-3 text-[10px] text-slate-500">AI-assisted results. Low and Medium confidence detections should be verified on imagery or in the field before use in planning decisions.</p>
      </article>
    </div>
  );
}
