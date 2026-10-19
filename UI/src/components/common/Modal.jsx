// src/components/common/Modal.jsx
// A dialog. Keyboard focus stays inside it, Escape closes it, a click on the dark
// background closes it, and focus returns to the control that opened it.
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, title, onClose, children, footer = null, width }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = useId();

  // Keeps the latest onClose without restarting the focus logic on every render.
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        closeRef.current?.();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="ds-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current?.();
      }}
    >
      <div
        ref={dialogRef}
        className="ds-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={width ? { width } : undefined}
      >
        <div className="ds-modal-head">
          <h2 id={titleId} className="ds-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="ds-icon-btn"
            onClick={() => closeRef.current?.()}
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="ds-modal-body">{children}</div>
        {footer && <div className="ds-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}