// src/services/reportService.js
import mockWells from "../data/mockWells";
import { CONFIDENCE_LEVELS } from "../utils/constants";

const MOCK_DELAY = 500;
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch data needed for the Reports page summary.
 * Later replace with:
 *   const res = await api.get("/reports/summary");
 *   return res.data.data;
 */
export async function getReportSummary() {
  await delay(MOCK_DELAY);

  const totalWells = mockWells.length;
  const high = mockWells.filter((w) => w.confidence >= CONFIDENCE_LEVELS.HIGH).length;
  const medium = mockWells.filter(
    (w) => w.confidence >= CONFIDENCE_LEVELS.MEDIUM && w.confidence < CONFIDENCE_LEVELS.HIGH
  ).length;
  const low = mockWells.filter((w) => w.confidence < CONFIDENCE_LEVELS.MEDIUM).length;

  const districts = [...new Set(mockWells.map((w) => w.district))];
  const latestDetectionDate = mockWells
    .map((w) => w.detectedOn)
    .sort()
    .reverse()[0];

  return {
    totalWells,
    highConfidence: high,
    mediumConfidence: medium,
    lowConfidence: low,
    areasCovered: districts.join(", "),
    latestDetectionDate,
  };
}