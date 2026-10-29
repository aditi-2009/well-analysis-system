// src/services/detectionService.js
// Detection flow:  listImages / uploadImage -> startDetection -> waitForJob -> listWells({ jobId })
import api from "./api";

const POLL_INTERVAL_MS = 2000;
const POLL_FAILURES_ALLOWED = 5; // a short network blip must not abandon a run that lasts a long time
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Images already on the server, newest first. */
export async function listImages(pageSize = 100) {
  const { data } = await api.get("/images/list", { params: { page_size: pageSize } });
  return data.items.map((i) => ({
    fileId: i.file_id,
    filename: i.filename,
    width: i.width,
    height: i.height,
    crs: i.crs,
    sizeBytes: i.size_bytes,
    format: i.format,
    createdAt: i.created_at,
  }));
}

/**
 * Streams a file of any size as the raw request body (PUT /images/upload-stream).
 * The browser reads it from disk while sending, so a multi-GB file does not fill memory.
 * onProgress receives { loaded, total } in bytes.
 */
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
    fileId: data.file_id,
    filename: data.original_filename,
    format: data.detected_format,
    sizeBytes: data.file_size_bytes,
    width: data.image_width,
    height: data.image_height,
    bands: data.band_count,
    crs: data.crs,
    resolutionM: data.spatial_resolution_m,
    bounds: data.bounds || null, // {minx, miny, maxx, maxy} in the raster's own CRS
  };
}

/**
 * Starts a job and returns at once (HTTP 202) with status "pending".
 * Empty fields are left out so the backend uses its own defaults.
 */
export async function startDetection({ imageId, districtId, talukaId, villageId, confidence, tileSize, normalize }) {
  const body = { image_id: imageId };
  if (districtId) body.district_id = Number(districtId);
  if (talukaId) body.taluka_id = Number(talukaId);
  if (villageId) body.village_id = Number(villageId);
  if (confidence != null) body.confidence = confidence;
  if (tileSize != null) body.tile_size = tileSize;
  if (normalize) body.normalize = normalize;
  return (await api.post("/wells/detect", body)).data;
}

export const getJob = async (jobId) => (await api.get(`/wells/jobs/${jobId}`)).data;
export const listJobs = async (limit = 50) => (await api.get("/wells/jobs", { params: { limit } })).data;

/**
 * Polls every 2 s until the job completes or fails.
 * onUpdate(job) is called on each check; shouldStop() lets the page abandon the wait.
 */
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
    if (job.status === "completed" || job.status === "failed") return job;
    if (shouldStop()) return job;
    await sleep(POLL_INTERVAL_MS);
  }
}

export const getActiveModel = async () => (await api.get("/models/active")).data;
export const getHealth = async () => (await api.get("/health", { timeout: 6000 })).data;
