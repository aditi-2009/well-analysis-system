// src/components/wells/WellDetails.jsx
// The full record of one well, in a dialog (focus stays inside, Escape closes it).
import Modal from "../common/Modal";
import Button from "../common/Button";
import { wellLevel } from "../../utils/confidence";

function recorded(value) {
  return value && value !== "Unknown" ? value : "Not recorded";
}

function WellDetails({ well, onClose }) {
  if (!well) return null;

  const level = wellLevel(well);
  const confidenceText =
    level.key === "verified" ? "Officer verified" : `${Math.round(well.confidence * 100)}% (${level.label})`;

  const rows = [
    ["Well ID", well.id],
    ["Village", recorded(well.village)],
    ["Taluka", recorded(well.taluka)],
    ["District", recorded(well.district)],
    ["Coordinates", `${well.latitude}, ${well.longitude}`],
    ["Confidence", <span className={`ds-pill ds-pill-${level.key}`}>{confidenceText}</span>],
    ["Detected on", well.detectedOn || "Not recorded"],
    ["Status", well.status],
  ];

  return (
    <Modal
      open
      title={`Well ${well.id}`}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <dl className="ds-kv ds-kv-rows">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="ds-picture-row">
        <figure className="ds-picture">
          <div className="ds-picture-box">Not available yet</div>
          <figcaption>Original image</figcaption>
        </figure>
        <figure className="ds-picture">
          <div className="ds-picture-box">Not available yet</div>
          <figcaption>Detection result</figcaption>
        </figure>
      </div>
    </Modal>
  );
}

export default WellDetails;
