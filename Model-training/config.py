"""
Central configuration for the well-detection pipeline.
Edit these paths/values for your own data before running anything.
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# Input data
# ---------------------------------------------------------------------------
# If your source imagery is ECW, convert it to GeoTIFF first (see README) --
# this pipeline expects a GDAL-readable raster (GeoTIFF, etc.), not raw ECW.
RASTER_PATHS = [
    Path("data/raw/deoli image.tif"),
    # add one entry per source scene/mosaic
]

# Shapefile(s) with well annotations. Geometry can be Point or Polygon.
SHAPEFILE_PATHS = [
    Path("data/raw/Wardha_Arvi_Deoli_Well_fixed.shp"),
    # must be in the same order / correspondence as RASTER_PATHS
]

# ---------------------------------------------------------------------------
# Output dataset layout (YOLO format)
# ---------------------------------------------------------------------------
DATASET_ROOT = Path("data/wells_dataset")
IMAGES_DIR = DATASET_ROOT / "images"
LABELS_DIR = DATASET_ROOT / "labels"

# ---------------------------------------------------------------------------
# Tiling parameters
# ---------------------------------------------------------------------------
TILE_SIZE = 640          # pixels, square tiles
OVERLAP = 64             # pixel overlap between adjacent tiles
MIN_BOX_PIXELS = 4       # discard boxes smaller than this after clipping (edge slivers)
NEGATIVE_TILE_FRACTION = 0.15  # fraction of empty (no-well) tiles to keep, for background examples

# ---------------------------------------------------------------------------
# Annotation parameters
# ---------------------------------------------------------------------------
# If the shapefile geometry is a Point, buffer it by this radius (in the
# raster's CRS units -- usually metres if projected) to create a bounding box.
# Tune this to the real-world size of the wells you're detecting.
POINT_BUFFER_METERS = 0.00003  # ≈ 3 meters, expressed in degrees at this latitude

CLASS_NAMES = {0: "open_well"}

# ---------------------------------------------------------------------------
# Train/val/test split
# ---------------------------------------------------------------------------
# Split is done by SOURCE SCENE (region), not by individual tile, to avoid
# spatial leakage between overlapping tiles.
SPLIT_BLOCK_SIZE = 2000
VAL_FRACTION = 0.2
TEST_FRACTION = 0.1
RANDOM_SEED = 42

# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
BASE_MODEL = "yolo11m.pt"   # transfer-learning starting checkpoint
EPOCHS = 150
IMG_SIZE = 640
BATCH_SIZE = 16
PATIENCE = 30
RUN_NAME = "wells_run1"
PROJECT_DIR = "wells_detection"
