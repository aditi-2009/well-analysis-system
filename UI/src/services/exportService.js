// src/services/exportService.js
import api from "./api";

// Quote a cell that contains a comma, a quote or a line break,
// so "Deoli, Wardha" stays in one column.
function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Hands a Blob to the browser as a file download.
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// CSV of the wells already loaded in the browser (the Results and Reports pages).
export function exportWellsToCSV(wells, filename = "well-detection-results.csv") {
  if (!wells || wells.length === 0) {
    throw new Error("No data available to export.");
  }

  const headers = ["Well ID", "Latitude", "Longitude", "Confidence", "Status", "Village", "District", "Detected On"];
  const rows = wells.map((w) => [
    w.id,
    w.latitude,
    w.longitude,
    `${Math.round(w.confidence * 100)}%`,
    w.status,
    w.village,
    w.district,
    w.detectedOn,
  ]);

  const csvContent = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  saveBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), filename);
}

// CSV of the wells SAVED in the database for a job or an area. The server builds it, with no
// row limit, so it is complete even when the map only holds part of the wells.
// Pass jobId, or any of districtId / talukaId / villageId. label names the file.
export async function downloadWellsCsv({ jobId, districtId, talukaId, villageId, label = "wells" }) {
  const params = {};
  if (jobId) params.job_id = jobId;
  if (districtId) params.district_id = districtId;
  if (talukaId) params.taluka_id = talukaId;
  if (villageId) params.village_id = villageId;

  const res = await api.get("/wells/export", {
    params,
    responseType: "blob",
    timeout: 10 * 60 * 1000,
  });
  const blob = res.data;

  // A file with a header row and nothing else means no wells are stored for this choice.
  const head = await blob.slice(0, 4096).text();
  if (head.split("\r\n").filter(Boolean).length <= 1) {
    throw new Error("No wells are stored for this choice yet.");
  }

  const slug = label.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "wells";
  const day = new Date().toISOString().slice(0, 10);
  saveBlob(blob, `wells_${slug}_${day}.csv`);
}

// Report generation is not built yet. Say so, instead of pretending a report exists.
export async function generateReport() {
  throw new Error("Report generation is not available yet.");
}
