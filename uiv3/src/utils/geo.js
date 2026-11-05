// src/utils/geo.js
// Small, dependency-free geometry helpers. GeoJSON order is always [longitude, latitude].

const R = 6371008.8; // mean Earth radius, metres
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

function eachRing(geometry, fn) {
  if (!geometry) return;
  if (geometry.type === "Polygon") geometry.coordinates.forEach((ring, i) => fn(ring, i === 0));
  else if (geometry.type === "MultiPolygon")
    geometry.coordinates.forEach((poly) => poly.forEach((ring, i) => fn(ring, i === 0)));
}

/** [minLon, minLat, maxLon, maxLat] or null */
export function bboxOfGeometry(geometry) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  eachRing(geometry, (ring) => {
    ring.forEach(([x, y]) => {
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    });
  });
  return Number.isFinite(b[0]) ? b : null;
}

/** Leaflet bounds [[south, west], [north, east]] from a GeoJSON bbox */
export function bboxToLeaflet(b) {
  return b ? [[b[1], b[0]], [b[3], b[2]]] : null;
}

/** "minLon,minLat,maxLon,maxLat" - the format the backend expects in ?bbox= */
export function bboxToParam(b) {
  return b.map((v) => Number(v).toFixed(7)).join(",");
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(x, y, rings) {
  if (!inRing(x, y, rings[0])) return false;
  for (let k = 1; k < rings.length; k++) if (inRing(x, y, rings[k])) return false; // hole
  return true;
}

export function pointInGeometry(lon, lat, geometry) {
  if (!geometry) return true; // no boundary = everything is "inside"
  if (geometry.type === "Polygon") return inPolygon(lon, lat, geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.some((p) => inPolygon(lon, lat, p));
  return false;
}

/** Keep only wells whose (longitude, latitude) fall inside the boundary. */
export function filterWellsInBoundary(wells, geometry) {
  if (!geometry) return wells;
  const b = bboxOfGeometry(geometry);
  if (!b) return wells;
  return wells.filter(
    (w) =>
      w.longitude >= b[0] && w.longitude <= b[2] && w.latitude >= b[1] && w.latitude <= b[3] &&
      pointInGeometry(w.longitude, w.latitude, geometry)
  );
}

/** Approximate geodesic area in square metres (local equirectangular projection). */
export function areaSqMeters(geometry) {
  const b = bboxOfGeometry(geometry);
  if (!b) return 0;
  const lat0 = rad((b[1] + b[3]) / 2);
  const kx = R * Math.cos(lat0);
  const ky = R;
  let total = 0;
  eachRing(geometry, (ring, outer) => {
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const x1 = rad(ring[j][0]) * kx, y1 = rad(ring[j][1]) * ky;
      const x2 = rad(ring[i][0]) * kx, y2 = rad(ring[i][1]) * ky;
      a += x1 * y2 - x2 * y1;
    }
    a = Math.abs(a) / 2;
    total += outer ? a : -a;
  });
  return Math.max(total, 0);
}

export function formatArea(sqm, unit = "ha") {
  if (!sqm) return "-";
  if (unit === "acre") {
    const ac = sqm / 4046.8564224;
    return `${ac.toLocaleString(undefined, { maximumFractionDigits: ac < 10 ? 2 : 1 })} acres`;
  }
  if (sqm >= 1_000_000) return `${(sqm / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} km²`;
  const ha = sqm / 10000;
  return `${ha.toLocaleString(undefined, { maximumFractionDigits: ha < 10 ? 2 : 1 })} ha`;
}

/** Haversine distance in metres between two [lat, lon] points */
export function distanceMeters(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Polygon approximating a circle of `radiusM` metres around (lat, lon). */
export function circleToGeometry(lat, lon, radiusM, steps = 72) {
  const ring = [];
  const d = radiusM / R;
  const lat1 = rad(lat);
  const lon1 = rad(lon);
  for (let i = 0; i <= steps; i++) {
    const brg = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg));
    const lon2 = lon1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    ring.push([Number(deg(lon2).toFixed(7)), Number(deg(lat2).toFixed(7))]);
  }
  ring[ring.length - 1] = ring[0];
  return { type: "Polygon", coordinates: [ring] };
}

export function bboxToGeometry(b) {
  return {
    type: "Polygon",
    coordinates: [[[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]],
  };
}

/** Rectangle polygon from two opposite corners given as [lat, lon]. */
export function rectangleToGeometry(a, b) {
  const minLat = Math.min(a[0], b[0]), maxLat = Math.max(a[0], b[0]);
  const minLon = Math.min(a[1], b[1]), maxLon = Math.max(a[1], b[1]);
  return bboxToGeometry([minLon, minLat, maxLon, maxLat]);
}

/** Polygon from clicked vertices given as [lat, lon]. Needs 3+ points. */
export function polygonToGeometry(points) {
  if (points.length < 3) return null;
  const ring = points.map(([lat, lon]) => [Number(lon.toFixed(7)), Number(lat.toFixed(7))]);
  ring.push(ring[0]);
  return { type: "Polygon", coordinates: [ring] };
}

/**
 * Backend villages store geom_geojson as a string holding a Feature, a bare geometry
 * or a FeatureCollection. Return a Polygon / MultiPolygon geometry, or null.
 */
export function parseBoundary(value) {
  if (!value) return null;
  let obj = value;
  if (typeof value === "string") {
    try { obj = JSON.parse(value); } catch { return null; }
  }
  if (obj?.type === "FeatureCollection") obj = obj.features?.[0];
  if (obj?.type === "Feature") obj = obj.geometry;
  if (obj?.type === "Polygon" || obj?.type === "MultiPolygon") return obj;
  return null;
}

export function toDMS(value, isLat) {
  const hemi = isLat ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const mFull = (abs - d) * 60;
  const m = Math.floor(mFull);
  const s = ((mFull - m) * 60).toFixed(2);
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(5, "0")}"${hemi}`;
}

export function formatCoord(lat, lon, format = "decimal", digits = 6) {
  if (lat == null || lon == null) return "-";
  if (format === "dms") return `${toDMS(lat, true)}, ${toDMS(lon, false)}`;
  return `${Number(lat).toFixed(digits)}, ${Number(lon).toFixed(digits)}`;
}

export function googleMapsUrl(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}
