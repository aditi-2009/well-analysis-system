// src/services/learningService.js
// Learning from detections. Administrators only.
import api from "./api";

export const getLearningStatus = async () => (await api.get("/learning/status")).data;

export const startLearningRound = async (activateWithoutValidation = false) =>
  (await api.post("/learning/train", null, { params: { activate_without_validation: activateWithoutValidation } })).data;

export const activateSavedVersion = async () => (await api.post("/learning/activate-candidate")).data;
