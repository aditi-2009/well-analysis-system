// src/utils/validators.js

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidMobile(mobile) {
  return /^[6-9]\d{9}$/.test(mobile); // basic 10-digit Indian mobile format
}

export function isStrongPassword(password) {
  // At least 6 characters — kept simple for a research/internal tool
  return password.length >= 6;
}