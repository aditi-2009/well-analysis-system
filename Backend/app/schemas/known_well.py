"""
schemas/known_well.py

Response contract for GET /api/v1/known-wells (a GeoJSON FeatureCollection).
"""

from typing import Any

from pydantic import BaseModel, Field


class KnownWellProperties(BaseModel):
    id: int
    well_identifier: str | None = None
    source: str
    district: str | None = None
    taluka: str | None = None
    village: str | None = None
    status: str | None = None
    well_type: str | None = None


class KnownWellFeature(BaseModel):
    type: str = "Feature"
    geometry: dict[str, Any] = Field(
        description='{"type": "Point", "coordinates": [longitude, latitude]}'
    )
    properties: KnownWellProperties


class KnownWellCollection(BaseModel):
    type: str = "FeatureCollection"
    count: int = Field(ge=0)
    features: list[KnownWellFeature]
