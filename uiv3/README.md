# Agricultural Well Detection and Analysis System: frontend (v3)

React 19, Vite, Tailwind CSS and Leaflet. It works with the v3 FastAPI backend (`/api/v1`).

## Run it (PowerShell)

Start the backend first, in its own terminal, from its Backend folder:

```powershell
cd "D:\ICAR dataset\well-analysis-system\Backend"
.\.venv\Scripts\Activate.ps1
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Check http://localhost:8000/api/v1/health: it must show `"version": "3"`.

Then the frontend, in a second terminal:

```powershell
cd "<the folder where you unzipped this project>"
Copy-Item .env.example .env        # keep VITE_API_BASE_URL=http://localhost:8000/api/v1
npm install
npm run dev                        # opens http://localhost:3000
```

Port 3000 matches the backend's default allowed origin. For a production build: `npm run build`, then `npm run preview`.

## Accounts and rights

| Right | User | Administrator |
|---|---|---|
| Detect inside a searched village, place or drawn area (no upload) | yes | yes |
| Detect on an image on the server, or an upload | yes | yes |
| Confidence, tile size, colour stretch (Advanced settings) | no | yes |
| Stop own runs / stop any run | own | any |
| Delete own results / any results | own | any |
| Export CSV, GeoJSON, KML | yes | yes |
| Mark wells the detection missed | no | yes |
| Confidence levels, detection defaults, learning | read only | change |

Rights are enforced by the server. The screens only hide what an account cannot use.

## Using well detection

1. **Choose the area.** Type a village name (Search village), or search a place, or use the village list, your GPS location, or draw a boundary. The outline appears on the map. A village with no stored boundary uses its outline from the map (approximate).
2. **Detect.** The imagery choice defaults to **Detect inside this area (no upload)**, which scans the master image only inside the outline. Press **Detect wells in this area**.
3. **Results.** Each well shows its exact latitude and longitude, its confidence, and the village and district it lies in. Open a well for its profile. Stop a running detection with **Stop detection**; nothing is saved for a stopped run. Delete a run or single wells. Export CSV, GeoJSON or KML.

A searched area must lie inside the master image. If it does not, upload an image that covers it, or choose another area. Areas are limited to 1500 km2 by default (`DETECTION_MAX_AREA_KM2` in the backend `.env`).

Zoomed out, wells are points. Zoomed in to level 17 or closer, each well is a box around it. The level is `BOX_ZOOM` in `src/components/map/AreaMap.jsx`. The zoom buttons are at the bottom right of the map.

## Views: personal and universal

Well Detection, Results, Reports, the map and the dashboard default to Personal (your own detections). Universal shows detections from every account. In Results, Reports and the map, Universal lists only wells with medium and high confidence.

## Administrator features

- **Mark missed well** (map toolbar): click the exact spot. The village, taluka and district are found from the boundaries and can be corrected. Marked wells appear as verified (blue).
- **Advanced settings** on the detection page.
- **Running detections (all accounts)** on the detection page, with Stop.
- **Settings**: confidence levels, detection defaults, and learning from detections (wells above 70% confidence by default are kept as examples).

## Settings

Everyone can change the display: text size, contrast, grayscale, sidebar, default map layer, coordinate format and area unit. These are saved in the browser. System values are shown read-only to users.

## Project map

```
src/config/constants.js          names, contacts, team, defaults, REQUIRED_BACKEND_VERSION
src/services/                    every backend call (api.js is the single axios instance);
                                 geocodeService.js: place search and map outlines (OpenStreetMap)
src/context/                     Auth, Toast, Prefs (display), System (administrator settings)
src/utils/                       geo.js, confidence.js, exporters.js (CSV, GeoJSON, KML), permissions.js, runs.js
src/components/map/              AreaMap.jsx (map, boxes, draw tools, marking), WellTable.jsx, MarkWellModal.jsx
src/components/detection/        area pickers (search, list, place, location), imagery panel, running detections
src/components/wells/            WellProfile.jsx (village, district, coordinates, actions)
src/pages/app/ and pages/public/ all screens
```
