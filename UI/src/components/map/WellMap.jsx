// src/components/map/WellMap.jsx
import { useState } from "react";
import { MapContainer, TileLayer, LayersControl } from "react-leaflet";
import WellMarker from "./WellMarker";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "../../utils/constants";

const { BaseLayer } = LayersControl;

function WellMap({ wells = [], center = MAP_DEFAULT_CENTER, zoom = MAP_DEFAULT_ZOOM, onSelectWell }) {
  const [selectedWell, setSelectedWell] = useState(null);

  const handleViewDetails = (well) => {
    setSelectedWell(well);
    if (onSelectWell) onSelectWell(well);
  };

  return (
    <div className="map-container-wrapper">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="leaflet-map">
        <LayersControl position="topright">
          <BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>
          <BaseLayer name="Satellite">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </BaseLayer>
        </LayersControl>

        {wells.map((well) => (
          <WellMarker key={well.id} well={well} onViewDetails={handleViewDetails} />
        ))}
      </MapContainer>

      {selectedWell && (
        <div className="map-selected-info">
          <strong>Selected:</strong> {selectedWell.id} — {selectedWell.village}
        </div>
      )}
    </div>
  );
}

export default WellMap;