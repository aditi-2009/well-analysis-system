// src/services/detectionService.js
import mockWells from "../data/mockWells";

const MOCK_PROCESSING_TIME = 2500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock well detection trigger.
 * Later replace this function body with:
 *   const res = await api.post("/detection", areaParams);
 *   return res.data.data;
 *
 * areaParams example: { district, taluka, village, latitude, longitude, areaType }
 */
export async function runDetection(areaParams) {
  await delay(MOCK_PROCESSING_TIME);

  // Basic validation mimicking what a real backend might reject
  if (!areaParams.district) {
    throw new Error("District is required to run detection.");
  }

  // For the mock, just return the existing sample wells as "detection results"
  // filtered loosely by district if provided, to feel realistic.
  const results = mockWells.filter(
    (w) => w.district.toLowerCase() === areaParams.district.toLowerCase()
  );

  if (results.length === 0) {
    // Simulate an empty-result scenario, which the UI must handle gracefully
    return [];
  }

  return results;
}