"""
gis/coordinate_converter.py

Pixel boxes (from the AI model) -> GeoJSON Points in WGS84 (lon/lat).
GeoJSON requires EPSG:4326, so rasters in UTM etc. are reprojected.
"""

import logging

import rasterio
from rasterio.transform import xy
from rasterio.warp import transform as warp_transform

from app.core.exceptions import GISProcessingException

logger = logging.getLogger(__name__)
WGS84 = "EPSG:4326"


def pixel_to_geojson(
    image_path: str, detections_pixels: list[dict]
) -> list[dict]:
    if not detections_pixels:
        return []

    with rasterio.open(image_path) as src:
        transform, crs = src.transform, src.crs

    if crs is None:
        raise GISProcessingException(
            "Image has no coordinate reference system (not georeferenced).",
            detail=image_path,
        )

    cols = [(d["x1"] + d["x2"]) / 2 for d in detections_pixels]
    rows = [(d["y1"] + d["y2"]) / 2 for d in detections_pixels]
    xs, ys = xy(transform, rows, cols)  # rasterio takes rows first

    if crs.to_epsg() != 4326:
        xs, ys = warp_transform(crs, WGS84, xs, ys)

    features = []
    for i, (det, lon, lat) in enumerate(zip(detections_pixels, xs, ys)):
        features.append(
            {
                "type": "Feature",
                "id": i,
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "confidence": round(det["confidence"], 3),
                    "class": det["class_name"],
                    "pixel_x1": int(det["x1"]),
                    "pixel_y1": int(det["y1"]),
                    "pixel_x2": int(det["x2"]),
                    "pixel_y2": int(det["y2"]),
                },
            }
        )

    logger.info("Converted %d detections to GeoJSON", len(features))
    return features
