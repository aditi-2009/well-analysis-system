"""
db/models/satellite_image.py

ORM model for uploaded satellite imagery files.

WHY THIS FILE EXISTS
-----------------------
Every uploaded GeoTIFF/TIFF file needs a database record. This model
stores metadata: file_id, original filename, storage path, geospatial
bounds, CRS, band count, resolution, etc. Maps 1:1 to UploadResponse
schema.

WHO IMPORTS THIS FILE
------------------------
db/session.py (indirectly, via Base.metadata.create_all)
services/upload_service.py (creates rows: db.add(SatelliteImage(...)))
api/v1/endpoints/upload.py (returns SatelliteImage rows as UploadResponse)

WHAT THIS FILE IMPORTS
------------------------
sqlalchemy (Column, String, Integer, Float, DateTime, JSON)
db/base.py (Base)
"""

from datetime import datetime

from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from sqlalchemy import BigInteger
from app.db.base import Base


class SatelliteImage(Base):
    """
    Metadata for one uploaded raster file. Inherits from Base.
    SQLAlchemy auto-creates a 'satellite_image' table in PostgreSQL.
    """

    __tablename__ = "satellite_image"

    # Primary key
    file_id = Column(
        String(255),
        primary_key=True,
        )
    storage_uri = Column(String(1000), nullable=True)  # where the file lives (a path now, s3:// later)
    # File info
    original_filename = Column(String(500), nullable=False)
    stored_filename = Column(String(500), nullable=False, unique=True)
    file_size_bytes = Column(BigInteger, nullable=False)

    # Format & structure
    detected_format = Column(String(50), nullable=False)
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)
    band_count = Column(Integer, nullable=True)

    # Geospatial metadata
    crs = Column(String(255), nullable=True)
    spatial_resolution_m = Column(Float, nullable=True)
    bounds = Column(JSON, nullable=True)

    # Additional metadata
    image_metadata = Column(JSON, nullable=True)

    # Status & timestamps
    status = Column(String(50), default="stored", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<SatelliteImage(file_id={self.file_id}, "
            f"format={self.detected_format}, size={self.file_size_bytes})>"
        )
