// One well in full: the village, taluka and district it lies in, exact coordinates, confidence and actions.
import { ExternalLink, MapPin, Trash2 } from "lucide-react";
import { Modal, CopyButton, LevelPill, ConfidenceBar, btn } from "../common/ui";
import { useSystem } from "../../context/SystemContext";
import { formatCoord, googleMapsUrl, toDMS } from "../../utils/geo";
import { pct } from "../../utils/confidence";
import { formatDate } from "../../utils/format";

function Field({ label, children }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

/**
 * kind: "detected" (a well found by detection) or "verified" (a survey or administrator-marked well).
 */
export default function WellProfile({ well, kind = "detected", canDelete = false, onDelete, onClose }) {
  const { classify } = useSystem();
  if (!well) return null;
  const verified = kind === "verified";
  const title = verified ? `Verified well${well.identifier ? ` ${well.identifier}` : ""}` : `Well #${well.id}`;
  const places = [well.taluka && `${well.taluka} taluka`, well.district && `${well.district} district`].filter(Boolean).join(", ");

  return (
    <Modal open onClose={onClose} title={title} icon={MapPin} wide>
      <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">This well lies in</p>
        <p className="mt-1 text-lg font-bold text-slate-900">{well.village ? `${well.village} village` : "Village not recorded"}</p>
        <p className="text-sm text-slate-700">{places || "Taluka and district not recorded"}</p>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        <Field label="Latitude">{well.latitude.toFixed(7)}</Field>
        <Field label="Longitude">{well.longitude.toFixed(7)}</Field>
        <Field label="Degrees, minutes, seconds">{`${toDMS(well.latitude, true)}, ${toDMS(well.longitude, false)}`}</Field>
        {!verified && (
          <Field label="Confidence">
            <span className="flex flex-wrap items-center gap-2">{pct(well.confidence, 2)} <LevelPill level={classify(well.confidence)} /></span>
            <span className="mt-1.5 block"><ConfidenceBar confidence={well.confidence} /></span>
          </Field>
        )}
        {!verified && <Field label="Detected on">{formatDate(well.detectedOn, true)}</Field>}
        {!verified && well.ownerName && <Field label="Found by">{well.ownerName}</Field>}
        {verified && <Field label="Type">{well.wellType || "Open well"}</Field>}
        {verified && <Field label="Source">{well.source === "admin-manual" ? "Marked by administrator" : "Survey record"}</Field>}
        {verified && <Field label="Notes">{well.notes || <span className="text-slate-400">None</span>}</Field>}
      </dl>
      <p className="mt-3 text-[11px] text-slate-500">Coordinates are WGS 84 (EPSG:4326).</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <CopyButton text={formatCoord(well.latitude, well.longitude, "decimal", 7)} label="Copy lat, lon" />
        <a href={googleMapsUrl(well.latitude, well.longitude)} target="_blank" rel="noreferrer" className={btn.small}>
          <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
        </a>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
        {canDelete ? (
          <button type="button" className={btn.dangerSmall} onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /> Delete well</button>
        ) : <span />}
        <button type="button" className={btn.secondary} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
