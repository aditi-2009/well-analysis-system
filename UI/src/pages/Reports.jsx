// src/pages/Reports.jsx
import { useEffect, useState } from "react";
import { FileText, Download, FileSpreadsheet } from "lucide-react";
import { getReportSummary } from "../services/reportService";
import { getAllWells } from "../services/wellService";
import { exportWellsToCSV, generateReport } from "../services/exportService";
import WellMap from "../components/map/WellMap";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";

function Reports() {
  const [summary, setSummary] = useState(null);
  const [wells, setWells] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    async function loadReportData() {
      setIsLoading(true);
      setError("");
      try {
        const [summaryResult, wellsResult] = await Promise.all([
          getReportSummary(),
          getAllWells(),
        ]);
        setSummary(summaryResult);
        setWells(wellsResult);
      } catch (err) {
        setError("Unable to load report data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    loadReportData();
  }, []);

  if (isLoading) return <Loader message="Loading report data..." />;
  if (error) return <ErrorMessage message={error} />;

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setActionMessage("");
    try {
      const report = await generateReport(wells);
      setActionMessage(`Report ${report.reportId} generated successfully.`);
    } catch (err) {
      setActionMessage(err.message || "Failed to generate report.");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setActionMessage(""), 4000);
    }
  };

  const handleDownloadPDF = () => {
    // Mock — real PDF generation requires backend rendering (or a PDF lib later)
    setActionMessage("PDF download is not yet connected to a backend. This is a placeholder.");
    setTimeout(() => setActionMessage(""), 4000);
  };

  const handleDownloadCSV = () => {
    try {
      exportWellsToCSV(wells, "well-detection-report.csv");
      setActionMessage("CSV downloaded successfully.");
    } catch (err) {
      setActionMessage(err.message);
    }
    setTimeout(() => setActionMessage(""), 3000);
  };

  return (
    <div className="reports-page">
      <h2 className="page-heading">Reports</h2>
      <p className="page-subheading">Generate and download detection reports</p>

      {actionMessage && <div className="action-message-banner">{actionMessage}</div>}

      <div className="report-summary-card">
        <h3 className="section-title">Detection Summary</h3>
        <div className="report-summary-grid">
          <div className="report-summary-item">
            <span className="detail-label">Total Wells</span>
            <span className="detail-value">{summary.totalWells}</span>
          </div>
          <div className="report-summary-item">
            <span className="detail-label">High Confidence</span>
            <span className="detail-value">{summary.highConfidence}</span>
          </div>
          <div className="report-summary-item">
            <span className="detail-label">Medium Confidence</span>
            <span className="detail-value">{summary.mediumConfidence}</span>
          </div>
          <div className="report-summary-item">
            <span className="detail-label">Low Confidence</span>
            <span className="detail-value">{summary.lowConfidence}</span>
          </div>
          <div className="report-summary-item">
            <span className="detail-label">Area(s) Covered</span>
            <span className="detail-value">{summary.areasCovered}</span>
          </div>
          <div className="report-summary-item">
            <span className="detail-label">Latest Detection Date</span>
            <span className="detail-value">{summary.latestDetectionDate}</span>
          </div>
        </div>
      </div>

      <div className="report-map-card">
        <h3 className="section-title">Map Preview</h3>
        <WellMap wells={wells} />
      </div>

      <div className="report-actions-row">
        <button className="start-detection-btn" onClick={handleGenerateReport} disabled={isGenerating}>
          <FileText size={16} /> {isGenerating ? "Generating..." : "Generate Report"}
        </button>
        <button className="secondary-btn" onClick={handleDownloadPDF}>
          <Download size={16} /> Download PDF
        </button>
        <button className="secondary-btn" onClick={handleDownloadCSV}>
          <FileSpreadsheet size={16} /> Download CSV
        </button>
      </div>
    </div>
  );
}

export default Reports;