// Compact list of wells with exact latitude / longitude and confidence.
import { useMemo, useState } from "react";
import { ExternalLink, LocateFixed } from "lucide-react";
import { usePrefs } from "../../context/PrefsContext";
import { ConfidenceBar, CopyButton, LevelPill, btn } from "../common/ui";
import { formatCoord, googleMapsUrl } from "../../utils/geo";
import { pct } from "../../utils/confidence";

export default function WellTable({ wells, selectedId, onSelect, pageSize = 100, emptyText = "No wells to show." }) {
  const { prefs, classify } = usePrefs();
  const [limit, setLimit] = useState(pageSize);
  const rows = useMemo(() => [...wells].sort((a, b) => b.confidence - a.confidence), [wells]);
  const shown = rows.slice(0, limit);

  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-500">{emptyText}</p>;
  return (
    <div>
      <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 custom-scrollbar">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Well</th>
              <th className="px-3 py-2.5">Latitude</th>
              <th className="px-3 py-2.5">Longitude</th>
              <th className="px-3 py-2.5">Confidence</th>
              <th className="px-3 py-2.5">Level</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((w) => (
              <tr key={w.id} onClick={() => onSelect?.(w.id)} className={`cursor-pointer transition hover:bg-emerald-50/60 ${selectedId === w.id ? "bg-emerald-50" : ""}`}>
                <td className="px-3 py-2 font-semibold text-slate-800">#{w.id}</td>
                <td className="px-3 py-2 font-mono text-xs">{w.latitude.toFixed(7)}</td>
                <td className="px-3 py-2 font-mono text-xs">{w.longitude.toFixed(7)}</td>
                <td className="w-40 px-3 py-2">
                  <div className="mb-1 text-xs font-bold text-slate-800">{pct(w.confidence, 2)}</div>
                  <ConfidenceBar confidence={w.confidence} />
                </td>
                <td className="px-3 py-2"><LevelPill level={classify(w.confidence)} /></td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700" title="Locate on map" aria-label="Locate on map" onClick={() => onSelect?.(w.id, true)}><LocateFixed className="h-3.5 w-3.5" /></button>
                    <CopyButton text={formatCoord(w.latitude, w.longitude, "decimal", 7)} label="Copy" />
                    <a className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700" href={googleMapsUrl(w.latitude, w.longitude)} target="_blank" rel="noreferrer" title="Open in Google Maps" aria-label="Open in Google Maps"><ExternalLink className="h-3.5 w-3.5" /></a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {shown.length} of {rows.length} wells{prefs.coordFormat === "dms" ? " (coordinates shown in decimal degrees; DMS in the map popup)" : ""}</span>
        {rows.length > limit && <button className={btn.small} onClick={() => setLimit((l) => l + 200)}>Show more</button>}
      </div>
    </div>
  );
}
