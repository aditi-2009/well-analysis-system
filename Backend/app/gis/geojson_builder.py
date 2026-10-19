"""
gis/geojson_builder.py

Small GeoJSON helpers. Pure Python (no rasterio), so it's easy to test.
"""

import json
from collections.abc import Iterator

from app.core.exceptions import GISProcessingException


def build_feature_collection(features: list[dict]) -> dict:
    """Wrap Feature dicts into a FeatureCollection."""
    return {"type": "FeatureCollection", "features": features}


def _iter_positions(coords) -> Iterator[list[float]]:
    """Walk arbitrarily nested coordinate arrays, yield [lon, lat]."""
    if coords and isinstance(coords[0], (int, float)):
        yield coords
    else:
        for item in coords:
            yield from _iter_positions(item)


def _geometries(obj: dict) -> Iterator[dict]:
    kind = obj.get("type")
    if kind == "FeatureCollection":
        for feat in obj.get("features", []):
            yield from _geometries(feat)
    elif kind == "Feature":
        if obj.get("geometry"):
            yield obj["geometry"]
    elif kind == "GeometryCollection":
        for geom in obj.get("geometries", []):
            yield from _geometries(geom)
    else:
        yield obj


def bbox_from_geojson(
    geojson: str | dict,
) -> tuple[float, float, float, float]:
    """Return (minx, miny, maxx, maxy) of any GeoJSON object/string."""
    try:
        obj = json.loads(geojson) if isinstance(geojson, str) else geojson
        positions = [
            pos
            for geom in _geometries(obj)
            for pos in _iter_positions(geom["coordinates"])
        ]
        xs = [p[0] for p in positions]
        ys = [p[1] for p in positions]
        return min(xs), min(ys), max(xs), max(ys)
    except (ValueError, KeyError, TypeError, IndexError) as e:
        raise GISProcessingException("Invalid GeoJSON boundary.", detail=str(e)) from e
