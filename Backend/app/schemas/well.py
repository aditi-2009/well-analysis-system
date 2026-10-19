"""
schemas/well.py

One detected well, as the API returns it. The names match what the React
mapper (utils/wellMapper.js) reads. The pixel box and model version are extra.

WHO IMPORTS THIS: api/v1/endpoints/well.py
WHAT IT IMPORTS: pydantic
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WellOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    confidence: float = Field(ge=0, le=1)
    class_name: str
    status: str = "Detected"
    district: str | None = None
    taluka: str | None = None
    village: str | None = None
    model_version: str | None = None
    px_x1: int | None = None
    px_y1: int | None = None
    px_x2: int | None = None
    px_y2: int | None = None
    detected_on: datetime | None = None
