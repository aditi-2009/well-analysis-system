# version: well-detection-2
"""
schemas/detection.py

Request and reply shapes for detection jobs.
An empty area means "no area". An empty setting means "the server default" from .env.

WHO IMPORTS THIS: api/v1/endpoints/well.py
WHAT IT IMPORTS: pydantic
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DetectionRequest(BaseModel):
    image_id: str = Field(min_length=1, max_length=255)
    district_id: int | None = Field(default=None, gt=0)
    taluka_id: int | None = Field(default=None, gt=0)
    village_id: int | None = Field(default=None, gt=0)
    tile_size: int | None = Field(default=None, ge=256, le=1024)
    normalize: Literal["none", "stretch"] | None = None
    confidence: float | None = Field(default=None, ge=0.01, le=0.99)


class DetectionJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    image_id: str
    district: str | None = None
    taluka: str | None = None
    village: str | None = None
    model_version: str
    params: dict | None = None  # settings used, plus "image" and "stats" once known
    tiles_total: int | None = None
    tiles_done: int = 0
    total_detections: int = 0
    error_message: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None