// Administrators only: record a well the detection missed. The village, taluka and district are found from the
// village boundaries, and can be corrected before saving.
import { useEffect, useState } from "react";
import { MapPin, Save } from "lucide-react";
import { Alert, Modal, Spinner, btn, inputCls, labelCls } from "../common/ui";
import { createKnownWell } from "../../services/wellService";
import { locatePoint } from "../../services/locationService";

const WELL_TYPES = ["Open well", "Bore well", "Farm pond", "Other water source"];

export default function MarkWellModal({ at, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!at) return undefined;
    let alive = true;
    setForm({ wellType: "Open well", notes: "", village: "", taluka: "", district: "", confirm: false });
    setError("");
    setLocating(true);
    locatePoint(at.lat, at.lon)
      .then((r) => {
        if (alive) setForm((f) => (f ? { ...f, village: r.village || "", taluka: r.taluka || "", district: r.district || "" } : f));
      })
      .catch(() => {})
      .finally(() => { if (alive) setLocating(false); });
    return () => { alive = false; };
  }, [at]);

  if (!at || !form) return null;

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async () => {
    if (!form.confirm) {
      setError("Tick the box to confirm that this point is a real well.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await createKnownWell({
        latitude: at.lat,
        longitude: at.lon,
        well_type: form.wellType,
        village: form.village.trim() || null,
        taluka: form.taluka.trim() || null,
        district: form.district.trim() || null,
        notes: form.notes.trim() || null,
      });
      onSaved?.(res);
      onClose?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={busy ? undefined : onClose} title="Mark a well the detection missed" icon={MapPin} wide>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Exact position (WGS 84)</p>
          <p className="font-mono text-sm font-semibold text-slate-900">{at.lat.toFixed(7)}, {at.lon.toFixed(7)}</p>
        </div>
        {locating && (
          <p className="flex items-center gap-2 text-xs text-slate-500"><Spinner className="h-4 w-4" /> Finding the village from the boundaries...</p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={labelCls} htmlFor="mk-village">Village</label><input id="mk-village" className={inputCls} value={form.village} onChange={set("village")} /></div>
          <div><label className={labelCls} htmlFor="mk-taluka">Taluka</label><input id="mk-taluka" className={inputCls} value={form.taluka} onChange={set("taluka")} /></div>
          <div><label className={labelCls} htmlFor="mk-district">District</label><input id="mk-district" className={inputCls} value={form.district} onChange={set("district")} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="mk-type">Type</label>
            <select id="mk-type" className={inputCls} value={form.wellType} onChange={set("wellType")}>
              {WELL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="mk-notes">Notes</label>
            <input id="mk-notes" className={inputCls} placeholder="For example: beside the field bund" value={form.notes} onChange={set("notes")} />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 accent-emerald-700" checked={form.confirm} onChange={set("confirm")} />
          I confirm that this point is a real well (checked on imagery or in the field).
        </label>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btn.secondary} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={btn.primary} onClick={save} disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save well
          </button>
        </div>
      </div>
    </Modal>
  );
}
