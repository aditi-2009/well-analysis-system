// src/pages/Dashboard.jsx
// The first screen after login. Each tile opens the page where its number comes from.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, Map as MapIcon, MapPin, Search, Target } from "lucide-react";
import { getDashboardStats, getWellsByArea, getConfidenceBreakdown } from "../services/wellService";
import { loadSettings } from "../utils/settingsStore";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import DashboardCharts from "../components/charts/DashboardCharts";
import PageHeader from "../components/common/PageHeader";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";

const REFRESH_MS = 5 * 60 * 1000;

function Dashboard() {
  useDocumentTitle("Dashboard");

  const [stats, setStats] = useState(null);
  const [areaData, setAreaData] = useState([]);
  const [confidenceData, setConfidenceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh] = useState(() => loadSettings().autoRefreshDashboard);

  // silent = true is the timed refresh: no loading screen, and a failure keeps the old numbers.
  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const [statsResult, areaResult, confidenceResult] = await Promise.all([
        getDashboardStats(),
        getWellsByArea(),
        getConfidenceBreakdown(),
      ]);
      setStats(statsResult);
      setAreaData(areaResult);
      setConfidenceData(confidenceResult);
    } catch (err) {
      if (!silent) setError(err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  if (isLoading) return <LoadingState label="Loading dashboard" />;
  if (error) return <ErrorState what="the dashboard" error={error} onRetry={() => load()} />;
  if (!stats) return null;

  const tiles = [
    { label: "Total Wells Detected", value: stats.totalWells, icon: Target, color: "#14532d", to: "/app/results" },
    { label: "Selected Area", value: stats.selectedArea, icon: MapPin, color: "#1d4ed8", to: "/app/detection" },
    { label: "Average Confidence", value: stats.detectionAccuracy, icon: ListChecks, color: "#b45309", to: "/app/results" },
    { label: "Villages Covered", value: stats.villagesCovered, icon: MapIcon, color: "#7c3aed", to: "/app/map" },
  ];

  return (
    <div className="ds-page">
      <PageHeader
        title="Dashboard"
        description="Overview of agricultural well detection activity"
        actions={
          <Link to="/app/detection" className="ds-btn ds-btn-primary">
            <Search size={16} aria-hidden="true" />
            <span>Detect wells</span>
          </Link>
        }
      />

      <div className="ds-stats">
        {tiles.map(({ label, value, icon: Icon, color, to }) => (
          <Link
            key={label}
            to={to}
            className="ds-stat"
            style={{ "--accent": color, display: "block", textDecoration: "none" }}
          >
            <div className="ds-stat-top">
              <span className="ds-stat-icon" style={{ backgroundColor: `${color}1A`, color }}>
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="ds-stat-label">{label}</span>
            </div>
            <p className="ds-stat-value">{value}</p>
          </Link>
        ))}
      </div>

      {stats.totalWells === 0 ? (
        <EmptyState
          icon={Search}
          title="No wells detected yet"
          action={
            <Link to="/app/detection" className="ds-btn ds-btn-primary">
              Go to Well Detection
            </Link>
          }
        >
          Run a detection on an image and the results will appear here.
        </EmptyState>
      ) : (
        <DashboardCharts areaData={areaData} confidenceData={confidenceData} />
      )}
    </div>
  );
}

export default Dashboard;
