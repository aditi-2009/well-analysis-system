// src/services/geocodeService.js
// Place search + reverse lookup via OpenStreetMap Nominatim (free, no key).
// Usage policy: max 1 request/second, user-triggered only (we search on submit, never per keystroke).
import axios from "axios";
import { bboxToGeometry } from "../utils/geo";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const http = axios.create({ timeout: 15000, headers: { Accept: "application/json" } });

/**
 * Returns [{ id, name, type, lat, lon, geometry, approximate }]
 * geometry is the real polygon when OSM has one, else the bounding box (approximate = true).
 */
export async function searchPlaces(query, { countryCodes = "in", limit = 6 } = {}) {
  const { data } = await http.get(`${NOMINATIM}/search`, {
    params: {
      q: query, format: "jsonv2", polygon_geojson: 1, addressdetails: 0,
      limit, countrycodes: countryCodes,
    },
  });
  return data.map((p) => {
    const lat = Number(p.lat), lon = Number(p.lon);
    let geometry = null;
    let approximate = false;
    if (p.geojson && (p.geojson.type === "Polygon" || p.geojson.type === "MultiPolygon")) {
      geometry = p.geojson;
    } else if (p.boundingbox) {
      const [s, n, w, e] = p.boundingbox.map(Number); // Nominatim order: south, north, west, east
      geometry = bboxToGeometry([w, s, e, n]);
      approximate = true;
    }
    return {
      id: String(p.place_id),
      name: p.display_name,
      type: p.type || p.category || "place",
      lat, lon, geometry, approximate,
    };
  });
}

export async function reverseGeocode(lat, lon) {
  try {
    const { data } = await http.get(`${NOMINATIM}/reverse`, {
      params: { lat, lon, format: "jsonv2", zoom: 14, addressdetails: 1 },
    });
    return data?.display_name || null;
  } catch {
    return null; // a missing label must never block the workflow
  }
}
