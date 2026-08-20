// src/services/exportService.js

/**
 * Converts an array of well objects into a CSV string and triggers a download.
 * This is a genuine working CSV export (not mocked) since it's pure frontend logic —
 * no backend is needed for this specific feature.
 */
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

  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const MOCK_DELAY = 700;
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock report generation.
 * Later replace with:
 *   const res = await api.post("/reports/generate", { wellIds });
 *   return res.data; // e.g. a report ID or download URL
 */
export async function generateReport(wells) {
  await delay(MOCK_DELAY);

  if (!wells || wells.length === 0) {
    throw new Error("Cannot generate a report with no detection data.");
  }

  return {
    reportId: `RPT-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    wellCount: wells.length,
  };
}