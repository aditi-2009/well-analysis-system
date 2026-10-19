// src/components/common/EmptyState.jsx
// What a screen shows when there is nothing to show yet. It says why,
// and what the user can do next.
export default function EmptyState({ icon: Icon = null, title, children = null, action = null }) {
  return (
    <div className="ds-card ds-empty">
      {Icon && (
        <div className="ds-empty-icon" aria-hidden="true">
          <Icon size={26} />
        </div>
      )}
      <h2 className="ds-empty-title">{title}</h2>
      {children && <p className="ds-empty-text">{children}</p>}
      {action}
    </div>
  );
}