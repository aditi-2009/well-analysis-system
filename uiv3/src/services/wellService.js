// src/services/wellService.js
// Wells, runs and reference wells. scope: 'mine' (personal, the default) or 'all' (universal).
import api from "./api";
import { bboxToParam } from "../utils/geo";

/** Backend WellOut -> shape used by the screens. confidence stays 0-1. */
export function mapWell(w) {
  return {
    id: String(w.id),
    numericId: w.id,
    jobId: w.job_id,
    latitude: w.latitude,
    longitude: w.longitude,
    confidence: w.confidence,
    status: w.status || "Detected",
    village: w.village || "",
    taluka: w.taluka || "",
    district: w.district || "",
    userId: w.user_id ?? null,
    ownerName: w.owner_name || "",
    detectedOn: w.detected_on || "",
    box: w.px_x1 == null ? null : [w.px_x1, w.px_y1, w.px_x2, w.px_y2],
  };
}

function scopeParams({ jobId, districtId, talukaId, villageId, bbox, minConfidence, scope = "mine", limit = 5000 } = {}) {
  const params = { limit, scope };
  if (jobId) params.job_id = jobId;
  if (districtId) params.district_id = districtId;
  if (talukaId) params.taluka_id = talukaId;
  if (villageId) params.village_id = villageId;
  if (bbox) params.bbox = bboxToParam(bbox);
  if (minConfidence != null) params.min_confidence = minConfidence;
  return params;
}

export async function listWells(options = {}) {
  const { data } = await api.get("/wells", { params: scopeParams(options), timeout: 120000 });
  return data.map(mapWell);
}

export async function deleteWell(wellId) {
  return (await api.delete(`/wells/${wellId}`)).data;
}

/** Officer-survey and administrator-marked wells (GeoJSON from GET /known-wells) -> flat list. */
export async function listKnownWells({ bbox, village, limit = 5000 } = {}) {
  const params = { limit };
  if (bbox) params.bbox = bboxToParam(bbox);
  if (village) params.village = village;
  const { data } = await api.get("/known-wells", { params, timeout: 120000 });
  return data.features.map((f) => ({
    id: `known-${f.properties.id}`,
    knownId: f.properties.id,
    identifier: f.properties.well_identifier || "",
    latitude: f.geometry.coordinates[1], // GeoJSON order is [longitude, latitude]
    longitude: f.geometry.coordinates[0],
    source: f.properties.source,
    village: f.properties.village || "",
    taluka: f.properties.taluka || "",
    district: f.properties.district || "",
    wellType: f.properties.well_type || "",
    notes: f.properties.notes || "",
    status: f.properties.status || "Verified",
    createdBy: f.properties.created_by ?? null,
  }));
}

export async function createKnownWell(payload) {
  return (await api.post("/known-wells", payload)).data;
}

export async function deleteKnownWell(knownId) {
  return (await api.delete(`/known-wells/${knownId}`)).data;
}

/** Server-side CSV (no row limit). Needs one of jobId / districtId / talukaId / villageId. */
export async function exportWellsCsv(options) {
  const params = scopeParams({ ...options, limit: undefined });
  delete params.limit;
  const res = await api.get("/wells/export", { params, responseType: "blob", timeout: 0 });
  return res.data;
}
