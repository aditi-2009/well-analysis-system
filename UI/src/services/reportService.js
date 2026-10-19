// src/services/reportService.js
import { getAllWells } from "./wellService";
import { CONFIDENCE_LEVELS } from "../utils/constants";

// Summary numbers for the Reports page, computed from the real wells.
export async function getReportSummary() {
  const wells = await getAllWells();

  const high = wells.filter((w) => w.confidence >= CONFIDENCE_LEVELS.HIGH).length;
  const medium = wells.filter(
    (w) => w.confidence >= CONFIDENCE_LEVELS.MEDIUM && w.confidence < CONFIDENCE_LEVELS.HIGH
  ).length;
  const low = wells.length - high - medium;

  const districts = [...new Set(wells.map((w) => w.district))];
  const latest = wells.map((w) => w.detectedOn).filter(Boolean).sort().reverse()[0];

  return {
    totalWells: wells.length,
    highConfidence: high,
    mediumConfidence: medium,
    lowConfidence: low,
    areasCovered: districts.join(", ") || "—",
    latestDetectionDate: latest || "—",
  };
}