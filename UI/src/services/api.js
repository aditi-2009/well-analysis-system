// src/services/api.js
import axios from "axios";

// The one place that knows the backend address and how to talk to it.
// Every service file imports this instance.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // File uploads: the browser must set "multipart/form-data" with its boundary.
  // A JSON Content-Type here would turn the file into JSON and break the upload.
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }

  const token = localStorage.getItem("agriWellToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let friendlyMessage = "Something went wrong. Please try again.";

    if (error.response) {
      const { status, data } = error.response;

      // Token expired or rejected: log out. Not on the login form itself,
      // because a wrong password is also a 401 and its message must stay visible.
      if (status === 401 && !error.config?.url?.includes("/auth/login")) {
        localStorage.removeItem("agriWellToken");
        localStorage.removeItem("agriWellUser");
        window.location.href = "/login";
      }

      if (Array.isArray(data?.detail)) {
        // FastAPI validation errors: a list of { loc, msg }. Show the field and the reason.
        friendlyMessage = data.detail
          .map((d) => `${d.loc?.[d.loc.length - 1] ?? "input"}: ${d.msg}`)
          .join("; ");
      } else if (typeof data?.detail === "string") {
        // Our own errors use "detail" as a plain sentence.
        friendlyMessage = data.detail;
      } else if (typeof data?.message === "string") {
        friendlyMessage = data.message;
      } else {
        friendlyMessage = `Request failed (${status}).`;
      }
    } else if (error.request) {
      friendlyMessage = "Unable to reach the server. Please check your connection.";
    }

    return Promise.reject(new Error(friendlyMessage));
  }
);

export default api;