# version: well-detection-3
"""
Model-Training/check_model_input.py

Diagnostic only. The app does not use this file.

Does the model find the labelled wells in this picture?

The centre 2048 x 2048 pixels are cut into 640 x 640 tiles. The model runs on every
tile at a very low confidence (0.01), for every order of the first three bands (6)
and two contrast settings (as is, 1-99%): 12 rows.

Columns (with --wells):
  labels hit    how many DIFFERENT labelled wells have a box within 6 m
  random hits   how many labels random boxes would hit on average (a uniform baseline;
                real boxes gather on buildings, so treat it as a rough yardstick)
  near boxes    boxes within 6 m of any labelled well (one well can have several)
  best hit      the highest score among boxes that sit on a labelled well

Run from Model-Training, after loading dev_env.ps1 in the same window:
    ../Backend/.venv/Scripts/python.exe check_model_input.py <picture> --wells data\raw\Wardha_Arvi_Deoli_Well_fixed.shp
Takes 1 to 3 minutes per picture.
"""

import argparse
import itertools
import math

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.transform import rowcol
from rasterio.windows import Window
from ultralytics import YOLO

WEIGHTS = "runs/detect/runs/train/weights/best.pt"
TILE = 640      # the size the model is run at, with no resizing
CONF = 0.01     # very low on purpose: every box is information
NEAR_M = 6.0    # a box this close to a labelled well counts as a hit
CHECK = 2048    # pixels read from the centre of the picture


def tile_starts(size, tile):
    if size <= tile:
        return [0]
    return sorted(set(list(range(0, size - tile, tile)) + [size - tile]))


def pad_to(arr, size):
    """(bands, h, w) -> (bands, size, size), padded with zeros."""
    out = np.zeros((arr.shape[0], size, size), dtype=arr.dtype)
    out[:, : arr.shape[1], : arr.shape[2]] = arr
    return out


def stretch_1_99(rgb):
    """1-99 percent contrast stretch per colour channel, to 0-255."""
    out = np.zeros(rgb.shape, dtype=np.uint8)
    for c in range(3):
        band = rgb[..., c].astype(np.float32)
        lo, hi = np.percentile(band, (1, 99))
        if hi <= lo:
            hi = lo + 1
        out[..., c] = np.clip((band - lo) / (hi - lo) * 255, 0, 255)
    return out


def metres_per_pixel(transform, crs, h):
    """Map units are metres in a projected CRS, degrees in a geographic one."""
    size = abs(transform.a)
    if crs is not None and not crs.is_projected:
        lat_mid = transform.f + transform.e * (h / 2)
        size *= 111320.0 * math.cos(math.radians(lat_mid))
    return size


def main():
    ap = argparse.ArgumentParser(description="Does the model find the labelled wells in this picture?")
    ap.add_argument("image")
    ap.add_argument("--wells", default=None, help="shapefile of labelled wells")
    args = ap.parse_args()

    with rasterio.open(args.image) as src:
        print(f"file: {args.image}")
        print(f"size: {src.width} x {src.height} px, {src.count} band(s), {src.dtypes[0]}")
        print(f"coordinates: {src.crs.to_string() if src.crs else 'none'}")
        w, h = min(CHECK, src.width), min(CHECK, src.height)
        col0, row0 = (src.width - w) // 2, (src.height - h) // 2
        window = Window(col0, row0, w, h)
        transform = src.window_transform(window)
        crs = src.crs
        print(f"checked area: {w} x {h} px from the centre (row {row0}, column {col0})")
        arr = src.read(list(range(1, min(3, src.count) + 1)), window=window)
        if arr.shape[0] < 3:
            arr = np.repeat(arr[:1], 3, axis=0)
        data_type = arr.dtype

    # Labelled wells as pixel positions inside the checked area
    label_xy = None
    if args.wells:
        if crs is None:
            raise SystemExit("This picture has no coordinates, so labelled wells cannot be compared.")
        labels = gpd.read_file(args.wells).to_crs(crs)
        x_a, y_a = transform * (0, 0)
        x_b, y_b = transform * (w, h)
        labels = labels.cx[min(x_a, x_b):max(x_a, x_b), min(y_a, y_b):max(y_a, y_b)]
        print(f"labelled wells inside the checked area: {len(labels)}")
        if len(labels):
            rows, cols = rowcol(transform, labels.geometry.x.values, labels.geometry.y.values)
            label_xy = np.column_stack([np.asarray(cols, float), np.asarray(rows, float)])
        else:
            print("No labelled well lies in the checked area, so only the boxes are counted.")

    near_px = NEAR_M / metres_per_pixel(transform, crs, h)
    chance = math.pi * near_px ** 2 / (w * h)  # chance that one random box lands within 6 m of one label

    print("band statistics (checked area):")
    for i in range(3):
        print(f"  band {i + 1}: min {int(arr[i].min())}, max {int(arr[i].max())}, mean {arr[i].mean():.1f}")
    if data_type != np.uint8:
        print(f"note: the data is {data_type}, not 8-bit, so every row is contrast-stretched.")

    model = YOLO(WEIGHTS)
    results = []
    for order in itertools.permutations(range(3)):
        for contrast in ("as is", "1-99%"):
            centres, scores = [], []
            for y0 in tile_starts(h, TILE):
                for x0 in tile_starts(w, TILE):
                    th, tw = min(TILE, h - y0), min(TILE, w - x0)
                    tile = arr[list(order), y0:y0 + th, x0:x0 + tw]
                    rgb = np.transpose(pad_to(tile, TILE), (1, 2, 0))
                    if contrast == "1-99%" or data_type != np.uint8:
                        rgb = stretch_1_99(rgb)
                    bgr = np.ascontiguousarray(rgb[..., ::-1])  # the model expects BGR arrays
                    boxes = model.predict(bgr, conf=CONF, imgsz=TILE, verbose=False)[0].boxes
                    if len(boxes) == 0:
                        continue
                    xyxy = boxes.xyxy.cpu().numpy()
                    conf = boxes.conf.cpu().numpy()
                    cx = (xyxy[:, 0] + xyxy[:, 2]) / 2
                    cy = (xyxy[:, 1] + xyxy[:, 3]) / 2
                    keep = (cx < tw) & (cy < th)  # ignore boxes that lie in the padding
                    centres += list(zip(cx[keep] + x0, cy[keep] + y0))
                    scores += list(conf[keep])

            n = len(scores)
            hits, near, best_hit, expected = 0, 0, 0.0, 0.0
            if label_xy is not None:
                expected = len(label_xy) * (1 - (1 - chance) ** n)
                if n:
                    pts = np.array(centres)
                    dist = np.hypot(pts[:, None, 0] - label_xy[None, :, 0],
                                    pts[:, None, 1] - label_xy[None, :, 1])
                    close = dist <= near_px
                    near = int(close.any(axis=1).sum())  # boxes that sit on a label
                    hits = int(close.any(axis=0).sum())  # different labels hit
                    if near:
                        best_hit = float(np.array(scores)[close.any(axis=1)].max())
            best = float(max(scores, default=0.0))
            results.append((tuple(i + 1 for i in order), contrast, n, best, hits, expected, near, best_hit))

    print()
    if label_xy is None:
        print(f"{'bands (R,G,B)':<16}{'contrast':<10}{'boxes':>7}{'best score':>12}")
        for order, contrast, n, best, *_ in sorted(results, key=lambda r: -r[3]):
            print(f"{str(order):<16}{contrast:<10}{n:>7}{best:>12.3f}")
        print()
        print("Run again with --wells to see whether the boxes sit on labelled wells.")
        return

    total = len(label_xy)
    print(f"{'bands (R,G,B)':<16}{'contrast':<10}{'boxes':>7}{'labels hit':>12}{'random hits':>13}{'near boxes':>12}{'best hit':>10}")
    for order, contrast, n, _best, hits, expected, near, best_hit in sorted(results, key=lambda r: (-r[4], -r[6])):
        print(f"{str(order):<16}{contrast:<10}{n:>7}{f'{hits} of {total}':>12}{expected:>13.2f}{near:>12}{best_hit:>10.3f}")
    print()
    top = max(results, key=lambda r: r[4] - r[5])
    print(f"Best row: {top[0]} {top[1]}: {top[4]} of {total} labelled wells hit; "
          f"random boxes would hit about {top[5]:.2f}.")
    print("A row that hits clearly more labels than random boxes means the model finds those wells.")


if __name__ == "__main__":
    main()