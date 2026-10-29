import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { btn } from "../../components/common/ui";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <Compass className="h-14 w-14 text-emerald-600" />
      <h2 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h2>
      <p className="mt-2 text-sm text-slate-600">The page you are looking for does not exist or has moved.</p>
      <div className="mt-6 flex gap-3"><Link to="/" className={btn.primary}>Go to home</Link><Link to="/help" className={btn.secondary}>Help Center</Link></div>
    </div>
  );
}
