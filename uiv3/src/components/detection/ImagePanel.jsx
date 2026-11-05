// Imagery for one run: detect inside the area with no upload, an image already on the server, or an upload.
// The confidence, tile size and colour stretch are shown to administrators only.
import { useState } from "react";
import { Ban, FileImage, PlayCircle, Upload } from "lucide-react";
import { DETECTION_LIMITS, UPLOAD_ACCEPT } from "../../config/constants";
import { Alert, Spinner, btn, inputCls, labelCls } from "../common/ui";
import { formatBytes } from "../../utils/format";

const MODES = [
  { k: "area", title: "Detect inside this area (no upload)", text: "Scans the master image only inside the village, place or area you searched or chose." },
  { k: "existing", title: "Use an image already on the server", text: "Pick an image you or your team uploaded before." },
  { k: "upload", title: "Upload a new image for this area", text: "GeoTIFF, JPEG 2000, PNG or JPEG, any size. It is kept on the server." },
];

export default function ImagePanel({
  mode, onMode, canArea, areaName, approximate, images, imageId, onImageId, file, onFile, busy, phase, upload, job,
  uploaded, isAdmin, params, onParams, onRun, onAbort, onCancelUpload,
}) {
  const [over, setOver] = useState(false);
  const pctUp = upload.total ? Math.round((upload.loaded / upload.total) * 100) : 0;
  const pctJob = job?.tiles_total ? Math.round(((job.tiles_done || 0) / job.tiles_total) * 100) : 0;
  const running = ["starting", "running", "stopping"].includes(phase);
  const runLabel = mode === "area" ? "Detect wells in this area" : mode === "upload" ? "Upload and detect wells" : "Detect wells";

  const onDrop = (e) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2" role="radiogroup" aria-label="Imagery source">
        {MODES.map((m) => {
          const disabled = busy || (m.k === "area" && !canArea);
          return (
            <label key={m.k} className={`flex items-start gap-3 rounded-xl border p-3 transition ${mode === m.k ? "border-emerald-500 bg-emerald-50" : "border-slate-200"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-emerald-300"}`}>
              <input type="radio" name="img-mode" className="mt-1 accent-emerald-700" checked={mode === m.k} disabled={disabled} onChange={() => onMode(m.k)} />
              <span>
                <span className="block text-sm font-semibold text-slate-900">{m.title}</span>
                <span className="text-xs text-slate-500">
                  {m.k === "area" && !canArea ? "Search a village or a place, or draw an area, first." : m.text}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {mode === "area" && canArea && (
        <Alert tone="info">
          Wells will be detected inside <b>{areaName}</b>, and only inside its boundary. No file is uploaded.
          {approximate ? " The outline comes from the map, so it is approximate." : ""}
        </Alert>
      )}

      {mode === "existing" && (
        <div>
          <label className={labelCls} htmlFor="img-select">Image</label>
          <select id="img-select" className={inputCls} value={imageId} disabled={busy || !images.length} onChange={(e) => onImageId(e.target.value)}>
            <option value="">{images.length ? "Select an image" : "No images uploaded yet. Use Upload."}</option>
            {images.map((i) => (
              <option key={i.fileId} value={i.fileId}>
                {i.filename} {i.width ? `(${i.width.toLocaleString()} x ${i.height.toLocaleString()} px, ${formatBytes(i.sizeBytes)})` : "(not a picture)"}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "upload" && (
        <label onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${over ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:border-emerald-400"} ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {file ? <FileImage className="h-8 w-8 text-emerald-600" /> : <Upload className="h-8 w-8 text-emerald-600" />}
          <span className="text-sm font-semibold text-slate-900">{file ? file.name : "Drop an image here or click to choose"}</span>
          <span className="text-xs text-slate-500">{file ? formatBytes(file.size) : `Accepted: ${UPLOAD_ACCEPT.replace(/\./g, "").replace(/,/g, ", ")}`}</span>
          <input type="file" accept={UPLOAD_ACCEPT} className="sr-only" disabled={busy} onChange={(e) => onFile(e.target.files?.[0] || null)} />
        </label>
      )}

      {uploaded && (
        <Alert tone={uploaded.crs ? "success" : "warning"}>
          Uploaded <b>{uploaded.filename}</b>.{" "}
          {uploaded.crs ? <>Map coordinates: <b>{uploaded.crs}</b>.</> : <>It has <b>no map coordinates</b>, so wells cannot be placed on the map. Use a georeferenced GeoTIFF.</>}
        </Alert>
      )}

      {isAdmin && (
        <details className="rounded-xl border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">Advanced settings (administrator)</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="conf">Minimum confidence: {params.confidence == null ? "system default" : `${Math.round(params.confidence * 100)}%`}</label>
              <input id="conf" type="range" min={DETECTION_LIMITS.confidenceMin} max={DETECTION_LIMITS.confidenceMax} step="0.01"
                className="w-full accent-emerald-700" value={params.confidence ?? 0.25} disabled={busy}
                onChange={(e) => onParams({ confidence: Number(e.target.value) })} />
              <button type="button" className="text-[11px] font-semibold text-emerald-700 hover:underline" onClick={() => onParams({ confidence: null })}>Use system default</button>
            </div>
            <div>
              <label className={labelCls} htmlFor="tile">Tile size (px)</label>
              <select id="tile" className={inputCls} value={params.tileSize ?? ""} disabled={busy}
                onChange={(e) => onParams({ tileSize: e.target.value ? Number(e.target.value) : null })}>
                <option value="">System default</option>
                {DETECTION_LIMITS.tileSizes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="norm">Colour stretch</label>
              <select id="norm" className={inputCls} value={params.normalize ?? ""} disabled={busy}
                onChange={(e) => onParams({ normalize: e.target.value || null })}>
                <option value="">System default</option>
                <option value="none">None (8-bit images)</option>
                <option value="stretch">Stretch (16-bit or dark images)</option>
              </select>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">A lower minimum confidence finds more wells, and more false ones. These settings apply to this run only.</p>
        </details>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {phase === "uploading" && <button type="button" className={btn.secondary} onClick={onCancelUpload}>Cancel upload</button>}
        {running && (
          <button type="button" className={btn.danger} onClick={onAbort} disabled={phase !== "running"}>
            <Ban className="h-4 w-4" /> Stop detection
          </button>
        )}
        <button type="button" className={btn.primary} onClick={onRun} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />} {runLabel}
        </button>
      </div>

      {phase === "uploading" && (
        <div role="status">
          <p className="text-sm text-slate-700">Uploading {formatBytes(upload.loaded)} of {formatBytes(upload.total)} ({pctUp}%)</p>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${pctUp}%` }} /></div>
          <p className="mt-1 text-[11px] text-slate-500">Keep this tab open until the upload finishes.</p>
        </div>
      )}
      {phase === "starting" && <p className="flex items-center gap-2 text-sm text-slate-700" role="status"><Spinner className="h-4 w-4" /> Starting detection...</p>}
      {(phase === "running" || phase === "stopping") && (
        <div role="status">
          <p className="text-sm text-slate-700">
            {phase === "stopping"
              ? "Stopping... the scan finishes the tile it is on. Nothing is saved."
              : `Detecting wells: tile ${job?.tiles_done ?? 0} of ${job?.tiles_total ?? "?"} (${pctJob}%)`}
          </p>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${pctJob}%` }} /></div>
          <p className="mt-1 text-[11px] text-slate-500">You can leave this page. The run continues on the server and this page reconnects when you come back.</p>
        </div>
      )}
    </div>
  );
}
