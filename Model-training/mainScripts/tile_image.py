"""
tile_image.py
Cut a large GeoTIFF into 256 x 256 px tiles (tiling only, no labels).

- Windowed reading: the full image is never loaded into RAM.
- Each tile keeps its own georeferencing (CRS + transform), so tiles can be
  loaded in QGIS or used later for labelling / inference.
- Edge tiles smaller than 256 px are padded with zeros so every tile is 256 x 256.
- Fully empty (nodata / black) tiles are skipped and logged, not silently dropped.
- A tile_index.csv is written with every tile's position and bounds.
"""

import argparse
import csv
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.windows import Window, transform as window_transform
from rasterio.windows import bounds as window_bounds

TILE_SIZE = 256


def tile_image(src_path, out_dir, tile_size=TILE_SIZE, overlap=0,
               skip_empty=True, bands=3):
    src_path = Path(src_path)
    out_dir = Path(out_dir)

    # ---- pre-flight checks ----
    if not src_path.exists():
        sys.exit(f"[ERROR] Input image not found: {src_path}")
    if overlap < 0 or overlap >= tile_size:
        sys.exit("[ERROR] overlap must be >= 0 and < tile_size")

    out_dir.mkdir(parents=True, exist_ok=True)
    stride = tile_size - overlap

    stats = {"written": 0, "skipped_empty": 0, "total_windows": 0}
    index_rows = []

    with rasterio.open(src_path) as src:
        W, H = src.width, src.height
        n_bands = min(bands, src.count)
        print(f"[INFO] Image : {W} x {H} px, {src.count} band(s), CRS = {src.crs}")
        print(f"[INFO] Tile  : {tile_size} px, overlap = {overlap} px, stride = {stride} px")
        print(f"[INFO] Using first {n_bands} band(s)")

        n_cols = (W + stride - 1) // stride
        n_rows = (H + stride - 1) // stride
        print(f"[INFO] Grid  : {n_cols} cols x {n_rows} rows = {n_cols * n_rows} windows")

        profile = src.profile.copy()
        profile.update(
            driver="GTiff",
            width=tile_size,
            height=tile_size,
            count=n_bands,
            compress="lzw",
            tiled=False,
            blockxsize=None,
            blockysize=None,
        )
        # remove block settings that conflict with a small non-tiled output
        profile.pop("blockxsize", None)
        profile.pop("blockysize", None)

        for row_i, row_off in enumerate(range(0, H, stride)):
            for col_i, col_off in enumerate(range(0, W, stride)):
                stats["total_windows"] += 1

                win_w = min(tile_size, W - col_off)
                win_h = min(tile_size, H - row_off)
                window = Window(col_off, row_off, win_w, win_h)

                data = src.read(indexes=list(range(1, n_bands + 1)), window=window)

                # skip empty tiles (all zeros = black / nodata)
                if skip_empty and not data.any():
                    stats["skipped_empty"] += 1
                    continue

                # pad edge tiles up to full tile size
                if win_w < tile_size or win_h < tile_size:
                    padded = np.zeros((n_bands, tile_size, tile_size), dtype=data.dtype)
                    padded[:, :win_h, :win_w] = data
                    data = padded

                # georeferencing for this tile (full tile extent)
                full_window = Window(col_off, row_off, tile_size, tile_size)
                tile_transform = window_transform(full_window, src.transform)
                left, bottom, right, top = window_bounds(full_window, src.transform)

                name = f"tile_r{row_i:04d}_c{col_i:04d}.tif"
                tile_profile = profile.copy()
                tile_profile.update(transform=tile_transform)

                with rasterio.open(out_dir / name, "w", **tile_profile) as dst:
                    dst.write(data)

                index_rows.append([name, row_i, col_i, col_off, row_off,
                                   left, bottom, right, top])
                stats["written"] += 1

            if (row_i + 1) % 20 == 0 or row_i == n_rows - 1:
                print(f"[PROGRESS] row {row_i + 1}/{n_rows} | "
                      f"written = {stats['written']} | skipped empty = {stats['skipped_empty']}")

    # ---- tile index ----
    index_path = out_dir / "tile_index.csv"
    with open(index_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["tile", "row_idx", "col_idx", "x_off_px", "y_off_px",
                    "left", "bottom", "right", "top"])
        w.writerows(index_rows)

    # ---- QC report ----
    print("\n========== QC REPORT ==========")
    print(f"Total windows     : {stats['total_windows']}")
    print(f"Tiles written     : {stats['written']}")
    print(f"Empty tiles skipped: {stats['skipped_empty']}")
    print(f"Output folder     : {out_dir}")
    print(f"Tile index        : {index_path}")
    print("===============================")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Tile a large GeoTIFF into 256x256 tiles.")
    ap.add_argument("--input", required=True, help="Path to input GeoTIFF")
    ap.add_argument("--output", required=True, help="Folder for output tiles")
    ap.add_argument("--tile-size", type=int, default=TILE_SIZE)
    ap.add_argument("--overlap", type=int, default=0, help="Overlap in px (e.g. 32)")
    ap.add_argument("--keep-empty", action="store_true", help="Also save empty tiles")
    ap.add_argument("--bands", type=int, default=3, help="Number of bands to keep (default 3 = RGB)")
    args = ap.parse_args()

    tile_image(args.input, args.output, args.tile_size, args.overlap,
               skip_empty=not args.keep_empty, bands=args.bands)