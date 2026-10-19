# version: well-detection-3
"""
services/upload_service.py

Stores an uploaded file of any type and records what it is.
- A picture (GeoTIFF, TIFF, JPEG, PNG, JPEG 2000, ECW, ...) gets its size, band
  count, data type and coordinate system recorded. A picture without coordinates
  (JPEG, PNG) is stored with the coordinate field empty.
- A file that is not a picture (PDF, CSV, document, ...) is stored too, with the
  picture fields empty. Detection refuses it later with a clear message.
- If recording fails part-way, the stored copy is deleted, so nothing is left behind.

WHO IMPORTS THIS: api/v1/endpoints/upload.py
WHAT IT IMPORTS: uuid, shutil, datetime, pathlib, rasterio, SQLAlchemy Session,
the SatelliteImage model, the upload repository, the GeoTIFF reader, file_utils
"""

import logging
import shutil
import uuid
from datetime import datetime
from pathlib import Path

import rasterio
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models.satellite_image import SatelliteImage
from app.db.repository.upload_repository import UploadRepository
from app.gis.raster_processor import extract_metadata
from app.utils.file_utils import delete_quietly, safe_filename

logger = logging.getLogger(__name__)
settings = get_settings()

FORMAT_NAMES = {
    ".tif": "GeoTIFF", ".tiff": "GeoTIFF", ".geotiff": "GeoTIFF", ".gtiff": "GeoTIFF",
    ".jp2": "JPEG 2000", ".j2k": "JPEG 2000", ".ecw": "ECW", ".img": "ERDAS IMAGINE",
    ".jpg": "JPEG", ".jpeg": "JPEG", ".png": "PNG", ".gif": "GIF", ".bmp": "BMP",
    ".webp": "WEBP", ".tga": "TGA",
}
GEOTIFF_FORMATS = {"GeoTIFF"}  # these use the GeoTIFF reader first


def detected_format(filename: str) -> str:
    """Format name from the extension. An unknown extension gives the extension itself."""
    ext = Path(filename).suffix.lower()
    if not ext:
        return "FILE"
    return FORMAT_NAMES.get(ext, ext[1:].upper())


def read_picture(path: Path) -> dict | None:
    """Size, bands, data type and coordinate system, or None when the file is not a picture."""
    try:
        with rasterio.open(path) as src:
            projected = src.crs is not None and src.crs.is_projected
            return {
                "width": src.width,
                "height": src.height,
                "band_count": src.count,
                "dtype": src.dtypes[0],
                "crs": src.crs.to_string() if src.crs else None,
                "resolution": float(src.res[0]) if projected else None,
                "bounds": None,
            }
    except Exception:
        return None


def read_metadata(path: Path, fmt: str) -> dict:
    """Picture details. GeoTIFF files use the GeoTIFF reader; other pictures use rasterio.
    A file that is not a picture gets empty picture fields."""
    if fmt in GEOTIFF_FORMATS:
        try:
            meta = extract_metadata(str(path))
            return {
                "width": meta["width"],
                "height": meta["height"],
                "band_count": meta["band_count"],
                "dtype": meta["dtype"],
                "crs": meta["crs"],
                "resolution": meta["resolution"],
                "bounds": meta["bounds"],
            }
        except Exception:
            logger.warning("GeoTIFF reader failed for %s; trying the general reader", path.name)
    info = read_picture(path)
    if info is not None:
        return info
    return {"width": None, "height": None, "band_count": None, "dtype": None,
            "crs": None, "resolution": None, "bounds": None}


class UploadService:
    """Handles uploads of any file type."""

    @staticmethod
    def save_uploaded_file(temp_file_path: str, original_filename: str) -> tuple[str, str]:
        """Moves the temp file to permanent storage. Returns (file_id, stored_path)."""
        file_id = str(uuid.uuid4())
        storage_dir = Path(settings.UPLOAD_DIR)
        storage_dir.mkdir(parents=True, exist_ok=True)
        stored_path = storage_dir / f"{file_id}_{safe_filename(original_filename)}"
        shutil.move(temp_file_path, stored_path)
        logger.info("Saved upload: %s -> %s", original_filename, stored_path)
        return file_id, str(stored_path)

    @staticmethod
    def extract_geospatial_metadata(file_path: str) -> dict:
        """GeoTIFF metadata, kept for any code that calls it directly."""
        return extract_metadata(file_path)

    @staticmethod
    def process_upload(temp_file_path: str, original_filename: str, db: Session) -> dict:
        file_id, stored_path = UploadService.save_uploaded_file(temp_file_path, original_filename)
        stored = Path(stored_path)
        fmt = detected_format(original_filename)
        try:
            meta = read_metadata(stored, fmt)
            if fmt == "GeoTIFF" and meta["crs"] is None:
                fmt = "TIFF"  # a TIFF without coordinates is still a picture
            size = stored.stat().st_size
            record = SatelliteImage(
                file_id=file_id,
                original_filename=original_filename,
                stored_filename=stored.name,
                file_size_bytes=size,
                detected_format=fmt,
                image_width=meta["width"],
                image_height=meta["height"],
                band_count=meta["band_count"],
                crs=meta["crs"],
                spatial_resolution_m=meta["resolution"],
                bounds=meta["bounds"],
                image_metadata={"dtype": meta["dtype"]},
                status="stored",
                created_at=datetime.utcnow(),
            )
            UploadRepository.save_satellite_image(db, record)
        except Exception:
            db.rollback()
            delete_quietly(stored)  # no record and no file: nothing is left behind
            logger.exception("Upload processing failed for %s", original_filename)
            raise

        logger.info("Upload complete: %s (%s)", file_id, fmt)
        return {
            "file_id": file_id,
            "original_filename": original_filename,
            "stored_filename": stored.name,
            "detected_format": fmt,
            "file_size_bytes": size,
            "file_size_mb": round(size / 1_000_000, 3),
            "image_width": meta["width"],
            "image_height": meta["height"],
            "band_count": meta["band_count"],
            "crs": meta["crs"],
            "spatial_resolution_m": meta["resolution"],
            "bounds": meta["bounds"],
            "metadata": {"dtype": meta["dtype"]},
            "status": "stored",
        }