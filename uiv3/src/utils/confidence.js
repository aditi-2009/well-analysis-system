// src/utils/confidence.js
import { DEFAULT_THRESHOLDS } from "../config/constants";

export const LEVEL_META = {
  high:   { label: "High",   color: "#10b981", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", hint: "Accept with light review" },
  medium: { label: "Medium", color: "#f59e0b", badge: "bg-amber-50 text-amber-700 border-amber-200",       hint: "Review on imagery" },
  low:    { label: "Low",    color: "#ef4444", badge: "bg-red-50 text-red-700 border-red-200",             hint: "Send for field check" },
};

/** confidence is 0-1 (as the backend returns it). */
export function levelOf(confidence, thresholds = DEFAULT_THRESHOLDS) {
  if (confidence >= thresholds.high) return "high";
  if (confidence >= thresholds.medium) return "medium";
  return "low";
}

export const pct = (c, digits = 1) => `${(c * 100).toFixed(digits)}%`;

export function countByLevel(wells, thresholds) {
  const out = { high: 0, medium: 0, low: 0 };
  wells.forEach((w) => { out[levelOf(w.confidence, thresholds)] += 1; });
  return out;
}
