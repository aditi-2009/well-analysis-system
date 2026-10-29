// src/config/constants.js
// Everything you may want to edit (names, contacts, defaults) lives here.

export const APP_NAME = "Agricultural Well Detection & Analysis System";
export const APP_SHORT = "Well Detection System";
export const ORG_NAME = "ICAR-National Bureau of Soil Survey and Land Use Planning";
export const ORG_SHORT = "ICAR-NBSS&LUP";
export const ORG_TAGLINE = "Ministry of Agriculture & Farmers Welfare, Government of India";

export const CONTACT = {
  address: "Amaravati Road, P.B. No. 426, Nagpur - 440 033, Maharashtra, India",
  phone: "+91 712 2500386",
  email: "nbss_lug@icar.gov.in",
  website: "https://nbsslup.icar.gov.in",
};

// Shown on the About page. Edit freely.
export const TEAM = [
  { name: "Apeksha Veer", role: "Model training & frontend", org: "G H Raisoni College of Engineering and Management, Nagpur" },
  { name: "Aditi Nimbalkar", role: "Backend & API integration", org: "G H Raisoni College of Engineering and Management, Nagpur" },
];
export const GUIDES = [
  { name: "Dr. U. Surendran", role: "Company guide - Principal Scientist", org: ORG_SHORT },
  { name: "Mrs. Hemlata Kosare", role: "College guide - Assistant Professor", org: "G H Raisoni College of Engineering and Management, Nagpur" },
];

// Default map view (Deoli-Wardha study area, Maharashtra)
export const MAP_DEFAULT_CENTER = [20.565, 78.41];
export const MAP_DEFAULT_ZOOM = 12;

// Confidence bands (0-1). Users can change them in Settings.
export const DEFAULT_THRESHOLDS = { high: 0.75, medium: 0.5 };

export const STORAGE = {
  token: "agriWellToken",
  user: "agriWellUser",
  prefs: "agriWellPrefs",
};

// Backend limits (see schemas/detection.py)
export const DETECTION_LIMITS = {
  confidenceMin: 0.01,
  confidenceMax: 0.99,
  tileSizes: [256, 384, 512, 640, 768, 1024],
};

// Accepted upload types (backend ALLOWED_UPLOAD_EXTENSIONS)
export const UPLOAD_ACCEPT = ".tif,.tiff,.geotiff,.jp2,.img,.jpg,.jpeg,.png,.ecw,.vrt";
