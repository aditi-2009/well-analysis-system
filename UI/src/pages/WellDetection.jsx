// version: well-detection-3
// src/pages/WellDetection.jsx
//
// Two tabs:
//   Preview area: the wells already stored for an area, with a CSV download.
//   Detect wells: run detection on one file, already on the server or uploaded now.
//
// Files of any size are accepted. They are streamed to the server, and this page only
// watches the run. A run goes on at the server if you leave, and this page picks it up
// again when you return. There are no tile, contrast or confidence controls: the server
// uses the settings in Backend\.env.
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, PlayCircle, Upload } from "lucide-react";
import { getStates, getDistricts, getTalukas, getVillages } from "../services/locationService";
import { getAllWells, getKnownWells } from "../services/wellService";
import {
  listImages,
  listJobs,
  uploadImage,
  startDetection,
  waitForJob,
  getJobWells,
} from "../services/detectionService";
import { downloadWellsCsv } from "../services/exportService";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useToast } from "../context/ToastContext";
import WellMap from "../components/map/WellMap";
import WellTable from "../components/wells/WellTable";
import WellDetails from "../components/wells/WellDetails";
import PageHeader from "../components/common/PageHeader";
import Alert from "../components/common/Alert";
import Button from "../components/common/Button";

const NO_AREA = { districtId: "", talukaId: "", villageId: "", district: "", taluka: "", village: "" };

// Name of the item with this id, or "" when it is not loaded yet.
function nameOf(list, id) {
  const item = list.find((x) => String(x.id) === String(id));
  return item ? item.name : "";
}

// Wells whose stored area names match the chosen area.
// An empty taluka or village matches every one in the district.
function inArea(wells, area) {
  return wells.filter(
    (w) =>
      w.district === area.district &&
      (!area.taluka || w.taluka === area.taluka) &&
      (!area.village || w.village === area.village)
  );
}

// Only wells with a map position can be drawn.
function onMap(wells) {
  return wells.filter((w) => w.latitude != null && w.longitude != null);
}

function formatSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDuration(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${minutes} min`;
}

// "about 25 min left", from how long the tiles done so far took. Empty until there is data.
function timeLeft(job) {
  if (!job?.started_at || !job.tiles_done || !job.tiles_total) return "";
  const elapsed = Date.now() - new Date(job.started_at).getTime();
  const remaining = (elapsed / job.tiles_done) * (job.tiles_total - job.tiles_done);
  return `about ${formatDuration(remaining)} left`;
}

function timeTaken(job) {
  if (!job?.started_at || !job.completed_at) return null;
  return formatDuration(new Date(job.completed_at) - new Date(job.started_at));
}

// One sentence that says what happened in a run.
function explainRun(job) {
  if (job.status === "failed") return job.error_message || "The run failed.";
  const s = job.params?.stats;
  if (!s) return "";
  if (s.wells > 0) {
    return `${s.wells} wells found. Each well shows the model's confidence: how sure it is that the mark is a well.`;
  }
  if (s.tiles === 0 || s.skipped_empty >= s.tiles) {
    return "The picture is empty, so there was nothing for the model to read.";
  }
  if (s.model_boxes === 0) {
    return (
      "The model returned no marks for this picture. Either the picture holds no wells, " +
      "or it looks different from the training pictures."
    );
  }
  return "The model marked some spots, but none were kept after removing duplicates and marks at the edge.";
}

// The numbers of one run, one row each. Read-only.
function RunDetails({ job, fileName }) {
  const s = job.params?.stats;
  const img = job.params?.image;
  if (!s) return null;
  const rows = [
    ["File", fileName || job.image_id],
    ["Picture", img ? `${img.width} x ${img.height} px, ${img.bands} band(s), ${img.dtype}` : "unknown"],
    ["Map coordinates", img?.crs || "none: wells cannot be placed on a map"],
    ["Tiles", `${s.tiles} tiles of ${s.tile_size} x ${s.tile_size} px`],
    ["Empty tiles skipped", s.skipped_empty],
    ["Marks from the model", s.model_boxes],
    ["Marks after the edge check", s.raw_boxes],
    ["Wells after removing duplicates", s.wells],
    ["Time taken", timeTaken(job) ?? "-"],
  ];
  return (
    <dl className="ds-kv ds-kv-rows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{String(value ?? "-")}</dd>
        </div>
      ))}
    </dl>
  );
}

// Three linked dropdowns: district, then taluka, then village.
// Changing a level clears the levels below it.
//   districtPlaceholder: text for the empty district choice
//   emptyLabel: text for the empty taluka and village choices
function AreaPicker({ value, onChange, disabled, prefix, districtPlaceholder, emptyLabel }) {
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getStates()
      .then((states) => {
        const state = states.find((s) => s.name.toLowerCase() === "maharashtra") ?? states[0];
        if (!state) throw new Error("No state is stored in the database yet.");
        return getDistricts(state.id);
      })
      .then(setDistricts)
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    setTalukas([]);
    if (!value.districtId) return;
    getTalukas(value.districtId).then(setTalukas).catch((err) => setLoadError(err.message));
  }, [value.districtId]);

  useEffect(() => {
    setVillages([]);
    if (!value.talukaId) return;
    getVillages(value.talukaId).then(setVillages).catch((err) => setLoadError(err.message));
  }, [value.talukaId]);

  const update = (changes) => {
    const next = { ...value, ...changes };
    onChange({
      ...next,
      district: nameOf(districts, next.districtId),
      taluka: nameOf(talukas, next.talukaId),
      village: nameOf(villages, next.villageId),
    });
  };

  return (
    <div className="ds-stack-sm">
      {loadError && <Alert variant="error">{loadError}</Alert>}
      <div className="ds-grid-3">
        <div className="ds-field">
          <label className="ds-label" htmlFor={`${prefix}-district`}>District</label>
          <select
            id={`${prefix}-district`}
            className="ds-select"
            value={value.districtId}
            disabled={disabled || districts.length === 0}
            onChange={(e) => update({ districtId: e.target.value, talukaId: "", villageId: "" })}
          >
            <option value="">{districts.length === 0 ? "Loading..." : districtPlaceholder}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="ds-field">
          <label className="ds-label" htmlFor={`${prefix}-taluka`}>Taluka</label>
          <select
            id={`${prefix}-taluka`}
            className="ds-select"
            value={value.talukaId}
            disabled={disabled || !value.districtId || talukas.length === 0}
            onChange={(e) => update({ talukaId: e.target.value, villageId: "" })}
          >
            <option value="">{emptyLabel}</option>
            {talukas.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="ds-field">
          <label className="ds-label" htmlFor={`${prefix}-village`}>Village</label>
          <select
            id={`${prefix}-village`}
            className="ds-select"
            value={value.villageId}
            disabled={disabled || !value.talukaId || villages.length === 0}
            onChange={(e) => update({ villageId: e.target.value })}
          >
            <option value="">{emptyLabel}</option>
            {villages.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// Downloads the wells SAVED in the database for a job or an area. The server builds the file,
// so it is complete even when the map holds only part of the wells.
function CsvButton({ filters, label, disabled = false }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await downloadWellsCsv({ ...filters, label });
      toast.success("CSV downloaded.");
    } catch (err) {
      toast.error(err.message || "The download failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="secondary" icon={Download} loading={busy} disabled={disabled} onClick={run}>
      Download CSV
    </Button>
  );
}

// Preview area: the wells already stored for an area. No file is needed.
function PreviewTab() {
  const [area, setArea] = useState(NO_AREA);
  const [wells, setWells] = useState(null); // null until Preview area is pressed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const mapWells = useMemo(() => (wells ? onMap(wells) : []), [wells]);

  const showWells = async () => {
    setError("");
    setSelected(null);
    if (!area.districtId) {
      setError("Choose a district first.");
      return;
    }
    setLoading(true);
    try {
      const [ai, officer] = await Promise.all([getAllWells(), getKnownWells()]);
      setWells([...inArea(officer, area), ...inArea(ai, area)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verified = wells ? wells.filter((w) => w.status === "Verified").length : 0;
  const label = area.village || area.taluka || area.district;

  return (
    <div className="ds-stack">
      <section className="ds-card">
        <AreaPicker
          value={area}
          onChange={setArea}
          disabled={loading}
          prefix="preview"
          districtPlaceholder="Select district"
          emptyLabel="All"
        />
        <div className="ds-card-foot">
          <CsvButton
            filters={{ districtId: area.districtId, talukaId: area.talukaId, villageId: area.villageId }}
            label={label || "wells"}
            disabled={!area.districtId}
          />
          <Button variant="primary" icon={Eye} loading={loading} onClick={showWells}>
            Preview area
          </Button>
        </div>
      </section>

      {error && <Alert variant="error">{error}</Alert>}

      {wells && (
        <section className="ds-card">
          <div className="ds-card-head">
            <h2 className="ds-card-title">
              {label}: {verified} officer-verified, {wells.length - verified} AI-detected
            </h2>
          </div>
          {wells.length === 0 ? (
            <p className="ds-card-sub">No wells are stored for this area yet. Use Detect wells to add some.</p>
          ) : (
            <div className="ds-stack">
              <WellMap wells={mapWells} />
              <WellTable wells={wells} onRowClick={setSelected} />
            </div>
          )}
        </section>
      )}

      {selected && <WellDetails well={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// Detect wells: run detection on one file. Choose a file already on the server, or upload one.
function DetectTab() {
  const stoppedRef = useRef(false);
  useEffect(() => {
    stoppedRef.current = false;
    return () => {
      stoppedRef.current = true;
    };
  }, []);

  const [mode, setMode] = useState("district"); // "district" or "upload"
  const [area, setArea] = useState(NO_AREA);
  const [files, setFiles] = useState([]);
  const [fileId, setFileId] = useState("");
  const [newFile, setNewFile] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | uploading | starting | running | done | failed
  const [upload, setUpload] = useState({ loaded: 0, total: 0 });
  const [job, setJob] = useState(null);
  const [wells, setWells] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const mapWells = useMemo(() => onMap(wells), [wells]);

  const busy = phase === "uploading" || phase === "starting" || phase === "running";
  const isFinished = phase === "done" || phase === "failed";
  const fileName = files.find((f) => f.file_id === job?.image_id)?.filename;
  const jobPercent = job?.tiles_total ? Math.round(((job.tiles_done ?? 0) / job.tiles_total) * 100) : 0;
  const uploadPercent = upload.total ? Math.round((upload.loaded / upload.total) * 100) : 0;

  // Files already on the server. Nothing is selected for you: choose the one you want.
  const refreshFiles = async () => {
    try {
      setFiles(await listImages());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  // Watches one job until it ends, then loads its wells.
  async function followJob(started) {
    setJob(started);
    setPhase("running");
    const result = await waitForJob(started.id, setJob, () => stoppedRef.current);
    if (stoppedRef.current) return;
    setJob(result);
    if (result.status === "completed") {
      setWells(await getJobWells(result.id));
      setPhase("done");
    } else {
      setPhase("failed"); // the reason is shown with the run's numbers below
    }
  }

  // Back on this page while a run is still going: pick it up instead of showing a blank form.
  useEffect(() => {
    let cancelled = false;
    listJobs(5)
      .then((jobs) => {
        const active = jobs.find((j) => j.status === "pending" || j.status === "running");
        if (active && !cancelled) return followJob(active);
        return undefined;
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startRun = async () => {
    setError("");
    setWells([]);
    setSelected(null);
    setJob(null);

    if (mode === "district") {
      if (!area.districtId) {
        setError("Choose the district the wells belong to.");
        return;
      }
      if (!fileId) {
        setError("Choose a file from the list.");
        return;
      }
    } else if (!newFile) {
      setError("Choose a file to upload.");
      return;
    }

    try {
      let chosen = fileId;
      if (mode === "upload") {
        setPhase("uploading");
        setUpload({ loaded: 0, total: newFile.size });
        const uploaded = await uploadImage(newFile, setUpload);
        chosen = uploaded.file_id;
        setFileId(chosen);
        setNewFile(null);
        await refreshFiles();
      }

      setPhase("starting");
      const started = await startDetection({
        imageId: chosen,
        districtId: area.districtId,
        talukaId: area.talukaId,
        villageId: area.villageId,
      });
      await followJob(started);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setPhase("failed");
    }
  };

  const reset = () => {
    setPhase("idle");
    setJob(null);
    setWells([]);
    setSelected(null);
    setError("");
  };

  const csvLabel = job?.village || job?.taluka || job?.district || fileName || "detection";

  return (
    <div className="ds-stack">
      <section className="ds-card">
        <div className="ds-stack">
          <div className="ds-choices" role="radiogroup" aria-label="How do you want to detect?">
            <label className={`ds-choice ${mode === "district" ? "is-on" : ""}`}>
              <input
                type="radio"
                name="detect-mode"
                checked={mode === "district"}
                disabled={busy}
                onChange={() => setMode("district")}
              />
              <span>
                <span className="ds-choice-title">Use a file already on the server</span>
                <span className="ds-choice-text">Choose the district, then one of the files you uploaded before.</span>
              </span>
            </label>
            <label className={`ds-choice ${mode === "upload" ? "is-on" : ""}`}>
              <input
                type="radio"
                name="detect-mode"
                checked={mode === "upload"}
                disabled={busy}
                onChange={() => setMode("upload")}
              />
              <span>
                <span className="ds-choice-title">Upload a new image</span>
                <span className="ds-choice-text">Any size. The district is optional.</span>
              </span>
            </label>
          </div>

          {mode === "district" ? (
            <>
              <AreaPicker
                value={area}
                onChange={setArea}
                disabled={busy}
                prefix="detect"
                districtPlaceholder="Select district"
                emptyLabel="Not specified"
              />
              <div className="ds-field">
                <label className="ds-label" htmlFor="detect-file">File</label>
                <select
                  id="detect-file"
                  className="ds-select"
                  value={fileId}
                  disabled={busy || files.length === 0}
                  onChange={(e) => setFileId(e.target.value)}
                >
                  <option value="">{files.length === 0 ? "No files uploaded yet" : "Select a file"}</option>
                  {files.map((f) => (
                    <option key={f.file_id} value={f.file_id}>
                      {f.filename}
                      {f.width
                        ? ` (${f.width} x ${f.height} px, ${formatSize(f.size_bytes)})`
                        : " (not a picture)"}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <label className={`ds-drop ${busy ? "is-busy" : ""}`}>
                <Upload size={28} aria-hidden="true" />
                <span className="ds-drop-title">{newFile ? newFile.name : "Choose an image to upload"}</span>
                <span className="ds-drop-hint">
                  {newFile
                    ? `${formatSize(newFile.size)}. It is kept on the server and appears in the file list.`
                    : "GeoTIFF of any size. Large files are fine."}
                </span>
                <input
                  type="file"
                  className="ds-visually-hidden"
                  disabled={busy}
                  onChange={(e) => setNewFile(e.target.files[0] ?? null)}
                />
              </label>
              <AreaPicker
                value={area}
                onChange={setArea}
                disabled={busy}
                prefix="detect-upload"
                districtPlaceholder="Not specified"
                emptyLabel="Not specified"
              />
            </>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          <div className="ds-runbar">
            <span className="ds-card-sub">
              The server uses its tested settings. There is nothing to tune and no size to enter.
            </span>
            <Button variant="primary" icon={PlayCircle} loading={busy} onClick={startRun}>
              Start well detection
            </Button>
          </div>

          {phase === "uploading" && (
            <div role="status">
              <p className="ds-body-text">
                Uploading: {formatSize(upload.loaded)} of {formatSize(upload.total)} ({uploadPercent}%)
              </p>
              <div className="ds-bar"><div className="ds-bar-fill" style={{ width: `${uploadPercent}%` }} /></div>
              <p className="ds-card-sub">Keep this tab open until the upload finishes. A large file takes a while.</p>
            </div>
          )}
          {phase === "starting" && <p className="ds-body-text" role="status">Starting the detection...</p>}
          {phase === "running" && (
            <div role="status">
              <p className="ds-body-text">
                Running detection: tile {job?.tiles_done ?? 0} of {job?.tiles_total ?? "?"} ({jobPercent}%)
                {timeLeft(job) ? `, ${timeLeft(job)}` : ""}
              </p>
              <div className="ds-bar"><div className="ds-bar-fill" style={{ width: `${jobPercent}%` }} /></div>
              <p className="ds-card-sub">
                You can leave this page. The run goes on at the server, and this page picks it up when you return.
              </p>
            </div>
          )}
        </div>
      </section>

      {isFinished && job && (
        <section className="ds-card">
          <Alert
            variant={phase === "done" ? "success" : "error"}
            title={phase === "done" ? `${wells.length} wells found` : "Detection failed"}
          >
            {explainRun(job)}
          </Alert>
          <RunDetails job={job} fileName={fileName} />
          {phase === "done" && wells.length > 0 && (
            <div className="ds-stack" style={{ marginTop: 18 }}>
              <WellMap wells={mapWells} />
              <WellTable wells={wells} onRowClick={setSelected} />
            </div>
          )}
          <div className="ds-card-foot">
            {phase === "done" && <CsvButton filters={{ jobId: job.id }} label={csvLabel} />}
            <Button variant="secondary" onClick={reset}>Run another detection</Button>
          </div>
        </section>
      )}

      {selected && <WellDetails well={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function WellDetection() {
  useDocumentTitle("Well Detection");
  const [tab, setTab] = useState("preview");

  return (
    <div className="ds-page">
      <PageHeader
        title="Agricultural Well Detection"
        description="Preview area shows the wells stored for an area. Detect wells finds wells in an image and saves them to the database."
      />

      <div className="ds-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preview"}
          className={`ds-tab ${tab === "preview" ? "is-on" : ""}`}
          onClick={() => setTab("preview")}
        >
          Preview area
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "detect"}
          className={`ds-tab ${tab === "detect" ? "is-on" : ""}`}
          onClick={() => setTab("detect")}
        >
          Detect wells
        </button>
      </div>

      {tab === "preview" ? <PreviewTab /> : <DetectTab />}
    </div>
  );
}

export default WellDetection;
