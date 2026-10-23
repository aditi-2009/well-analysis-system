"""
Model-Training/make_test_clip.py

Cuts one 2048 x 2048 pixel test clip from the full DEOLI raster.

Only labelled wells that fall inside the raster are used. The clip is placed
on the window that contains the most of them, and it is written with the
georeference of its own window, so its bounds match the pixels in it.

Output: data/test_clip.tif
Run from Model-Training with the Backend venv Python, after dev_env.ps1.
"""

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.transform import rowcol
from rasterio.windows import Window

SOURCE = "data/dataset/DEOLI.tif"
WELLS = "data/raw/Wardha_Arvi_Deoli_Well_fixed.shp"
OUT = "data/test_clip.tif"
SIZE = 2048  # pixels; at 0.2986 m per pixel this is about 611 m square

with rasterio.open(SOURCE) as src:
    labels = gpd.read_file(WELLS).to_crs(src.crs)
    b = src.bounds
    labels = labels.cx[b.left:b.right, b.bottom:b.top]
    print(f"labelled wells inside the full raster: {len(labels)}")
    if len(labels) == 0:
        raise SystemExit("No labelled wells inside the raster. Check the label CRS.")

    rows, cols = rowcol(src.transform, labels.geometry.x.values, labels.geometry.y.values)
    rows = np.asarray(rows)
    cols = np.asarray(cols)

    best_count, best_top, best_left = -1, 0, 0
    for r, c in zip(rows, cols):
        top = int(min(max(r - SIZE // 2, 0), src.height - SIZE))
        left = int(min(max(c - SIZE // 2, 0), src.width - SIZE))
        count = int(np.count_nonzero(
            (rows >= top) & (rows < top + SIZE) & (cols >= left) & (cols < left + SIZE)
        ))
        if count > best_count:
            best_count, best_top, best_left = count, top, left

    window = Window(best_left, best_top, SIZE, SIZE)
    data = src.read(window=window)
    print(f"window: top row {best_top}, left column {best_left}, "
          f"labelled wells inside it: {best_count}")
    print(f"distinct pixel values in the clip: {int(np.unique(data).size)}")

    profile = src.profile.copy()
    profile.pop("photometric", None)
    profile.update(
        driver="GTiff",
        height=SIZE,
        width=SIZE,
        count=data.shape[0],
        transform=src.window_transform(window),
        tiled=True,
        blockxsize=256,
        blockysize=256,
        compress="deflate",
    )

with rasterio.open(OUT, "w", **profile) as dst:
    dst.write(data)

with rasterio.open(OUT) as clip:
    print(f"wrote {OUT}: {clip.width} x {clip.height} px, {clip.count} bands, "
          f"{clip.crs.to_string()}")
    cb = clip.bounds
    check = gpd.read_file(WELLS).to_crs(clip.crs)
    check = check.cx[cb.left:cb.right, cb.bottom:cb.top]
    print(f"labelled wells inside the new clip: {len(check)}")
