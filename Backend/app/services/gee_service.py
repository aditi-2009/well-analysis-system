"""
services/gee_service.py

Google Earth Engine integration for satellite imagery.

NOTE: This is a stub for Phase 8. Implement after core detection works.
Currently returns hardcoded data. Full implementation requires:
- GEE authentication (service account)
- GEE Python API
- OAuth2 flow
"""

import logging

# from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class GEEService:
    @staticmethod
    def search_imagery(
        minx: float,
        miny: float,
        maxx: float,
        maxy: float,
        start_date: str = None,
        end_date: str = None,
        cloud_cover_max: int = 10,
    ) -> list[dict]:

        # Search for satellite imagery in a region.
        # Args:
        #     minx, miny, maxx, maxy: Bounding box
        #     start_date: Start date (YYYY-MM-DD)
        #     end_date: End date (YYYY-MM-DD)
        #     cloud_cover_max: Maximum cloud cover %
        # Returns:
        #     List of imagery metadata dicts
        # NOTE: This is a stub. Returns hardcoded Sentinel-2 example.

        logger.warning("GEE search called — using stub implementation")

        # Stub: return hardcoded example
        return [
            {
                "id": "COPERNICUS/S2/20260930T053651_20260930T055851_T42RRK",
                "date": "2026-09-30",
                "cloud_cover": 5.2,
                "sensor": "Sentinel-2",
                "url": "https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1",
            }
        ]

    @staticmethod
    def download_imagery(
        image_id: str,
        minx: float,
        miny: float,
        maxx: float,
        maxy: float,
        output_path: str,
    ) -> str:
        """
        Download satellite image to local file.

        Args:
            image_id: Image identifier from GEE
            minx, miny, maxx, maxy: Bounding box
            output_path: Where to save

        Returns:
            Path to downloaded file

        NOTE: This is a stub. Actual implementation uses GEE export.
        """
        logger.warning("GEE download called — stub implementation")
        logger.info(f"Would download {image_id} to {output_path}")
        return output_path
