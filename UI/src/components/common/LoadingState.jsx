// src/components/common/LoadingState.jsx
// Shown while a page loads. The grey blocks hold the shape of the content,
// so the page does not jump when the data arrives.
export default function LoadingState({ label = "Loading", rows = 3 }) {
  const blocks = Array.from({ length: rows }, (_, index) => index);

  return (
    <div className="ds-card" role="status" aria-live="polite">
      <div className="ds-loading-row">
        <span className="ds-spinner ds-spinner-lg" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="ds-stack-sm" style={{ marginTop: 20 }} aria-hidden="true">
        {blocks.map((index) => (
          <div
            key={index}
            className="ds-skel"
            style={{
              height: index === 0 ? 180 : 14,
              width: index === 0 ? "100%" : `${88 - index * 14}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}