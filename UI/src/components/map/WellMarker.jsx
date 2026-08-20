// src/components/map/WellMarker.jsx
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { CONFIDENCE_LEVELS } from "../../utils/constants";

function getMarkerIcon(confidence) {
  let color = "#dc2626";
  if (confidence >= CONFIDENCE_LEVELS.HIGH) color = "#16a34a";
  else if (confidence >= CONFIDENCE_LEVELS.MEDIUM) color = "#f59e0b";

  return L.divIcon({
    className: "custom-well-marker",
    html: `<div style="
      width: 16px;
      height: 16px;
      background-color: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

function WellMarker({ well, onViewDetails }) {
  return (
    <Marker position={[well.latitude, well.longitude]} icon={getMarkerIcon(well.confidence)}>
      <Popup>
        <div className="well-popup">
          <p><strong>Well ID:</strong> {well.id}</p>
          <p><strong>Latitude:</strong> {well.latitude}</p>
          <p><strong>Longitude:</strong> {well.longitude}</p>
          <p><strong>Confidence:</strong> {Math.round(well.confidence * 100)}%</p>
          <p><strong>Status:</strong> {well.status}</p>
          <p><strong>Village:</strong> {well.village}</p>
          {onViewDetails && (
            <button className="popup-details-btn" onClick={() => onViewDetails(well)}>
              View Details
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default WellMarker;