// src/services/wellService.js
import api from "./api";
import { mapWell } from "../utils/wellMapper";
import { CONFIDENCE_LEVELS } from "../utils/constants";

// AI-detected wells from completed detection jobs.
export async function getAllWells() {
  const res = await api.get("/wells", { params: { limit: 5000 } });
  return res.data.map(mapWell);
}

// Officer-verified wells (ground truth), GeoJSON from GET /known-wells.
export async function getKnownWells() {
  const res = await api.get("/known-wells", { params: { limit: 5000 } });
  return res.data.features.map((f) => ({
    id: `known-${f.properties.id}`,
    latitude: f.geometry.coordinates[1], // GeoJSON order is [longitude, latitude]
    longitude: f.geometry.coordinates[0],
    confidence: 1, // verified by a surveyor = 100%
    status: "Verified",
    village: f.properties.village ?? "Unknown",
    taluka: f.properties.taluka ?? "Unknown",
    district: f.properties.district ?? "Unknown",
    detectedOn: "",
  }));
}

function level(c) {
  if (c >= CONFIDENCE_LEVELS.HIGH) return "high";
  if (c >= CONFIDENCE_LEVELS.MEDIUM) return "medium";
  return "low";
}

export async function getDashboardStats() {
  const wells = await getAllWells();
  const total = wells.length;
  const avg = total ? wells.reduce((s, w) => s + w.confidence, 0) / total : 0;
  const first = wells[0]?.district;
  return {
    totalWells: total,
    selectedArea: first && first !== "Unknown" ? `${first} District` : "—",
    // This is average model confidence, not accuracy. Accuracy needs labelled test data.
    detectionAccuracy: total ? `${Math.round(avg * 100)}%` : "—",
    processedImages: 0, // needs a backend count of uploaded images (later)
    villagesCovered: new Set(wells.map((w) => w.village)).size,
  };
}

export async function getWellsByArea() {
  const wells = await getAllWells();
  const grouped = {};
  wells.forEach((w) => {
    grouped[w.village] ??= { area: w.village, high: 0, medium: 0, low: 0 };
    grouped[w.village][level(w.confidence)] += 1;
  });
  return Object.values(grouped);
}

export async function getConfidenceBreakdown() {
  const wells = await getAllWells();
  const c = { high: 0, medium: 0, low: 0 };
  wells.forEach((w) => (c[level(w.confidence)] += 1));
  return [
    { name: "High Confidence", value: c.high },
    { name: "Medium Confidence", value: c.medium },
    { name: "Low Confidence", value: c.low },
  ];
}