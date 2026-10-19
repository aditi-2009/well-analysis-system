"""
scripts/detect_clip.py

Run sliding-window detection on a GeoTIFF from the command line.
Run from Backend :
    python -m scripts.detect_clip PATH clip.tif --tile 640 --normalize none
Optional accuracy check against your labelled wells (needs geopandas):
    ... --wells PATH wells.shp --radius-m 6
"""

import argparse
import json
import time
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import xy

from app.gis.coordinate_converter import pixel_to_geojson
from app.ml.bridge import load_model, predict_tile
from app.services.tiled_detection import detect_raster


def evaluate(raster_path, merged, wells_path, radius_m):
    """Match detections to labelled wells within radius_m metres."""
    import geopandas as gpd

    with rasterio.open(raster_path) as src:
        if not src.crs.is_projected:
            print("Skipping accuracy check: raster CRS is not in metres.")
            return
        b = src.bounds
        wells = gpd.read_file(wells_path).to_crs(src.crs).cx[
            b.left:b.right, b.bottom:b.top
        ]
        gt = np.array([[p.x, p.y] for p in wells.geometry]).reshape(-1, 2)
        xs, ys = xy(
            src.transform,
            [(d["y1"] + d["y2"]) / 2 for d in merged],
            [(d["x1"] + d["x2"]) / 2 for d in merged],
        )
    pred = np.column_stack([xs, ys]) if merged else np.empty((0, 2))
    used = np.zeros(len(gt), dtype=bool)
    tp = 0
    for i in sorted(range(len(merged)),
                    key=lambda k: -merged[k]["confidence"]
                    ):
        if not len(gt):
            break
        dist = np.hypot(gt[:, 0] - pred[i, 0], gt[:, 1] - pred[i, 1])
        dist[used] = np.inf
        j = int(dist.argmin())
        if dist[j] <= radius_m:
            used[j] = True
            tp += 1
    fp, fn = len(merged) - tp, len(gt) - tp
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    print(f"ACCURACY: labelled wells in clip={len(gt)} detected={len(merged)} "
          f"correct={tp} missed={fn} false={fp} "
          f"precision={prec:.2f} recall={rec:.2f}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("raster")
    ap.add_argument("--tile", type=int, default=640)
    ap.add_argument("--overlap", type=int, default=None)
    ap.add_argument("--normalize", choices=["none", "stretch"], default="none")
    ap.add_argument("--conf", type=float, default=0.25)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--wells", default=None)
    ap.add_argument("--radius-m", type=float, default=6.0)
    args = ap.parse_args()
    overlap = args.overlap if args.overlap is not None else args.tile // 10

    with rasterio.open(args.raster) as src:
        print(f"raster: {src.width}x{src.height}px bands={src.count} "
            f"dtype={src.dtypes[0]} nodata={src.nodata} pixel={src.res[0]:.3f}")

    load_model()
    t0 = time.time()
    merged, stats = detect_raster(
        args.raster,
        lambda rgb: predict_tile(rgb, conf=args.conf, imgsz=args.imgsz),
        tile_size=args.tile,
        overlap=overlap,
        normalize=args.normalize,
        progress=lambda n, t: print(f"\r  tile {n}/{t}", end="", flush=True),
    )
    secs = time.time() - t0
    print(f"\ntile={args.tile} normalize={args.normalize} -> {stats} "
          f"in {secs:.1f}s ({secs / max(stats['tiles'], 1):.2f}s per tile)")

    features = pixel_to_geojson(args.raster, merged)
    out = Path(args.raster).with_name(
        f"{Path(args.raster).stem}_t{args.tile}_{args.normalize}.geojson"
    )
    out.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    print(f"wrote {out}")

    if args.wells:
        try:
            evaluate(args.raster, merged, args.wells, args.radius_m)
        except ImportError:
            print("geopandas is not installed here; skipped the accuracy check.")


if __name__ == "__main__":
    main()
