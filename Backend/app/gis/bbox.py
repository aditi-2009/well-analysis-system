"""
gis/bbox.py

Reads a map box given as "minLon,minLat,maxLon,maxLat" from a query string.
The map asks only for wells inside the view.

WHO IMPORTS THIS: api/v1/endpoints/well.py
WHAT IT IMPORTS: core/exceptions.py (ValidationException)
"""

from app.core.exceptions import ValidationException


def parse_bbox(raw: str | None) -> tuple[float, float, float, float] | None:
    """Return (minLon, minLat, maxLon, maxLat), or None when no box was given."""
    if raw is None:
        return None
    try:
        min_lon, min_lat, max_lon, max_lat = (float(v) for v in raw.split(","))
    except ValueError as exc:
        raise ValidationException(
            "bbox must be four numbers: minLon,minLat,maxLon,maxLat"
        ) from exc
    if not (-180 <= min_lon <= max_lon <= 180 and -90 <= min_lat <= max_lat <= 90):
        raise ValidationException(
            "bbox is out of range, or the minimum is above the maximum"
        )
    return min_lon, min_lat, max_lon, max_lat
