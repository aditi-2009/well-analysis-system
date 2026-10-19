"""
gis/raster_processor.py

Reads raster metadata and rejects unusable files. Used by
services/upload_service.py. Wrapping rasterio errors in
ImageProcessingException keeps them from leaking upward.
"""

import logging

import rasterio
from rasterio.errors import RasterioIOError

from app.core.exceptions import ImageProcessingException

logger = logging.getLogger(__name__)


def extract_metadata(file_path: str, require_crs: bool = True) -> dict:
    try:
        with rasterio.open(file_path) as src:
            if require_crs and src.crs is None:
                raise ImageProcessingException(
                    "Image has no coordinate reference system " "(not georeferenced).",
                    detail=file_path,
                )
            bounds = src.bounds
            return {
                "width": src.width,
                "height": src.height,
                "band_count": src.count,
                "crs": str(src.crs) if src.crs else None,
                "bounds": {
                    "minx": bounds.left,
                    "miny": bounds.bottom,
                    "maxx": bounds.right,
                    "maxy": bounds.top,
                },
                "resolution": abs(src.res[0]),
                "dtype": src.dtypes[0],
            }
    except RasterioIOError as e:
        raise ImageProcessingException(
            "File could not be read as a raster image.", detail=str(e)
        ) from e
