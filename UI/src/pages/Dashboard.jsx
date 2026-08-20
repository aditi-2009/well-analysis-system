// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { Layers, MapPin, Target, Image } from "lucide-react";
import { getDashboardStats, getWellsByArea, getConfidenceBreakdown } from "../services/wellService";
import DashboardCharts from "../components/charts/DashboardCharts";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [areaData, setAreaData] = useState([]);
  const [confidenceData, setConfidenceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      setError("");
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
        setError("Unable to load dashboard data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (isLoading) return <Loader message="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!stats) return null;

  const statCards = [
    { label: "Total Wells Detected", value: stats.totalWells, icon: Target, color: "#14532d" },
    { label: "Selected Area", value: stats.selectedArea, icon: MapPin, color: "#1d4ed8" },
    { label: "Detection Accuracy", value: stats.detectionAccuracy, icon: Layers, color: "#b45309" },
    { label: "Processed Images", value: stats.processedImages, icon: Image, color: "#7c3aed" },
  ];

  return (
    <div className="dashboard-page">
      <h2 className="page-heading">Dashboard</h2>
      <p className="page-subheading">Overview of agricultural well detection activity</p>

      <div className="stat-cards-grid">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon" style={{ backgroundColor: `${color}1A`, color }}>
              <Icon size={22} />
            </div>
            <div>
              <p className="stat-value">{value}</p>
              <p className="stat-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <DashboardCharts areaData={areaData} confidenceData={confidenceData} />
    </div>
  );
}

export default Dashboard;