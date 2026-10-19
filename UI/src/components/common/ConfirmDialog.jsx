// src/components/common/ConfirmDialog.jsx
// Asks before an action that cannot be undone. The confirm button names the action,
// so the user reads what will happen before pressing it.
import Button from "./Button";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? undefined : onCancel}
      width="min(460px, 100%)"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="ds-body-text">{children}</div>
    </Modal>
  );
}