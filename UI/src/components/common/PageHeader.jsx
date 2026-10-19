// src/components/common/PageHeader.jsx
// The title block at the top of each app page: the heading, a short description,
// and the page's main actions.
export default function PageHeader({ title, description, actions = null }) {
  return (
    <div className="ds-page-header">
      <div>
        <h1 className="ds-page-title">{title}</h1>
        {description && <p className="ds-page-desc">{description}</p>}
      </div>
      {actions && <div className="ds-page-actions">{actions}</div>}
    </div>
  );
}