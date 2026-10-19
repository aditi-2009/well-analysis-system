// src/components/map/WellMap.jsx
// Draws wells on a Leaflet map. Pure Leaflet: tile layers, canvas markers, a layer switcher.
// "View details" in a popup opens the well's record.
//
// Clarity rules:
//  - The map never zooms past MAX_ZOOM, and each layer says the highest zoom it really has
//    (nativeZoom). Past that, tiles would be stretched and look blurry.
//  - An empty map shows a small note. Nothing is drawn over the map itself.
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import WellMarker from "./WellMarker";
import WellDetails from "../wells/WellDetails";
import { wellLevel, CONFIDENCE_COLORS, VERIFIED_COLOR } from "../../utils/confidence";
import { loadSettings } from "../../utils/settingsStore";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "../../utils/constants";

const { BaseLayer } = LayersControl;

const MAX_ZOOM = 18;

// To use a licensed or self-hosted tile server later, change only the url here.
const BASE_LAYERS = [
  {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    nativeZoom: 18,
  },
  {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    nativeZoom: 18,
  },
  {
    name: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data &copy; OpenStreetMap contributors, SRTM | Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    nativeZoom: 17,
  },
];

const LEGEND_ROWS = [
  { key: "verified", label: "Officer verified", color: VERIFIED_COLOR },
  { key: "high", label: "High confidence", color: CONFIDENCE_COLORS.high },
  { key: "medium", label: "Medium confidence", color: CONFIDENCE_COLORS.medium },
  { key: "low", label: "Low confidence", color: CONFIDENCE_COLORS.low },
];

// Zooms the map to fit the wells whenever the list changes.
// It must be a child of MapContainer, because useMap() only works inside it.
function FitToWells({ wells }) {
  const map = useMap();

  useEffect(() => {
    const points = wells
      .filter((w) => w.latitude != null && w.longitude != null)
      .map((w) => [w.latitude, w.longitude]);
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 17 });
  }, [wells, map]);

  return null;
}

function WellMap({
  wells = [],
  center = MAP_DEFAULT_CENTER,
  zoom = MAP_DEFAULT_ZOOM,
  height = "clamp(360px, 65vh, 720px)",
}) {
  const [selectedWell, setSelectedWell] = useState(null);

  // The layer saved in Settings, or OpenStreetMap if nothing valid is saved.
  const [startLayer] = useState(() => {
    const saved = loadSettings().mapLayer;
    return BASE_LAYERS.some((layer) => layer.name === saved) ? saved : "OpenStreetMap";
  });

  const counts = useMemo(() => {
    const result = { verified: 0, high: 0, medium: 0, low: 0 };
    wells.forEach((well) => {
      result[wellLevel(well).key] += 1;
    });
    return result;
  }, [wells]);

  // zIndex 1 gives the whole map its own stacking layer, so Leaflet's controls
  // and the legend can never draw on top of a dialog.
  return (
    <div className="ds-map" style={{ "--ds-map-h": height, zIndex: 1 }}>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={4}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom
        preferCanvas
        className="ds-map-canvas"
      >
        <FitToWells wells={wells} />

        <LayersControl position="topright">
          {BASE_LAYERS.map((layer) => (
            <BaseLayer key={layer.name} checked={layer.name === startLayer} name={layer.name}>
              <TileLayer
                url={layer.url}
                attribution={layer.attribution}
                maxZoom={MAX_ZOOM}
                maxNativeZoom={layer.nativeZoom}
              />
            </BaseLayer>
          ))}
        </LayersControl>

        {wells.map((well) => (
          <WellMarker key={well.id} well={well} onViewDetails={setSelectedWell} />
        ))}
      </MapContainer>

      <div className="ds-legend" aria-label="Map legend">
        <p className="ds-legend-title">Legend</p>
        {LEGEND_ROWS.map(({ key, label, color }) => (
          <p className="ds-legend-row" key={key}>
            <span className="ds-dot" style={{ background: color }} aria-hidden="true" />
            {label}
            <strong>{counts[key]}</strong>
          </p>
        ))}
      </div>

      {wells.length === 0 && <div className="ds-map-note">No wells to show here yet.</div>}

      {selectedWell && <WellDetails well={selectedWell} onClose={() => setSelectedWell(null)} />}
    </div>
  );
}

export default WellMap;
