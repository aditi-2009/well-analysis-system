// src/utils/runs.js
// The name of the area a detection run covered: the searched village or place, or the district chain.
export const runArea = (j) =>
  j.area_label || [j.village, j.taluka, j.district].filter(Boolean).join(", ") || "No area label";
