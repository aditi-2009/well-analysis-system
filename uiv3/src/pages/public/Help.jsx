import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Mail, Search } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { inputCls } from "../../components/common/ui";
import { CONTACT } from "../../config/constants";

const FAQ = [
  { cat: "Getting started", q: "How do I run my first detection?", a: "Sign in and open Well Detection. Search a village or a place and pick it. Its outline appears on the map. Then press Detect wells in this area. No upload is needed. You can also choose an image already on the server, or upload one, and press Detect wells." },
  { cat: "Getting started", q: "Do I need an account?", a: "You can read the public pages without one. Detection, maps, results and reports need an account. Use Register, then sign in." },
  { cat: "Choosing an area", q: "What are the ways to choose an area?", a: "Search village (type a name; its boundary appears), Village list (district, taluka, village), Search place (OpenStreetMap), My location (your GPS position with a radius, or typed coordinates), and Draw on map (polygon, rectangle or circle)." },
  { cat: "Choosing an area", q: "A village has no stored boundary.", a: "The village is still found by name. Its outline is taken from the map (approximate), and detection runs inside it. If no outline exists, search a place or draw the area." },
  { cat: "Choosing an area", q: "Can I detect wells in a place I search for?", a: "Yes. Search the place, pick it, and press Detect wells in this area. No upload is needed. The area must lie inside the master image; if it does not, upload an image that covers it." },
  { cat: "Choosing an area", q: "How accurate is My location?", a: "It depends on your device. Phones with GPS are usually within 5 to 20 m. Laptops using Wi-Fi can be off by hundreds of metres. The circle around the blue dot shows the likely error." },
  { cat: "Detection", q: "How do I stop a detection?", a: "Press Stop detection while it runs. The scan stops after the tile it is on, and nothing is saved for that run." },
  { cat: "Detection", q: "Which files can I upload?", a: "GeoTIFF is best (.tif, .tiff). JPEG 2000, IMG, VRT, ECW, JPEG and PNG are accepted too, but JPEG and PNG have no map coordinates, so wells cannot be placed on the map. Convert to GeoTIFF in QGIS if in doubt." },
  { cat: "Detection", q: "No wells were found.", a: "Check that the imagery covers the area. Administrators can lower the minimum confidence under Advanced settings." },
  { cat: "Detection", q: "I see 'Another detection is running'.", a: "Only one detection can run at a time on the server. Wait a moment, then try again." },
  { cat: "Results", q: "What does the confidence score mean?", a: "It is an estimate of how sure the detection is that a mark is a well. It is not a measured accuracy. The High, Medium and Low levels are set by the administrator in Settings." },
  { cat: "Results", q: "Where is a well?", a: "Each well profile shows the village, taluka and district it lies in, plus its exact latitude and longitude in decimal and in degrees, minutes and seconds." },
  { cat: "Results", q: "What do Personal and Universal mean?", a: "Personal shows your own detections. Universal shows detections from every account. In Results, Reports and the map, the Universal view lists only wells with medium and high confidence." },
  { cat: "Results", q: "How do I delete results?", a: "Use Delete these results on a run summary, or the bin icon next to a well. You can delete your own results. Administrators can delete anyone's." },
  { cat: "Results", q: "Which export should I use?", a: "CSV for spreadsheets, GeoJSON for QGIS, ArcGIS or web maps, and KML for Google Earth. Reports can also be printed to PDF. For very large runs, use Full CSV from server." },
  { cat: "Results", q: "What are the blue wells?", a: "Verified wells: officer survey records, and wells an administrator marked. Turn them on with the Verified wells button." },
  { cat: "Administrators", q: "How do I mark a well the detection missed?", a: "Turn on Mark missed well, click the exact spot, check the village and district found from the boundaries, tick the confirmation and save." },
  { cat: "Administrators", q: "What is learning from detections?", a: "Confident wells (above 70% by default) are kept as examples. A new version is used only if it is not worse on the wells marked by administrators. Its status is shown in Settings." },
  { cat: "Account and access", q: "I forgot my password.", a: `Password reset is not available online yet. Write to ${CONTACT.email} from your registered address.` },
  { cat: "Account and access", q: "I was signed out suddenly.", a: "Sessions last 24 hours. After that, or after the server restarts with a new secret, sign in again." },
  { cat: "Troubleshooting", q: "The app says it cannot reach the server.", a: "Check that the backend is running and that the frontend is started. The status dot in the top bar shows the connection." },
  { cat: "Troubleshooting", q: "The map is blank or grey.", a: "Map tiles need internet access. Try the Roadmap layer, or check a firewall that may block the imagery servers." },
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
          <input className={`${inputCls} pl-10`} placeholder="Search help, for example: village, stop, delete, export" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search help" />
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
                  <button type="button" className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
                    {f.q}
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {!cats.length && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Nothing matches “{q}”. Try another word, or contact us.
        </p>
      )}

      <section className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Still stuck?</h4>
          <p className="text-xs text-slate-600">Write to {CONTACT.email}, or use the contact form.</p>
        </div>
        <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
          <Mail className="h-4 w-4" /> Contact us
        </Link>
      </section>
    </div>
  );
}
