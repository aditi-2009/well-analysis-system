// src/components/common/Alert.jsx
// A message that stays on the page until the cause is fixed.
// Messages that should fade on their own use the toast instead.
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const VARIANTS = {
  error: { className: "ds-alert-error", Icon: AlertCircle, role: "alert" },
  success: { className: "ds-alert-success", Icon: CheckCircle2, role: "status" },
  info: { className: "ds-alert-info", Icon: Info, role: "status" },
};

export default function Alert({ variant = "info", title, children, action = null }) {
  const { className, Icon, role } = VARIANTS[variant] ?? VARIANTS.info;

  return (
    <div className={`ds-alert ${className}`} role={role}>
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <span className="ds-alert-title">{title}</span>}
        {children}
        {action && <div className="ds-alert-action">{action}</div>}
      </div>
    </div>
  );
}