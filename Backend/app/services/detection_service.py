"""
services/detection_service.py

Orchestrates the detection pipeline:
  1. Load satellite image from storage
  2. Run YOLOv11 inference
  3. Convert pixel coordinates → lat/lon
  4. Save results to database
  5. Return GeoJSON

WHO IMPORTS THIS FILE
------------------------
api/v1/endpoints/detection.py (calls detect_wells_in_image)

WHAT THIS FILE IMPORTS
------------------------
ml/bridge.py (run_inference)
gis/coordinate_converter.py (pixel_to_geojson)
db/repository/prediction_repository.py (save_prediction)
logging, pathlib, uuid

Pipeline: AI inference -> pixel->lat/lon -> save Prediction + Wells.
Imports: ml.bridge, gis.coordinate_converter, repositories, models.
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models.prediction import Prediction
from app.db.models.well import Well
from app.db.repository import well_repository
from app.db.repository.prediction_repository import PredictionRepository
from app.gis.coordinate_converter import pixel_to_geojson
from app.ml.bridge import run_inference

logger = logging.getLogger(__name__)
settings = get_settings()

DEFAULT_MODEL_ID = "yolo11m_default"


def _utcnow() -> datetime:
    """Naive UTC (matches DateTime columns) without utcnow() deprecation."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def detect_wells_in_image(
    image_path: str,
    db: Session,
    user_id: int | None = None,
    file_id: str | None = None,
    model_id: str = DEFAULT_MODEL_ID,
) -> dict:
    prediction_id = str(uuid.uuid4())
    started = _utcnow()
    log = f"[{prediction_id}]"

    try:
        logger.info("%s inference on %s", log, image_path)
        pixel_detections = run_inference(image_path)

        logger.info("%s converting %d detections", log, len(pixel_detections))
        features = pixel_to_geojson(image_path, pixel_detections)

        finished = _utcnow()
        prediction = Prediction(
            prediction_id=prediction_id,
            task=settings.AI_DETECTION_TASK,
            status="completed",
            model_id=model_id,
            file_id=file_id,
            user_id=user_id,
            detection_count=len(features),
            detections=features,
            created_at=started,
            completed_at=finished,
        )
        wells = [
            Well(
                longitude=f["geometry"]["coordinates"][0],
                latitude=f["geometry"]["coordinates"][1],
                confidence=f["properties"]["confidence"],
                status="Detected",
                detected_on=finished,
            )
            for f in features
        ]
        PredictionRepository.save_prediction(db, prediction)
        well_repository.add_many(db, wells)

        logger.info("%s complete", log)
        return {
            "prediction_id": prediction_id,
            "status": "completed",
            "detection_count": len(features),
            "detections": features,
            "user_id": user_id,
            "created_at": started.isoformat(),
        }

    except Exception:
        db.rollback()
        logger.exception("%s detection failed", log)
        raise
