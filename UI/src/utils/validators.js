// src/utils/validators.js

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidMobile(mobile) {
  return /^[6-9]\d{9}$/.test(mobile); // 10-digit Indian mobile number
}

export function isStrongPassword(password) {
  // Same rule as the backend: at least 8 characters
  return password.length >= 8;
}