// The main map: base layers, boundary, wells, draw tools, "my location", cursor coordinates.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle, CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, Rectangle, TileLayer, Tooltip, useMap, useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Check, Circle as CircleIcon, Crosshair, ExternalLink, Hexagon, Layers, Square, Trash2, Undo2, X } from "lucide-react";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "../../config/constants";
import { LEVEL_META, pct } from "../../utils/confidence";
import { usePrefs } from "../../context/PrefsContext";
import {
  bboxOfGeometry, bboxToLeaflet, circleToGeometry, distanceMeters, formatCoord, googleMapsUrl, polygonToGeometry, rectangleToGeometry,
} from "../../utils/geo";
import { CopyButton } from "../common/ui";

const ESRI_IMG = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const LAYERS = [
  { id: "satellite", label: "Satellite" },
  { id: "hybrid", label: "Hybrid" },
  { id: "roadmap", label: "Roadmap" },
];

const userIcon = L.divIcon({ className: "", html: '<div class="user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

/** GeoJSON Polygon / MultiPolygon -> Leaflet positions ([lat, lon] nested arrays) */
function toPositions(geometry) {
  const flip = (ring) => ring.map(([x, y]) => [y, x]);
  if (geometry.type === "Polygon") return geometry.coordinates.map(flip);
  return geometry.coordinates.map((poly) => poly.map(flip));
}

function BaseLayers({ layer }) {
  if (layer === "roadmap") {
    return <TileLayer key="osm" url={OSM} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' maxZoom={19} />;
  }
  return (
    <>
      <TileLayer key="esri" url={ESRI_IMG} attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics" maxNativeZoom={18} maxZoom={20} />
      {layer === "hybrid" && <TileLayer key="lbl" url={ESRI_LABELS} maxNativeZoom={18} maxZoom={20} opacity={0.95} />}
    </>
  );
}

/** Moves / zooms the map when `focus` or `boundary` change, and keeps tiles correct when the container resizes. */
function MapController({ focus, boundary }) {
  const map = useMap();

  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);

  useEffect(() => {
    if (!boundary) return;
    const b = bboxToLeaflet(bboxOfGeometry(boundary));
    if (b) map.fitBounds(b, { padding: [30, 30], maxZoom: 18, animate: true });
  }, [boundary, map]);

  useEffect(() => {
    if (!focus) return;
    if (focus.bounds) map.fitBounds(focus.bounds, { padding: [30, 30], maxZoom: 18 });
    else if (focus.lat != null) map.flyTo([focus.lat, focus.lon], focus.zoom ?? 17, { duration: 0.8 });
  }, [focus?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function CursorReadout({ format }) {
  const [pos, setPos] = useState(null);
  useMapEvents({
    mousemove: (e) => setPos(e.latlng),
    mouseout: () => setPos(null),
  });
  if (!pos) return null;
  return (
    <div className="pointer-events-none absolute bottom-2 right-2 z-[1000] rounded-lg bg-slate-900/80 px-2.5 py-1 font-mono text-[11px] text-white shadow">
      {formatCoord(pos.lat, pos.lng, format, 6)}
    </div>
  );
}

/** Click handling for the draw tools. Lives inside the map so it can use map events. */
function DrawHandler({ tool, points, setPoints, setHover, finish }) {
  const map = useMap();

  useEffect(() => {
    const el = map.getContainer();
    if (tool) { map.doubleClickZoom.disable(); el.style.cursor = "crosshair"; }
    else { map.doubleClickZoom.enable(); el.style.cursor = ""; }
    return () => { el.style.cursor = ""; map.doubleClickZoom.enable(); };
  }, [tool, map]);

  useMapEvents({
    click(e) {
      if (!tool) return;
      const p = [e.latlng.lat, e.latlng.lng];
      if (tool === "polygon") {
        // clicking next to the first vertex closes the shape
        if (points.length >= 3) {
          const a = map.latLngToContainerPoint(L.latLng(points[0]));
          const b = map.latLngToContainerPoint(e.latlng);
          if (a.distanceTo(b) < 14) { finish(polygonToGeometry(points)); return; }
        }
        setPoints([...points, p]);
      } else if (points.length === 0) {
        setPoints([p]);
      } else if (tool === "rectangle") {
        finish(rectangleToGeometry(points[0], p));
      } else if (tool === "circle") {
        const r = distanceMeters(points[0], p);
        if (r > 1) finish(circleToGeometry(points[0][0], points[0][1], r));
      }
    },
    mousemove(e) {
      if (tool && points.length) setHover([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

const toolBtn = "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition";

export default function AreaMap({
  boundary = null,
  wells = [],
  knownWells = [],
  footprint = null,          // [[south, west], [north, east]]
  userLocation = null,       // { lat, lon, accuracy }
  focus = null,              // { lat, lon, zoom, bounds, token }
  selectedId = null,
  onSelect,
  onBoundaryChange,          // (geometry | null, meta) => void
  onLocate,                  // () => void  (button shown when provided)
  layer,
  onLayerChange,
  allowDraw = true,
  showLegend = true,
  className = "h-[560px]",
}) {
  const { prefs, classify } = usePrefs();
  const [tool, setTool] = useState(null);       // null | polygon | rectangle | circle
  const [points, setPoints] = useState([]);     // [lat, lon] vertices
  const [hover, setHover] = useState(null);
  const [layerMenu, setLayerMenu] = useState(false);
  const activeLayer = layer || prefs.mapLayer;
  const wrapRef = useRef(null);

  const cancel = useCallback(() => { setTool(null); setPoints([]); setHover(null); }, []);
  const finish = useCallback((geometry) => {
    cancel();
    if (geometry) onBoundaryChange?.(geometry, { kind: "drawn" });
  }, [cancel, onBoundaryChange]);

  // Keyboard: Enter = finish polygon, Esc = cancel, Backspace = undo last point
  useEffect(() => {
    if (!tool) return;
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "Escape") cancel();
      else if (e.key === "Enter" && tool === "polygon" && points.length >= 3) finish(polygonToGeometry(points));
      else if (e.key === "Backspace") { e.preventDefault(); setPoints((p) => p.slice(0, -1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, points, cancel, finish]);

  const startTool = (t) => { setPoints([]); setHover(null); setTool(tool === t ? null : t); };

  const selected = useMemo(
    () => (selectedId ? wells.find((w) => w.id === selectedId) || knownWells.find((w) => w.id === selectedId) : null),
    [selectedId, wells, knownWells]
  );

  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0 };
    wells.forEach((w) => { c[classify(w.confidence)] += 1; });
    return c;
  }, [wells, classify]);

  // Live preview of the shape being drawn
  const preview = (() => {
    if (!tool || !points.length) return null;
    const last = hover || points[points.length - 1];
    const style = { color: "#f59e0b", weight: 2, dashArray: "6 4", fillColor: "#f59e0b", fillOpacity: 0.12 };
    if (tool === "polygon") {
      return (
        <>
          {points.length >= 3 && <Polygon positions={points} pathOptions={{ ...style, dashArray: null, weight: 0 }} />}
          <Polyline positions={hover ? [...points, hover] : points} pathOptions={style} />
          {points.map((p, i) => (
            <CircleMarker key={i} center={p} radius={i === 0 && points.length >= 3 ? 7 : 4}
              pathOptions={{ color: "#fff", weight: 2, fillColor: i === 0 ? "#10b981" : "#f59e0b", fillOpacity: 1 }} />
          ))}
        </>
      );
    }
    if (tool === "rectangle") return <Rectangle bounds={[points[0], last]} pathOptions={style} />;
    if (tool === "circle") return <Circle center={points[0]} radius={distanceMeters(points[0], last)} pathOptions={style} />;
    return null;
  })();

  const hint = {
    polygon: points.length < 3 ? "Click the map to add corners (3 or more)" : "Click the green start point, press Finish, or hit Enter to close the shape",
    rectangle: points.length ? "Click the opposite corner" : "Click the first corner",
    circle: points.length ? "Click to set the radius" : "Click the centre point",
  }[tool];

  return (
    <div ref={wrapRef} className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm ${className}`}>
      <MapContainer center={MAP_DEFAULT_CENTER} zoom={MAP_DEFAULT_ZOOM} maxZoom={20} preferCanvas scrollWheelZoom className="h-full w-full">
        <BaseLayers layer={activeLayer} />
        <MapController focus={focus} boundary={boundary} />
        <DrawHandler tool={tool} points={points} setPoints={setPoints} setHover={setHover} finish={finish} />
        <CursorReadout format={prefs.coordFormat} />

        {footprint && (
          <Rectangle bounds={footprint} pathOptions={{ color: "#38bdf8", weight: 2, dashArray: "8 6", fill: false }}>
            <Tooltip sticky>Uploaded image coverage</Tooltip>
          </Rectangle>
        )}

        {boundary && (
          <Polygon positions={toPositions(boundary)} pathOptions={{ color: "#fbbf24", weight: 3, fillColor: "#fbbf24", fillOpacity: 0.08 }} interactive={false} />
        )}

        {knownWells.map((k) => (
          <CircleMarker key={k.id} center={[k.latitude, k.longitude]} radius={selectedId === k.id ? 8 : 5}
            pathOptions={{ color: "#fff", weight: 1.5, fillColor: "#2563eb", fillOpacity: 0.95 }}
            eventHandlers={{ click: () => onSelect?.(k.id) }} />
        ))}

        {wells.map((w) => {
          const m = LEVEL_META[classify(w.confidence)];
          const sel = selectedId === w.id;
          return (
            <CircleMarker key={w.id} center={[w.latitude, w.longitude]} radius={sel ? 11 : 7}
              pathOptions={{ color: sel ? "#0f172a" : "#fff", weight: sel ? 3 : 2, fillColor: m.color, fillOpacity: 0.92 }}
              eventHandlers={{ click: () => onSelect?.(w.id) }} />
          );
        })}

        {userLocation && (
          <>
            <Circle center={[userLocation.lat, userLocation.lon]} radius={userLocation.accuracy || 20}
              pathOptions={{ color: "#2563eb", weight: 1, fillColor: "#2563eb", fillOpacity: 0.1 }} interactive={false} />
            <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon} interactive={false} />
          </>
        )}

        {preview}

        {selected && (
          <Popup key={selected.id} position={[selected.latitude, selected.longitude]} offset={[0, -6]} eventHandlers={{ remove: () => onSelect?.(null) }}>
            <WellPopup well={selected} format={prefs.coordFormat} level={selected.confidence != null && !selected.id.startsWith("known-") ? classify(selected.confidence) : null} />
          </Popup>
        )}
      </MapContainer>

      {/* Top-left tools */}
      <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
          {allowDraw && (
            <>
              <button className={`${toolBtn} ${tool === "polygon" ? "bg-amber-500 text-white" : "text-slate-700 hover:bg-slate-100"}`} onClick={() => startTool("polygon")} title="Draw a polygon boundary"><Hexagon className="h-4 w-4" /> Polygon</button>
              <button className={`${toolBtn} ${tool === "rectangle" ? "bg-amber-500 text-white" : "text-slate-700 hover:bg-slate-100"}`} onClick={() => startTool("rectangle")} title="Draw a rectangle"><Square className="h-4 w-4" /> Rectangle</button>
              <button className={`${toolBtn} ${tool === "circle" ? "bg-amber-500 text-white" : "text-slate-700 hover:bg-slate-100"}`} onClick={() => startTool("circle")} title="Draw a circle (centre + radius)"><CircleIcon className="h-4 w-4" /> Circle</button>
              {boundary && !tool && (
                <button className={`${toolBtn} text-red-600 hover:bg-red-50`} onClick={() => onBoundaryChange?.(null, { kind: "cleared" })} title="Remove boundary"><Trash2 className="h-4 w-4" /> Clear</button>
              )}
            </>
          )}
          {onLocate && (
            <button className={`${toolBtn} text-sky-700 hover:bg-sky-50`} onClick={onLocate} title="Use my exact location"><Crosshair className="h-4 w-4" /> My location</button>
          )}
        </div>

        {tool && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-lg">
            <span>{hint}</span>
            {tool === "polygon" && points.length > 0 && (
              <button onClick={() => setPoints((p) => p.slice(0, -1))} className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 hover:bg-white/30"><Undo2 className="h-3.5 w-3.5" /> Undo</button>
            )}
            {tool === "polygon" && points.length >= 3 && (
              <button onClick={() => finish(polygonToGeometry(points))} className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-amber-700 hover:bg-amber-50"><Check className="h-3.5 w-3.5" /> Finish</button>
            )}
            <button onClick={cancel} className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 hover:bg-white/30"><X className="h-3.5 w-3.5" /> Cancel</button>
          </div>
        )}
      </div>

      {/* Top-right layer switch */}
      <div className="absolute right-3 top-3 z-10">
        <div className="rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
          <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:hidden" onClick={() => setLayerMenu((o) => !o)}><Layers className="h-4 w-4" /></button>
          <div className={`${layerMenu ? "flex" : "hidden"} gap-1 sm:flex`}>
            {LAYERS.map((l) => (
              <button key={l.id} onClick={() => { onLayerChange?.(l.id); setLayerMenu(false); }}
                className={`${toolBtn} ${activeLayer === l.id ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}>{l.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-lg backdrop-blur">
          {["high", "medium", "low"].map((k) => (
            <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_META[k].color }} />{LEVEL_META[k].label} ({counts[k]})</span>
          ))}
          {knownWells.length > 0 && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Verified ({knownWells.length})</span>}
        </div>
      )}
    </div>
  );
}

function WellPopup({ well, format, level }) {
  const known = well.id.startsWith("known-");
  const coord = formatCoord(well.latitude, well.longitude, "decimal", 6);
  return (
    <div className="min-w-[210px]">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-900">{known ? (well.identifier || `Verified well ${well.id.replace("known-", "")}`) : `Well #${well.id}`}</h4>
        {level && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${LEVEL_META[level].badge}`}>{LEVEL_META[level].label}</span>}
        {known && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Verified</span>}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
        <dt className="text-slate-500">Latitude</dt><dd className="font-mono font-semibold">{well.latitude.toFixed(7)}</dd>
        <dt className="text-slate-500">Longitude</dt><dd className="font-mono font-semibold">{well.longitude.toFixed(7)}</dd>
        {!known && (<><dt className="text-slate-500">Confidence</dt><dd className="font-semibold">{pct(well.confidence, 2)}</dd></>)}
        {well.village && (<><dt className="text-slate-500">Village</dt><dd>{well.village}</dd></>)}
        {well.taluka && (<><dt className="text-slate-500">Taluka</dt><dd>{well.taluka}</dd></>)}
        {known && well.wellType && (<><dt className="text-slate-500">Type</dt><dd>{well.wellType}</dd></>)}
      </dl>
      {format === "dms" && <p className="mt-1 font-mono text-[11px] text-slate-500">{formatCoord(well.latitude, well.longitude, "dms")}</p>}
      <div className="mt-2 flex items-center gap-2">
        <CopyButton text={coord} label="Copy lat, lon" />
        <a href={googleMapsUrl(well.latitude, well.longitude)} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700">
          <ExternalLink className="h-3.5 w-3.5" /> Google Maps
        </a>
      </div>
    </div>
  );
}
