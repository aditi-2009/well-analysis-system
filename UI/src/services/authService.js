// src/services/authService.js
import api from "./api";

const TOKEN_KEY = "agriWellToken";

// Backend user (snake_case) -> the shape the screens use (camelCase)
function toUiUser(u) {
  return {
    fullName: u.full_name || u.email,
    email: u.email,
    mobile: u.mobile || "",
    organization: u.organization || "",
  };
}

export async function loginUser({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });

  // Save the token first: the next request reads it from localStorage
  localStorage.setItem(TOKEN_KEY, data.access_token);
  try {
    const me = await api.get("/auth/me");
    return toUiUser(me.data);
  } catch (err) {
    localStorage.removeItem(TOKEN_KEY);
    throw err;
  }
}

export async function registerUser(formData) {
  const { data } = await api.post("/auth/register", {
    email: formData.email,
    password: formData.password,
    full_name: formData.fullName,
    mobile: formData.mobile,
    organization: formData.organization,
  });
  return toUiUser(data);
}