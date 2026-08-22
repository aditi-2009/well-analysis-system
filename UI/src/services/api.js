// src/services/api.js
import axios from "axios";

// Centralized Axios instance.
// All service files (authService, wellService, detectionService, reportService)
// should import and use THIS instance instead of calling axios directly.
// This is the ONLY place that needs to change if the backend's base URL,
// auth token handling, or response format changes.

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ----- Request Interceptor -----
// Attach auth token automatically if one exists (e.g. after real login).
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("agriWellToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ----- Response Interceptor -----
// Normalizes errors so components never see raw axios/network errors —
// they only ever see a clean `.message` string (per spec: never expose raw backend errors).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let friendlyMessage = "Something went wrong. Please try again.";

    if (error.response) {
      // Backend responded with an error status (4xx/5xx)
      friendlyMessage =
        error.response.data?.message || `Request failed (${error.response.status}).`;
    } else if (error.request) {
      // Request was made but no response received (network/server down)
      friendlyMessage = "Unable to reach the server. Please check your connection.";
    }

    return Promise.reject(new Error(friendlyMessage));
  }
);

export default api;