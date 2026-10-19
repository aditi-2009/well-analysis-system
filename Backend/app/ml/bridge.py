"""
ml/bridge.py

Bridge to YOLOv11 model from Ai-Models folder.
Loads the model ONCE at startup, runs inference on demand.

WHY THIS FILE EXISTS
-----------------------
Backend doesn't run training (that happens on work system in Ai-Models/).
This file wraps YOLOv11's .predict() API so the rest of the backend
never knows about model loading, paths, or inference details.
If we switch to Faster R-CNN later, ONLY this file changes.

WHO IMPORTS THIS FILE
------------------------
services/detection_service.py — calls run_inference(image_path)

WHAT THIS FILE IMPORTS
------------------------
ultralytics (YOLO), pathlib, logging
"""

import numpy as np
import logging
import threading
from typing import Any
from pathlib import Path
from app.core.config import get_settings
from app.core.exceptions import AIInferenceException

logger = logging.getLogger(__name__)
settings = get_settings()

_model: Any = None
_lock = threading.Lock()


def load_model() -> Any:
    """Load weights once; later calls return the cached model."""
    global _model

    with _lock:
        if _model is not None:
            return _model

        weights = settings.MODEL_WEIGHTS_PATH

        if not weights.is_absolute():
            weights = (Path(__file__).resolve().parents[2] / weights).resolve()

        if not weights.is_file():
            raise AIInferenceException(
                "AI model is not available.",
                detail=f"Weights file not found: {weights}",
            )

        try:
            from ultralytics import YOLO
        except ImportError as e:
            raise AIInferenceException(
                "AI engine is not installed.",
                detail=str(e),
            ) from e

        logger.info("Loading model from %s", weights)
        _model = YOLO(str(weights))
        logger.info("Model loaded")

        return _model


def run_inference(image_path: str) -> list[dict]:
    """Return pixel-space detections:
    [{x1, y1, x2, y2, confidence, class_id, class_name}, ...]"""
    model = load_model()
    try:
        results = model.predict(
            image_path,
            conf=settings.AI_CONFIDENCE_THRESHOLD,
            verbose=False,
        )
    except Exception as e:
        raise AIInferenceException(
            "Detection failed on this image.", detail=str(e)
        ) from e

    detections = []
    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            class_id = int(box.cls[0])
            detections.append(
                {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                    "confidence": float(box.conf[0]),
                    "class_id": class_id,
                    "class_name": result.names.get(class_id, "unknown"),
                }
            )
    logger.info("Found %d detections", len(detections))
    return detections


def describe_model() -> dict:
    """Static description for GET /models until an ai_model table exists."""
    return {
        "model_id": "yolo11m_default",
        "model_name": "YOLO v11 (well detector)",
        "model_version": "1.0.0",
        "architecture": "YOLO",
        "framework": "PyTorch",
        "task": settings.AI_DETECTION_TASK,
        "is_active": True,
        "weights_path": str(settings.MODEL_WEIGHTS_PATH),
    }


def _to_detections(results) -> list[dict]:
    detections = []
    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            class_id = int(box.cls[0])
            detections.append(
                {
                    "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                    "confidence": float(box.conf[0]),
                    "class_id": class_id,
                    "class_name": result.names.get(class_id, "unknown"),
                }
            )
    return detections


def predict_tile(
    rgb: np.ndarray, conf: float | None = None, imgsz: int = 640
) -> list[dict]:
    """Run the model on ONE in-memory RGB uint8 tile (H, W, 3).
    Returns boxes in that tile's own pixel coordinates."""
    model = load_model()
    # Ultralytics treats numpy arrays as BGR (OpenCV order); our tile is RGB.
    bgr = np.ascontiguousarray(rgb[..., ::-1])
    try:
        results = model.predict(
            bgr,
            conf=settings.AI_CONFIDENCE_THRESHOLD if conf is None else conf,
            imgsz=imgsz,
            verbose=False,
        )
    except Exception as e:
        raise AIInferenceException(
            "Detection failed on this image tile.", detail=str(e)
        ) from e
    return _to_detections(results)
