// src/services/authService.js

// Simulates network latency so loading states feel real during testing
const MOCK_DELAY = 800;

// Simple in-memory mock "database" of registered users.
// In a real backend this would live server-side, not in the frontend.
let mockUsers = [
  {
    fullName: "Demo User",
    email: "demo@nbsslup.gov.in",
    mobile: "9876543210",
    organization: "ICAR - NBSS & LUP",
    password: "Demo@123",
  },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock login.
 * Later replace this function body with:
 *   const res = await api.post("/auth/login", { email, password });
 *   return res.data;
 */
export async function loginUser({ email, password }) {
  await delay(MOCK_DELAY);

  const foundUser = mockUsers.find((u) => u.email === email);

  if (!foundUser) {
    throw new Error("No account found with this email.");
  }
  if (foundUser.password !== password) {
    throw new Error("Incorrect password.");
  }

  // Never return the password field to the "frontend" — mimic real API behavior
  const { password: _pw, ...safeUser } = foundUser;
  return safeUser;
}

/**
 * Mock registration.
 * Later replace this function body with:
 *   const res = await api.post("/auth/register", formData);
 *   return res.data;
 */
export async function registerUser(formData) {
  await delay(MOCK_DELAY);

  const alreadyExists = mockUsers.some((u) => u.email === formData.email);
  if (alreadyExists) {
    throw new Error("An account with this email already exists.");
  }

  mockUsers.push(formData);

  const { password: _pw, ...safeUser } = formData;
  return safeUser;
}