// src/utils/constants.js
// Central place for constants used across the app.
// Avoids magic strings/numbers scattered in components.

export const APP_NAME = "Agricultural Well Detection & Analysis System";
export const ORG_NAME = "ICAR - NBSS & LUP";

export const CONFIDENCE_LEVELS = {
  HIGH: 0.75,   // >= 75% confidence
  MEDIUM: 0.5,  // 50% - 74%
  // below 0.5 is considered LOW
};

export const DETECTION_STATUS = {
  DETECTED: "Detected",
  PROCESSING: "Processing",
  FAILED: "Failed",
};

export const MAP_DEFAULT_CENTER = [21.1458, 79.0882]; // Nagpur, MH
export const MAP_DEFAULT_ZOOM = 12;