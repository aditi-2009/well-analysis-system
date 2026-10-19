// src/pages/MapView.jsx
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getAllWells } from "../services/wellService";
import { wellLevel } from "../utils/confidence";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import WellMap from "../components/map/WellMap";
import PageHeader from "../components/common/PageHeader";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";

function MapView() {
  useDocumentTitle("Map");

  const [wells, setWells] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");

  async function loadWells() {
    setIsLoading(true);
    setError(null);
    try {
      setWells(await getAllWells());
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWells();
  }, []);

  // Hooks must run on every render, so this sits above the early returns below.
  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    return wells.filter((well) => {
      if (well.latitude == null || well.longitude == null) return false;
      if (level !== "all" && wellLevel(well).key !== level) return false;
      if (!text) return true;
      return [well.id, well.village, well.taluka, well.district].some((value) =>
        String(value ?? "").toLowerCase().includes(text)
      );
    });
  }, [wells, query, level]);

  if (isLoading) return <LoadingState label="Loading map data" rows={1} />;
  if (error) return <ErrorState what="the well locations" error={error} onRetry={loadWells} />;

  return (
    <div className="ds-page">
      <PageHeader
        title="GIS Map View"
        description={`${shown.length} of ${wells.length} wells shown. Click a marker to view details.`}
      />

      <div className="ds-toolbar">
        <div className="ds-search" style={{ flex: "1 1 280px" }}>
          <Search size={16} aria-hidden="true" />
          <input
            className="ds-input"
            type="search"
            placeholder="Search by well ID, village, taluka or district"
            aria-label="Search wells"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select
          className="ds-select ds-select-compact"
          aria-label="Filter by confidence"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
        >
          <option value="all">All confidence levels</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <WellMap wells={shown} />
    </div>
  );
}

export default MapView;
