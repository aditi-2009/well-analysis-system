"""
Run a trained model on a full new raster scene and write detections back out
as a georeferenced shapefile of point locations (well centroids).

Handles the tiling/stitching problem: the same tile grid used in training is
re-used here, and duplicate detections in overlap regions are merged with a
simple centroid-distance dedup pass (swap in proper NMS-across-tiles if you
see a lot of duplicate/split detections at tile seams).

Run:
    python infer.py path/to/new_scene.tif path/to/output_wells.shp
"""

import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.transform import xy
from shapely.geometry import Point
from ultralytics import YOLO

import config as C
from prepare_dataset import iter_tile_origins, _write_tile


CONF_THRESHOLD = 0.25
DEDUP_DISTANCE_M = 2.0  # merge detections whose centroids are closer than this


def detect_on_scene(model, raster_path: Path):
    detections = []  # list of (x_geo, y_geo, confidence)

    with rasterio.open(raster_path) as src:
        for x, y in iter_tile_origins(src.width, src.height, C.TILE_SIZE, C.OVERLAP):
            w = min(C.TILE_SIZE, src.width - x)
            h = min(C.TILE_SIZE, src.height - y)
            window = Window(x, y, w, h)
            transform = src.window_transform(window)

            tile_arr = src.read(window=window)
            tmp_path = Path("/tmp/_infer_tile.jpg")
            _write_tile(tile_arr, tmp_path)

            results = model.predict(str(tmp_path), conf=CONF_THRESHOLD, verbose=False)
            for r in results:
                for box in r.boxes:
                    px1, py1, px2, py2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cx_pix = (px1 + px2) / 2
                    cy_pix = (py1 + py2) / 2
                    geo_x, geo_y = xy(transform, cy_pix, cx_pix)
                    detections.append((geo_x, geo_y, conf))

        crs = src.crs

    return detections, crs


def dedup_detections(detections, distance_m):
    """Greedy dedup: sort by confidence desc, drop later detections that are
    within `distance_m` of an already-kept one (handles overlap-region dupes)."""
    detections = sorted(detections, key=lambda d: -d[2])
    kept = []
    for x, y, conf in detections:
        if all(np.hypot(x - kx, y - ky) > distance_m for kx, ky, _ in kept):
            kept.append((x, y, conf))
    return kept


def main():
    if len(sys.argv) != 3:
        print("Usage: python infer.py <input_raster.tif> <output_wells.shp>")
        sys.exit(1)

    raster_path = Path(sys.argv[1])
    out_shp = Path(sys.argv[2])

    weights_path = Path(C.PROJECT_DIR) / C.RUN_NAME / "weights" / "best.pt"
    model = YOLO(str(weights_path))

    raw_detections, crs = detect_on_scene(model, raster_path)
    print(f"{len(raw_detections)} raw detections before dedup")

    merged = dedup_detections(raw_detections, DEDUP_DISTANCE_M)
    print(f"{len(merged)} detections after cross-tile dedup")

    gdf = gpd.GeoDataFrame(
        {
            "confidence": [c for _, _, c in merged],
            "geometry": [Point(x, y) for x, y, _ in merged],
        },
        crs=crs,
    )
    out_shp.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_file(out_shp)
    print(f"Wrote {len(gdf)} detected wells to {out_shp}")


if __name__ == "__main__":
    main()
