// The four ways to choose an area: backend village list, place search, my location, coordinates.
import { useEffect, useState } from "react";
import { Crosshair, MapPin, Search } from "lucide-react";
import { getDistricts, getStates, getTalukas, getVillage, getVillages } from "../../services/locationService";
import { searchPlaces } from "../../services/geocodeService";
import { Alert, Spinner, btn, inputCls, labelCls } from "../common/ui";
import { parseBoundary } from "../../utils/geo";

const nameOf = (list, id) => list.find((x) => String(x.id) === String(id))?.name || "";

/** District -> Taluka -> Village, read from the backend. Picking a village loads its boundary. */
export function VillagePicker({ value, onPick, disabled }) {
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [villages, setVillages] = useState([]);
  const [sel, setSel] = useState({ districtId: "", talukaId: "", villageId: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getStates()
      .then((states) => {
        const st = states.find((s) => /maharashtra/i.test(s.name)) || states[0];
        if (!st) throw new Error("No state is stored in the database yet. Run the seed_locations script on the backend.");
        return getDistricts(st.id);
      })
      .then(setDistricts)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setTalukas([]);
    if (sel.districtId) getTalukas(sel.districtId).then(setTalukas).catch((e) => setError(e.message));
  }, [sel.districtId]);

  useEffect(() => {
    setVillages([]);
    if (sel.talukaId) getVillages(sel.talukaId).then(setVillages).catch((e) => setError(e.message));
  }, [sel.talukaId]);

  // Report the ids of the area (even without a boundary) so detection can label its wells.
  const report = async (next) => {
    const ids = { districtId: next.districtId, talukaId: next.talukaId, villageId: next.villageId };
    const label = [nameOf(villages, next.villageId), nameOf(talukas, next.talukaId), nameOf(districts, next.districtId)].filter(Boolean).join(", ");
    if (!next.villageId) { onPick({ ids, label, geometry: null, note: next.districtId ? "Choose a village to load its boundary, or draw one on the map." : "" }); return; }
    setBusy(true);
    try {
      const v = await getVillage(next.villageId);
      const geometry = parseBoundary(v.geom_geojson);
      onPick({
        ids, label, geometry,
        note: geometry ? "" : "This village has no boundary stored yet. Use Search place or Draw on map to set one.",
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const change = (patch) => {
    const next = { ...sel, ...patch };
    setSel(next);
    report(next);
  };

  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls} htmlFor="sel-district">District</label>
          <select id="sel-district" className={inputCls} disabled={disabled || !districts.length} value={sel.districtId}
            onChange={(e) => change({ districtId: e.target.value, talukaId: "", villageId: "" })}>
            <option value="">{districts.length ? "Select district" : "Loading..."}</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="sel-taluka">Taluka</label>
          <select id="sel-taluka" className={inputCls} disabled={disabled || !sel.districtId || !talukas.length} value={sel.talukaId}
            onChange={(e) => change({ talukaId: e.target.value, villageId: "" })}>
            <option value="">{sel.districtId && !talukas.length ? "None found" : "Select taluka"}</option>
            {talukas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="sel-village">Village</label>
          <select id="sel-village" className={inputCls} disabled={disabled || !sel.talukaId || !villages.length} value={sel.villageId}
            onChange={(e) => change({ villageId: e.target.value })}>
            <option value="">{sel.talukaId && !villages.length ? "None found" : "Select village"}</option>
            {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      </div>
      {busy && <p className="flex items-center gap-2 text-xs text-slate-500"><Spinner className="h-4 w-4" /> Loading village boundary...</p>}
      {value?.note && <Alert tone="warning">{value.note}</Alert>}
    </div>
  );
}

/** Free-text place search (OpenStreetMap). Searches on submit, never per keystroke. */
export function PlaceSearch({ onPick, disabled }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true); setError(""); setResults(null);
    try { setResults(await searchPlaces(q.trim())); }
    catch (err) { setError("Place search failed. Check your internet connection and try again."); console.error(err); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <input className={inputCls} placeholder="e.g. Deoli, Wardha" value={q} onChange={(e) => setQ(e.target.value)} disabled={disabled} aria-label="Place or village name" />
        <button className={btn.primary} disabled={busy || disabled}>{busy ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />} Search</button>
      </form>
      {error && <Alert tone="error">{error}</Alert>}
      {results && results.length === 0 && <Alert tone="warning">No places found. Try a nearby town, or draw the area on the map.</Alert>}
      {results?.length > 0 && (
        <ul className="max-h-56 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 custom-scrollbar">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onPick({ label: r.name.split(",").slice(0, 3).join(","), geometry: r.geometry, approximate: r.approximate, center: [r.lat, r.lon] })}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-emerald-50">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span><span className="font-medium text-slate-800">{r.name}</span>
                  <span className="block text-[11px] text-slate-500">{r.type}{r.approximate ? " - boundary is the bounding box (approximate)" : " - outline from OpenStreetMap"}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-slate-500">Search by OpenStreetMap Nominatim. Boundaries from OpenStreetMap are approximate; draw your own for survey-grade work.</p>
    </div>
  );
}

/** My exact location (GPS) with a radius, or typed latitude / longitude. */
export function LocationPanel({ location, locating, onLocate, onCoords, radius, onRadius, geoError }) {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [err, setErr] = useState("");

  const go = (e) => {
    e.preventDefault();
    const la = Number(lat), lo = Number(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180 || lat === "" || lon === "") {
      setErr("Enter a valid latitude (-90 to 90) and longitude (-180 to 180) in decimal degrees.");
      return;
    }
    setErr("");
    onCoords(la, lo);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <button className={btn.primary} onClick={onLocate} disabled={locating}>
          {locating ? <Spinner className="h-4 w-4" /> : <Crosshair className="h-4 w-4" />} Use my exact location
        </button>
        <div>
          <label className={labelCls} htmlFor="radius">Radius (metres)</label>
          <input id="radius" type="number" min="50" max="20000" step="50" className={`${inputCls} w-32`} value={radius}
            onChange={(e) => onRadius(Math.max(50, Math.min(20000, Number(e.target.value) || 50)))} />
        </div>
      </div>
      {geoError && <Alert tone="error">{geoError}</Alert>}
      {location && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <p className="font-semibold">Your location</p>
          <p className="mt-1 font-mono">Lat {location.lat.toFixed(7)}, Lon {location.lon.toFixed(7)}</p>
          <p className="mt-0.5">Accuracy about ±{Math.round(location.accuracy)} m{location.accuracy > 100 ? " - weak signal, try outdoors or use a phone with GPS" : ""}</p>
          {location.label && <p className="mt-0.5 text-sky-800">{location.label}</p>}
        </div>
      )}
      <form onSubmit={go} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div><label className={labelCls} htmlFor="lat">Latitude</label><input id="lat" className={inputCls} inputMode="decimal" placeholder="20.5650000" value={lat} onChange={(e) => setLat(e.target.value)} /></div>
        <div><label className={labelCls} htmlFor="lon">Longitude</label><input id="lon" className={inputCls} inputMode="decimal" placeholder="78.4100000" value={lon} onChange={(e) => setLon(e.target.value)} /></div>
        <button className={btn.secondary}>Go to coordinates</button>
      </form>
      {err && <Alert tone="error">{err}</Alert>}
      <p className="text-[11px] text-slate-500">A circular boundary of the chosen radius is drawn around the point. Your browser will ask permission to share your location.</p>
    </div>
  );
}
