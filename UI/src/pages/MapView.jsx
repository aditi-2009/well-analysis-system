// src/pages/MapView.jsx
import { useEffect, useState } from "react";
import { getAllWells } from "../services/wellService";
import WellMap from "../components/map/WellMap";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";

function MapView() {
  const [wells, setWells] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWells() {
      setIsLoading(true);
      setError("");
      try {
        const data = await getAllWells();
        setWells(data);
      } catch (err) {
        setError("Unable to load well locations. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    loadWells();
  }, []);

  if (isLoading) return <Loader message="Loading map data..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="map-page">
      <h2 className="page-heading">GIS Map View</h2>
      <p className="page-subheading">
        {wells.length} wells plotted — click a marker to view details
      </p>
      <WellMap wells={wells} />
    </div>
  );
}

export default MapView;