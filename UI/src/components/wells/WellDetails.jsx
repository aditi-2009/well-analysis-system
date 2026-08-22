// src/components/wells/WellDetails.jsx
import { X } from "lucide-react";
import { CONFIDENCE_LEVELS } from "../../utils/constants";

const PLACEHOLDER_ORIGINAL_IMAGE = "https://placehold.co/500x350?text=Original+Image";
const PLACEHOLDER_DETECTION_IMAGE = "https://placehold.co/500x350?text=Detection+Result+(Bounding+Box)";

function getConfidenceLabel(confidence) {
  if (confidence >= CONFIDENCE_LEVELS.HIGH) return { label: "High", color: "#16a34a" };
  if (confidence >= CONFIDENCE_LEVELS.MEDIUM) return { label: "Medium", color: "#f59e0b" };
  return { label: "Low", color: "#dc2626" };
}

function WellDetails({ well, onClose }) {
  if (!well) return null;

  const { label, color } = getConfidenceLabel(well.confidence);

  return (
    <div className="well-details-overlay" onClick={onClose}>
      <div className="well-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="well-details-header">
          <h3>Well Details — {well.id}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="well-details-body">
          <div className="well-details-info">
            <div className="detail-row">
              <span className="detail-label">Well ID</span>
              <span className="detail-value">{well.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Area / Village</span>
              <span className="detail-value">{well.village}, {well.taluka}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">District</span>
              <span className="detail-value">{well.district}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Coordinates</span>
              <span className="detail-value">{well.latitude}, {well.longitude}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Confidence Score</span>
              <span className="detail-value">
                {Math.round(well.confidence * 100)}%{" "}
                <span className="confidence-badge" style={{ backgroundColor: `${color}1A`, color }}>
                  {label}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Detection Date</span>
              <span className="detail-value">{well.detectedOn}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value">{well.status}</span>
            </div>
          </div>

          <div className="well-details-images">
            <div className="image-block">
              <p className="image-block-label">Original Image</p>
              <img src={PLACEHOLDER_ORIGINAL_IMAGE} alt="Original aerial view" />
            </div>
            <div className="image-block">
              <p className="image-block-label">Detection Result</p>
              <img src={PLACEHOLDER_DETECTION_IMAGE} alt="Detection with bounding box" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WellDetails;