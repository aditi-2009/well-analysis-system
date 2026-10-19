// src/pages/Reports.jsx
// What works today: the summary, the map preview and the CSV download.
// PDF reports need a backend that does not exist yet, so those buttons say so.
import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Download } from "lucide-react";
import { getReportSummary } from "../services/reportService";
import { getAllWells } from "../services/wellService";
import { exportWellsToCSV } from "../services/exportService";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useToast } from "../context/ToastContext";
import WellMap from "../components/map/WellMap";
import PageHeader from "../components/common/PageHeader";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";
import Button from "../components/common/Button";

function Reports() {
  useDocumentTitle("Reports");
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [wells, setWells] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadReportData() {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryResult, wellsResult] = await Promise.all([getReportSummary(), getAllWells()]);
      setSummary(summaryResult);
      setWells(wellsResult);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReportData();
  }, []);

  if (isLoading) return <LoadingState label="Loading report data" />;
  if (error) return <ErrorState what="the report data" error={error} onRetry={loadReportData} />;
  if (!summary) return null;

  const handleDownloadCSV = () => {
    try {
      exportWellsToCSV(wells, "well-detection-report.csv");
      toast.success("CSV downloaded.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const summaryRows = [
    ["Total wells", summary.totalWells],
    ["High confidence", summary.highConfidence],
    ["Medium confidence", summary.mediumConfidence],
    ["Low confidence", summary.lowConfidence],
    ["Area(s) covered", summary.areasCovered],
    ["Latest detection", summary.latestDetectionDate],
  ];

  return (
    <div className="ds-page">
      <PageHeader
        title="Reports"
        description="Summary of detected wells and downloads"
        actions={
          <Button variant="primary" icon={FileSpreadsheet} onClick={handleDownloadCSV}>
            Download CSV
          </Button>
        }
      />

      <section className="ds-card">
        <div className="ds-card-head">
          <h2 className="ds-card-title">Detection summary</h2>
        </div>
        <dl className="ds-kv">
          {summaryRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ds-card">
        <div className="ds-card-head">
          <h2 className="ds-card-title">Map preview</h2>
        </div>
        <WellMap wells={wells} />
      </section>

      <section className="ds-card">
        <div className="ds-card-head">
          <h2 className="ds-card-title">
            PDF reports <span className="ds-soon">Coming soon</span>
          </h2>
        </div>
        <div className="ds-page-actions">
          <Button variant="secondary" icon={FileText} disabled>
            Generate report
          </Button>
          <Button variant="secondary" icon={Download} disabled>
            Download PDF
          </Button>
        </div>
      </section>

      <EmptyState icon={FileText} title="No reports yet">
        Generated reports will be listed here once report generation is available.
      </EmptyState>
    </div>
  );
}

export default Reports;
