import { Link } from "react-router-dom";
import { Globe, Mail, MapPin, Phone, Sprout } from "lucide-react";
import { CONTACT, ORG_SHORT } from "../../config/constants";

const col = "mb-4 text-xs font-semibold uppercase tracking-wider text-white";
const lnk = "transition hover:text-white";

export default function Footer() {
  return (
    <footer className="no-print mt-12 border-t border-emerald-900 bg-emerald-950 px-4 pb-6 pt-12 text-emerald-200 sm:px-8">
      <div className="mx-auto mb-8 grid max-w-7xl grid-cols-1 gap-8 text-sm md:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900"><Sprout className="h-5 w-5 text-emerald-400" /></div>
            <span className="text-base font-bold text-white">{ORG_SHORT}</span>
          </div>
          <p className="text-xs leading-relaxed text-emerald-300">
            National Bureau of Soil Survey and Land Use Planning works on scientific management of soil and groundwater resources for sustainable agriculture across India.
          </p>
        </div>
        <div>
          <h4 className={col}>Important links</h4>
          <ul className="space-y-2 text-xs">
            <li><Link className={lnk} to="/">Home</Link></li>
            <li><Link className={lnk} to="/about">About Us</Link></li>
            <li><Link className={lnk} to="/help">Help Center</Link></li>
            <li><Link className={lnk} to="/contact">Contact Us</Link></li>
            <li><Link className={lnk} to="/app/dashboard">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className={col}>Headquarters</h4>
          <ul className="space-y-2 text-xs text-emerald-300">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {CONTACT.address}</li>
            <li className="flex gap-2"><Phone className="h-3.5 w-3.5 shrink-0" /> {CONTACT.phone}</li>
            <li className="flex gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /> {CONTACT.email}</li>
            <li className="flex gap-2"><Globe className="h-3.5 w-3.5 shrink-0" /> <a className={lnk} href={CONTACT.website} target="_blank" rel="noreferrer">{CONTACT.website.replace("https://", "")}</a></li>
          </ul>
        </div>
        <div>
          <h4 className={col}>Policies &amp; security</h4>
          <ul className="space-y-2 text-xs">
            <li><Link className={lnk} to="/policies/privacy">Privacy Policy</Link></li>
            <li><Link className={lnk} to="/policies/terms">Terms &amp; Conditions</Link></li>
            <li><Link className={lnk} to="/policies/disclaimer">Disclaimer</Link></li>
            <li><Link className={lnk} to="/policies/accessibility">Accessibility Statement</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 border-t border-emerald-900/80 pt-6 text-xs text-emerald-400 sm:flex-row">
        <p>© {new Date().getFullYear()} {ORG_SHORT}, Government of India. All rights reserved.</p>
        <p>Designed for agricultural research &amp; geospatial mapping.</p>
      </div>
    </footer>
  );
}
