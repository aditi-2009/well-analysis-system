"""
schemas/ai_model.py

AI model metadata — what model is active, version, performance metrics.

WHY THIS FILE EXISTS
-----------------------
Master prompt Section 5/22: the backend must NOT hardcode model names
(YOLO, Faster R-CNN, etc.). Instead, the active model is registered in
the ai_models DB table, versioned, and tracked with each prediction so
you can answer "which model generated this well?" (Section 22). This
schema documents what the frontend sees when it asks "what model is
currently active?"

WHO IMPORTS THIS FILE
------------------------
- api/v1/endpoints/models.py (future) — GET /models returns this
- services/detection_service.py (future) — records which model_id was
  used for each prediction
- Indirectly: any analytics that groups predictions by model

WHAT THIS FILE IMPORTS
------------------------
schemas/common.py (OrmBaseModel), stdlib.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import OrmBaseModel


class AIModelResponse(OrmBaseModel):
    """
    One registered AI model, with its performance metrics and status.
    Inherits OrmBaseModel so this can be built from a SQLAlchemy
    ai_model row via model_validate(db_row) once db/models/ai_model.py
    exists.
    """

    model_id: str = Field(
        description=(
            "Unique identifier for this model version, e.g., "
            "'well_detector_yolo_v11_2024-01-15'. Never hardcoded in code."
        )
    )
    model_name: str = Field(description="Human-readable name, e.g., 'YOLO v11'.")
    model_version: str = Field(description="Semantic version, e.g., '1.2.0'.")
    architecture: str = Field(
        description=(
            "Model family, e.g., 'YOLO', 'Faster R-CNN', 'SAM'. "
            "For informational purposes — backend never branches on this."
        )
    )
    framework: str = Field(description="Framework/library, e.g., 'PyTorch', 'TensorFlow'.")
    task: str = Field(
        description=(
            "Logical task this model handles, e.g., 'well_detection'. "
            "Matches AI_DETECTION_TASK from config.py."
        )
    )
    is_active: bool = Field(
        description="True if this is the currently active model for its task."
    )
    accuracy_metric: float | None = Field(
        default=None,
        ge=0,
        le=1,
        description=(
            "Performance metric on validation set. Interpretation depends on "
            "the metric (mAP, F1, recall, etc.) — see metric_name."
        ),
    )
    metric_name: str | None = Field(
        default=None,
        description="Name of the metric, e.g., 'mAP', 'F1', 'Recall'.",
    )
    weights_path: str | None = Field(
        default=None,
        description=(
            "Path to weights file on disk, e.g., "
            "'../Ai-Models/weights/well_detector_v1.pt'. "
            "Null if weights are embedded or sourced elsewhere."
        ),
    )
    trained_on_dataset: str | None = Field(
        default=None,
        description="Dataset name/version this model was trained on.",
    )
    created_at: datetime | None = Field(default=None)
    updated_at: datetime | None = Field(default=None)


class ActiveModelResponse(BaseModel):
    """
    Simpler version returned by GET /models/active — just the currently
    active model, not a list.
    """

    model_id: str
    model_name: str
    model_version: str
    architecture: str
    is_active: bool = True
    accuracy_metric: float | None = None
    metric_name: str | None = None