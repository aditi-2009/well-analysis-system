/* ============================================
   WELLPOINT — Data layer
   --------------------------------------------
   Everything talks to the app through the
   `WellStore` and `AuthStore` objects below.
   Right now they read/write localStorage.
   Later, swap the *implementation* of each
   method to call `fetch('/api/...')` instead —
   nothing outside this file needs to change.
   ============================================ */

const STORAGE_KEYS = {
  wells: "wellpoint_wells_v1",
  users: "wellpoint_users_v1",
  session: "wellpoint_session_v1",
};

/* ---------- Seed data (first run only) ---------- */
const SEED_WELLS = [
  { id: "w001", name: "Karoo Basin Borehole 4",      lat: -29.1, lng: 23.8,  diameter: 0.45 },
  { id: "w002", name: "Ogallala Aquifer Site 12",      lat: 38.0, lng: -100.9, diameter: 0.6 },
  { id: "w003", name: "Thar Desert Well",              lat: 27.0, lng: 71.2,  diameter: 0.3 },
  { id: "w004", name: "Murray-Darling Bore 7",         lat: -34.0, lng: 142.5, diameter: 0.5 },
  { id: "w005", name: "Sahel Community Well",          lat: 14.5, lng: 1.5,   diameter: 0.25 },
  { id: "w006", name: "Po Valley Test Well",           lat: 45.1, lng: 10.0,  diameter: 0.4 },
  { id: "w007", name: "Yangtze Delta Well 3",          lat: 31.2, lng: 121.5, diameter: 0.55 },
  { id: "w008", name: "Atacama Monitoring Well",       lat: -23.6, lng: -69.3, diameter: 0.2 },
  { id: "w009", name: "Marathwada Borewell 9",         lat: 19.1, lng: 76.6,  diameter: 0.35 },
  { id: "w010", name: "Vidarbha Community Well",       lat: 20.9, lng: 78.9,  diameter: 0.4 },
  { id: "w011", name: "Konkan Coastal Well",           lat: 17.0, lng: 73.3,  diameter: 0.28 },
];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`Failed to read ${key}:`, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Failed to write ${key}:`, e);
    return false;
  }
}

/* ---------- WellStore ---------- */
/* Swap method bodies for fetch() calls when a backend exists.
   Keep the method names and return shapes identical. */
const WellStore = {
  async list() {
    let wells = readJSON(STORAGE_KEYS.wells, null);
    if (!wells) {
      wells = SEED_WELLS;
      writeJSON(STORAGE_KEYS.wells, wells);
    }
    return wells;
    // API version:
    // const res = await fetch('/api/wells'); return res.json();
  },

  async get(id) {
    const wells = await this.list();
    return wells.find((w) => w.id === id) || null;
    // API version:
    // const res = await fetch(`/api/wells/${id}`); return res.json();
  },

  async create(well) {
    const wells = await this.list();
    const newWell = { ...well, id: "w" + Date.now() };
    wells.push(newWell);
    writeJSON(STORAGE_KEYS.wells, wells);
    return newWell;
    // API version:
    // const res = await fetch('/api/wells', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(well) });
    // return res.json();
  },
};

/* ---------- AuthStore ---------- */
const AuthStore = {
  async signup({ name, email, password }) {
    const users = readJSON(STORAGE_KEYS.users, []);
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with that email already exists.");
    }
    // NOTE: localStorage is plaintext — fine for a demo, never do this with a real backend.
    // A real API would hash the password server-side and never return it.
    const user = { id: "u" + Date.now(), name, email, password };
    users.push(user);
    writeJSON(STORAGE_KEYS.users, users);
    this._setSession(user);
    return { id: user.id, name: user.name, email: user.email };
    // API version:
    // const res = await fetch('/api/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,email,password}) });
    // if (!res.ok) throw new Error((await res.json()).message);
    // const { user, token } = await res.json(); this._setSession(user, token); return user;
  },

  async login({ email, password }) {
    const users = readJSON(STORAGE_KEYS.users, []);
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) throw new Error("Incorrect email or password.");
    this._setSession(user);
    return { id: user.id, name: user.name, email: user.email };
    // API version:
    // const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password}) });
    // if (!res.ok) throw new Error((await res.json()).message);
    // const { user, token } = await res.json(); this._setSession(user, token); return user;
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.session);
    // API version: also call fetch('/api/auth/logout', { method: 'POST' }) if server tracks sessions.
  },

  currentUser() {
    return readJSON(STORAGE_KEYS.session, null);
  },

  requireAuth() {
    const user = this.currentUser();
    if (!user) window.location.href = "index.html";
    return user;
  },

  _setSession(user, token) {
    writeJSON(STORAGE_KEYS.session, { id: user.id, name: user.name, email: user.email, token: token || null });
  },
};
