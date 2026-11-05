// src/utils/exporters.js
// Exports of the wells on screen: CSV, GeoJSON and KML (Google Earth, QGIS, ArcGIS).
import { levelOf } from "./confidence";

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function download(filename, text, mime) {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function wellsToCsv(wells, thresholds) {
  const head = ["well_id", "latitude", "longitude", "confidence", "confidence_percent", "level",
    "village", "taluka", "district", "found_by", "detected_on"];
  const rows = wells.map((w) => [
    w.id, w.latitude.toFixed(7), w.longitude.toFixed(7), w.confidence.toFixed(4),
    (w.confidence * 100).toFixed(1), levelOf(w.confidence, thresholds),
    w.village, w.taluka, w.district, w.ownerName, w.detectedOn,
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function downloadWellsCsv(wells, thresholds, name = "wells") {
  download(`${name}.csv`, wellsToCsv(wells, thresholds), "text/csv;charset=utf-8");
}

export function wellsToGeoJson(wells, thresholds, boundary) {
  const features = wells.map((w) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [w.longitude, w.latitude] },
    properties: {
      id: w.id, confidence: w.confidence, level: levelOf(w.confidence, thresholds),
      village: w.village, taluka: w.taluka, district: w.district,
    },
  }));
  if (boundary) features.unshift({ type: "Feature", geometry: boundary, properties: { kind: "boundary" } });
  return { type: "FeatureCollection", features };
}

export function downloadWellsGeoJson(wells, thresholds, boundary, name = "wells") {
  download(`${name}.geojson`, JSON.stringify(wellsToGeoJson(wells, thresholds, boundary), null, 2), "application/geo+json");
}

// KML colours are aabbggrr. Level colours match the screens.
const KML_COLOR = { high: "ff81b910", medium: "ff0b9ef5", low: "ff4444ef" };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function ringKml(ring) {
  return ring.map(([lon, lat]) => `${lon},${lat},0`).join(" ");
}

function boundaryKml(geometry) {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const body = polys
    .map((rings) => `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ringKml(rings[0])}</coordinates></LinearRing></outerBoundaryIs></Polygon>`)
    .join("");
  return polys.length > 1 ? `<MultiGeometry>${body}</MultiGeometry>` : body;
}

export function wellsToKml(wells, thresholds, boundary, title = "Detected wells") {
  const styles = Object.entries(KML_COLOR)
    .map(([id, color]) => `<Style id="${id}"><IconStyle><color>${color}</color><scale>0.9</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/shaded_dot.png</href></Icon></IconStyle></Style>`)
    .join("");
  const area = boundary
    ? `<Placemark><name>Area boundary</name><Style><LineStyle><color>ff00c0ff</color><width>2</width></LineStyle><PolyStyle><color>2200c0ff</color></PolyStyle></Style>${boundaryKml(boundary)}</Placemark>`
    : "";
  const places = wells.map((w) => {
    const level = levelOf(w.confidence, thresholds);
    const text = `Confidence ${(w.confidence * 100).toFixed(1)}% (${level}). Village: ${w.village || "-"}. Taluka: ${w.taluka || "-"}. District: ${w.district || "-"}. Lat ${w.latitude.toFixed(7)}, Lon ${w.longitude.toFixed(7)}`;
    return `<Placemark><name>${esc(`Well #${w.id}`)}</name><description>${esc(text)}</description><styleUrl>#${level}</styleUrl><Point><coordinates>${w.longitude.toFixed(7)},${w.latitude.toFixed(7)},0</coordinates></Point></Placemark>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(title)}</name>${styles}${area}${places}</Document></kml>`;
}

export function downloadWellsKml(wells, thresholds, boundary, name = "wells") {
  download(`${name}.kml`, wellsToKml(wells, thresholds, boundary, name), "application/vnd.google-earth.kml+xml");
}
