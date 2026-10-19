"""
schemas/upload.py

Request/response contracts for satellite imagery upload.

WHY THIS FILE EXISTS
-----------------------
Phase 4 (master prompt Section 30): file-based detection. A user uploads
a raster file (GeoTIFF, TIFF, ECW, etc.); the backend validates it,
detects its format and geospatial metadata, stores it safely, and
returns an UploadResponse with a file_id and all the metadata the
frontend/services need to make decisions about it.

WHO IMPORTS THIS FILE
------------------------
- api/v1/endpoints/upload.py (future) — receives file, returns
  UploadResponse
- services/upload_service.py (future) — coordinates file validation,
  format detection, storage, metadata extraction

WHAT THIS FILE IMPORTS
------------------------
Only schemas/common.py (OrmBaseModel) and stdlib/pydantic. No service,
db, or api imports.

DESIGN PATTERN
-----------------
Request schema is minimal (multipart file handling is FastAPI's job),
Response schema is detailed (captures all metadata format_normalizer.py
discovers per Section 12). Response inherits OrmBaseModel so it can
later be built from a SQLAlchemy row via model_validate(), once the
satellite_image table is wired in.

ARCHITECTURAL NOTE
--------------------
Upload and detection are deliberately separate. POST /upload returns a
file_id and metadata; POST /detect (with that file_id + detection params)
actually runs detection. This matches Section 9 (async, no blocking long
requests) and Section 10 (file and location flows converge on the same
detection pipeline, not separate implementations).
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import OrmBaseModel


class FileFormat(str, Enum):
    """
    Supported raster file formats. Kept as an Enum so validation is
    automatic and /docs shows exactly what's accepted. Expanded as new
    formats are supported — see Section 7 (flexible input formats).
    """

    GEOTIFF = "GeoTIFF"
    TIFF = "TIFF"
    JPEG = "JPEG"
    PNG = "PNG"
    ECW = "ECW"  # placeholder; actual ECW support depends on GDAL drivers
    COG = "COG"  # Cloud Optimized GeoTIFF


class UploadStatus(str, Enum):
    """
    Upload lifecycle. "pending_validation" → "validated" → "stored", or
    "validation_failed" if format_normalizer.py rejects it. Kept simple
    for now; async queuing (Section 20) will add "queued" → "processing"
    → "completed" if uploads become heavy.
    """

    PENDING_VALIDATION = "pending_validation"
    VALIDATED = "validated"
    STORED = "stored"
    VALIDATION_FAILED = "validation_failed"


class UploadResponse(OrmBaseModel):
    """
    The response returned after a successful file upload. Inherits
    OrmBaseModel so this can later be constructed directly from a
    SatelliteImage ORM row (once db/models/satellite_image.py exists)
    via model_validate(db_row), without manual field mapping.

    Captures all the geospatial metadata that format_normalizer.py
    discovers (Section 12), so downstream services and the frontend
    can make informed decisions without re-reading the file.
    """

    file_id: str = Field(
        description=(
            "Unique identifier for this upload. Used to reference this file "
            "in detection requests, database queries, and cleanup operations."
        )
    )
    original_filename: str = Field(
        description="Original filename as uploaded by the user (for audit/display)."
    )
    stored_filename: str = Field(
        description=(
            "Sanitized filename on disk (Section 24: safe filename handling). "
            "Located at storage/uploads/{stored_filename}."
        )
    )
    detected_format: str = Field(
        description="Format detected by format_normalizer.py (GeoTIFF, TIFF, etc.)."
    )
    file_size_bytes: int = Field(
        ge=0, description="Actual file size on disk, in bytes."
    )
    file_size_mb: float = Field(
        ge=0,
        description="Convenience field: file_size_bytes / 1_000_000.",
    )
    image_width: int | None = Field(
        default=None, ge=1, description="Image width in pixels, if detected."
    )
    image_height: int | None = Field(
        default=None, ge=1, description="Image height in pixels, if detected."
    )
    band_count: int | None = Field(
        default=None, ge=1, description="Number of bands (channels) if detected."
    )
    crs: str | None = Field(
        default=None,
        description=(
            "Coordinate reference system, e.g. 'EPSG:4326' or a full WKT string. "
            "Only present for georeferenced formats (GeoTIFF). None for non-spatial "
            "formats (JPEG). Critical for geographic coordinate conversion (Section 18)."
        ),
    )
    spatial_resolution_m: float | None = Field(
        default=None,
        ge=0,
        description=(
            "Pixel size in meters (GeoTIFF only). Derived from geotransform. "
            "Used for scientific evaluation (Section 11: small object problem)."
        ),
    )
    bounds: dict[str, float] | None = Field(
        default=None,
        description=(
            "Geospatial extent as {minx, miny, maxx, maxy} in the raster's CRS. "
            "Used for spatial validation and location filtering (Section 14/20)."
        ),
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Additional metadata from the raster (e.g. cloud cover, imagery date, "
            "sensor name). Preserved for audit and future analytics."
        ),
    )
    status: UploadStatus = Field(default=UploadStatus.STORED)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the file was uploaded.",
    )
    expires_at: datetime | None = Field(
        default=None,
        description=(
            "Optional: when this file will be auto-deleted for storage cleanup "
            "(Section 24: resource limits). None = keep indefinitely."
        ),
    )


class UploadListResponse(BaseModel):
    """
    Paginated list of uploaded files. Separate from PaginatedResponse[T]
    because it's not a generic container — just a list with metadata.
    Useful for a future "my uploads" endpoint.
    """

    items: list[UploadResponse]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total_pages: int = Field(ge=0)
