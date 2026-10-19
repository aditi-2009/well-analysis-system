// src/components/map/WellMarker.jsx
// One well on the map, drawn as a circle on Leaflet's canvas layer. That stays fast with
// thousands of wells, where one HTML element per marker would not.
import { CircleMarker, Popup } from "react-leaflet";
import { wellLevel } from "../../utils/confidence";

// The screens write "Unknown" when a run had no area. Say so plainly instead.
function recorded(value) {
  return value && value !== "Unknown" ? value : "Not recorded";
}

function WellMarker({ well, onViewDetails }) {
  const level = wellLevel(well);
  const isVerified = level.key === "verified";

  return (
    <CircleMarker
      center={[well.latitude, well.longitude]}
      radius={7}
      pathOptions={{ color: "#ffffff", weight: 2, fillColor: level.color, fillOpacity: 1 }}
    >
      <Popup>
        <div className="ds-popup">
          <h4>Well {well.id}</h4>
          <dl>
            <dt>Status</dt>
            <dd>{well.status}</dd>
            <dt>Confidence</dt>
            <dd>{isVerified ? "Officer verified" : `${Math.round(well.confidence * 100)}% (${level.label})`}</dd>
            <dt>District</dt>
            <dd>{recorded(well.district)}</dd>
            <dt>Taluka</dt>
            <dd>{recorded(well.taluka)}</dd>
            <dt>Village</dt>
            <dd>{recorded(well.village)}</dd>
            <dt>Coordinates</dt>
            <dd>
              {Number(well.latitude).toFixed(5)}, {Number(well.longitude).toFixed(5)}
            </dd>
            {well.detectedOn && (
              <>
                <dt>Detected on</dt>
                <dd>{well.detectedOn}</dd>
              </>
            )}
          </dl>
          {onViewDetails && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="ds-btn ds-btn-primary ds-btn-sm ds-btn-block"
                onClick={() => onViewDetails(well)}
              >
                View details
              </button>
            </div>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}

export default WellMarker;
