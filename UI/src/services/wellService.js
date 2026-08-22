// src/services/wellService.js
import mockWells from "../data/mockWells";
import { CONFIDENCE_LEVELS } from "../utils/constants";

const MOCK_DELAY = 500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch all detected wells.
 * Later replace with:
 *   const res = await api.get("/wells");
 *   return res.data.data;
 */
export async function getAllWells() {
  await delay(MOCK_DELAY);
  return mockWells;
}

/**
 * Fetch summary stats for the dashboard.
 * Later this may become its own backend endpoint (e.g. GET /wells/summary)
 * instead of being computed on the frontend.
 */
export async function getDashboardStats() {
  await delay(MOCK_DELAY);

  const totalWells = mockWells.length;
  const uniqueVillages = new Set(mockWells.map((w) => w.village)).size;
  const avgConfidence =
    mockWells.reduce((sum, w) => sum + w.confidence, 0) / totalWells;

  return {
    totalWells,
    selectedArea: "Nagpur District",
    detectionAccuracy: `${Math.round(avgConfidence * 100)}%`,
    processedImages: 24, // mock static value for now
    villagesCovered: uniqueVillages,
  };
}

/**
 * Wells grouped by village/area, including average confidence per area —
 * used for the bar chart (bar color reflects avgConfidence).
 */
/**
 * Wells grouped by village/area, broken down by confidence level (High/Medium/Low)
 * — used for the stacked bar chart, using the same color scheme as the pie chart.
 */
export async function getWellsByArea() {
  await delay(MOCK_DELAY);

  const grouped = {};
  mockWells.forEach((well) => {
    if (!grouped[well.village]) {
      grouped[well.village] = { area: well.village, high: 0, medium: 0, low: 0 };
    }
    if (well.confidence >= CONFIDENCE_LEVELS.HIGH) grouped[well.village].high += 1;
    else if (well.confidence >= CONFIDENCE_LEVELS.MEDIUM) grouped[well.village].medium += 1;
    else grouped[well.village].low += 1;
  });

  return Object.values(grouped);
}

/**
 * Wells grouped by confidence level (High/Medium/Low) — used for the pie chart.
 */
export async function getConfidenceBreakdown() {
  await delay(MOCK_DELAY);

  let high = 0, medium = 0, low = 0;
  mockWells.forEach((w) => {
    if (w.confidence >= CONFIDENCE_LEVELS.HIGH) high++;
    else if (w.confidence >= CONFIDENCE_LEVELS.MEDIUM) medium++;
    else low++;
  });

  return [
    { name: "High Confidence", value: high },
    { name: "Medium Confidence", value: medium },
    { name: "Low Confidence", value: low },
  ];
}