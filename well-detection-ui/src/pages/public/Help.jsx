import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Mail, Search } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { inputCls } from "../../components/common/ui";
import { CONTACT } from "../../config/constants";

const FAQ = [
  { cat: "Getting started", q: "How do I run my first detection?", a: "Sign in, open Well Detection, choose an area (step 1), pick or upload an image (step 2) and press Detect wells. Progress is shown live; the wells appear on the map and in the table when it finishes." },
  { cat: "Getting started", q: "Do I need an account?", a: "You can read the public pages without one. Detection, maps, results and reports need an account. Use Register, then sign in." },
  { cat: "Choosing an area", q: "What are the four ways to choose an area?", a: "Village list (district → taluka → village from the database, with its stored boundary), Search place (OpenStreetMap), My location (your GPS position with a radius, or typed coordinates) and Draw on map (polygon, rectangle or circle)." },
  { cat: "Choosing an area", q: "My village has no boundary.", a: "Some villages in the database have no boundary stored yet. Use Search place or draw the boundary on the map. For drawing: click corners, then click the green start point or press Enter to close the polygon." },
  { cat: "Choosing an area", q: "How accurate is “My location”?", a: "Accuracy depends on your device. Phones with GPS are usually within 5-20 m; laptops using Wi-Fi can be off by hundreds of metres. The accuracy circle around the blue dot shows the likely error." },
  { cat: "Imagery & detection", q: "Which files can I upload?", a: "GeoTIFF is best (.tif, .tiff). JPEG 2000, IMG, VRT, ECW, JPEG and PNG are accepted, but JPEG / PNG have no map coordinates, so detected wells cannot be placed on the map. ECW may need GDAL support on the server; converting to GeoTIFF in QGIS is safest." },
  { cat: "Imagery & detection", q: "Why does detection scan the whole image, not just my boundary?", a: "The server detects on the full image you choose and stores every well. The page then keeps only the wells inside your boundary. For faster runs, upload an image clipped to your area." },
  { cat: "Imagery & detection", q: "I get “A detection is already running”.", a: "The model is shared, so one run at a time is allowed. Wait for the current run to finish (the Well Detection page reconnects to it), then start again." },
  { cat: "Imagery & detection", q: "No wells were found.", a: "The image may hold no wells, may not cover your area, or may look different from the training images. Try a lower minimum confidence under Advanced settings, or check that the image footprint (dashed blue box) covers your boundary." },
  { cat: "Reading results", q: "What does the confidence score mean?", a: "It is the model's own certainty for that mark (0-100%), not a measured accuracy. High wells need light review, Medium should be checked on imagery and Low should go for field verification. You can change the cut-offs in Settings." },
  { cat: "Reading results", q: "How do I get a well's exact latitude and longitude?", a: "Click a marker on the map or a row in the table. Coordinates are in decimal degrees (WGS 84) with 7 decimals (about 1 cm). Use Copy to copy them, or open the spot in Google Maps." },
  { cat: "Reading results", q: "What are the blue “Verified” wells?", a: "Reference wells from officer surveys. Turn them on with the Verified wells button to compare with the AI detections." },
  { cat: "Reading results", q: "How do I export data?", a: "Use the CSV / GeoJSON buttons on the Detection and Results pages, or the Reports page. Reports can also be printed to PDF." },
  { cat: "Account & access", q: "I forgot my password.", a: `Password reset is not available online yet. Write to ${CONTACT.email} from your registered address.` },
  { cat: "Account & access", q: "I was signed out suddenly.", a: "Sessions last 24 hours. After that, or if the server restarts with a new secret, you must sign in again." },
  { cat: "Troubleshooting", q: "The app says it cannot reach the server.", a: "Check that the backend is running (uvicorn on port 8000) and that VITE_API_BASE_URL in the frontend .env is correct. The API status dot in the top bar shows the connection state." },
  { cat: "Troubleshooting", q: "The map is blank or grey.", a: "Map tiles need internet access. Try the Roadmap layer, zoom out, or check a firewall that may block server.arcgisonline.com / tile.openstreetmap.org." },
];

export default function Help() {
  useDocumentTitle("Help Center");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(0);
  const cats = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = FAQ.filter((f) => !t || (f.q + f.a + f.cat).toLowerCase().includes(t));
    return [...new Set(list.map((f) => f.cat))].map((c) => [c, list.filter((f) => f.cat === c)]);
  }, [q]);

  let n = -1;
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Help Center</h2>
        <p className="mt-2 text-sm text-slate-600">Answers to common questions about areas, imagery, detection and results.</p>
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-10`} placeholder="Search help (e.g. upload, boundary, confidence)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search help" />
        </div>
      </header>

      {cats.map(([cat, items]) => (
        <section key={cat}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">{cat}</h3>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {items.map((f) => {
              const i = ++n;
              const isOpen = q ? true : open === i;
              return (
                <div key={f.q}>
                  <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
                    {f.q}<ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {!cats.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Nothing matches “{q}”. Try another word or contact us.</p>}

      <section className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row">
        <div><h4 className="text-sm font-bold text-slate-900">Still stuck?</h4><p className="text-xs text-slate-600">Write to {CONTACT.email} or use the contact form.</p></div>
        <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"><Mail className="h-4 w-4" /> Contact us</Link>
      </section>
    </div>
  );
}
