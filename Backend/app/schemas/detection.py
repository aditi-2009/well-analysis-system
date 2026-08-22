"""
schemas/detection.py

Request/response contracts for the well-detection pipeline.

WHY THIS FILE EXISTS
-----------------------
Defines the ONE standardized shape a well detection result takes,
regardless of which AI model produced it (YOLO today, Faster R-CNN or
another model later — see master prompt Section 5/6). Also defines the
two distinct ways detection can be triggered (file upload vs. location
selection — Section 10), kept as separate request schemas so an
invalid combined state (e.g. both a file AND a village_id present) is
structurally impossible rather than something a service has to check
for at runtime.

WHO IMPORTS THIS FILE
------------------------
- api/v1/endpoints/detection.py (future) — request validation +
  response_model.
- services/detection_service.py (future) — constructs
  WellDetectionResponse after orchestrating GIS + AI Bridge.
- ml/bridge.py (future) — maps raw AI engine output into WellDetection
  items before returning to the service layer.

WHAT THIS FILE IMPORTS
------------------------
Only schemas/common.py (OrmBaseModel, PaginatedResponse) and stdlib/
pydantic. No service, db, or api imports — schemas stay low in the
dependency graph.

DESIGN PATTERN
-----------------
Standardized output contract (matches the "Standardized Prediction
Contract" in the GEE architecture doc) + discriminated request schemas
per input type (Section 10: file-based and location-based detection
must converge on one pipeline without duplicating logic — modeled here
as two request shapes feeding one response shape).

WHAT THIS FILE DOES NOT DO
------------------------------
Does not define GIS geometry beyond a simple lat/lon pair. A full
GeoJSON Point/Polygon representation belongs in schemas/location.py or
a dedicated geojson schema once gis/geojson_builder.py exists — kept
out of here to avoid this file taking on GIS-layer responsibility.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import OrmBaseModel, PaginatedResponse


class DetectionStatus(str, Enum):
    """
    Mirrors the job lifecycle from master prompt Section 20/9:
    queued -> processing -> completed -> failed. Modeled as an Enum so
    FastAPI validates it automatically and /docs shows the exact
    allowed values instead of "any string."
    """

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ---------------------------------------------------------------------
# Per-detection item — the standardized AI output contract
# ---------------------------------------------------------------------
class BoundingBox(BaseModel):
    """
    Pixel-space bounding box as returned by the AI engine, BEFORE
    geographic conversion. x, y are top-left corner; width/height in
    pixels. Kept separate from geographic fields (see WellDetection
    below) because pixel coordinates and lat/lon coordinates must never
    be conflated — master prompt Section 18 is explicit about this.
    """

    x: float = Field(ge=0, description="Top-left X, in pixels, within the source patch.")
    y: float = Field(ge=0, description="Top-left Y, in pixels, within the source patch.")
    width: float = Field(gt=0, description="Box width in pixels.")
    height: float = Field(gt=0, description="Box height in pixels.")


class WellDetection(BaseModel):
    """
    One detected well, AFTER pixel-to-geographic conversion
    (coordinate_service.py's job) and spatial validation
    (spatial_validator.py's job) have both run. This is what ends up
    in a WellDetectionResponse and what gets persisted per-row when the
    database layer exists.

    Deliberately does NOT include which model produced it — that lives
    once at the response level (model_id/model_version), not repeated
    per detection, since every detection in one response came from the
    same inference run.
    """

    detection_id: str = Field(description="Unique id for this specific detection.")
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    confidence: float = Field(ge=0, le=1, description="Model confidence score, 0-1.")
    bounding_box: BoundingBox = Field(description="Original pixel-space box, preserved for audit/debug.")


# ---------------------------------------------------------------------
# Request schemas — two entry points, per master prompt Section 10
# ---------------------------------------------------------------------
class FileDetectionRequest(BaseModel):
    """
    Metadata accompanying a file-based detection request. The actual
    raster file arrives as multipart/form-data (UploadFile in FastAPI),
    NOT as a field on this schema — file bytes don't belong in a JSON
    body. This schema covers everything else about the request.
    """

    patch_size: int = Field(
        default=200,
        gt=0,
        description=(
            "Model input patch size in pixels. Configurable per master "
            "prompt Section 17 — do not hardcode 200 as permanently correct."
        ),
    )
    overlap: int = Field(
        default=0,
        ge=0,
        description="Overlap between adjacent patches, in pixels.",
    )

    @model_validator(mode="after")
    def _overlap_smaller_than_patch(self) -> "FileDetectionRequest":
        if self.overlap >= self.patch_size:
            raise ValueError("overlap must be smaller than patch_size.")
        return self


class LocationDetectionRequest(BaseModel):
    """
    Triggers location-based detection (Section 10B): resolve a village
    to a boundary, acquire imagery for that boundary (future GEE
    service), then run the same detection pipeline as the file-based
    flow. village_id references the future villages table — kept as a
    plain int here since db/models/village.py doesn't exist yet in
    this conversation; this schema will need its FK-style validation
    tightened once that table is real.
    """

    village_id: int = Field(gt=0, description="Identifier of the target village.")
    patch_size: int = Field(default=200, gt=0)
    overlap: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def _overlap_smaller_than_patch(self) -> "LocationDetectionRequest":
        if self.overlap >= self.patch_size:
            raise ValueError("overlap must be smaller than patch_size.")
        return self


# ---------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------
class WellDetectionResponse(OrmBaseModel):
    """
    The single standardized shape returned by well-detection requests,
    regardless of whether they were file-based or location-based, and
    regardless of which AI model produced the detections (master prompt
    Section 5/6). Inherits OrmBaseModel so this can later be built
    directly from a SQLAlchemy Prediction row via model_validate(),
    once db/models/prediction.py exists.
    """

    prediction_id: str = Field(description="Unique id for this detection run.")
    status: DetectionStatus
    task: str = Field(
        default="well_detection",
        description="Logical task name sent to the AI bridge — never a model name.",
    )
    model_id: str | None = Field(
        default=None, description="Which registered model produced this result. Set once AI bridge exists."
    )
    model_version: str | None = Field(default=None)
    detections: list[WellDetection] = Field(default_factory=list)
    detection_count: int = Field(ge=0, default=0)
    processing_time_ms: float | None = Field(default=None, ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @model_validator(mode="after")
    def _detection_count_matches(self) -> "WellDetectionResponse":
        """
        Guards against a service accidentally reporting a count that
        doesn't match the actual list length — catches a real class of
        bug (stale count after filtering detections) at construction
        time instead of silently shipping a wrong number to the client.
        """
        if self.detection_count != len(self.detections):
            self.detection_count = len(self.detections)
        return self


class WellDetectionListResponse(PaginatedResponse[WellDetectionResponse]):
    """
    Paginated list of past detection runs — backs a future
    GET /predictions endpoint. Reuses PaginatedResponse from
    schemas/common.py rather than redefining page/total/page_size here.
    """

    pass