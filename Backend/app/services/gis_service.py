"""
services/gis_service.py

GIS processing service — raster operations, spatial queries.
"""

import logging

# from pathlib import Path

import rasterio
from rasterio.mask import mask as rasterio_mask
from shapely.geometry import box

logger = logging.getLogger(__name__)


class GISService:
    """GIS operations for raster and vector data."""

    @staticmethod
    def get_raster_bounds(raster_path: str) -> dict:
        """
        Get geographic bounds of a raster.

        Args:
            raster_path: Path to raster file

        Returns:
            {
                "minx": float,
                "miny": float,
                "maxx": float,
                "maxy": float,
                "crs": str,
            }
        """
        try:
            with rasterio.open(raster_path) as src:
                bounds = src.bounds
                return {
                    "minx": bounds.left,
                    "miny": bounds.bottom,
                    "maxx": bounds.right,
                    "maxy": bounds.top,
                    "crs": str(src.crs),
                }
        except Exception as e:
            logger.error(f"Error getting raster bounds: {e}")
            raise

    @staticmethod
    def clip_raster_to_bbox(
        raster_path: str,
        output_path: str,
        minx: float,
        miny: float,
        maxx: float,
        maxy: float,
    ) -> bool:
        """
        Clip raster to bounding box.

        Args:
            raster_path: Input raster
            output_path: Output clipped raster
            minx, miny, maxx, maxy: Bounding box

        Returns:
            True if successful
        """
        try:
            bbox = box(minx, miny, maxx, maxy)

            with rasterio.open(raster_path) as src:
                clipped, transform = rasterio_mask(src, [bbox], crop=True)

                profile = src.profile
                profile.update(
                    {
                        "height": clipped.shape[1],
                        "width": clipped.shape[2],
                        "transform": transform,
                    }
                )

                with rasterio.open(output_path, "w", **profile) as dst:
                    dst.write(clipped)

            logger.info(f"Clipped raster saved to {output_path}")
            return True

        except Exception as e:
            logger.error(f"Error clipping raster: {e}")
            raise

    @staticmethod
    def get_raster_resolution(raster_path: str) -> float:
        """Get pixel size in native units (usually meters)."""
        try:
            with rasterio.open(raster_path) as src:
                return abs(src.res[0])
        except Exception as e:
            logger.error(f"Error getting resolution: {e}")
            raise

    @staticmethod
    def get_raster_crs(raster_path: str) -> str:
        """Get coordinate reference system."""
        try:
            with rasterio.open(raster_path) as src:
                return str(src.crs)
        except Exception as e:
            logger.error(f"Error getting CRS: {e}")
            raise
