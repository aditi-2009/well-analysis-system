"""
End-to-end dataset preparation:
  1. Load each raster scene + its corresponding well shapefile.
  2. Reproject shapefile to the raster's CRS.
  3. Convert point/polygon geometries to bounding boxes.
  4. Tile the raster into fixed-size overlapping patches.
  5. For each tile, find intersecting wells, convert to pixel coords, clip,
     normalize, and write YOLO-format label files.
  6. Split into train/val/test using SPATIAL BLOCKS as the split unit
     (not individual tiles, and not scene files). Each block is a large
     region of the original raster; a block is assigned wholly to train,
     val, or test. This keeps overlapping tiles from leaking across splits
     even when there is only a single input scene.

Run:
    python prepare_dataset.py
"""

import random
from pathlib import Path

import cv2
import geopandas as gpd
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.transform import rowcol
from shapely.geometry import box as shapely_box
from sklearn.model_selection import train_test_split
from tqdm import tqdm

import config as C


# ---------------------------------------------------------------------------
# Annotation helpers
# ---------------------------------------------------------------------------

def load_and_prepare_shapefile(shp_path: Path, raster_crs) -> gpd.GeoDataFrame:
    """Load a shapefile, reproject to raster CRS, and compute a bbox column."""
    gdf = gpd.read_file(shp_path)
    if gdf.crs is None:
        raise ValueError(f"{shp_path} has no CRS defined -- cannot reproject safely.")
    gdf = gdf.to_crs(raster_crs)

    def geom_to_bbox(geom):
        if geom.geom_type == "Point":
            return geom.buffer(C.POINT_BUFFER_METERS).bounds
        return geom.bounds  # (minx, miny, maxx, maxy)

    gdf["bbox"] = gdf.geometry.apply(geom_to_bbox)
    return gdf


def geo_bbox_to_pixel(bbox, transform):
    """Convert a (minx, miny, maxx, maxy) geo bbox to pixel (x1, y1, x2, y2)."""
    minx, miny, maxx, maxy = bbox
    row1, col1 = rowcol(transform, minx, maxy)  # top-left in image space
    row2, col2 = rowcol(transform, maxx, miny)  # bottom-right in image space
    x1, x2 = sorted((col1, col2))
    y1, y2 = sorted((row1, row2))
    return x1, y1, x2, y2


def clip_box(x1, y1, x2, y2, w, h):
    """Clip a pixel box to tile bounds [0, w) x [0, h)."""
    return max(0, x1), max(0, y1), min(w, x2), min(h, y2)


def to_yolo_line(x1, y1, x2, y2, img_w, img_h, class_id=0):
    x_center = ((x1 + x2) / 2) / img_w
    y_center = ((y1 + y2) / 2) / img_h
    bw = (x2 - x1) / img_w
    bh = (y2 - y1) / img_h
    return f"{class_id} {x_center:.6f} {y_center:.6f} {bw:.6f} {bh:.6f}"


# ---------------------------------------------------------------------------
# Tiling
# ---------------------------------------------------------------------------

def iter_tile_origins(width, height, tile_size, overlap):
    step = tile_size - overlap
    xs = list(range(0, max(width - tile_size, 0) + 1, step)) or [0]
    ys = list(range(0, max(height - tile_size, 0) + 1, step)) or [0]
    # Ensure the final row/col reaches the edge even if step doesn't divide evenly.
    if xs[-1] + tile_size < width:
        xs.append(width - tile_size)
    if ys[-1] + tile_size < height:
        ys.append(height - tile_size)
    for y in ys:
        for x in xs:
            yield x, y


def block_id_for_tile(scene_id: str, x: int, y: int, block_size: int) -> str:
    """
    Assign a tile to a coarse spatial block based on its pixel origin.
    All tiles sharing a block are kept together on the same side of the
    train/val/test split, so overlapping tiles never leak across splits.
    """
    bx = x // block_size
    by = y // block_size
    return f"{scene_id}_blk_{bx}_{by}"


def process_scene(raster_path: Path, shp_path: Path, scene_id: str, tmp_root: Path):
    """
    Tile one scene and write (image, label) pairs into a scratch directory
    under tmp_root/scene_id/. Returns:
      - written_positive: list of (tile_name, block_id) for tiles with >=1 well
      - kept_negative_names: list of (tile_name, block_id) for background tiles kept
    """
    scene_img_dir = tmp_root / scene_id / "images"
    scene_lbl_dir = tmp_root / scene_id / "labels"
    scene_img_dir.mkdir(parents=True, exist_ok=True)
    scene_lbl_dir.mkdir(parents=True, exist_ok=True)

    written_positive, written_negative = [], []

    with rasterio.open(raster_path) as src:
        gdf = load_and_prepare_shapefile(shp_path, src.crs)

        for x, y in iter_tile_origins(src.width, src.height, C.TILE_SIZE, C.OVERLAP):
            w = min(C.TILE_SIZE, src.width - x)
            h = min(C.TILE_SIZE, src.height - y)
            window = Window(x, y, w, h)
            transform = src.window_transform(window)

            # Tile geo-extent for spatial filtering.
            minx, miny = transform * (0, h)
            maxx, maxy = transform * (w, 0)
            tile_geom = shapely_box(min(minx, maxx), min(miny, maxy),
                                     max(minx, maxx), max(miny, maxy))

            candidates = gdf[gdf.geometry.intersects(tile_geom)]

            yolo_lines = []
            for _, row in candidates.iterrows():
                px1, py1, px2, py2 = geo_bbox_to_pixel(row["bbox"], transform)
                cx1, cy1, cx2, cy2 = clip_box(px1, py1, px2, py2, w, h)
                if (cx2 - cx1) < C.MIN_BOX_PIXELS or (cy2 - cy1) < C.MIN_BOX_PIXELS:
                    continue
                yolo_lines.append(to_yolo_line(cx1, cy1, cx2, cy2, w, h, class_id=0))

            tile_name = f"{scene_id}_{x}_{y}"
            blk_id = block_id_for_tile(scene_id, x, y, C.SPLIT_BLOCK_SIZE)
            is_positive = len(yolo_lines) > 0

            if not is_positive:
                # Keep only a sampled fraction of negative tiles, decided at
                # the very end across the whole scene -- here we just record
                # candidates and defer writing to keep memory/O(1) IO simple.
                written_negative.append((tile_name, window, blk_id))
                continue

            # Read pixel data and write image + label now for positive tiles.
            tile_arr = src.read(window=window)
            _write_tile(tile_arr, scene_img_dir / f"{tile_name}.jpg")
            (scene_lbl_dir / f"{tile_name}.txt").write_text("\n".join(yolo_lines))
            written_positive.append((tile_name, blk_id))

        # Now sample and materialize a subset of negative tiles.
        n_neg_to_keep = int(len(written_positive) * C.NEGATIVE_TILE_FRACTION)
        sampled_negatives = random.sample(
            written_negative, k=min(n_neg_to_keep, len(written_negative))
        )
        kept_negative_names = []
        for tile_name, window, blk_id in sampled_negatives:
            tile_arr = src.read(window=window)
            _write_tile(tile_arr, scene_img_dir / f"{tile_name}.jpg")
            (scene_lbl_dir / f"{tile_name}.txt").write_text("")  # empty label = background
            kept_negative_names.append((tile_name, blk_id))

    return written_positive, kept_negative_names


def _write_tile(tile_arr: np.ndarray, out_path: Path):
    """tile_arr is (bands, H, W) from rasterio; write first 3 bands as BGR jpg."""
    bands = tile_arr[:3] if tile_arr.shape[0] >= 3 else np.repeat(tile_arr[:1], 3, axis=0)
    img = np.transpose(bands, (1, 2, 0))  # H, W, C  (assumed R,G,B order)
    if img.dtype != np.uint8:
        img = _to_uint8(img)
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    cv2.imwrite(str(out_path), bgr)


def _to_uint8(img: np.ndarray) -> np.ndarray:
    """Simple percentile stretch for non-8-bit imagery (e.g. 16-bit sources)."""
    out = np.zeros_like(img, dtype=np.uint8)
    for c in range(img.shape[-1]):
        band = img[..., c].astype(np.float32)
        lo, hi = np.percentile(band, (1, 99))
        if hi <= lo:
            hi = lo + 1
        stretched = np.clip((band - lo) / (hi - lo) * 255, 0, 255)
        out[..., c] = stretched.astype(np.uint8)
    return out


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main():
    random.seed(C.RANDOM_SEED)

    if len(C.RASTER_PATHS) != len(C.SHAPEFILE_PATHS):
        raise ValueError("RASTER_PATHS and SHAPEFILE_PATHS must correspond 1:1 in config.py")

    tmp_root = Path("data/_tiles_scratch")
    tmp_root.mkdir(parents=True, exist_ok=True)

    # block_id -> list of (scene_id, tile_name)
    block_tiles = {}
    scene_ids_seen = set()

    for raster_path, shp_path in tqdm(
        list(zip(C.RASTER_PATHS, C.SHAPEFILE_PATHS)), desc="Processing scenes"
    ):
        scene_id = raster_path.stem
        scene_ids_seen.add(scene_id)
        pos, neg = process_scene(raster_path, shp_path, scene_id, tmp_root)
        for tile_name, blk_id in pos + neg:
            block_tiles.setdefault(blk_id, []).append((scene_id, tile_name))
        print(f"{scene_id}: {len(pos)} positive tiles, {len(neg)} negative tiles kept")

    # ---- Split by SPATIAL BLOCK (not by scene, not by individual tile) ----
    # This is the split unit that avoids leakage from overlapping tiles,
    # and works correctly even with a single input scene, since a large
    # scene naturally produces many blocks.
    block_ids = list(block_tiles.keys())
    n_blocks = len(block_ids)

    if n_blocks >= 3:
        train_blocks, temp_blocks = train_test_split(
            block_ids, test_size=(C.VAL_FRACTION + C.TEST_FRACTION), random_state=C.RANDOM_SEED
        )
        rel_test = C.TEST_FRACTION / (C.VAL_FRACTION + C.TEST_FRACTION)
        val_blocks, test_blocks = train_test_split(
            temp_blocks, test_size=rel_test, random_state=C.RANDOM_SEED
        )
    else:
        print(
            "WARNING: fewer than 3 spatial blocks were generated -- the scene "
            "may be smaller than SPLIT_BLOCK_SIZE, or SPLIT_BLOCK_SIZE is set "
            "too large. Reduce config.SPLIT_BLOCK_SIZE to generate more blocks, "
            "or all tiles will be placed in train with no val/test."
        )
        train_blocks, val_blocks, test_blocks = block_ids, [], []

    splits = {"train": train_blocks, "val": val_blocks, "test": test_blocks}

    for split_name, blocks in splits.items():
        img_out = C.IMAGES_DIR / split_name
        lbl_out = C.LABELS_DIR / split_name
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)
        for blk_id in blocks:
            for scene_id, tile_name in block_tiles[blk_id]:
                src_img_dir = tmp_root / scene_id / "images"
                src_lbl_dir = tmp_root / scene_id / "labels"
                img_src = src_img_dir / f"{tile_name}.jpg"
                lbl_src = src_lbl_dir / f"{tile_name}.txt"
                if img_src.exists():
                    img_src.rename(img_out / img_src.name)
                    lbl_src.rename(lbl_out / lbl_src.name)

    print(f"\nDone. {n_blocks} spatial block(s) generated from "
          f"{len(scene_ids_seen)} scene(s). Tile counts per split:")
    for split_name, blocks in splits.items():
        n = sum(len(block_tiles[b]) for b in blocks)
        print(f"  {split_name}: {n} tiles from {len(blocks)} block(s)")


if __name__ == "__main__":
    main()