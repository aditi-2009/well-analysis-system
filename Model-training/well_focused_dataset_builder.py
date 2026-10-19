r"""
=====================================================================
 WELL-FOCUSED YOLO DATASET BUILDER
=====================================================================
Converts a GeoTIFF + well-point Shapefile into a YOLO object-detection
dataset where each training image is a small crop CENTERED on a well,
instead of one huge tile containing mostly irrelevant land.

Implements STEP 1 -> STEP 15 from the project spec:
  1. Read GeoTIFF (rasterio)
  2. Read well shapefile (geopandas), reproject if CRS differs
  3. Convert well geo-coordinates -> pixel coordinates
  4-6. Build a well-centered crop with configurable size / context
  7. Handle multiple wells falling inside one crop
  8. Convert every well box to normalized YOLO format
  9. Keep a metadata CSV linking well_id <-> pixel <-> geo <-> crop
  10. Spatial BLOCK train/val/test split (no leakage on a single scene)
  11. Standard YOLO folder structure + data.yaml
  12. Visual QC previews (original location + crop + box)
  13. Configurable "experiments" (different CROP_SIZE/WELL_BOX_SIZE)
  14. Dataset statistics
  15. Quality-control report (nothing failed silently)

Run (defaults from CONFIG below):
    python well_focused_dataset_builder.py

Run one of the preset experiments:
    python well_focused_dataset_builder.py --experiment A
    python well_focused_dataset_builder.py --experiment B
    python well_focused_dataset_builder.py --experiment C

Override paths from the command line instead of editing CONFIG:
    python well_focused_dataset_builder.py --geotiff "D:\...\image.tif" --shapefile "D:\...\wells.shp" --output "D:\...\out"
=====================================================================
"""

import argparse
import math
import random
from pathlib import Path
from collections import defaultdict

import numpy as np
import pandas as pd
import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import rasterio
import rasterio.transform
from rasterio.windows import Window
from rasterio.transform import xy
from rasterio.enums import Resampling

import geopandas as gpd


# =====================================================================
# CONFIG -- EDIT THESE PATHS AND VALUES FOR YOUR MACHINE
# =====================================================================

GEOTIFF_PATH   = r"data\raw\deoli image.tif"
SHAPEFILE_PATH = r"data\raw\Wardha_Arvi_Deoli_Well_fixed.shp"
OUTPUT_DIR     = r"data\wells_dataset"

CROP_SIZE      = 256     # output image size in pixels (square)
WELL_BOX_SIZE  = 20      # bbox side length around each well point, in pixels

GRID_CELLS     = 10      # raster split into GRID_CELLS x GRID_CELLS blocks (STEP 10)
TRAIN_RATIO    = 0.70
VAL_RATIO      = 0.20
TEST_RATIO     = 0.10
RANDOM_SEED    = 42

MIN_WELL_MARGIN  = 6     # px: warn if a well bbox edge is closer than this to the crop edge
MAX_PREVIEWS     = 60    # number of QC preview images to render (STEP 12)
OVERVIEW_MAX_DIM = 1600  # size of the cached low-res overview used only in previews
JPEG_QUALITY     = 95

# STEP 13 - configurable experiments. Run with --experiment A / B / C
EXPERIMENTS = {
    "A": {"CROP_SIZE": 128, "WELL_BOX_SIZE": 10},
    "B": {"CROP_SIZE": 256, "WELL_BOX_SIZE": 20},
    "C": {"CROP_SIZE": 512, "WELL_BOX_SIZE": 30},
}

CLASS_NAMES = {0: "well"}

# =====================================================================


class QCReport:
    """Collects quality-control issues instead of silently ignoring them (STEP 15)."""

    def __init__(self):
        self.issues = defaultdict(list)
        self.counts = defaultdict(int)

    def add(self, category, message):
        self.issues[category].append(message)
        self.counts[category] += 1

    def summary(self):
        lines = ["=" * 70, "QUALITY CONTROL REPORT", "=" * 70]
        if not self.counts:
            lines.append("No issues detected.")
        for cat, n in sorted(self.counts.items(), key=lambda x: -x[1]):
            lines.append(f"{cat}: {n}")
        lines.append("")
        for cat, msgs in self.issues.items():
            lines.append(f"--- {cat} ({len(msgs)}) ---")
            for m in msgs[:50]:
                lines.append(f"  - {m}")
            if len(msgs) > 50:
                lines.append(f"  ... and {len(msgs) - 50} more")
            lines.append("")
        return "\n".join(lines)

    def save(self, path):
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.summary())


def setup_dirs(output_dir):
    dirs = [
        "images/train", "images/val", "images/test",
        "labels/train", "labels/val", "labels/test",
        "previews", "metadata",
    ]
    for d in dirs:
        Path(output_dir, d).mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------
# STEP 1 - READ THE GEOTIFF
# ---------------------------------------------------------------------
def _friendly_missing_file_error(path, kind):
    p = Path(path)
    msg = [f"\n{'!' * 70}", f"{kind} NOT FOUND:", f"  {p}", ""]
    parent = p.parent
    if parent.exists():
        entries = sorted(e.name for e in parent.iterdir())
        msg.append(f"Contents of '{parent}':")
        if entries:
            for e in entries:
                msg.append(f"  - {e}")
        else:
            msg.append("  (empty folder)")
    else:
        msg.append(f"Parent folder does not exist either: {parent}")
        grandparent = parent.parent
        if grandparent.exists():
            msg.append(f"Contents of '{grandparent}':")
            for e in sorted(e.name for e in grandparent.iterdir()):
                msg.append(f"  - {e}")
    msg.append("")
    msg.append("Fix the path in the CONFIG block (or pass --geotiff / --shapefile)")
    msg.append("to match the exact filename shown above.")
    msg.append("!" * 70)
    return "\n".join(msg)


def load_raster_info(path):
    if not Path(path).is_file():
        raise FileNotFoundError(_friendly_missing_file_error(path, "GEOTIFF"))
    ds = rasterio.open(path)
    info = {
        "crs": ds.crs,
        "width": ds.width,
        "height": ds.height,
        "count": ds.count,
        "transform": ds.transform,
        "res": ds.res,
        "bounds": ds.bounds,
        "dtype": ds.dtypes[0],
    }
    print("=" * 70)
    print("STEP 1: GEOTIFF INFO")
    print("=" * 70)
    print(f"Path        : {path}")
    print(f"CRS         : {info['crs']}")
    print(f"Width       : {info['width']}")
    print(f"Height      : {info['height']}")
    print(f"Bands       : {info['count']}")
    print(f"Dtype       : {info['dtype']}")
    print(f"Resolution  : {info['res']} (x, y units per pixel)")
    print(f"Bounds      : {info['bounds']}")
    print(f"Transform   : {info['transform']}")
    return ds, info


# ---------------------------------------------------------------------
# STEP 2 - READ THE WELL SHAPEFILE (+ reproject if needed)
# ---------------------------------------------------------------------
def load_wells(shp_path, raster_crs, qc: QCReport):
    print("\n" + "=" * 70)
    print("STEP 2: WELL SHAPEFILE")
    print("=" * 70)
    if not Path(shp_path).is_file():
        raise FileNotFoundError(_friendly_missing_file_error(shp_path, "SHAPEFILE"))
    gdf = gpd.read_file(shp_path)

    if gdf.crs is None:
        qc.add("missing_crs", f"Shapefile has no CRS defined: {shp_path}")
        raise ValueError(
            "Shapefile has no CRS. Fix the .prj before continuing "
            "(CRS mislabeling is a common root cause of zero usable tiles)."
        )

    n_before = len(gdf)
    invalid = ~gdf.geometry.is_valid
    if invalid.any():
        qc.add("invalid_geometry", f"{invalid.sum()} invalid geometries removed")
        gdf = gdf[~invalid].copy()

    not_point = gdf.geometry.geom_type != "Point"
    if not_point.any():
        qc.add("non_point_geometry", f"{not_point.sum()} non-POINT geometries removed")
        gdf = gdf[~not_point].copy()

    reprojected = False
    if str(gdf.crs) != str(raster_crs):
        print(f"Shapefile CRS ({gdf.crs}) != GeoTIFF CRS ({raster_crs}) -> reprojecting")
        gdf = gdf.to_crs(raster_crs)
        reprojected = True

    gdf = gdf.reset_index(drop=True)
    gdf["well_id"] = gdf.index.astype(int)

    print(f"Number of wells (raw)      : {n_before}")
    print(f"Number of wells (usable)   : {len(gdf)}")
    print(f"Shapefile CRS              : {gdf.crs}")
    print(f"GeoTIFF CRS                : {raster_crs}")
    print(f"Reprojected                : {'Yes' if reprojected else 'No'}")

    return gdf


# ---------------------------------------------------------------------
# STEP 3 - GEOGRAPHIC -> PIXEL COORDINATES
# ---------------------------------------------------------------------
def wells_to_pixel_coords(gdf, raster_info, qc: QCReport):
    print("\n" + "=" * 70)
    print("STEP 3: GEOGRAPHIC -> PIXEL COORDINATES")
    print("=" * 70)

    xs = gdf.geometry.x.values
    ys = gdf.geometry.y.values

    # rasterio.transform.rowcol applies the affine transform AND handles
    # the row/col (y-down) convention correctly - never roll this by hand.
    rows, cols = rasterio.transform.rowcol(raster_info["transform"], xs, ys)
    rows = np.array(rows)
    cols = np.array(cols)

    gdf["pixel_x"] = cols
    gdf["pixel_y"] = rows
    gdf["geo_x"] = xs
    gdf["geo_y"] = ys

    W, H = raster_info["width"], raster_info["height"]
    out_of_bounds = (
        (gdf["pixel_x"] < 0) | (gdf["pixel_x"] >= W) |
        (gdf["pixel_y"] < 0) | (gdf["pixel_y"] >= H)
    )
    if out_of_bounds.any():
        for wid in gdf.loc[out_of_bounds, "well_id"]:
            qc.add("well_outside_raster", f"well_id={wid} falls outside raster bounds")
        print(f"WARNING: {out_of_bounds.sum()} wells fall outside the raster and will be dropped.")
        gdf = gdf.loc[~out_of_bounds].reset_index(drop=True)

    print(f"Usable wells after bounds check: {len(gdf)}")
    return gdf


# ---------------------------------------------------------------------
# STEP 14 - DATASET STATISTICS (computed before crop generation)
# ---------------------------------------------------------------------
def compute_statistics(gdf, raster_info, crop_size, well_box_size):
    print("\n" + "=" * 70)
    print("STEP 14: DATASET STATISTICS")
    print("=" * 70)

    n = len(gdf)
    px = gdf["pixel_x"].values.astype(float)
    py = gdf["pixel_y"].values.astype(float)

    if n > 1:
        d = np.sqrt((px[:, None] - px[None, :]) ** 2 + (py[:, None] - py[None, :]) ** 2)
        np.fill_diagonal(d, np.inf)
        nn_dist = d.min(axis=1)
        min_dist = float(nn_dist.min())
        avg_dist = float(nn_dist.mean())
    else:
        min_dist = avg_dist = float("nan")

    res_x, res_y = raster_info["res"]
    W, H = raster_info["width"], raster_info["height"]

    margin = crop_size / 2
    near_edge = (
        (px < margin) | (px > W - margin) |
        (py < margin) | (py > H - margin)
    ).sum()

    box_area_pct = (well_box_size ** 2) / (crop_size ** 2) * 100

    stats = {
        "num_wells": n,
        "raster_width": W,
        "raster_height": H,
        "resolution_x_units_per_px": res_x,
        "resolution_y_units_per_px": res_y,
        "min_nn_distance_px": min_dist,
        "avg_nn_distance_px": avg_dist,
        "wells_near_boundary": int(near_edge),
        "well_box_size_px": well_box_size,
        "crop_size_px": crop_size,
        "well_pct_of_crop_area": round(box_area_pct, 3),
    }

    for k, v in stats.items():
        print(f"{k:32s}: {v}")

    if crop_size <= well_box_size * 2:
        print("\nWARNING: CROP_SIZE is not much bigger than WELL_BOX_SIZE - "
              "there will be little surrounding context. Consider increasing CROP_SIZE.")
    if not math.isnan(min_dist) and min_dist < crop_size:
        print(f"\nNOTE: some wells are closer together ({min_dist:.1f}px) than the crop "
              f"size ({crop_size}px) -> expect merged multi-well crops (this is handled).")

    return stats


# ---------------------------------------------------------------------
# Cached low-res overview + a global stretch, used only for QC previews.
# ---------------------------------------------------------------------
def build_overview(ds, raster_info, max_dim=1600):
    W, H = raster_info["width"], raster_info["height"]
    scale = max_dim / max(W, H)
    out_w = max(1, int(W * scale))
    out_h = max(1, int(H * scale))

    n_bands = min(3, raster_info["count"])
    overview = ds.read(
        indexes=list(range(1, n_bands + 1)),
        out_shape=(n_bands, out_h, out_w),
        resampling=Resampling.average,
    )
    overview = np.transpose(overview, (1, 2, 0))  # H, W, C

    stretch = []
    for b in range(overview.shape[2]):
        band = overview[:, :, b].astype(np.float32)
        lo, hi = np.percentile(band, [2, 98])
        if hi <= lo:
            hi = lo + 1
        stretch.append((float(lo), float(hi)))

    overview_u8 = normalize_bands(overview, stretch)
    return overview_u8, scale, stretch


def normalize_bands(arr, stretch):
    """arr: H,W,C float or int. stretch: list of (lo,hi) per band, reused for every crop
    so contrast/brightness stays consistent across the whole dataset."""
    out = np.zeros(arr.shape, dtype=np.uint8)
    for b in range(arr.shape[2]):
        lo, hi = stretch[b]
        band = arr[:, :, b].astype(np.float32)
        band = np.clip((band - lo) / (hi - lo) * 255.0, 0, 255)
        out[:, :, b] = band.astype(np.uint8)
    return out


# ---------------------------------------------------------------------
# STEP 10 - SPATIAL GRID-BLOCK TRAIN / VAL / TEST SPLIT
# ---------------------------------------------------------------------
def assign_grid_split(gdf, raster_info, grid_cells, ratios, seed):
    print("\n" + "=" * 70)
    print("STEP 10: SPATIAL BLOCK TRAIN / VAL / TEST SPLIT")
    print("=" * 70)

    W, H = raster_info["width"], raster_info["height"]
    cell_w = W / grid_cells
    cell_h = H / grid_cells

    cell_col = np.minimum((gdf["pixel_x"] / cell_w).astype(int), grid_cells - 1)
    cell_row = np.minimum((gdf["pixel_y"] / cell_h).astype(int), grid_cells - 1)
    gdf["cell_id"] = cell_row.astype(str) + "_" + cell_col.astype(str)

    unique_cells = sorted(gdf["cell_id"].unique())
    rng = random.Random(seed)
    rng.shuffle(unique_cells)

    n_cells = len(unique_cells)
    n_train = max(1, round(n_cells * ratios[0]))
    n_train = min(n_train, n_cells)
    n_val = max(1, round(n_cells * ratios[1]))
    n_val = min(n_val, n_cells - n_train)

    train_cells = set(unique_cells[:n_train])
    val_cells = set(unique_cells[n_train:n_train + n_val])
    test_cells = set(unique_cells[n_train + n_val:])

    def split_for(cell_id):
        if cell_id in train_cells:
            return "train"
        if cell_id in val_cells:
            return "val"
        return "test"

    gdf["split"] = gdf["cell_id"].apply(split_for)

    counts = gdf["split"].value_counts().to_dict()
    print(f"Grid                 : {grid_cells} x {grid_cells} cells")
    print(f"Cells train/val/test : {len(train_cells)}/{len(val_cells)}/{len(test_cells)}")
    print(f"Wells train/val/test : "
          f"{counts.get('train', 0)}/{counts.get('val', 0)}/{counts.get('test', 0)}")

    return gdf


# ---------------------------------------------------------------------
# STEP 4-9 - CROP GENERATION + YOLO ANNOTATION + METADATA
# ---------------------------------------------------------------------
def compute_crop_origin(px, py, crop_size, W, H):
    half = crop_size // 2
    x0 = px - half
    y0 = py - half
    x0 = max(0, min(x0, W - crop_size))
    y0 = max(0, min(y0, H - crop_size))
    return int(x0), int(y0)


def save_preview(output_dir, crop_name, crop_img_u8, boxes,
                  overview_u8, ov_scale, px, py):
    fig, axes = plt.subplots(1, 2, figsize=(9, 4.5))

    axes[0].imshow(overview_u8)
    axes[0].scatter([px * ov_scale], [py * ov_scale], c="red", s=25, marker="x")
    axes[0].set_title("Location in full scene", fontsize=9)
    axes[0].axis("off")

    axes[1].imshow(crop_img_u8)
    for (bx1, by1, bx2, by2) in boxes:
        rect = plt.Rectangle((bx1, by1), bx2 - bx1, by2 - by1,
                              fill=False, edgecolor="lime", linewidth=1.5)
        axes[1].add_patch(rect)
    axes[1].set_title(f"{crop_name} ({len(boxes)} well(s))", fontsize=9)
    axes[1].axis("off")

    plt.tight_layout()
    plt.savefig(Path(output_dir, "previews", f"{crop_name}_preview.png"), dpi=110)
    plt.close(fig)


def generate_dataset(ds, gdf, raster_info, cfg, qc: QCReport):
    print("\n" + "=" * 70)
    print("STEP 4-9: GENERATING WELL-CENTERED CROPS")
    print("=" * 70)

    W, H = raster_info["width"], raster_info["height"]
    crop_size = cfg["CROP_SIZE"]
    box_size = cfg["WELL_BOX_SIZE"]
    output_dir = cfg["OUTPUT_DIR"]
    n_bands = min(3, raster_info["count"])

    if crop_size > W or crop_size > H:
        raise ValueError("CROP_SIZE is larger than the raster itself.")

    px_all = gdf["pixel_x"].values
    py_all = gdf["pixel_y"].values
    well_ids = gdf["well_id"].values
    splits = gdf["split"].values

    covered = np.zeros(len(gdf), dtype=bool)
    metadata_rows = []
    crop_wells_count = []
    n_saved = 0
    n_previews = 0

    overview_u8, ov_scale, stretch = build_overview(ds, raster_info, OVERVIEW_MAX_DIM)

    for i in range(len(gdf)):
        if covered[i]:
            continue

        px, py = px_all[i], py_all[i]
        x0, y0 = compute_crop_origin(px, py, crop_size, W, H)
        x1, y1 = x0 + crop_size, y0 + crop_size

        # STEP 7 - find every well point that falls inside this crop window
        inside = np.where(
            (px_all >= x0) & (px_all < x1) &
            (py_all >= y0) & (py_all < y1) &
            (~covered)
        )[0]
        if len(inside) == 0:
            inside = np.array([i])

        covered[inside] = True
        crop_split = splits[i]  # anchor well decides which split the crop belongs to

        # STEP 6 - windowed read: raster stays on disk, only this tile is loaded
        window = Window(x0, y0, crop_size, crop_size)
        try:
            arr = ds.read(indexes=list(range(1, n_bands + 1)), window=window)
        except Exception as e:
            qc.add("read_error", f"well_id={well_ids[i]}: {e}")
            continue
        arr = np.transpose(arr, (1, 2, 0))

        if arr.shape[0] != crop_size or arr.shape[1] != crop_size:
            qc.add("crop_shape_mismatch", f"well_id={well_ids[i]} got shape {arr.shape}")
            continue
        if np.all(arr == 0):
            qc.add("empty_crop", f"well_id={well_ids[i]} crop is entirely blank/nodata")
            continue

        img_u8 = normalize_bands(arr, stretch)
        img_bgr = cv2.cvtColor(img_u8, cv2.COLOR_RGB2BGR) if img_u8.shape[2] == 3 else img_u8

        crop_name = f"well_{well_ids[i]:05d}"
        img_path = Path(output_dir, "images", crop_split, f"{crop_name}.jpg")
        lbl_path = Path(output_dir, "labels", crop_split, f"{crop_name}.txt")

        # STEP 5, 8 - build a YOLO annotation for every well inside this crop
        yolo_lines = []
        boxes_for_preview = []
        for j in inside:
            wpx, wpy = px_all[j] - x0, py_all[j] - y0
            half_b = box_size / 2
            bx1, by1 = wpx - half_b, wpy - half_b
            bx2, by2 = wpx + half_b, wpy + half_b

            cbx1, cby1 = max(0, bx1), max(0, by1)
            cbx2, cby2 = min(crop_size, bx2), min(crop_size, by2)

            if (cbx2 - cbx1) <= 1 or (cby2 - cby1) <= 1:
                qc.add("degenerate_bbox_at_edge",
                       f"well_id={well_ids[j]} bbox clipped to ~0 at boundary, skipped")
                continue

            if (bx1 < MIN_WELL_MARGIN or by1 < MIN_WELL_MARGIN or
                    bx2 > crop_size - MIN_WELL_MARGIN or by2 > crop_size - MIN_WELL_MARGIN):
                qc.add("well_near_crop_boundary",
                       f"well_id={well_ids[j]} bbox close to crop edge in {crop_name}")

            xc = ((cbx1 + cbx2) / 2) / crop_size
            yc = ((cby1 + cby2) / 2) / crop_size
            w = (cbx2 - cbx1) / crop_size
            h = (cby2 - cby1) / crop_size

            if not (0 <= xc <= 1 and 0 <= yc <= 1 and 0 < w <= 1 and 0 < h <= 1):
                qc.add("invalid_yolo_coords", f"well_id={well_ids[j]} produced invalid YOLO box")
                continue

            yolo_lines.append(f"0 {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}")
            boxes_for_preview.append((cbx1, cby1, cbx2, cby2))

            gx, gy = xy(raster_info["transform"], py_all[j], px_all[j])
            metadata_rows.append({
                "well_id": int(well_ids[j]),
                "crop_name": crop_name,
                "split": crop_split,
                "x_pixel": int(px_all[j]),
                "y_pixel": int(py_all[j]),
                "x_geo": gx,
                "y_geo": gy,
                "crop_x0": x0,
                "crop_y0": y0,
            })

        if not yolo_lines:
            qc.add("missing_annotation", f"{crop_name} had wells but zero valid boxes, skipped")
            continue

        cv2.imwrite(str(img_path), img_bgr, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        with open(lbl_path, "w") as f:
            f.write("\n".join(yolo_lines) + "\n")

        n_saved += 1
        crop_wells_count.append(len(yolo_lines))

        if n_previews < MAX_PREVIEWS:
            save_preview(output_dir, crop_name, img_u8, boxes_for_preview,
                         overview_u8, ov_scale, px, py)
            n_previews += 1

    print(f"\nCrops generated : {n_saved}")
    if crop_wells_count:
        print(f"Wells per crop  : min={min(crop_wells_count)} "
              f"avg={np.mean(crop_wells_count):.2f} max={max(crop_wells_count)}")

    return metadata_rows, n_saved


# ---------------------------------------------------------------------
# STEP 9, 11 - METADATA CSV + data.yaml
# ---------------------------------------------------------------------
def save_metadata(output_dir, metadata_rows):
    path = Path(output_dir, "metadata", "wells.csv")
    df = pd.DataFrame(metadata_rows)
    df.to_csv(path, index=False)
    print(f"\nMetadata CSV saved: {path} ({len(df)} rows)")
    return df


def save_data_yaml(output_dir):
    yaml_text = (
        f"path: {output_dir}\n"
        f"train: images/train\n"
        f"val: images/val\n"
        f"test: images/test\n\n"
        f"names:\n"
        + "\n".join(f"  {k}: {v}" for k, v in CLASS_NAMES.items())
        + "\n"
    )
    path = Path(output_dir, "data.yaml")
    with open(path, "w") as f:
        f.write(yaml_text)
    print(f"data.yaml saved: {path}")


# ---------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--experiment", choices=list(EXPERIMENTS.keys()), default=None,
                         help="Use a preset CROP_SIZE/WELL_BOX_SIZE experiment (A/B/C)")
    parser.add_argument("--geotiff", default=GEOTIFF_PATH)
    parser.add_argument("--shapefile", default=SHAPEFILE_PATH)
    parser.add_argument("--output", default=OUTPUT_DIR)
    args = parser.parse_args()

    crop_size = CROP_SIZE
    box_size = WELL_BOX_SIZE
    output_dir = args.output

    if args.experiment:
        preset = EXPERIMENTS[args.experiment]
        crop_size = preset["CROP_SIZE"]
        box_size = preset["WELL_BOX_SIZE"]
        output_dir = f"{args.output}_exp{args.experiment}"

    qc = QCReport()
    setup_dirs(output_dir)

    ds, raster_info = load_raster_info(args.geotiff)
    try:
        gdf = load_wells(args.shapefile, raster_info["crs"], qc)
        gdf = wells_to_pixel_coords(gdf, raster_info, qc)
        compute_statistics(gdf, raster_info, crop_size, box_size)
        gdf = assign_grid_split(gdf, raster_info, GRID_CELLS,
                                 (TRAIN_RATIO, VAL_RATIO, TEST_RATIO), RANDOM_SEED)

        cfg = {"CROP_SIZE": crop_size, "WELL_BOX_SIZE": box_size, "OUTPUT_DIR": output_dir}
        metadata_rows, n_saved = generate_dataset(ds, gdf, raster_info, cfg, qc)

        save_metadata(output_dir, metadata_rows)
        save_data_yaml(output_dir)
    finally:
        ds.close()

    qc_path = Path(output_dir, "metadata", "qc_report.txt")
    qc.save(qc_path)

    print("\n" + "=" * 70)
    print(f"DONE. Dataset written to: {output_dir}")
    print(f"Crops saved  : {n_saved}")
    print(f"QC report    : {qc_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()