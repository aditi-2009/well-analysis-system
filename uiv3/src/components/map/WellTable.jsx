// Wells in a table: exact latitude and longitude, confidence, the village and district where the well lies, and actions.
import { useMemo, useState } from "react";
import { Eye, ExternalLink, LocateFixed, Trash2 } from "lucide-react";
import { useSystem } from "../../context/SystemContext";
import { ConfidenceBar, CopyButton, LevelPill, btn } from "../common/ui";
import { formatCoord, googleMapsUrl } from "../../utils/geo";
import { pct } from "../../utils/confidence";

const iconBtn = "rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700";

export default function WellTable({
  wells, selectedId, onView, onLocate, onDelete, canDelete, showOwner = false, pageSize = 50,
  emptyText = "No wells to show.",
}) {
  const { classify } = useSystem();
  const [limit, setLimit] = useState(pageSize);
  const rows = useMemo(() => [...wells].sort((a, b) => b.confidence - a.confidence), [wells]);
  const shown = rows.slice(0, limit);

  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-500">{emptyText}</p>;

  return (
    <div>
      <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-200 custom-scrollbar">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Well</th>
              <th className="px-3 py-2.5">Latitude</th>
              <th className="px-3 py-2.5">Longitude</th>
              <th className="px-3 py-2.5">Confidence</th>
              <th className="px-3 py-2.5">Village / district</th>
              {showOwner && <th className="px-3 py-2.5">Found by</th>}
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((w) => (
              <tr key={w.id} onClick={() => onView?.(w)} className={`cursor-pointer hover:bg-emerald-50/60 ${selectedId === w.id ? "bg-emerald-50" : ""}`}>
                <td className="px-3 py-2 font-semibold text-slate-800">
                  #{w.id}
                  <div className="mt-0.5"><LevelPill level={classify(w.confidence)} /></div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{w.latitude.toFixed(7)}</td>
                <td className="px-3 py-2 font-mono text-xs">{w.longitude.toFixed(7)}</td>
                <td className="w-40 px-3 py-2">
                  <div className="mb-1 text-xs font-bold text-slate-800">{pct(w.confidence, 2)}</div>
                  <ConfidenceBar confidence={w.confidence} />
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-semibold text-slate-800">{w.village || "Not recorded"}</div>
                  <div className="text-slate-500">{w.district || "District not recorded"}</div>
                </td>
                {showOwner && <td className="px-3 py-2 text-xs text-slate-600">{w.ownerName || "-"}</td>}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className={iconBtn} title="View profile" aria-label="View profile" onClick={() => onView?.(w)}><Eye className="h-3.5 w-3.5" /></button>
                    {onLocate && <button type="button" className={iconBtn} title="Show on map" aria-label="Show on map" onClick={() => onLocate(w)}><LocateFixed className="h-3.5 w-3.5" /></button>}
                    <CopyButton text={formatCoord(w.latitude, w.longitude, "decimal", 7)} label="Copy" />
                    <a className={iconBtn} href={googleMapsUrl(w.latitude, w.longitude)} target="_blank" rel="noreferrer" title="Open in Google Maps" aria-label="Open in Google Maps"><ExternalLink className="h-3.5 w-3.5" /></a>
                    {canDelete?.(w) && (
                      <button type="button" className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50" title="Delete well" aria-label="Delete well" onClick={() => onDelete?.(w)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {shown.length} of {rows.length} wells</span>
        {rows.length > limit && <button type="button" className={btn.small} onClick={() => setLimit((l) => l + 200)}>Show more</button>}
      </div>
    </div>
  );
}
