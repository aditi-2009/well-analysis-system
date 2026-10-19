"""
services/coordinate_service.py

Coordinate transformation and validation service.
"""

import logging

# from typing import Tuple

from math import cos, radians

logger = logging.getLogger(__name__)


class CoordinateService:
    """Coordinate transformation and validation."""

    @staticmethod
    def validate_lat_lon(lat: float, lon: float) -> bool:
        """
        Validate that coordinates are within valid range.

        Args:
            lat: Latitude (-90 to 90)
            lon: Longitude (-180 to 180)

        Returns:
            True if valid, False otherwise
        """
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            return False

        if lat < -90 or lat > 90:
            return False

        if lon < -180 or lon > 180:
            return False

        return True

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two points in kilometers.

        Args:
            lat1, lon1: First point
            lat2, lon2: Second point

        Returns:
            Distance in kilometers
        """
        from math import radians, sin, cos, sqrt, atan2

        R = 6371  # Earth radius in kilometers

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance = R * c

        return distance

    @staticmethod
    def get_bounding_box(
        center_lat: float, center_lon: float, radius_km: float
    ) -> dict:
        """
        Get bounding box around a center point.

        Args:
            center_lat: Center latitude
            center_lon: Center longitude
            radius_km: Radius in kilometers

        Returns:
            {"min_lat": ..., "max_lat": ..., "min_lon": ..., "max_lon": ...}
        """
        lat_offset = radius_km / 111.0  # 1 degree ≈ 111 km
        lon_offset = radius_km / (111.0 * cos(radians(center_lat)))

        return {
            "min_lat": center_lat - lat_offset,
            "max_lat": center_lat + lat_offset,
            "min_lon": center_lon - lon_offset,
            "max_lon": center_lon + lon_offset,
        }
