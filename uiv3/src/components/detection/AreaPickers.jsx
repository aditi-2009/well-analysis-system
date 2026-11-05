// The ways to choose an area: search a village name, search a place, the district / taluka / village lists,
// and my location (GPS or typed coordinates).
import { useEffect, useState } from "react";
import { Crosshair, MapPin, Search } from "lucide-react";
import { getDistricts, getStates, getTalukas, getVillage, getVillages, searchVillages } from "../../services/locationService";
import { findOutline, searchPlaces } from "../../services/geocodeService";
import { Alert, Spinner, btn, inputCls, labelCls } from "../common/ui";
import { parseBoundary } from "../../utils/geo";

const nameOf = (list, id) => list.find((x) => String(x.id) === String(id))?.name || "";

/** Type a village name. Picking it draws its stored boundary, or its outline from the map when none is stored. */
export function VillageSearch({ onPick, disabled }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(null);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setResults([]);
      setError("");
      return undefined;
    }
    let alive = true;
    const timer = setTimeout(() => {
      setBusy(true);
      searchVillages(text)
        .then((items) => { if (alive) { setResults(items); setError(""); } })
        .catch((e) => { if (alive) setError(e.message); })
        .finally(() => { if (alive) setBusy(false); });
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [q]);

  const pick = async (v) => {
    setPicking(v.id);
    setError("");
    try {
      let geometry = null;
      if (v.hasBoundary) {
        geometry = parseBoundary((await getVillage(v.id)).geom_geojson);
      }
      let approximate = false;
      if (!geometry) {
        try {
          const outline = await findOutline(`${v.name}, ${v.taluka}, ${v.district}, Maharashtra, India`, [v.name, v.district]);
          if (outline) {
            geometry = outline.geometry;
            approximate = outline.approximate;
          }
        } catch {
          // The map outline is optional: without it the user can search a place or draw the area.
        }
      }
      onPick({
        ids: { districtId: v.districtId, talukaId: v.talukaId, villageId: v.id },
        label: `${v.name}, ${v.taluka}, ${v.district}`,
        geometry,
        approximate,
        note: geometry ? "" : `No outline was found for ${v.name}. Search a place, or draw the area on the map.`,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setPicking(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className={`${inputCls} pl-9`} placeholder="Type a village name, e.g. Deoli" value={q} disabled={disabled}
          onChange={(e) => setQ(e.target.value)} aria-label="Village name" />
      </div>
      {busy && <p className="flex items-center gap-2 text-xs text-slate-500"><Spinner className="h-4 w-4" /> Searching...</p>}
      {error && <Alert tone="error">{error}</Alert>}
      {q.trim().length >= 2 && !busy && results.length === 0 && !error && (
        <Alert tone="warning">No village with that name is stored. Try another spelling, or search a place.</Alert>
      )}
      {results.length > 0 && (
        <ul className="max-h-64 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 custom-scrollbar">
          {results.map((v) => (
            <li key={v.id}>
              <button type="button" disabled={disabled || picking !== null} onClick={() => pick(v)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-emerald-50 disabled:opacity-60">
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-900">{v.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">{v.taluka} taluka, {v.district} district</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {picking === v.id && <Spinner className="h-4 w-4" />}
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${v.hasBoundary ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}>
                    {v.hasBoundary ? "Stored boundary" : "Outline from map"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** District -> taluka -> village, read from the database. Picking a village loads its stored boundary. */
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

  const report = async (next) => {
    const ids = { districtId: next.districtId, talukaId: next.talukaId, villageId: next.villageId };
    const label = [nameOf(villages, next.villageId), nameOf(talukas, next.talukaId), nameOf(districts, next.districtId)]
      .filter(Boolean).join(", ");
    if (!next.villageId) {
      onPick({ ids, label, geometry: null, note: next.districtId ? "Choose a village to load its boundary, or draw one on the map." : "" });
      return;
    }
    setBusy(true);
    try {
      const v = await getVillage(next.villageId);
      const geometry = parseBoundary(v.geom_geojson);
      onPick({
        ids, label, geometry,
        note: geometry ? "" : "This village has no stored boundary. Search it by name (it will use an outline from the map), search a place, or draw the area.",
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

/** Place search (OpenStreetMap). Searches on submit, never per keystroke. */
export function PlaceSearch({ onPick, disabled }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    setError("");
    setResults(null);
    try {
      setResults(await searchPlaces(q.trim()));
    } catch {
      setError("Place search failed. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <input className={inputCls} placeholder="For example: Deoli, Wardha" value={q} onChange={(e) => setQ(e.target.value)} disabled={disabled} aria-label="Place name" />
        <button type="submit" className={btn.primary} disabled={busy || disabled}>{busy ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />} Search</button>
      </form>
      {error && <Alert tone="error">{error}</Alert>}
      {results && results.length === 0 && <Alert tone="warning">No places found. Try a nearby town, or draw the area on the map.</Alert>}
      {results?.length > 0 && (
        <ul className="max-h-56 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 custom-scrollbar">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button"
                onClick={() => onPick({ label: r.name.split(",").slice(0, 3).join(","), geometry: r.geometry, approximate: r.approximate, center: [r.lat, r.lon] })}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-emerald-50">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  <span className="font-medium text-slate-800">{r.name}</span>
                  <span className="block text-[11px] text-slate-500">{r.type}{r.approximate ? " - approximate outline (bounding box)" : " - outline from the map"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-slate-500">Place search uses OpenStreetMap. Its outlines are approximate; draw your own boundary for survey-grade work.</p>
    </div>
  );
}

/** My exact location (GPS) with a radius, or typed latitude and longitude. */
export function LocationPanel({ location, locating, onLocate, onCoords, radius, onRadius, geoError }) {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [err, setErr] = useState("");

  const go = (e) => {
    e.preventDefault();
    const la = Number(lat);
    const lo = Number(lon);
    if (lat === "" || lon === "" || !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
      setErr("Enter a valid latitude (-90 to 90) and longitude (-180 to 180) in decimal degrees.");
      return;
    }
    setErr("");
    onCoords(la, lo);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" className={btn.primary} onClick={onLocate} disabled={locating}>
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
          {location.accuracy > 0 && (
            <p className="mt-0.5">Accuracy about ±{Math.round(location.accuracy)} m{location.accuracy > 100 ? " (weak signal; try outdoors)" : ""}</p>
          )}
          {location.label && <p className="mt-0.5 text-sky-800">{location.label}</p>}
        </div>
      )}
      <form onSubmit={go} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div><label className={labelCls} htmlFor="lat">Latitude</label><input id="lat" className={inputCls} inputMode="decimal" placeholder="20.5650000" value={lat} onChange={(e) => setLat(e.target.value)} /></div>
        <div><label className={labelCls} htmlFor="lon">Longitude</label><input id="lon" className={inputCls} inputMode="decimal" placeholder="78.4100000" value={lon} onChange={(e) => setLon(e.target.value)} /></div>
        <button type="submit" className={btn.secondary}>Go to coordinates</button>
      </form>
      {err && <Alert tone="error">{err}</Alert>}
      <p className="text-[11px] text-slate-500">A circle of the chosen radius is drawn around the point. Detection runs inside it. Your browser asks permission to share your location.</p>
    </div>
  );
}
