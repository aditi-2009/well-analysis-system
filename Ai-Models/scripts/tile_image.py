import os
import rasterio
from rasterio.windows import Window

# ==========================================
# SETTINGS
# ==========================================

# Input GeoTIFF image
INPUT_IMAGE = r"data\images\deoli image.tif"

# Output folder
OUTPUT_FOLDER = r"tiles/images"

# Tile size (3 × 640 = 1920)
TILE_SIZE = 1920

# Overlap between tiles (recommended for object detection)
OVERLAP = 320

# ==========================================

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

with rasterio.open(INPUT_IMAGE) as src:

    width = src.width
    height = src.height

    profile = src.profile.copy()

    tile_count = 0

    step = TILE_SIZE - OVERLAP

    print(f"Image Size : {width} x {height}")
    print(f"Tile Size  : {TILE_SIZE}")
    print(f"Overlap    : {OVERLAP}")
    print("--------------------------------")

    for y in range(0, height, step):

        for x in range(0, width, step):

            win_width = min(TILE_SIZE, width - x)
            win_height = min(TILE_SIZE, height - y)

            window = Window(x, y, win_width, win_height)

            transform = src.window_transform(window)

            profile.update({
                "height": win_height,
                "width": win_width,
                "transform": transform
            })

            tile_name = f"tile_{tile_count:05d}.tif"
            tile_path = os.path.join(OUTPUT_FOLDER, tile_name)

            with rasterio.open(tile_path, "w", **profile) as dst:
                dst.write(src.read(window=window))

            print(f"Created {tile_name}")

            tile_count += 1

print("--------------------------------")
print("Finished!")
print("Total tiles:", tile_count)