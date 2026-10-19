// src/utils/wellMapper.js
// Converts backend records into the shape the screens use.

export function mapWell(w) {
  return {
    id: String(w.id),
    latitude: w.latitude,
    longitude: w.longitude,
    confidence: w.confidence, // 0 to 1, not 0 to 100
    status: w.status ?? "Detected",
    village: w.village ?? "Unknown",
    taluka: w.taluka ?? "Unknown",
    district: w.district ?? "Unknown",
    detectedOn: (w.detected_on ?? "").slice(0, 10),
  };
}

// One GeoJSON feature from the detection response -> the same screen shape.
// GeoJSON stores [longitude, latitude]; Leaflet wants [latitude, longitude].
export function mapFeature(feature, index, jobId, area = {}) {
  const [lon, lat] = feature.geometry.coordinates;
  return {
    id: `${jobId.slice(0, 8)}-${index + 1}`,
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lon.toFixed(6)),
    confidence: feature.properties.confidence,
    status: "Detected",
    village: area.village || "Unknown",
    taluka: area.taluka || "Unknown",
    district: area.district || "Unknown",
    detectedOn: new Date().toISOString().slice(0, 10),
  };
}