// Asks before anything is deleted.
import { Trash2 } from "lucide-react";
import { Modal, Spinner, btn } from "./ui";

export default function ConfirmDelete({ open, title, text, busy = false, onCancel, onConfirm, confirmLabel = "Delete" }) {
  return (
    <Modal open={open} onClose={busy ? undefined : onCancel} title={title} icon={Trash2}>
      <p className="text-sm leading-relaxed text-slate-600">{text}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className={btn.secondary} onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={btn.danger} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner className="h-4 w-4" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
