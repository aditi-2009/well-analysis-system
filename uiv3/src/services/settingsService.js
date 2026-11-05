// src/services/settingsService.js
// System settings. Everyone reads them; only administrators save them.
import api from "./api";

export const getSettings = async () => (await api.get("/settings")).data;

/** Returns { [key]: saved value } */
export const saveSetting = async (key, value) => (await api.put(`/settings/${key}`, { value })).data;
