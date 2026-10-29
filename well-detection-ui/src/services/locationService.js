// src/services/locationService.js
// State -> District -> Taluka -> Village cascade, read from the backend database.
import api from "./api";

export const getStates = async () => (await api.get("/locations/states")).data;
export const getDistricts = async (stateId) => (await api.get(`/locations/districts/${stateId}`)).data;
export const getTalukas = async (districtId) => (await api.get(`/locations/talukas/${districtId}`)).data;
export const getVillages = async (talukaId) => (await api.get(`/locations/villages/${talukaId}`)).data;

/** One village including geom_geojson (its boundary) */
export const getVillage = async (villageId) => (await api.get(`/locations/village/${villageId}`)).data;
