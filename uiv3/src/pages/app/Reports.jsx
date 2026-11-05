// Reports and exports. Personal (my wells) or universal (medium and high confidence, every account).
import { useEffect, useMemo, useState } from "react";
import { Database, Download, FileJson, FileSpreadsheet, Globe, Printer } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Card, PageHeader, PageLoader, ScopeToggle, Spinner, btn, inputCls, labelCls } from "../../components/common/ui";
import { useSystem } from "../../context/SystemContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { exportWellsCsv, listWells } from "../../services/wellService";
import { listJobs } from "../../services/detectionService";
import { downloadBlob, downloadWellsCsv, downloadWellsGeoJson, downloadWellsKml } from "../../utils/exporters";
import { LEVEL_META, countByLevel, pct } from "../../utils/confidence";
import { formatDate } from "../../utils/format";
import { runArea } from "../../utils/runs";
import { APP_NAME, ORG_NAME } from "../../config/constants";

export default function Reports() {
  useDocumentTitle("Reports and Exports");
  const { thresholds } = useSystem();
  const { user } = useAuth();
  const toast = useToast();
  const [scope, setScope] = useState("mine");
  const [wells, setWells] = useState([]);
  const [runs, setRuns] = useState([]);
  const [run, setRun] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const minForScope = scope === "all" ? thresholds.medium : null;

  useEffect(() => { setRun("all"); }, [scope]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([listWells({ scope, minConfidence: minForScope, limit: 20000 }), listJobs({ scope, limit: 100 })])
      .then(([w, j]) => {
        if (!alive) return;
        setWells(w);
        setRuns(j.filter((x) => x.status === "completed"));
      })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [scope, minForScope]);

  const scoped = useMemo(() => (run === "all" ? wells : wells.filter((w) => w.jobId === run)), [wells, run]);
  const counts = useMemo(() => countByLevel(scoped, thresholds), [scoped, thresholds]);
  const avg = scoped.length ? scoped.reduce((s, w) => s + w.confidence, 0) / scoped.length : 0;
  const chosen = runs.find((r) => r.id === run);
  const scopeName = chosen
    ? runArea(chosen)
    : scope === "mine" ? "My detections" : "All detections (medium and high confidence)";
  const topRows = useMemo(() => [...scoped].sort((a, b) => b.confidence - a.confidence).slice(0, 25), [scoped]);
  const exportName = `wells_${scope}`;

  const serverCsv = async () => {
    if (!chosen) {
      toast.warning("Choose one detection run to use the full server export.");
      return;
    }
    setBusy(true);
    try {
      downloadBlob(`wells_run_${chosen.id.slice(0, 8)}.csv`, await exportWellsCsv({ jobId: chosen.id }));
      toast.success("Full CSV downloaded from the server.");
    } catch (e) {
      toast.error(e.message || "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !wells.length) return <PageLoader label="Loading report data..." />;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader title="Reports and Exports" subtitle="Download the wells as a spreadsheet, GIS or Google Earth file, or print a summary report.">
          <ScopeToggle value={scope} onChange={setScope} />
        </PageHeader>
      </div>
      {scope === "all" && (
        <div className="no-print">
          <Alert tone="info">Universal view: wells with medium and high confidence (from {Math.round(thresholds.medium * 100)}%) from every account.</Alert>
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="no-print grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: FileSpreadsheet, title: "CSV spreadsheet", text: "Latitude, longitude, confidence, village and district for every well.", action: () => downloadWellsCsv(scoped, thresholds, exportName), label: "Download CSV" },
          { icon: FileJson, title: "GeoJSON", text: "Open directly in QGIS, ArcGIS or a web map.", action: () => downloadWellsGeoJson(scoped, thresholds, null, exportName), label: "Download GeoJSON" },
          { icon: Globe, title: "KML", text: "Open in Google Earth or Google Maps.", action: () => downloadWellsKml(scoped, thresholds, null, exportName), label: "Download KML" },
          { icon: Printer, title: "PDF report", text: "Print the summary below and choose Save as PDF.", action: () => window.print(), label: "Print or save PDF" },
        ].map((c) => (
          <div key={c.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><c.icon className="h-5 w-5" /></div>
            <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
            <p className="mt-1 flex-1 text-xs text-slate-500">{c.text}</p>
            <button type="button" className={`${btn.secondary} mt-4`} disabled={!scoped.length} onClick={c.action}><Download className="h-4 w-4" /> {c.label}</button>
          </div>
        ))}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Database className="h-5 w-5" /></div>
          <h3 className="text-sm font-bold text-slate-900">Full CSV from server</h3>
          <p className="mt-1 flex-1 text-xs text-slate-500">Every row of one detection run, with no limit. Choose a run below first.</p>
          <button type="button" className={`${btn.secondary} mt-4`} disabled={busy || !chosen} onClick={serverCsv}>
            {busy ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Download from server
          </button>
        </div>
      </div>

      <div className="no-print max-w-xl">
        <label className={labelCls} htmlFor="rep-run">Report scope</label>
        <select id="rep-run" className={inputCls} value={run} onChange={(e) => setRun(e.target.value)}>
          <option value="all">All runs ({wells.length.toLocaleString()} wells)</option>
          {runs.map((j) => (
            <option key={j.id} value={j.id}>
              {formatDate(j.completed_at || j.created_at, true)} - {runArea(j)} ({j.total_detections})
              {scope === "all" && j.owner_name ? ` - ${j.owner_name}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Printable report */}
      <article className="print-area rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{ORG_NAME}</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Agricultural Well Detection Report</h2>
          <p className="text-xs text-slate-500">{APP_NAME}</p>
          <dl className="mt-3 grid gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
            <div className="flex gap-2"><dt className="text-slate-500">Scope:</dt><dd className="font-semibold">{scopeName}</dd></div>
            <div className="flex gap-2"><dt className="text-slate-500">Generated:</dt><dd className="font-semibold">{formatDate(new Date(), true)}</dd></div>
            <div className="flex gap-2"><dt className="text-slate-500">Prepared by:</dt><dd className="font-semibold">{user?.fullName}</dd></div>
          </dl>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ["Total wells", scoped.length.toLocaleString()],
            ["High confidence", counts.high],
            ["Medium confidence", counts.medium],
            ["Low confidence", counts.low],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </section>
        <p className="mt-3 text-xs text-slate-600">
          Average confidence {scoped.length ? pct(avg) : "-"}. High from {Math.round(thresholds.high * 100)}%, medium from {Math.round(thresholds.medium * 100)}%.
          Confidence is an estimate of how sure each detection is. It is not a measured accuracy.
        </p>

        <h3 className="mb-2 mt-6 text-sm font-bold text-slate-900">Top {topRows.length} wells by confidence</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-slate-300 text-[10px] font-bold uppercase text-slate-500">
              <tr>
                <th className="py-1.5 pr-3">Well</th>
                <th className="pr-3">Latitude</th>
                <th className="pr-3">Longitude</th>
                <th className="pr-3">Confidence</th>
                <th className="pr-3">Level</th>
                <th className="pr-3">Village</th>
                <th>District</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topRows.map((w) => {
                const lv = w.confidence >= thresholds.high ? "high" : w.confidence >= thresholds.medium ? "medium" : "low";
                return (
                  <tr key={w.id}>
                    <td className="py-1.5 pr-3 font-semibold">#{w.id}</td>
                    <td className="pr-3 font-mono">{w.latitude.toFixed(6)}</td>
                    <td className="pr-3 font-mono">{w.longitude.toFixed(6)}</td>
                    <td className="pr-3">{pct(w.confidence)}</td>
                    <td className="pr-3">{LEVEL_META[lv].label}</td>
                    <td className="pr-3">{w.village || "Not recorded"}</td>
                    <td>{w.district || "Not recorded"}</td>
                  </tr>
                );
              })}
              {!topRows.length && <tr><td colSpan={7} className="py-6 text-center text-slate-500">No wells in this scope.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-6 border-t border-slate-200 pt-3 text-[10px] text-slate-500">
          Automatically detected results. Medium and low confidence wells should be verified on imagery or in the field before use in planning decisions.
        </p>
      </article>
    </div>
  );
}
