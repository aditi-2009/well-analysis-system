# Agricultural Well Detection & Analysis System

Frontend for ICAR — National Bureau of Soil Survey & Land Use Planning
(NBSS&LUP), Nagpur. Built with React 19 + Vite, styled as a professional
Indian government / research-institute portal.

This project has two halves:

1. **Public marketing site** — Home, About, Contact, Login, Register.
   Open to anyone, no account needed.
2. **Internal application** (`/app/*`) — Dashboard, Well Detection, Map,
   Results, Reports, Profile, Settings. Requires login.

## 1. Folder structure

```
src/
├── main.jsx                    # React entry point
├── App.jsx                     # BrowserRouter + AuthProvider + AppRoutes
├── index.css                   # Single stylesheet — all styling lives here
├── routes/
│   └── AppRoutes.jsx            # All route definitions (public + protected)
├── context/
│   └── AuthContext.jsx          # Login state, persisted to localStorage
├── components/
│   ├── public/                  # Public-site chrome
│   │   ├── PublicLayout.jsx      # Skip-link + UtilityBar + Header + Footer wrapper
│   │   ├── UtilityBar.jsx        # Text-size controls, accessibility link
│   │   ├── PublicHeader.jsx      # Logo left, org name + nav tabs right
│   │   └── PublicFooter.jsx
│   ├── common/                  # Internal-app chrome
│   │   ├── Navbar.jsx            # Top bar with profile dropdown
│   │   ├── Sidebar.jsx           # Left nav (Dashboard, Detection, Map, ...)
│   │   ├── Loader.jsx
│   │   └── ErrorMessage.jsx
│   ├── charts/DashboardCharts.jsx
│   ├── map/WellMap.jsx, WellMarker.jsx
│   └── wells/WellTable.jsx, WellDetails.jsx
├── layouts/
│   └── MainLayout.jsx            # Navbar + Sidebar + <Outlet /> for /app/*
├── pages/
│   ├── public/
│   │   ├── Home.jsx
│   │   ├── About.jsx
│   │   └── Contact.jsx
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── ForgotPassword.jsx
│   ├── Dashboard.jsx
│   ├── WellDetection.jsx
│   ├── MapView.jsx
│   ├── Results.jsx
│   ├── Reports.jsx
│   ├── Profile.jsx
│   ├── Settings.jsx
│   └── NotFound.jsx
├── services/                    # Every backend call goes through these
│   ├── api.js                    # Central Axios instance (auth header, error normalization)
│   ├── authService.js
│   ├── wellService.js
│   ├── detectionService.js
│   ├── exportService.js
│   ├── reportService.js
│   └── contactService.js
├── data/mockWells.js             # Sample data — delete once a backend exists
└── utils/
    ├── constants.js               # APP_NAME, ORG_NAME, confidence thresholds, map defaults
    ├── validators.js
    └── leafletIconFix.js
```

## 2. Routes

| Route | Access | Notes |
|---|---|---|
| `/` | Public | Home — hero, brief org intro, notice panel |
| `/about` | Public | About ICAR, NBSS&LUP, and the Nagpur unit |
| `/contact` | Public | Org info placeholders + contact form |
| `/login` | Public | |
| `/register` | Public | |
| `/forgot-password` | Public | Placeholder screen — not backend-connected |
| `/app/dashboard` | Protected | Stat cards + charts |
| `/app/detection` | Protected | Select an area, run detection, view results on a map |
| `/app/map` | Protected | Full GIS map of all wells |
| `/app/results` | Protected | Sortable/filterable table, CSV export, report generation |
| `/app/reports` | Protected | Summary + PDF/CSV export actions |
| `/app/profile` | Protected | Account info, logout |
| `/app/settings` | Protected | Map/detection/appearance/notification preferences (stored locally) |
| `*` | — | 404, rendered with the public header/footer |

"Protected" means `ProtectedRoute` (in `AppRoutes.jsx`) redirects to `/login`
if `AuthContext` has no logged-in user.

## 3. Setup

```bash
npm install
npm run dev        # http://localhost:5173
```

**Demo login** (works out of the box, no backend needed):
`demo@nbsslup.gov.in` / `Demo@123`

To build for production:

```bash
npm run build
npm run preview
```

## 4. Connecting to a real backend

Right now every service in `src/services/` (except `exportService.js`'s
CSV export, which is genuine client-side logic) runs against **mock
data** with an artificial delay, so the app is fully usable without a
backend. Each mock function has a comment showing exactly what its
real implementation should look like, e.g.:

```js
// src/services/wellService.js
export async function getAllWells() {
  await delay(MOCK_DELAY);
  return mockWells;
}
// Later replace with:
//   const res = await api.get("/wells");
//   return res.data.data;
```

To connect a real backend:

1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
2. In each service file, replace the mock body with the real `api.get`
   / `api.post` call shown in its comment. `src/services/api.js` is
   the one shared Axios instance — it already attaches the auth token
   and normalizes errors, so nothing else needs to change.
3. Once nothing imports `src/data/mockWells.js` anymore, delete it.

## 5. Design notes

- Palette: navy/blue (`--primary`, `--primary-dark`) as the base, with
  saffron (`--saffron`) and green (`--tricolor-green`) used only as
  small accents — not a tricolor-themed design.
- Headings use Source Serif 4 (loaded via Google Fonts in
  `index.html`) for an institutional feel; body text stays system UI.
- Public header: logo on the left, org name and all nav tabs
  (including Login/Register) right-aligned in one row, styled
  identically as plain underlined tabs.
- Accessibility: skip-to-content link, visible focus rings, text-size
  controls in the utility bar, semantic landmarks.
- The public site intentionally does not explain detection
  methodology anywhere (Home/About only cover the organization) —
  that lives inside the authenticated app, in the working UI itself.

## 6. Known placeholders / remaining work

- Contact page address/phone/email/website are placeholders.
- `/forgot-password` is a placeholder screen — no backend wired.
- `Reports.jsx`'s "Download PDF" and `Profile.jsx`'s "Edit Profile" /
  "Change Password" are mocked action messages, not real yet.
- `Settings.jsx` preferences are stored only in component state (not
  persisted) — wire to a `/settings` endpoint per the comment in that
  file when ready.
- Actual ICAR / NBSS&LUP logo image files are not included. The
  public header currently shows a plain "ICAR" text badge in place of
  a logo — swap in real logo files and update `PublicHeader.jsx`
  accordingly.
