// src/services/api.js
// The ONE place that knows the backend address and how to talk to it.
// Every other service imports this axios instance.
import axios from "axios";
import { STORAGE } from "../config/constants";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/** Token lives in localStorage ("remember me") or sessionStorage (this tab only). */
export function getToken() {
  return localStorage.getItem(STORAGE.token) || sessionStorage.getItem(STORAGE.token);
}
export function setToken(token, remember = true) {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem(STORAGE.token, token);
}
export function clearToken() {
  localStorage.removeItem(STORAGE.token);
  sessionStorage.removeItem(STORAGE.token);
}

api.interceptors.request.use((config) => {
  // Uploads of FormData: let the browser set the multipart boundary itself.
  if (config.data instanceof FormData) config.headers.delete("Content-Type");
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * The backend answers errors in three shapes:
 *   { detail: "text" }                         HTTPException
 *   { detail: [{loc, msg}, ...] }              FastAPI validation (default)
 *   { error_code, message, fields? }           AppException / our own validation handler
 */
export function extractError(error) {
  if (error?.response) {
    const { status, data } = error.response;
    if (typeof data?.detail === "string") return data.detail;
    const list = Array.isArray(data?.detail) ? data.detail : Array.isArray(data?.fields) ? data.fields : null;
    if (list) {
      return list
        .map((d) => `${d.loc?.[d.loc.length - 1] ?? "input"}: ${d.msg}`)
        .join("; ");
    }
    if (typeof data?.message === "string") return data.message;
    if (status === 413) return "The file is too large for the server.";
    if (status === 503) return "The service is temporarily unavailable.";
    return `Request failed (${status}).`;
  }
  if (error?.code === "ECONNABORTED") return "The server took too long to answer. Please try again.";
  if (error?.request) return "Unable to reach the server. Check that the backend is running and the address in .env is correct.";
  return error?.message || "Something went wrong. Please try again.";
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    // An expired / rejected token ends the session. A wrong password on the login
    // form is also a 401, and its message must stay visible there.
    if (status === 401 && !url.includes("/auth/login")) {
      clearToken();
      localStorage.removeItem(STORAGE.user);
      window.dispatchEvent(new Event("auth:expired"));
    }
    const err = new Error(extractError(error));
    err.status = status;
    return Promise.reject(err);
  }
);

export default api;
