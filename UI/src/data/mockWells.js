// src/data/mockWells.js
// Realistic mock well detection data.
// Later, this entire file can be deleted once a real backend provides this data —
// nothing else needs to change except the service functions that read it.

const mockWells = [
  { id: "W001", latitude: 21.1458, longitude: 79.0882, confidence: 0.87, status: "Detected", village: "Wadi", taluka: "Nagpur Rural", district: "Nagpur", detectedOn: "2026-07-01" },
  { id: "W002", latitude: 21.1502, longitude: 79.0925, confidence: 0.93, status: "Detected", village: "Kalmeshwar", taluka: "Kalmeshwar", district: "Nagpur", detectedOn: "2026-07-01" },
  { id: "W003", latitude: 21.1390, longitude: 79.0810, confidence: 0.62, status: "Detected", village: "Wadi", taluka: "Nagpur Rural", district: "Nagpur", detectedOn: "2026-07-02" },
  { id: "W004", latitude: 21.1600, longitude: 79.1000, confidence: 0.45, status: "Detected", village: "Katol", taluka: "Katol", district: "Nagpur", detectedOn: "2026-07-02" },
  { id: "W005", latitude: 21.1325, longitude: 79.0750, confidence: 0.78, status: "Detected", village: "Hingna", taluka: "Hingna", district: "Nagpur", detectedOn: "2026-07-03" },
  { id: "W006", latitude: 21.1700, longitude: 79.1100, confidence: 0.91, status: "Detected", village: "Kamptee", taluka: "Kamptee", district: "Nagpur", detectedOn: "2026-07-03" },
  { id: "W007", latitude: 21.1210, longitude: 79.0690, confidence: 0.55, status: "Detected", village: "Hingna", taluka: "Hingna", district: "Nagpur", detectedOn: "2026-07-04" },
  { id: "W008", latitude: 21.1550, longitude: 79.0950, confidence: 0.88, status: "Detected", village: "Kalmeshwar", taluka: "Kalmeshwar", district: "Nagpur", detectedOn: "2026-07-04" },
  { id: "W009", latitude: 21.1480, longitude: 79.0870, confidence: 0.35, status: "Detected", village: "Wadi", taluka: "Nagpur Rural", district: "Nagpur", detectedOn: "2026-07-05" },
  { id: "W010", latitude: 21.1650, longitude: 79.1050, confidence: 0.72, status: "Detected", village: "Katol", taluka: "Katol", district: "Nagpur", detectedOn: "2026-07-05" },
  { id: "W011", latitude: 21.1280, longitude: 79.0730, confidence: 0.95, status: "Detected", village: "Hingna", taluka: "Hingna", district: "Nagpur", detectedOn: "2026-07-06" },
  { id: "W012", latitude: 21.1750, longitude: 79.1150, confidence: 0.68, status: "Detected", village: "Kamptee", taluka: "Kamptee", district: "Nagpur", detectedOn: "2026-07-06" },
];

export default mockWells;