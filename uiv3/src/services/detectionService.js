// src/services/detectionService.js
// Detection. The area can be a searched village or place, a drawn area, or a located circle: the master image
// is scanned inside it, so no upload is needed. Or use an image already on the server, or upload one.
import api from "./api";

const POLL_INTERVAL_MS = 2000;
const POLL_FAILURES_ALLOWED = 5;
const FINISHED = ["completed", "failed", "cancelled"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Images already on the server, newest first. */
export async function listImages(pageSize = 100) {
  const { data } = await api.get("/images/list", { params: { page_size: pageSize } });
  return data.items.map((i) => ({
    fileId: i.file_id, filename: i.filename, width: i.width, height: i.height,
    crs: i.crs, sizeBytes: i.size_bytes, format: i.format, createdAt: i.created_at,
  }));
}

/** Streams a file of any size as the request body. onProgress receives { loaded, total } in bytes. */
export async function uploadImage(file, onProgress, signal) {
  const { data } = await api.put("/images/upload-stream", file, {
    params: { filename: file.name },
    headers: { "Content-Type": "application/octet-stream" },
    timeout: 0,
    signal,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress({ loaded: e.loaded, total: e.total });
    },
  });
  if (!data?.file_id) throw new Error("The upload finished, but the server returned no file id.");
  return {
    fileId: data.file_id, filename: data.original_filename, format: data.detected_format,
    sizeBytes: data.file_size_bytes, width: data.image_width, height: data.image_height,
    bands: data.band_count, crs: data.crs, bounds: data.bounds || null,
  };
}

/**
 * Starts a run and returns at once (HTTP 202).
 *  - useMaster + boundary: scan the master image inside the area. No upload.
 *  - imageId (+ boundary, when there is one): scan that image, limited to the area.
 * Confidence, tile size and colour stretch are only sent by administrators.
 */
export async function startDetection({ useMaster = false, imageId, boundary, areaLabel, districtId, talukaId, villageId,
  confidence, tileSize, normalize }) {
  const body = useMaster ? { use_master: true } : { image_id: imageId };
  if (boundary) body.boundary = boundary;
  if (areaLabel) body.area_label = areaLabel;
  if (districtId) body.district_id = Number(districtId);
  if (talukaId) body.taluka_id = Number(talukaId);
  if (villageId) body.village_id = Number(villageId);
  if (confidence != null) body.confidence = confidence;
  if (tileSize != null) body.tile_size = tileSize;
  if (normalize) body.normalize = normalize;
  return (await api.post("/wells/detect", body)).data;
}

export const getJob = async (jobId) => (await api.get(`/wells/jobs/${jobId}`)).data;

/** Runs, personal (scope 'mine', default) or universal (scope 'all'). */
export const listJobs = async ({ limit = 50, scope = "mine" } = {}) =>
  (await api.get("/wells/jobs", { params: { limit, scope } })).data;

export const abortJob = async (jobId) => (await api.post(`/wells/jobs/${jobId}/abort`)).data;
export const deleteJob = async (jobId) => (await api.delete(`/wells/jobs/${jobId}`)).data;

/** Polls every 2 s until the run completes, fails or is cancelled. */
export async function waitForJob(jobId, onUpdate, shouldStop = () => false) {
  let failures = 0;
  for (;;) {
    let job;
    try {
      job = await getJob(jobId);
      failures = 0;
    } catch (err) {
      failures += 1;
      if (failures >= POLL_FAILURES_ALLOWED) throw err;
      await sleep(POLL_INTERVAL_MS * failures);
      continue;
    }
    onUpdate?.(job);
    if (FINISHED.includes(job.status)) return job;
    if (shouldStop()) return job;
    await sleep(POLL_INTERVAL_MS);
  }
}

/** Service status, including the API version (used to warn about an out-of-date backend). */
export const getHealth = async () => (await api.get("/health", { timeout: 6000 })).data;
