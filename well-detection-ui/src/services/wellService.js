// src/services/wellService.js
import api from "./api";
import { bboxToParam } from "../utils/geo";

/** Backend WellOut -> shape used by the screens. confidence stays 0-1. */
export function mapWell(w) {
  return {
    id: String(w.id),
    jobId: w.job_id,
    latitude: w.latitude,
    longitude: w.longitude,
    confidence: w.confidence,
    className: w.class_name || "well",
    status: w.status || "Detected",
    village: w.village || "",
    taluka: w.taluka || "",
    district: w.district || "",
    modelVersion: w.model_version || "",
    detectedOn: w.detected_on || "",
    box: w.px_x1 == null ? null : [w.px_x1, w.px_y1, w.px_x2, w.px_y2],
  };
}

/**
 * AI-detected wells from COMPLETED jobs.
 * Filters: jobId, districtId, talukaId, villageId, bbox ([minLon,minLat,maxLon,maxLat]), limit (max 20000).
 */
export async function listWells({ jobId, districtId, talukaId, villageId, bbox, limit = 5000 } = {}) {
  const params = { limit };
  if (jobId) params.job_id = jobId;
  if (districtId) params.district_id = districtId;
  if (talukaId) params.taluka_id = talukaId;
  if (villageId) params.village_id = villageId;
  if (bbox) params.bbox = bboxToParam(bbox);
  const { data } = await api.get("/wells", { params, timeout: 120000 });
  return data.map(mapWell);
}

/** Officer-verified wells (GeoJSON FeatureCollection) -> flat list */
export async function listKnownWells({ bbox, village, limit = 5000 } = {}) {
  const params = { limit };
  if (bbox) params.bbox = bboxToParam(bbox);
  if (village) params.village = village;
  const { data } = await api.get("/known-wells", { params, timeout: 120000 });
  return data.features.map((f) => ({
    id: `known-${f.properties.id}`,
    identifier: f.properties.well_identifier || "",
    latitude: f.geometry.coordinates[1], // GeoJSON order is [longitude, latitude]
    longitude: f.geometry.coordinates[0],
    source: f.properties.source,
    village: f.properties.village || "",
    taluka: f.properties.taluka || "",
    district: f.properties.district || "",
    wellType: f.properties.well_type || "",
    status: f.properties.status || "Verified",
  }));
}

/** Server-side CSV (no row limit). Needs one of jobId / districtId / talukaId / villageId. */
export async function exportWellsCsv({ jobId, districtId, talukaId, villageId }) {
  const params = {};
  if (jobId) params.job_id = jobId;
  if (districtId) params.district_id = districtId;
  if (talukaId) params.taluka_id = talukaId;
  if (villageId) params.village_id = villageId;
  const res = await api.get("/wells/export", { params, responseType: "blob", timeout: 0 });
  return res.data;
}
