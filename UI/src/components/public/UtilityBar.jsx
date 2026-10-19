// src/components/public/UtilityBar.jsx
import { useEffect, useState } from "react";

function UtilityBar() {
  const [fontScale, setFontScale] = useState(100);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
  }, [fontScale]);

  return (
    <div className="utility-bar" role="region" aria-label="Utility bar">
      <div className="utility-bar-inner">
        <span className="utility-bar-item">Government of India</span>
        <div className="utility-bar-controls">
          <span className="utility-bar-label">Text size</span>
          <button type="button" aria-label="Decrease text size" onClick={() => setFontScale((s) => Math.max(85, s - 10))}>
            A-
          </button>
          <button type="button" aria-label="Reset text size" onClick={() => setFontScale(100)}>
            A
          </button>
          <button type="button" aria-label="Increase text size" onClick={() => setFontScale((s) => Math.min(130, s + 10))}>
            A+
          </button>
          <a href="/accessibility">Accessibility</a>
        </div>
      </div>
    </div>
  );
}

export default UtilityBar;
