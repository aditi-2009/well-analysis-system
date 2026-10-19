# version: well-detection-2
"""
services/tiled_detection.py

Runs a detector over a picture of any size, one tile at a time.
- A picture smaller than a tile is padded with zeros, so a 256 x 256 picture runs.
- One band is copied to all three colours. Four or more bands use the first three.
- 8-bit data is used as it is. Other data types get a contrast stretch.
- Tiles that are all zero (no data) are skipped.
- A box whose centre lies in the padding is dropped.
- The statistics describe what was read, so an empty result can be explained.

WHO IMPORTS THIS: services/detection_job_service.py, scripts/detect_clip.py
WHAT IT IMPORTS: logging, math, collections.abc, numpy, rasterio
"""

import logging
import math
from collections.abc import Callable

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import Window

logger = logging.getLogger(__name__)

# Takes an RGB uint8 tile (H, W, 3) and returns boxes in that tile's own pixels:
# [{"x1", "y1", "x2", "y2", "confidence", "class_id", "class_name"}, ...]
PredictFn = Callable[[np.ndarray], list[dict]]


def read_info(src) -> dict:
    """Size, bands, data type and coordinate system of the picture."""
    nodata = src.nodata
    if isinstance(nodata, float) and math.isnan(nodata):
        nodata = None  # NaN cannot be stored as JSON
    return {
        "width": src.width,
        "height": src.height,
        "bands": src.count,
        "dtype": src.dtypes[0],
        "crs": src.crs.to_string() if src.crs else None,
        "georeferenced": src.crs is not None,
        "nodata": nodata,
    }


def tile_origins(size: int, tile: int, overlap: int) -> list[int]:
    """Start positions along one side. The last tile always ends at the edge."""
    if size <= tile:
        return [0]
    stride = max(1, tile - overlap)
    starts = list(range(0, size - tile, stride)) + [size - tile]
    return sorted(set(starts))


def compute_global_stretch(src, max_dim: int = 1600, low: float = 2.0, high: float = 98.0):
    """One contrast range per band, measured on a small copy of the whole picture,
    so every tile is scaled the same way."""
    scale = min(1.0, max_dim / max(src.width, src.height))
    out_w = max(1, int(src.width * scale))
    out_h = max(1, int(src.height * scale))
    n = min(3, src.count)
    overview = src.read(
        indexes=list(range(1, n + 1)),
        out_shape=(n, out_h, out_w),
        resampling=Resampling.average,
    )
    ranges = []
    for b in range(n):
        lo, hi = np.percentile(overview[b].astype(np.float32), [low, high])
        if hi <= lo:
            hi = lo + 1
        ranges.append((float(lo), float(hi)))
    return ranges


def pad_to_tile(arr: np.ndarray, tile: int) -> np.ndarray:
    """(bands, h, w) -> (bands, tile, tile), padded with zeros."""
    _, h, w = arr.shape
    if h == tile and w == tile:
        return arr
    out = np.zeros((arr.shape[0], tile, tile), dtype=arr.dtype)
    out[:, :h, :w] = arr
    return out


def to_rgb_uint8(arr: np.ndarray, stretch=None) -> np.ndarray:
    """(bands, H, W) -> (H, W, 3) uint8, in the order the model expects."""
    bands = arr[:3] if arr.shape[0] >= 3 else np.repeat(arr[:1], 3, axis=0)
    img = np.transpose(bands, (1, 2, 0))
    if img.dtype == np.uint8 and stretch is None:
        return np.ascontiguousarray(img)
    out = np.zeros(img.shape, dtype=np.uint8)
    for c in range(3):
        band = img[..., c].astype(np.float32)
        if stretch is None:
            lo, hi = np.percentile(band, (1, 99))
        else:
            lo, hi = stretch[min(c, len(stretch) - 1)]
        if hi <= lo:
            hi = lo + 1
        out[..., c] = np.clip((band - lo) / (hi - lo) * 255, 0, 255)
    return out


def merge_overlaps(dets: list[dict], iou_thresh: float = 0.3) -> list[dict]:
    """Greedy non-maximum suppression: when several boxes cover the same well
    (it sits in two overlapping tiles), only the most confident one is kept."""
    if not dets:
        return []
    boxes = np.array([[d["x1"], d["y1"], d["x2"], d["y2"]] for d in dets], dtype=np.float64)
    order = np.argsort([-d["confidence"] for d in dets])
    area = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
    keep = []
    while order.size:
        i = int(order[0])
        keep.append(i)
        rest = order[1:]
        if rest.size == 0:
            break
        w = np.clip(np.minimum(boxes[i, 2], boxes[rest, 2]) - np.maximum(boxes[i, 0], boxes[rest, 0]), 0, None)
        h = np.clip(np.minimum(boxes[i, 3], boxes[rest, 3]) - np.maximum(boxes[i, 1], boxes[rest, 1]), 0, None)
        inter = w * h
        iou = inter / np.maximum(area[i] + area[rest] - inter, 1e-9)
        order = rest[iou <= iou_thresh]
    return [dets[i] for i in keep]


def detect_raster(
    raster_path: str,
    predict_fn: PredictFn,
    tile_size: int = 640,
    overlap: int = 64,
    normalize: str = "none",
    nms_iou: float = 0.3,
    progress: Callable[[int, int], None] | None = None,
) -> tuple[list[dict], dict]:
    """Runs predict_fn on every tile. Returns the merged detections, in full-picture
    pixel coordinates, and statistics that describe the run."""
    raw: list[dict] = []
    model_boxes = 0
    skipped = 0

    with rasterio.open(raster_path) as src:
        info = read_info(src)
        bands = list(range(1, min(3, src.count) + 1))
        stretch = compute_global_stretch(src) if normalize == "stretch" else None
        xs = tile_origins(src.width, tile_size, overlap)
        ys = tile_origins(src.height, tile_size, overlap)
        positions = [(x, y) for y in ys for x in xs]
        total = len(positions)

        for n, (x0, y0) in enumerate(positions, 1):
            w = min(tile_size, src.width - x0)  # real pixels in this tile
            h = min(tile_size, src.height - y0)
            arr = src.read(indexes=bands, window=Window(x0, y0, w, h))
            if not np.any(arr):  # all zeros: no data here
                skipped += 1
            else:
                found = predict_fn(to_rgb_uint8(pad_to_tile(arr, tile_size), stretch))
                model_boxes += len(found)
                for d in found:
                    cx = (d["x1"] + d["x2"]) / 2
                    cy = (d["y1"] + d["y2"]) / 2
                    if cx >= w or cy >= h:
                        continue  # the centre lies in the padding, not in the picture
                    raw.append({
                        **d,
                        "x1": max(0.0, d["x1"]) + x0,
                        "y1": max(0.0, d["y1"]) + y0,
                        "x2": min(float(w), d["x2"]) + x0,
                        "y2": min(float(h), d["y2"]) + y0,
                    })
            if progress and (n % 10 == 0 or n == total):
                progress(n, total)

    merged = merge_overlaps(raw, nms_iou)
    stats = {
        "tiles": total,
        "skipped_empty": skipped,
        "model_boxes": model_boxes,
        "raw_boxes": len(raw),
        "wells": len(merged),
        "tile_size": tile_size,
        "overlap": overlap,
        "normalize": normalize,
        "image": info,
    }
    logger.info("Tiled detection: tiles=%d model_boxes=%d kept=%d wells=%d",
                total, model_boxes, len(raw), len(merged))
    return merged, stats