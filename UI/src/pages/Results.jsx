// src/pages/Results.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Map as MapIcon, Search } from "lucide-react";
import { getAllWells } from "../services/wellService";
import { exportWellsToCSV } from "../services/exportService";
import { CONFIDENCE_COLORS, confidenceLevel } from "../utils/confidence";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useToast } from "../context/ToastContext";
import WellTable from "../components/wells/WellTable";
import WellDetails from "../components/wells/WellDetails";
import WellMap from "../components/map/WellMap";
import PageHeader from "../components/common/PageHeader";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";
import Button from "../components/common/Button";

function Results() {
  useDocumentTitle("Results");
  const toast = useToast();

  const [wells, setWells] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWell, setSelectedWell] = useState(null);
  const [showMap, setShowMap] = useState(false);

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
  const counts = useMemo(() => {
    const result = { high: 0, medium: 0, low: 0 };
    wells.forEach((well) => {
      result[confidenceLevel(well.confidence).key] += 1;
    });
    return result;
  }, [wells]);

  if (isLoading) return <LoadingState label="Loading results" />;
  if (error) return <ErrorState what="the detection results" error={error} onRetry={loadWells} />;

  const tiles = [
    { label: "Total Wells", value: wells.length, color: "#14532d" },
    { label: "High Confidence", value: counts.high, color: CONFIDENCE_COLORS.high },
    { label: "Medium Confidence", value: counts.medium, color: CONFIDENCE_COLORS.medium },
    { label: "Low Confidence", value: counts.low, color: CONFIDENCE_COLORS.low },
  ];

  const handleDownloadCSV = () => {
    try {
      exportWellsToCSV(wells);
      toast.success("CSV downloaded.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="ds-page">
      <PageHeader
        title="Detection Results"
        description="Full breakdown of all detected wells"
        actions={
          <>
            <Button variant="secondary" icon={MapIcon} onClick={() => setShowMap((prev) => !prev)}>
              {showMap ? "Hide map" : "Show map"}
            </Button>
            <Button variant="secondary" icon={Download} onClick={handleDownloadCSV}>
              Download CSV
            </Button>
          </>
        }
      />

      {wells.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No detection results yet"
          action={
            <Link to="/app/detection" className="ds-btn ds-btn-primary">
              Go to Well Detection
            </Link>
          }
        >
          Detected wells are listed here after a detection run finishes.
        </EmptyState>
      ) : (
        <>
          <div className="ds-stats">
            {tiles.map(({ label, value, color }) => (
              <div className="ds-stat" key={label} style={{ "--accent": color }}>
                <div className="ds-stat-top">
                  <span className="ds-stat-label">{label}</span>
                </div>
                <p className="ds-stat-value">{value}</p>
              </div>
            ))}
          </div>

          {showMap && (
            <div style={{ marginBottom: 16 }}>
              <WellMap wells={wells} />
            </div>
          )}

          <div className="ds-card">
            <WellTable wells={wells} onRowClick={setSelectedWell} />
          </div>
        </>
      )}

      {selectedWell && <WellDetails well={selectedWell} onClose={() => setSelectedWell(null)} />}
    </div>
  );
}

export default Results;
