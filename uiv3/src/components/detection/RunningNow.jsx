// Administrators only: detections running on the server for every account, each with a Stop button.
import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { Card, Spinner, btn } from "../common/ui";
import { abortJob, listJobs } from "../../services/detectionService";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../utils/format";
import { runArea } from "../../utils/runs";

export default function RunningNow({ refreshKey = 0 }) {
  const toast = useToast();
  const [runs, setRuns] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      listJobs({ scope: "all", limit: 50 })
        .then((jobs) => { if (alive) setRuns(jobs.filter((j) => j.status === "pending" || j.status === "running")); })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, [refreshKey]);

  const stop = async (run) => {
    setBusyId(run.id);
    try {
      await abortJob(run.id);
      toast.info(`Stopping the run of ${run.owner_name || "an account"}. Nothing will be saved for it.`);
      setRuns((list) => list.filter((r) => r.id !== run.id));
    } catch (e) {
      toast.warning(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card title="Running detections (all accounts)" subtitle="Administrators can stop any running detection.">
      {runs.length === 0 ? (
        <p className="text-sm text-slate-500">No detections are running right now.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {runs.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900">{r.owner_name || "Unknown account"}</span>
                <span className="block truncate text-xs text-slate-500">
                  {runArea(r)} · started {formatDate(r.started_at || r.created_at, true)} · {r.status}
                  {r.tiles_total ? ` · tile ${r.tiles_done} of ${r.tiles_total}` : ""}
                </span>
              </span>
              <button type="button" className={btn.dangerSmall} onClick={() => stop(r)} disabled={busyId === r.id}>
                {busyId === r.id ? <Spinner className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />} Stop
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
