// src/services/locationService.js
// District -> taluka -> village from the database, village search by name, and point lookup.
import api from "./api";

export const getStates = async () => (await api.get("/locations/states")).data;
export const getDistricts = async (stateId) => (await api.get(`/locations/districts/${stateId}`)).data;
export const getTalukas = async (districtId) => (await api.get(`/locations/talukas/${districtId}`)).data;
export const getVillages = async (talukaId) => (await api.get(`/locations/villages/${talukaId}`)).data;

/** One village including geom_geojson (its stored boundary) */
export const getVillage = async (villageId) => (await api.get(`/locations/village/${villageId}`)).data;

/** Villages whose name contains the text. Each has hasBoundary, which tells whether a stored boundary exists. */
export async function searchVillages(q, limit = 15) {
  const { data } = await api.get("/locations/search/villages", { params: { q, limit } });
  return data.map((v) => ({
    id: v.id, name: v.name, talukaId: v.taluka_id, taluka: v.taluka,
    districtId: v.district_id, district: v.district, hasBoundary: v.has_boundary,
  }));
}

/** Which village, taluka and district a point lies in, from the stored boundaries. */
export const locatePoint = async (lat, lon) => (await api.get("/locations/locate", { params: { lat, lon } })).data;
