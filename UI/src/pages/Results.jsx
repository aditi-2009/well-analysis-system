// src/pages/Results.jsx
import { useEffect, useState } from "react";
import { Download, FileText, Map as MapIcon } from "lucide-react";
import { getAllWells } from "../services/wellService";
import { exportWellsToCSV, generateReport } from "../services/exportService";
import { CONFIDENCE_LEVELS } from "../utils/constants";
import WellTable from "../components/wells/WellTable";
import WellDetails from "../components/wells/WellDetails";
import WellMap from "../components/map/WellMap";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";

function Results() {
  const [wells, setWells] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedWell, setSelectedWell] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    async function loadWells() {
      setIsLoading(true);
      setError("");
      try {
        const data = await getAllWells();
        setWells(data);
      } catch (err) {
        setError("Unable to load detection results. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    loadWells();
  }, []);

  if (isLoading) return <Loader message="Loading results..." />;
  if (error) return <ErrorMessage message={error} />;

  // Summary counts derived from the loaded wells
  const totalWells = wells.length;
  const highConfidence = wells.filter((w) => w.confidence >= CONFIDENCE_LEVELS.HIGH).length;
  const mediumConfidence = wells.filter(
    (w) => w.confidence >= CONFIDENCE_LEVELS.MEDIUM && w.confidence < CONFIDENCE_LEVELS.HIGH
  ).length;
  const lowConfidence = wells.filter((w) => w.confidence < CONFIDENCE_LEVELS.MEDIUM).length;

  const summaryCards = [
    { label: "Total Wells", value: totalWells, color: "#14532d" },
    { label: "High Confidence", value: highConfidence, color: "#16a34a" },
    { label: "Medium Confidence", value: mediumConfidence, color: "#f59e0b" },
    { label: "Low Confidence", value: lowConfidence, color: "#dc2626" },
  ];

  const handleDownloadCSV = () => {
    try {
      exportWellsToCSV(wells);
      setActionMessage("CSV downloaded successfully.");
    } catch (err) {
      setActionMessage(err.message);
    }
    setTimeout(() => setActionMessage(""), 3000);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setActionMessage("");
    try {
      const report = await generateReport(wells);
      setActionMessage(`Report ${report.reportId} generated successfully.`);
    } catch (err) {
      setActionMessage(err.message || "Failed to generate report.");
    } finally {
      setIsGeneratingReport(false);
      setTimeout(() => setActionMessage(""), 4000);
    }
  };

  return (
    <div className="results-page">
      <h2 className="page-heading">Detection Results</h2>
      <p className="page-subheading">Full breakdown of all detected wells</p>

      {actionMessage && <div className="action-message-banner">{actionMessage}</div>}

      <div className="stat-cards-grid">
        {summaryCards.map(({ label, value, color }) => (
          <div className="stat-card" key={label}>
            <div>
              <p className="stat-value" style={{ color }}>{value}</p>
              <p className="stat-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="results-actions-row">
        <button className="secondary-btn" onClick={() => setShowMap((prev) => !prev)}>
          <MapIcon size={16} /> {showMap ? "Hide Map" : "View Map"}
        </button>
        <button className="secondary-btn" onClick={handleDownloadCSV}>
          <Download size={16} /> Download CSV
        </button>
        <button className="start-detection-btn" onClick={handleGenerateReport} disabled={isGeneratingReport}>
          <FileText size={16} /> {isGeneratingReport ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {showMap && (
        <div className="results-map-block">
          <WellMap wells={wells} />
        </div>
      )}

      <WellTable wells={wells} onRowClick={setSelectedWell} />

      {selectedWell && (
        <WellDetails well={selectedWell} onClose={() => setSelectedWell(null)} />
      )}
    </div>
  );
}

export default Results;