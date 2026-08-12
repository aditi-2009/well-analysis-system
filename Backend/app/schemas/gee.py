"""
schemas/gee.py

Google Earth Engine imagery search and download contracts.

WHY THIS FILE EXISTS
-----------------------
Master prompt Section 11/31 Phase 9: location-based detection needs
imagery. GEE provider (architecture-only for now) will search by
geographic area and download suitable scenes. This schema documents
the request shape (what area to search) and response shape (what
metadata about available imagery comes back).

WHO IMPORTS THIS FILE
------------------------
- api/v1/endpoints/gee.py (future) — search/download endpoints
- services/gee_service.py (future) — orchestrates GEE API calls
- services/detection_service.py (future) — calls gee_service for
  location-based detection flow

WHAT THIS FILE IMPORTS
------------------------
Only stdlib/pydantic. No project imports.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ImageryProvider(str, Enum):
    """
    Imagery sources. GEE today, extensible to future providers.
    """

    GOOGLE_EARTH_ENGINE = "gee"
    FUTURE_PROVIDER = "future"


class SatelliteSensor(str, Enum):
    """Known satellite sensors available through GEE."""

    SENTINEL_2 = "sentinel2"
    LANDSAT_8 = "landsat8"
    LANDSAT_9 = "landsat9"


class ImagerySearchRequest(BaseModel):
    """
    Request to search for imagery covering a geographic area.
    Does NOT directly upload; gee_service resolves these to an actual
    imagery acquisition (which may take time).
    """

    village_id: int = Field(
        gt=0,
        description=(
            "Lookup the village's boundary; search for imagery covering it. "
            "Avoids hardcoding bounds in the request."
        ),
    )
    min_date: datetime | None = Field(
        default=None,
        description="Earliest imagery date to consider. None = any date.",
    )
    max_date: datetime | None = Field(
        default=None,
        description="Latest imagery date to consider. None = today.",
    )
    max_cloud_percent: float | None = Field(
        default=None,
        ge=0,
        le=100,
        description="Filter scenes with cloud cover > this percent. None = no filter.",
    )
    sensor: SatelliteSensor = Field(
        default=SatelliteSensor.SENTINEL_2,
        description="Which satellite sensor to prefer.",
    )


class ImagerySceneMetadata(BaseModel):
    """
    One scene (acquisition) matching the search criteria.
    """

    scene_id: str = Field(
        description=(
            "Unique identifier from the provider "
            "(e.g., GEE asset ID)."
        )
    )
    acquisition_date: datetime
    cloud_percent: float = Field(ge=0, le=100)
    spatial_resolution_m: float = Field(
        gt=0,
        description="Native pixel size in meters.",
    )
    sensor: SatelliteSensor
    provider: ImageryProvider = Field(default=ImageryProvider.GOOGLE_EARTH_ENGINE)


class ImagerySearchResponse(BaseModel):
    """
    Results of an imagery search — list of scenes matching the query.
    """

    village_id: int = Field(gt=0)
    total_scenes: int = Field(ge=0)
    scenes: list[ImagerySceneMetadata]
    search_date: datetime = Field(default_factory=datetime.utcnow)


class ImageryDownloadRequest(BaseModel):
    """
    Request to download a specific scene and save it as a GeoTIFF in
    storage/uploads/ (triggering the same pipeline as a file upload).
    """

    scene_id: str = Field(description="Scene ID from ImagerySearchResponse.")
    village_id: int = Field(gt=0)
    sensor: SatelliteSensor
    provider: ImageryProvider = Field(default=ImageryProvider.GOOGLE_EARTH_ENGINE)


class ImageryDownloadResponse(BaseModel):
    """
    After downloading and storing the scene, return its file_id so
    detection can be triggered immediately, or the user can inspect
    it first.
    """

    file_id: str = Field(
        description=(
            "Unique identifier for the downloaded GeoTIFF. "
            "Use this in POST /detect."
        )
    )
    scene_id: str
    village_id: int
    acquisition_date: datetime
    storage_path: str = Field(description="Path to the file in storage/uploads/")