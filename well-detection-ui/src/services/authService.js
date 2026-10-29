// src/services/authService.js
import api, { setToken, clearToken, getToken } from "./api";

// Backend user (snake_case) -> shape used by the screens
export function toUiUser(u) {
  return {
    id: u.id,
    fullName: u.full_name || u.email,
    email: u.email,
    mobile: u.mobile || "",
    organization: u.organization || "",
    isActive: u.is_active !== false,
    createdAt: u.created_at || null,
  };
}

export async function loginUser({ email, password, remember = true }) {
  const { data } = await api.post("/auth/login", { email: email.trim(), password });
  setToken(data.access_token, remember);
  try {
    return toUiUser((await api.get("/auth/me")).data);
  } catch (err) {
    clearToken();
    throw err;
  }
}

export async function registerUser(form) {
  const body = {
    email: form.email.trim(),
    password: form.password,
    full_name: form.fullName.trim(),
  };
  if (form.mobile?.trim()) body.mobile = form.mobile.trim();
  if (form.organization?.trim()) body.organization = form.organization.trim();
  const { data } = await api.post("/auth/register", body);
  return toUiUser(data);
}

export async function fetchCurrentUser() {
  return toUiUser((await api.get("/auth/me")).data);
}

export function logoutUser() {
  clearToken();
}

/** Seconds-since-epoch expiry read from the JWT payload (no signature check - display only). */
export function tokenExpiry() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
