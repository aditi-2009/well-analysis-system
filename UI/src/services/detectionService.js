// version: well-detection-2
// src/services/detectionService.js
// Calls behind the Well Detection page:
//   listImages or uploadImage -> startDetection -> waitForJob -> getJobWells
//   listJobs lets the page pick up a run that is still going after a reload.
import api from "./api";
import { mapWell } from "../utils/wellMapper";

const POLL_INTERVAL_MS = 2000;
const POLL_FAILURES_ALLOWED = 5; // a short network blip must not end a run that lasts hours

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Files already on the server, newest first.
// Each item: file_id, filename, width, height, crs, size_bytes, format. Width and height
// are null for files that are not pictures.
export async function listImages() {
  const res = await api.get("/images/list", { params: { page_size: 100 } });
  return res.data.items;
}

// Streams a file of any size to the server as the raw request body. The browser reads it
// from disk as it sends, so an 8 GB file does not need 8 GB of memory, and the server
// writes it once. timeout 0 means no time limit: a large file can take hours.
// onProgress receives { loaded, total } in bytes.
export async function uploadImage(file, onProgress) {
  const res = await api.put("/images/upload-stream", file, {
    params: { filename: file.name },
    headers: { "Content-Type": "application/octet-stream" },
    timeout: 0,
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress({ loaded: event.loaded, total: event.total });
    },
  });
  if (!res.data?.file_id) throw new Error("The upload finished, but the server returned no file id.");
  return res.data;
}

// Starts a detection job and returns at once, with the job in status "pending".
// Empty area fields are left out, so the wells are kept without an area.
export async function startDetection({ imageId, districtId, talukaId, villageId, confidence, tileSize, normalize }) {
  const body = { image_id: imageId };
  if (districtId) body.district_id = Number(districtId);
  if (talukaId) body.taluka_id = Number(talukaId);
  if (villageId) body.village_id = Number(villageId);
  if (confidence != null) body.confidence = confidence;
  if (tileSize != null) body.tile_size = tileSize;
  if (normalize) body.normalize = normalize;
  const res = await api.post("/wells/detect", body);
  return res.data;
}

export async function getJob(jobId) {
  const res = await api.get(`/wells/jobs/${jobId}`);
  return res.data;
}

// The most recent jobs, newest first.
export async function listJobs(limit = 5) {
  const res = await api.get("/wells/jobs", { params: { limit } });
  return res.data;
}

// Checks the job every two seconds until it completes or fails.
// onUpdate receives each check. shouldStop() ends the wait when the user leaves the page.
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
    if (onUpdate) onUpdate(job);
    if (job.status === "completed" || job.status === "failed") return job;
    if (shouldStop()) return job;
    await sleep(POLL_INTERVAL_MS);
  }
}

// The wells one job produced, in the shape the table and the map use.
export async function getJobWells(jobId) {
  const res = await api.get("/wells", { params: { job_id: jobId, limit: 20000 } });
  return res.data.map(mapWell);
}
