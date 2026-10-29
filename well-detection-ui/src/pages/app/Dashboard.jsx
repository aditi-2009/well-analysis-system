import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Gauge, Image as ImageIcon, MapPinned, Satellite, Waves } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, Card, EmptyState, PageHeader, PageLoader, StatCard, btn } from "../../components/common/ui";
import { usePrefs } from "../../context/PrefsContext";
import { useAuth } from "../../context/AuthContext";
import { listWells } from "../../services/wellService";
import { listImages, listJobs } from "../../services/detectionService";
import { LEVEL_META, countByLevel, pct } from "../../utils/confidence";
import { formatDate } from "../../utils/format";

const STATUS = { completed: "bg-emerald-50 text-emerald-700 border-emerald-200", failed: "bg-red-50 text-red-700 border-red-200", running: "bg-sky-50 text-sky-700 border-sky-200", pending: "bg-slate-50 text-slate-600 border-slate-200" };

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { prefs } = usePrefs();
  const { user } = useAuth();
  const [wells, setWells] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listWells({ limit: 20000 }), listJobs(50), listImages(100)])
      .then(([w, j, i]) => { setWells(w); setJobs(j); setImages(i); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const levels = useMemo(() => countByLevel(wells, prefs.thresholds), [wells, prefs.thresholds]);
  const avg = wells.length ? wells.reduce((s, w) => s + w.confidence, 0) / wells.length : 0;

  const byArea = useMemo(() => {
    const map = new Map();
    wells.forEach((w) => {
      const key = w.village || w.taluka || w.district || "No area label";
      if (!map.has(key)) map.set(key, { area: key, high: 0, medium: 0, low: 0, total: 0 });
      const r = map.get(key);
      const lv = w.confidence >= prefs.thresholds.high ? "high" : w.confidence >= prefs.thresholds.medium ? "medium" : "low";
      r[lv] += 1; r.total += 1;
    });
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  }, [wells, prefs.thresholds]);

  const pie = ["high", "medium", "low"].map((k) => ({ name: `${LEVEL_META[k].label}`, value: levels[k], color: LEVEL_META[k].color }));
  const completed = jobs.filter((j) => j.status === "completed").length;
  const areas = new Set(wells.map((w) => w.village || w.taluka || w.district).filter(Boolean)).size;

  if (loading) return <PageLoader label="Loading dashboard..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Overview" subtitle={`Welcome, ${user?.fullName}. Well detection activity across all runs.`}>
        <Link to="/app/detection" className={btn.primary}><Satellite className="h-4 w-4" /> New detection</Link>
      </PageHeader>
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Waves} label="Total wells detected" value={wells.length.toLocaleString()} hint={`${completed} completed run${completed === 1 ? "" : "s"}`} />
        <StatCard icon={MapPinned} label="Areas covered" value={areas} hint="Villages / talukas with wells" tone="sky" />
        <StatCard icon={Gauge} label="Average confidence" value={wells.length ? pct(avg) : "-"} hint="Model confidence, not accuracy" tone="amber" />
        <StatCard icon={ImageIcon} label="Images on server" value={images.length} hint="Uploaded satellite images" tone="violet" />
      </div>

      {!wells.length && !error ? (
        <EmptyState icon={Satellite} title="No wells detected yet" text="Choose an area, upload or pick an image, and run your first detection.">
          <Link to="/app/detection" className={btn.primary}>Start detection</Link>
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Wells by area" subtitle="Top areas, split by confidence level">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byArea} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="area" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={55} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="high" name="High" stackId="a" fill={LEVEL_META.high.color} />
                  <Bar dataKey="medium" name="Medium" stackId="a" fill={LEVEL_META.medium.color} />
                  <Bar dataKey="low" name="Low" stackId="a" fill={LEVEL_META.low.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Confidence breakdown" subtitle={`High ≥ ${Math.round(prefs.thresholds.high * 100)}%, Medium ≥ ${Math.round(prefs.thresholds.medium * 100)}%`}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2} stroke="none" label={({ value }) => (value ? value : "")}>
                    {pie.map((p) => <Cell key={p.name} fill={p.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      <Card title="Recent detection runs" action={<Link to="/app/results" className="text-xs font-semibold text-emerald-700 hover:underline">View all results</Link>} bodyClass="p-0">
        {jobs.length ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2.5">Started</th><th className="px-4 py-2.5">Area</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Wells</th><th className="px-4 py-2.5">Model</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.slice(0, 8).map((j) => (
                  <tr key={j.id}>
                    <td className="px-4 py-2.5 text-slate-700">{formatDate(j.started_at || j.created_at, true)}</td>
                    <td className="px-4 py-2.5 text-slate-700">{[j.village, j.taluka, j.district].filter(Boolean).join(", ") || "No area label"}</td>
                    <td className="px-4 py-2.5"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS[j.status]}`}>{j.status}</span></td>
                    <td className="px-4 py-2.5 font-semibold">{j.total_detections}</td>
                    <td className="px-4 py-2.5 text-slate-500">{j.model_version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="px-5 py-8 text-center text-sm text-slate-500">No runs yet.</p>}
      </Card>
    </div>
  );
}
