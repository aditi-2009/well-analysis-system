// src/pages/WellDetection.jsx
import { useState } from "react";
import { Search, PlayCircle } from "lucide-react";
import { runDetection } from "../services/detectionService";
import WellMap from "../components/map/WellMap";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { useNavigate } from "react-router-dom";

// Workflow stages, matches the spec's step list
const STAGES = {
  SELECT: "select",
  PREVIEW: "preview",
  PROCESSING: "processing",
  COMPLETED: "completed",
};

const AREA_TYPES = ["Village", "Taluka", "District", "Custom Area"];

function WellDetection() {
  const navigate = useNavigate();

  const [areaType, setAreaType] = useState("District");
  const [formData, setFormData] = useState({
    district: "",
    taluka: "",
    village: "",
    latitude: "",
    longitude: "",
  });

  const [stage, setStage] = useState(STAGES.SELECT);
  const [error, setError] = useState("");
  const [detectedWells, setDetectedWells] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreview = (e) => {
    e.preventDefault();
    setError("");

    if (!formData.district.trim()) {
      setError("Please enter at least a District to preview the area.");
      return;
    }

    setStage(STAGES.PREVIEW);
  };

  const handleStartDetection = async () => {
    setError("");
    setStage(STAGES.PROCESSING);

    try {
      const results = await runDetection(formData);
      setDetectedWells(results);
      setStage(STAGES.COMPLETED);
    } catch (err) {
      setError(err.message || "Detection failed. Please try again.");
      setStage(STAGES.PREVIEW); // fall back so user can retry
    }
  };

  const handleReset = () => {
    setStage(STAGES.SELECT);
    setDetectedWells([]);
    setError("");
  };

  return (
    <div className="detection-page">
      <h2 className="page-heading">Agricultural Well Detection</h2>
      <p className="page-subheading">Select an area to run YOLO-based well detection</p>

      {error && <ErrorMessage message={error} />}

      {/* ---- Stage: SELECT ---- */}
      {stage === STAGES.SELECT && (
        <div className="detection-form-card">
          <div className="area-type-tabs">
            {AREA_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`area-type-tab ${areaType === type ? "area-type-tab-active" : ""}`}
                onClick={() => setAreaType(type)}
              >
                {type}
              </button>
            ))}
          </div>

          <form onSubmit={handlePreview} className="detection-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="district">District</label>
                <input
                  id="district"
                  name="district"
                  type="text"
                  placeholder="e.g. Nagpur"
                  value={formData.district}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="taluka">Taluka</label>
                <input
                  id="taluka"
                  name="taluka"
                  type="text"
                  placeholder="e.g. Kalmeshwar"
                  value={formData.taluka}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="village">Village</label>
                <input
                  id="village"
                  name="village"
                  type="text"
                  placeholder="e.g. Wadi"
                  value={formData.village}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="latitude">Latitude</label>
                <input
                  id="latitude"
                  name="latitude"
                  type="text"
                  placeholder="21.1458"
                  value={formData.latitude}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="longitude">Longitude</label>
                <input
                  id="longitude"
                  name="longitude"
                  type="text"
                  placeholder="79.0882"
                  value={formData.longitude}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>&nbsp;</label>
                <button type="button" className="search-location-btn">
                  <Search size={16} /> Search Location
                </button>
              </div>
            </div>

            <button type="submit" className="preview-btn">
              Preview Area
            </button>
          </form>
        </div>
      )}

      {/* ---- Stage: PREVIEW ---- */}
      {stage === STAGES.PREVIEW && (
        <div className="detection-preview-card">
          <h3 className="section-title">Area Preview</h3>
          <div className="preview-summary">
            <p><strong>District:</strong> {formData.district}</p>
            {formData.taluka && <p><strong>Taluka:</strong> {formData.taluka}</p>}
            {formData.village && <p><strong>Village:</strong> {formData.village}</p>}
            {formData.latitude && <p><strong>Latitude:</strong> {formData.latitude}</p>}
            {formData.longitude && <p><strong>Longitude:</strong> {formData.longitude}</p>}
          </div>

          <WellMap wells={[]} />

          <div className="preview-actions">
            <button className="secondary-btn" onClick={handleReset}>
              Back
            </button>
            <button className="start-detection-btn" onClick={handleStartDetection}>
              <PlayCircle size={18} /> Start Well Detection
            </button>
          </div>
        </div>
      )}

      {/* ---- Stage: PROCESSING ---- */}
      {stage === STAGES.PROCESSING && (
        <div className="detection-processing-card">
          <Loader message="Running YOLO detection model on selected area..." />
        </div>
      )}

      {/* ---- Stage: COMPLETED ---- */}
      {stage === STAGES.COMPLETED && (
        <div className="detection-completed-card">
          <h3 className="section-title">Detection Completed</h3>

          {detectedWells.length === 0 ? (
            <>
              <ErrorMessage message="No wells were detected in the selected area." />
              <button className="secondary-btn" onClick={handleReset}>
                Try a Different Area
              </button>
            </>
          ) : (
            <>
              <p className="page-subheading">
                {detectedWells.length} wells detected in {formData.district}
              </p>
              <WellMap wells={detectedWells} />
              <div className="preview-actions">
                <button className="secondary-btn" onClick={handleReset}>
                  Run New Detection
                </button>
                <button
                  className="start-detection-btn"
                  onClick={() => navigate("/results")}
                >
                  View Full Results
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default WellDetection;