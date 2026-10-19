// src/utils/confidence.js
// One rule for High, Medium and Low confidence, and for officer-verified wells.
// Maps, tables, popups and the legend all use it, so a colour means the same everywhere.
import { CONFIDENCE_LEVELS } from "./constants";

export const CONFIDENCE_COLORS = { high: "#16a34a", medium: "#f59e0b", low: "#dc2626" };
export const VERIFIED_COLOR = "#1d4ed8";

// confidence is a number from 0 to 1. Returns the level's key, label and colour.
export function confidenceLevel(confidence) {
  if (confidence >= CONFIDENCE_LEVELS.HIGH) {
    return { key: "high", label: "High", color: CONFIDENCE_COLORS.high };
  }
  if (confidence >= CONFIDENCE_LEVELS.MEDIUM) {
    return { key: "medium", label: "Medium", color: CONFIDENCE_COLORS.medium };
  }
  return { key: "low", label: "Low", color: CONFIDENCE_COLORS.low };
}

// A well an officer verified is ground truth, not a model guess, so it gets its own level.
export function wellLevel(well) {
  if (well.status === "Verified") {
    return { key: "verified", label: "Verified", color: VERIFIED_COLOR };
  }
  return confidenceLevel(well.confidence);
}
