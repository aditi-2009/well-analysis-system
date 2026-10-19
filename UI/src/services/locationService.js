// src/services/locationService.js
// Dropdown data for the Well Detection page. The backend reads these from the database.
import api from "./api";

export async function getStates() {
  const res = await api.get("/locations/states");
  return res.data;
}

export async function getDistricts(stateId) {
  const res = await api.get(`/locations/districts/${stateId}`);
  return res.data;
}

export async function getTalukas(districtId) {
  const res = await api.get(`/locations/talukas/${districtId}`);
  return res.data;
}

export async function getVillages(talukaId) {
  const res = await api.get(`/locations/villages/${talukaId}`);
  return res.data;
}