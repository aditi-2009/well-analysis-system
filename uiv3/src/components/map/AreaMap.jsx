// The map. Zoomed out, each well is a point. Zoomed in to BOX_ZOOM or closer, each well is a box
// around it, so it is easy to see. Also: the area boundary, draw tools, verified wells, the
// administrator's "mark a missed well" mode, my location and cursor coordinates.
import { useEffect, useMemo, useState } from "react";
import {
  Circle, CircleMarker, MapContainer, Marker, Polygon, Polyline, Rectangle, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Check, Circle as CircleIcon, Crosshair, Hexagon, Layers, MapPin, Square, Trash2, Undo2, X } from "lucide-react";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "../../config/constants";
import { LEVEL_META } from "../../utils/confidence";
import { usePrefs } from "../../context/PrefsContext";
import { useSystem } from "../../context/SystemContext";
import {
  bboxOfGeometry, bboxToLeaflet, circleToGeometry, distanceMeters, formatCoord, polygonToGeometry, rectangleToGeometry,
} from "../../utils/geo";

export const BOX_ZOOM = 17;
export const showBoxes = (zoom) => zoom >= BOX_ZOOM;
const MAX_BOXES = 1500;
const VERIFIED_COLOR = "#2563eb";

const ESRI_IMG = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const LAYERS = [
  { id: "satellite", label: "Satellite" },
  { id: "hybrid", label: "Hybrid" },
  { id: "roadmap", label: "Roadmap" },
];

const userIcon = L.divIcon({ className: "", html: '<div class="user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

const iconCache = new Map();
/** A square box drawn on screen, so a well is easy to see when zoomed in. */
function boxIcon(color, selected, verified) {
  const key = `${color}|${selected ? 1 : 0}|${verified ? 1 : 0}`;
  if (!iconCache.has(key)) {
    const size = selected ? 30 : 22;
    iconCache.set(key, L.divIcon({
      className: "",
      html: `<div style="width:${size}px;height:${size}px;box-sizing:border-box;border:${selected ? 3 : 2}px solid ${color};background:${color}33;border-radius:4px;box-shadow:0 0 0 1px #fff,0 2px 6px rgba(0,0,0,.45);${verified ? "outline:1px dashed #1d4ed8;outline-offset:2px;" : ""}"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    }));
  }
  return iconCache.get(key);
}

/** GeoJSON Polygon / MultiPolygon -> Leaflet positions ([lat, lon]) */
function toPositions(geometry) {
  const flip = (ring) => ring.map(([x, y]) => [y, x]);
  if (geometry.type === "Polygon") return geometry.coordinates.map(flip);
  return geometry.coordinates.map((poly) => poly.map(flip));
}

function BaseLayers({ layer }) {
  if (layer === "roadmap") {
    return <TileLayer url={OSM} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' maxZoom={19} />;
  }
  return (
    <>
      <TileLayer url={ESRI_IMG} attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics" maxNativeZoom={18} maxZoom={20} />
      {layer === "hybrid" && <TileLayer url={ESRI_LABELS} maxNativeZoom={18} maxZoom={20} opacity={0.95} />}
    </>
  );
}

/** Moves the map to the boundary or a focus point, and keeps the tiles right when the panel resizes. */
function MapController({ focus, boundary }) {
  const map = useMap();

  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);

  useEffect(() => {
    const b = bboxToLeaflet(bboxOfGeometry(boundary));
    if (b) map.fitBounds(b, { padding: [30, 30], maxZoom: 18 });
  }, [boundary, map]);

  useEffect(() => {
    if (!focus) return;
    if (focus.bounds) map.fitBounds(focus.bounds, { padding: [30, 30], maxZoom: 18 });
    else if (focus.lat != null) map.flyTo([focus.lat, focus.lon], focus.zoom ?? 17, { duration: 0.8 });
  }, [focus?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/** Reports the zoom level and the visible area, so the wells can switch between points and boxes. */
function MapWatcher({ onZoom, onBounds }) {
  const map = useMapEvents({
    zoomend: () => { onZoom(map.getZoom()); onBounds(map.getBounds()); },
    moveend: () => onBounds(map.getBounds()),
  });
  useEffect(() => { onZoom(map.getZoom()); onBounds(map.getBounds()); }, [map, onZoom, onBounds]);
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
    <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-lg bg-slate-900/80 px-2.5 py-1 font-mono text-[11px] text-white shadow">
      {formatCoord(pos.lat, pos.lng, format, 6)}
    </div>
  );
}

/** Clicks for the draw tools, and for marking a missed well. */
function InteractionHandler({ tool, points, setPoints, setHover, finish, markMode, onMarkPoint }) {
  const map = useMap();

  useEffect(() => {
    const el = map.getContainer();
    const active = Boolean(tool) || markMode;
    if (active) map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
    el.style.cursor = active ? "crosshair" : "";
    return () => { el.style.cursor = ""; map.doubleClickZoom.enable(); };
  }, [tool, markMode, map]);

  useMapEvents({
    click(e) {
      const p = [e.latlng.lat, e.latlng.lng];
      if (!tool) {
        if (markMode) onMarkPoint?.(p[0], p[1]);
        return;
      }
      if (tool === "polygon") {
        // A click next to the first corner closes the shape
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
  footprint = null,
  userLocation = null,
  focus = null,
  selectedId = null,
  onSelect,
  onBoundaryChange,
  onLocate,
  layer,
  onLayerChange,
  allowDraw = true,
  markMode = false,
  onToggleMark,
  onMarkPoint,
  showLegend = true,
  className = "h-[560px]",
}) {
  const { prefs, update } = usePrefs();
  const { classify } = useSystem();
  const [zoom, setZoom] = useState(MAP_DEFAULT_ZOOM);
  const [bounds, setBounds] = useState(null);
  const [tool, setTool] = useState(null);
  const [points, setPoints] = useState([]);
  const [hover, setHover] = useState(null);
  const [layerMenu, setLayerMenu] = useState(false);
  const activeLayer = layer || prefs.mapLayer;
  const boxMode = showBoxes(zoom);

  const cancel = () => { setTool(null); setPoints([]); setHover(null); };
  const finish = (geometry) => {
    cancel();
    if (geometry) onBoundaryChange?.(geometry, { kind: "drawn" });
  };
  const startTool = (t) => { setPoints([]); setHover(null); setTool(tool === t ? null : t); };
  const changeLayer = (id) => (onLayerChange ? onLayerChange(id) : update({ mapLayer: id }));

  // Keyboard: Enter closes a polygon, Backspace removes the last corner, Esc cancels
  useEffect(() => {
    if (!tool && !markMode) return undefined;
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "Escape") {
        if (tool) cancel();
        else onToggleMark?.();
      } else if (e.key === "Enter" && tool === "polygon" && points.length >= 3) {
        finish(polygonToGeometry(points));
      } else if (e.key === "Backspace" && tool) {
        e.preventDefault();
        setPoints((p) => p.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, markMode, points]); // eslint-disable-line react-hooks/exhaustive-deps

  // When zoomed in, only the wells in view are drawn as boxes (keeps the map fast)
  const shownWells = useMemo(() => {
    if (!boxMode || !bounds) return wells;
    return wells.filter((w) => w.id === selectedId || bounds.contains([w.latitude, w.longitude])).slice(0, MAX_BOXES);
  }, [wells, boxMode, bounds, selectedId]);

  const shownKnown = useMemo(() => {
    if (!boxMode || !bounds) return knownWells;
    return knownWells.filter((k) => k.id === selectedId || bounds.contains([k.latitude, k.longitude])).slice(0, MAX_BOXES);
  }, [knownWells, boxMode, bounds, selectedId]);

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
    polygon: points.length < 3 ? "Click the map to add corners (3 or more)" : "Click the green start point, press Finish, or press Enter",
    rectangle: points.length ? "Click the opposite corner" : "Click the first corner",
    circle: points.length ? "Click to set the radius" : "Click the centre point",
  }[tool];

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm ${className}`}>
      <MapContainer center={MAP_DEFAULT_CENTER} zoom={MAP_DEFAULT_ZOOM} maxZoom={20} preferCanvas scrollWheelZoom zoomControl={false} className="h-full w-full">
        <BaseLayers layer={activeLayer} />
        <MapController focus={focus} boundary={boundary} />
        <MapWatcher onZoom={setZoom} onBounds={setBounds} />
        <InteractionHandler tool={tool} points={points} setPoints={setPoints} setHover={setHover} finish={finish}
          markMode={markMode} onMarkPoint={onMarkPoint} />
        <CursorReadout format={prefs.coordFormat} />
        <ZoomControl position="bottomright" />

        {footprint && (
          <Rectangle bounds={footprint} pathOptions={{ color: "#38bdf8", weight: 2, dashArray: "8 6", fill: false }}>
            <Tooltip sticky>Uploaded image coverage</Tooltip>
          </Rectangle>
        )}

        {boundary && (
          <Polygon positions={toPositions(boundary)} pathOptions={{ color: "#fbbf24", weight: 3, fillColor: "#fbbf24", fillOpacity: 0.08 }} interactive={false} />
        )}

        {shownKnown.map((k) => {
          const sel = selectedId === k.id;
          const handlers = { click: (e) => { L.DomEvent.stopPropagation(e); onSelect?.(k.id); } };
          return boxMode ? (
            <Marker key={`kb-${k.id}`} position={[k.latitude, k.longitude]} icon={boxIcon(VERIFIED_COLOR, sel, true)} eventHandlers={handlers} />
          ) : (
            <CircleMarker key={`kc-${k.id}`} center={[k.latitude, k.longitude]} radius={sel ? 8 : 5}
              pathOptions={{ color: "#fff", weight: 1.5, fillColor: VERIFIED_COLOR, fillOpacity: 0.95 }} eventHandlers={handlers} />
          );
        })}

        {shownWells.map((w) => {
          const color = LEVEL_META[classify(w.confidence)].color;
          const sel = selectedId === w.id;
          const handlers = { click: (e) => { L.DomEvent.stopPropagation(e); onSelect?.(w.id); } };
          return boxMode ? (
            <Marker key={`wb-${w.id}`} position={[w.latitude, w.longitude]} icon={boxIcon(color, sel, false)} eventHandlers={handlers} />
          ) : (
            <CircleMarker key={`wc-${w.id}`} center={[w.latitude, w.longitude]} radius={sel ? 11 : 7}
              pathOptions={{ color: sel ? "#0f172a" : "#fff", weight: sel ? 3 : 2, fillColor: color, fillOpacity: 0.92 }} eventHandlers={handlers} />
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
      </MapContainer>

      {/* Top-left tools */}
      <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
          {allowDraw && (
            <>
              <button type="button" className={`${toolBtn} ${tool === "polygon" ? "bg-amber-500 text-white" : "text-slate-700 hover:bg-slate-100"}`} onClick={() => startTool("polygon")} title="Draw a polygon boundary"><Hexagon className="h-4 w-4" /> Polygon</button>
              <button type="button" className={`${toolBtn} ${tool === "rectangle" ? "bg-amber-500 text-white" : "text-slate-700 hover:bg-slate-100"}`} onClick={() => startTool("rectangle")} title="Draw a rectangle"><Square className="h-4 w-4" /> Rectangle</button>
              <button type="button" className={`${toolBtn} ${tool === "circle" ? "bg-amber-500 text-white" : "text-slate-700 hover:bg-slate-100"}`} onClick={() => startTool("circle")} title="Draw a circle"><CircleIcon className="h-4 w-4" /> Circle</button>
              {boundary && !tool && (
                <button type="button" className={`${toolBtn} text-red-600 hover:bg-red-50`} onClick={() => onBoundaryChange?.(null, { kind: "cleared" })} title="Remove boundary"><Trash2 className="h-4 w-4" /> Clear</button>
              )}
            </>
          )}
          {onToggleMark && (
            <button type="button" aria-pressed={markMode} onClick={onToggleMark}
              className={`${toolBtn} ${markMode ? "bg-blue-600 text-white" : "text-blue-700 hover:bg-blue-50"}`} title="Mark a well the detection missed">
              <MapPin className="h-4 w-4" /> {markMode ? "Marking on" : "Mark missed well"}
            </button>
          )}
          {onLocate && (
            <button type="button" className={`${toolBtn} text-sky-700 hover:bg-sky-50`} onClick={onLocate} title="Use my exact location"><Crosshair className="h-4 w-4" /> My location</button>
          )}
        </div>

        {tool && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-lg">
            <span>{hint}</span>
            {tool === "polygon" && points.length > 0 && (
              <button type="button" onClick={() => setPoints((p) => p.slice(0, -1))} className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 hover:bg-white/30"><Undo2 className="h-3.5 w-3.5" /> Undo</button>
            )}
            {tool === "polygon" && points.length >= 3 && (
              <button type="button" onClick={() => finish(polygonToGeometry(points))} className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-amber-700 hover:bg-amber-50"><Check className="h-3.5 w-3.5" /> Finish</button>
            )}
            <button type="button" onClick={cancel} className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 hover:bg-white/30"><X className="h-3.5 w-3.5" /> Cancel</button>
          </div>
        )}

        {markMode && !tool && (
          <div className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-lg">
            Click the exact spot of a well the detection missed. Press Esc to stop.
          </div>
        )}
      </div>

      {/* Top-right layer switch */}
      <div className="absolute right-3 top-3 z-10">
        <div className="rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
          <button type="button" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:hidden" onClick={() => setLayerMenu((o) => !o)} aria-label="Map layers"><Layers className="h-4 w-4" /></button>
          <div className={`${layerMenu ? "flex" : "hidden"} gap-1 sm:flex`}>
            {LAYERS.map((l) => (
              <button key={l.id} type="button" onClick={() => { changeLayer(l.id); setLayerMenu(false); }}
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
          <span className="text-slate-500">{boxMode ? "Boxes shown" : `Zoom to ${BOX_ZOOM} or closer to see boxes`}</span>
        </div>
      )}
    </div>
  );
}
