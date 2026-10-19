// src/components/common/Button.jsx
// The one button for the app. Variants and sizes come from design.css (.ds-btn-*).
// While loading, the button shows a spinner and cannot be pressed twice.
export default function Button({
  variant = "primary",
  size = "md",
  icon: Icon = null,
  loading = false,
  block = false,
  type = "button",
  disabled = false,
  className = "",
  children,
  ...rest
}) {
  const classes = [
    "ds-btn",
    `ds-btn-${variant}`,
    size === "sm" ? "ds-btn-sm" : "",
    block ? "ds-btn-block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="ds-spinner" aria-hidden="true" />
      ) : (
        Icon && <Icon size={16} aria-hidden="true" />
      )}
      <span>{children}</span>
    </button>
  );
}