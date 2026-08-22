// src/components/charts/DashboardCharts.jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CONFIDENCE_COLORS = {
  high: "#16a34a",
  medium: "#f59e0b",
  low: "#dc2626",
};

const PIE_COLORS = [CONFIDENCE_COLORS.high, CONFIDENCE_COLORS.medium, CONFIDENCE_COLORS.low];

function DashboardCharts({ areaData, confidenceData }) {
  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h4 className="chart-title">Wells Detected by Area</h4>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={areaData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="area" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="high" name="High Confidence" stackId="a" fill={CONFIDENCE_COLORS.high} />
            <Bar dataKey="medium" name="Medium Confidence" stackId="a" fill={CONFIDENCE_COLORS.medium} />
            <Bar dataKey="low" name="Low Confidence" stackId="a" fill={CONFIDENCE_COLORS.low} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h4 className="chart-title">Detection Confidence Breakdown</h4>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={confidenceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {confidenceData.map((_, index) => (
                <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default DashboardCharts;