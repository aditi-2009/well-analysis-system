import { Database, Globe, Layers, Server, Sprout, Target } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { GUIDES, ORG_NAME, ORG_SHORT, TEAM } from "../../config/constants";

const Block = ({ icon: Icon, title, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><Icon className="h-5 w-5 text-emerald-600" /> {title}</h3>
    <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
  </section>
);

const Person = ({ p }) => (
  <li className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="font-semibold text-slate-900">{p.name}</p>
    <p className="text-xs font-medium text-emerald-700">{p.role}</p>
    <p className="mt-0.5 text-xs text-slate-500">{p.org}</p>
  </li>
);

export default function About() {
  useDocumentTitle("About Us");
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">About Us</h2>
        <p className="mt-2 text-sm text-slate-600">The institute, the project and the people behind the Agricultural Well Detection &amp; Analysis System.</p>
      </header>

      <Block icon={Sprout} title="About ICAR">
        <p>The Indian Council of Agricultural Research (ICAR) is the apex autonomous body for coordinating agricultural research and education in India, under the Department of Agricultural Research and Education, Ministry of Agriculture &amp; Farmers Welfare, Government of India. It has its headquarters in New Delhi.</p>
      </Block>
      <Block icon={Globe} title={`About ${ORG_SHORT}`}>
        <p>{ORG_NAME} ({ORG_SHORT}), Nagpur, works on soil survey, land resource assessment, land use planning and the application of remote sensing and GIS to agricultural resource management.</p>
      </Block>
      <Block icon={Target} title="Why this project">
        <p>Open wells are a main source of irrigation water in semi-arid India, yet up-to-date, georeferenced well inventories are rare because they rely on slow field surveys or manual digitisation of imagery. This system detects wells automatically so that agencies can map them quickly for groundwater assessment, cropping-system planning and land use planning.</p>
        <p>The pilot study area is Deoli-Wardha, Maharashtra.</p>
      </Block>
      <Block icon={Layers} title="How it works">
        <ol className="list-decimal space-y-1 pl-5">
          <li>High-resolution RGB satellite imagery is cut into overlapping tiles.</li>
          <li>A YOLOv8 object detector, fine-tuned on well locations from a ground-truth shapefile, marks wells with a confidence score.</li>
          <li>Duplicate marks at tile borders are merged, and pixel positions are converted to latitude / longitude (WGS 84).</li>
          <li>Results are stored in a PostGIS database and shown on the map, clipped to the boundary you choose.</li>
        </ol>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Detections are model estimates. Medium and Low confidence wells should be verified on imagery or in the field.</p>
      </Block>
      <Block icon={Server} title="Technology">
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <li><b>Model:</b> YOLOv8 (Ultralytics), PyTorch</li>
          <li><b>Backend:</b> FastAPI, SQLAlchemy, Alembic</li>
          <li><b>Database:</b> PostgreSQL + PostGIS</li>
          <li><b>Geospatial:</b> rasterio, GeoPandas, QGIS</li>
          <li><b>Frontend:</b> React, Vite, Tailwind CSS</li>
          <li><b>Maps:</b> Leaflet, Esri imagery, OpenStreetMap</li>
        </ul>
      </Block>
      <Block icon={Database} title="Project team">
        <ul className="grid gap-3 sm:grid-cols-2">{TEAM.map((p) => <Person key={p.name} p={p} />)}</ul>
        <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Guides</p>
        <ul className="grid gap-3 sm:grid-cols-2">{GUIDES.map((p) => <Person key={p.name} p={p} />)}</ul>
      </Block>
    </div>
  );
}
