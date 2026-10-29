import { Link } from "react-router-dom";
import { ArrowRight, Brain, FileDown, Layers, Map as MapIcon, MapPinned, Play, ScanSearch, Upload, UserPlus } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { useAuth } from "../../context/AuthContext";
import { APP_NAME, ORG_SHORT } from "../../config/constants";

const features = [
  { icon: Brain, title: "YOLOv8 deep learning", text: "A YOLOv8 detector trained on high-resolution satellite imagery finds open agricultural wells automatically." },
  { icon: MapIcon, title: "Boundary-based GIS mapping", text: "Select a village, search a place, use your exact GPS location or draw a boundary, and see the wells inside it on a satellite map." },
  { icon: MapPinned, title: "Exact coordinates + confidence", text: "Every well comes with its latitude, longitude and a confidence score, colour-coded High, Medium or Low." },
  { icon: Upload, title: "Bring your own imagery", text: "Upload a GeoTIFF for a specific area and run detection on it, or reuse imagery already stored on the server." },
  { icon: FileDown, title: "CSV, GeoJSON & reports", text: "Export datasets for QGIS / ArcGIS, or print a summary report as PDF for planning and groundwater studies." },
  { icon: Layers, title: "Review before you trust", text: "High-confidence wells need light review; Low ones are flagged for field check. Verified reference wells can be overlaid." },
];

const steps = [
  ["1", "Choose the area", "Village list, place search, your GPS location or a boundary drawn on the map."],
  ["2", "Provide imagery", "Pick a stored image or upload one for the area."],
  ["3", "Run detection", "The server scans the image in tiles and shows live progress."],
  ["4", "Review & export", "Inspect wells inside your boundary, copy coordinates, download results."],
];

export default function Home() {
  useDocumentTitle("");
  const { isAuthenticated } = useAuth();
  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-800 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-8 text-white shadow-xl sm:p-14">
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative z-10 max-w-2xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
            <ScanSearch className="h-3.5 w-3.5" /> Geospatial AI • Deoli-Wardha, Maharashtra
          </span>
          <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Advanced Agricultural Well Detection &amp; Monitoring</h2>
          <p className="mb-8 text-sm leading-relaxed text-emerald-100/90 sm:text-base">
            {APP_NAME} by {ORG_SHORT}: automated identification of open agricultural wells from satellite imagery, with exact coordinates, confidence scores and interactive maps.
          </p>
          <div className="flex flex-wrap gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/app/detection" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-600"><Play className="h-4 w-4" /> Start detection</Link>
                <Link to="/app/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur-md transition hover:bg-white/20">Open dashboard <ArrowRight className="h-4 w-4" /></Link>
              </>
            ) : (
              <>
                <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-600"><UserPlus className="h-4 w-4" /> Register for access</Link>
                <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur-md transition hover:bg-white/20">Login <ArrowRight className="h-4 w-4" /></Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-6 text-center text-2xl font-bold text-slate-900">What the system does</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Icon className="h-6 w-6" /></div>
              <h4 className="mb-2 text-base font-bold text-slate-900">{title}</h4>
              <p className="text-xs leading-relaxed text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-10">
        <h3 className="mb-8 text-center text-2xl font-bold text-slate-900">How it works</h3>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([n, t, d]) => (
            <li key={n} className="relative rounded-2xl bg-white p-5 shadow-sm">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">{n}</span>
              <h4 className="font-bold text-slate-900">{t}</h4>
              <p className="mt-1 text-xs text-slate-500">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-white p-6 sm:flex-row">
        <div>
          <h4 className="text-sm font-bold text-slate-900">New here?</h4>
          <p className="mt-0.5 text-xs text-slate-600">Read the Help Center for a step-by-step guide to selecting an area, uploading imagery and reading the results.</p>
        </div>
        <Link to="/help" className="shrink-0 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-900">Open Help Center</Link>
      </section>
    </div>
  );
}
