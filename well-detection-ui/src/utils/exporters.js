// src/utils/exporters.js
// Client-side exports of wells already on screen.
import { levelOf } from "./confidence";

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function download(filename, text, mime) {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function wellsToCsv(wells, thresholds) {
  const head = ["well_id", "latitude", "longitude", "confidence", "confidence_percent", "level", "village", "taluka", "district", "job_id", "model_version", "detected_on"];
  const rows = wells.map((w) => [
    w.id, w.latitude.toFixed(7), w.longitude.toFixed(7), w.confidence.toFixed(4),
    (w.confidence * 100).toFixed(1), levelOf(w.confidence, thresholds),
    w.village, w.taluka, w.district, w.jobId, w.modelVersion, w.detectedOn,
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function downloadWellsCsv(wells, thresholds, name = "wells") {
  download(`${name}.csv`, wellsToCsv(wells, thresholds), "text/csv;charset=utf-8");
}

export function wellsToGeoJson(wells, thresholds, boundary) {
  const features = wells.map((w) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [w.longitude, w.latitude] },
    properties: {
      id: w.id, confidence: w.confidence, level: levelOf(w.confidence, thresholds),
      village: w.village, taluka: w.taluka, district: w.district, job_id: w.jobId,
    },
  }));
  if (boundary) features.unshift({ type: "Feature", geometry: boundary, properties: { kind: "boundary" } });
  return { type: "FeatureCollection", features };
}

export function downloadWellsGeoJson(wells, thresholds, boundary, name = "wells") {
  download(`${name}.geojson`, JSON.stringify(wellsToGeoJson(wells, thresholds, boundary), null, 2), "application/geo+json");
}
