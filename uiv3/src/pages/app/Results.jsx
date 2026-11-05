// Detection results. Personal (my wells, all confidence levels) or universal (medium and high confidence, every account).
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, FileJson, Globe, Satellite, Search, Trash2 } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import WellTable from "../../components/map/WellTable";
import WellProfile from "../../components/wells/WellProfile";
import ConfirmDelete from "../../components/common/ConfirmDelete";
import { Alert, Card, EmptyState, PageHeader, PageLoader, ScopeToggle, btn, inputCls } from "../../components/common/ui";
import { useSystem } from "../../context/SystemContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { isAdmin } from "../../utils/permissions";
import { deleteWell, exportWellsCsv, listWells } from "../../services/wellService";
import { deleteJob, listJobs } from "../../services/detectionService";
import { downloadBlob, downloadWellsCsv, downloadWellsGeoJson, downloadWellsKml } from "../../utils/exporters";
import { formatDate } from "../../utils/format";
import { runArea } from "../../utils/runs";

export default function Results() {
  useDocumentTitle("Detection Results");
  const { thresholds, classify } = useSystem();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const admin = isAdmin(user);

  const [scope, setScope] = useState("mine");
  const [wells, setWells] = useState([]);
  const [runs, setRuns] = useState([]);
  const [run, setRun] = useState("all");
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [tick, setTick] = useState(0);

  const minForScope = scope === "all" ? thresholds.medium : null;

  useEffect(() => { setRun("all"); }, [scope]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([
      listWells({ scope, minConfidence: minForScope, limit: 20000 }),
      listJobs({ scope, limit: 100 }),
    ])
      .then(([w, j]) => {
        if (!alive) return;
        setWells(w);
        setRuns(j.filter((x) => x.status === "completed"));
      })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [scope, minForScope, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return wells.filter((w) => {
      if (run !== "all" && w.jobId !== run) return false;
      if (level !== "all" && classify(w.confidence) !== level) return false;
      return !text || [w.id, w.village, w.taluka, w.district, w.ownerName].some((v) => String(v || "").toLowerCase().includes(text));
    });
  }, [wells, run, level, query, classify]);

  const activeRun = runs.find((r) => r.id === run);
  const canDeleteRun = Boolean(activeRun) && (admin || activeRun.user_id === user?.id);
  const canDeleteWell = (w) => admin || w.userId === user?.id;
  const exportName = "well_detection_results";

  const confirmDeleteAction = async () => {
    setDeleting(true);
    try {
      if (pendingDelete.type === "run") {
        const res = await deleteJob(activeRun.id);
        toast.success(`Run results deleted (${res.wells_removed} wells).`);
        setRun("all");
      } else {
        await deleteWell(pendingDelete.well.numericId);
        toast.success(`Well #${pendingDelete.well.id} deleted.`);
      }
      setPendingDelete(null);
      setProfile(null);
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const serverCsv = async () => {
    try {
      downloadBlob(`wells_run_${activeRun.id.slice(0, 8)}.csv`, await exportWellsCsv({ jobId: activeRun.id }));
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading && !wells.length) return <PageLoader label="Loading results..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Detection Results" subtitle="Every well from completed runs, with exact coordinates, confidence, and the village and district it lies in.">
        <ScopeToggle value={scope} onChange={setScope} />
        <button type="button" className={btn.secondary} disabled={!rows.length} onClick={() => downloadWellsCsv(rows, thresholds, exportName)}><Download className="h-4 w-4" /> CSV</button>
        <button type="button" className={btn.secondary} disabled={!rows.length} onClick={() => downloadWellsGeoJson(rows, thresholds, null, exportName)}><FileJson className="h-4 w-4" /> GeoJSON</button>
        <button type="button" className={btn.secondary} disabled={!rows.length} onClick={() => downloadWellsKml(rows, thresholds, null, exportName)}><Globe className="h-4 w-4" /> KML</button>
        <Link to="/app/reports" className={btn.primary}>Reports</Link>
      </PageHeader>

      {scope === "all" && (
        <Alert tone="info">Universal view: wells with medium and high confidence (from {Math.round(thresholds.medium * 100)}%) from every account.</Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      {!wells.length && !loading && !error ? (
        <EmptyState icon={Satellite} title="No detection results yet" text="Run a detection and the wells will be listed here.">
          <Link to="/app/detection" className={btn.primary}>Go to Well Detection</Link>
        </EmptyState>
      ) : (
        <Card bodyClass="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} pl-9`} placeholder="Search by well ID, village, taluka or district" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search results" />
            </div>
            <select className={`${inputCls} w-auto`} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Confidence level">
              <option value="all">All confidence levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select className={`${inputCls} w-auto max-w-[280px]`} value={run} onChange={(e) => setRun(e.target.value)} aria-label="Detection run">
              <option value="all">All detection runs</option>
              {runs.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatDate(j.completed_at || j.created_at, true)} - {runArea(j)} ({j.total_detections})
                  {scope === "all" && j.owner_name ? ` - ${j.owner_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          {activeRun && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <span>
                Run of {formatDate(activeRun.completed_at || activeRun.created_at, true)}
                {runArea(activeRun) !== "No area label" ? `, ${runArea(activeRun)}` : ""}
                {scope === "all" && activeRun.owner_name ? `, by ${activeRun.owner_name}` : ""}.
              </span>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btn.small} onClick={serverCsv}><Download className="h-3.5 w-3.5" /> Full CSV from server</button>
                {canDeleteRun && (
                  <button type="button" className={btn.dangerSmall} onClick={() => setPendingDelete({ type: "run" })}><Trash2 className="h-3.5 w-3.5" /> Delete run results</button>
                )}
              </div>
            </div>
          )}

          <WellTable
            wells={rows}
            onView={(w) => setProfile({ well: w, kind: "detected" })}
            onLocate={(w) => navigate(`/app/map?well=${w.id}&lat=${w.latitude}&lng=${w.longitude}`)}
            canDelete={canDeleteWell}
            onDelete={(w) => setPendingDelete({ type: "well", well: w })}
            showOwner={scope === "all"}
            pageSize={100}
            emptyText="No wells match your filters."
          />
        </Card>
      )}

      {profile && (
        <WellProfile
          well={profile.well}
          kind="detected"
          canDelete={canDeleteWell(profile.well)}
          onDelete={() => setPendingDelete({ type: "well", well: profile.well })}
          onClose={() => setProfile(null)}
        />
      )}

      <ConfirmDelete
        open={Boolean(pendingDelete)}
        title={pendingDelete?.type === "run" ? "Delete these run results?" : "Delete this well?"}
        text={pendingDelete?.type === "run"
          ? "All wells of this run are removed from the database. This cannot be undone."
          : "This well is removed from the database. This cannot be undone."}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDeleteAction}
      />
    </div>
  );
}
