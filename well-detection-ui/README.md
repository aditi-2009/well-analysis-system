# Agricultural Well Detection & Analysis System - Frontend

React 19 + Vite + Tailwind CSS 4 + Leaflet. Built for the FastAPI backend in `Backend/` (API prefix `/api/v1`).

## Run it (PowerShell)

```powershell
cd "D:\ICAR dataset\well detection\UI-new"      # the folder holding this project
Copy-Item .env.example .env                      # then check VITE_API_BASE_URL
npm install
npm run dev                                      # opens http://localhost:3000
```

Start the backend first (in its own terminal):

```powershell
cd "D:\ICAR dataset\well detection\backend"
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

CORS: the dev server uses port **3000**, which is the backend default (`ALLOWED_ORIGINS=http://localhost:3000`).
If you change the port, add it to `ALLOWED_ORIGINS` in `Backend\.env` (comma separated) and restart uvicorn.

Production build: `npm run build` (output in `dist/`), preview with `npm run preview`.

## Pages

Public: Home (opens first), About Us, Contact Us, Help Center, Policies (privacy, terms, disclaimer, accessibility), Login, Register, Forgot password.
Signed in (`/app/...`): Dashboard, Well Detection, Interactive Map, Results, Reports & Exports, My Account, Settings, Help.
The sidebar can be hidden with the button in the top bar (or Ctrl+B); on phones it is a drawer.

## Using Well Detection

1. Choose the area: village list (district > taluka > village, loads the stored boundary), search a place, "My location" (GPS + radius, or typed lat/lon), or draw a polygon / rectangle / circle on the map.
2. Choose imagery: an image already on the server, or upload one (streamed, any size, with progress).
3. Press Detect wells. Progress is live. Wells appear on the map inside your boundary, with latitude, longitude and confidence in the table. Click a marker for the popup; copy coordinates; open in Google Maps; export CSV / GeoJSON.

## Folder map

```
src/config/constants.js     names, contacts, team, defaults (edit here)
src/services/               ALL backend calls (api.js is the single axios instance)
src/context/                Auth, Toast, Prefs (accessibility, sidebar, thresholds)
src/utils/                  geo.js (boundary maths), confidence.js, exporters.js
src/components/map/         AreaMap.jsx (map + draw tools), WellTable.jsx
src/components/detection/   area pickers, image upload / run panel
src/pages/public|auth|app/  all screens
```

## Backend notes

* Detection scans the **whole image**; the frontend clips the wells to your boundary. Upload an image clipped to your area for faster runs.
* `/statistics/*` still read the old `wells` table, not `detected_wells`, so the dashboard is computed from `/wells` and `/wells/jobs` instead.
* No endpoints exist for password reset, profile edit or contact messages; those screens say so (contact uses a mailto link).
* Villages show a boundary only when `village.geom_geojson` is filled (the seed script leaves it empty).
* "My location" needs `http://localhost` or HTTPS, plus browser permission.
