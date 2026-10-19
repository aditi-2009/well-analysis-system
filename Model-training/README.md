# Open Agricultural Well Detection — YOLO Pipeline

End-to-end pipeline: ECW/GeoTIFF imagery + Shapefile well annotations → trained
YOLO model → georeferenced detections.

## Files

| File | Purpose |
|---|---|
| `config.py` | All paths and parameters — edit this first. |
| `convert_ecw.py` | One-time ECW → GeoTIFF conversion (requires ECW SDK support in GDAL). |
| `prepare_dataset.py` | Tiles rasters, converts shapefile annotations to YOLO labels, splits train/val/test by scene. |
| `make_dataset_yaml.py` | Generates the `wells.yaml` file Ultralytics needs. |
| `train.py` | Trains the YOLO model. |
| `infer.py` | Runs the trained model on a new scene and writes detections back out as a shapefile. |

## Setup

```bash
pip install -r requirements.txt
```

## Step 1 — Handle ECW imagery

Stock open-source GDAL cannot read ECW (proprietary, licensed format). If
`gdalinfo --formats` doesn't list `ECW`, you don't have support installed.
Either:
- use a GDAL build that includes the ECW SDK, or
- convert once on a machine/tool that does (ArcGIS, ERDAS, or a licensed
  GDAL+ECW build), then work entirely in GeoTIFF from here on.

```bash
python convert_ecw.py input.ecw output.tif
```

## Step 2 — Configure

Edit `config.py`:
- `RASTER_PATHS` / `SHAPEFILE_PATHS` — your GeoTIFF scenes and their
  corresponding well shapefiles (point or polygon geometry), in matching order.
- `POINT_BUFFER_METERS` — if your shapefile has point geometries, this
  buffer radius turns each point into a bounding box. Set it to roughly the
  real-world radius of a well.
- `TILE_SIZE`, `OVERLAP` — tiling parameters (640 px is a reasonable default
  for YOLO).
- `VAL_FRACTION` / `TEST_FRACTION` — the split is done **by scene**, not by
  tile, to avoid overlapping tiles leaking between train and val.

## Step 3 — Build the dataset

```bash
python prepare_dataset.py
python make_dataset_yaml.py
```

This produces:

```
data/wells_dataset/
├── images/{train,val,test}/*.jpg
├── labels/{train,val,test}/*.txt
└── wells.yaml
```

Each `.txt` label file uses standard YOLO format:
`class_id x_center y_center width height` (all normalized 0–1).

A fraction of empty/background tiles (`NEGATIVE_TILE_FRACTION` in
`config.py`) is kept so the model also learns what a non-well looks like.

**Sanity-check before training:** open a handful of generated tiles + labels
in a YOLO label viewer (e.g. `ultralytics` has one built in, or use
`labelImg`) to confirm boxes actually land on visible wells. Shapefile/imagery
misregistration is the most common source of bad labels in this kind of
dataset.

## Step 4 — Train

```bash
python train.py
```

Uses transfer learning from a pretrained checkpoint (`yolo11m.pt` by default,
set in `config.py`), with augmentations suited to overhead imagery (full
rotation, flips, mosaic).

Checkpoints and logs land in `wells_detection/wells_run1/`.

## Step 5 — Run inference on a new scene

```bash
python infer.py path/to/new_scene.tif path/to/output_wells.shp
```

This retiles the new scene the same way, runs the trained model on each tile,
converts detected pixel boxes back to real-world coordinates, deduplicates
detections that fall in tile-overlap regions, and writes the results out as a
point shapefile with a `confidence` column — same format as your original
annotations, ready to load back into GIS software.

## Notes / things worth tuning for your data

- **Small object size**: wells typically occupy few pixels. If recall is
  low, try `SAHI`-style sliced inference, or reduce `TILE_SIZE` so wells
  occupy proportionally more of each tile.
- **Class imbalance**: adjust `NEGATIVE_TILE_FRACTION` if the model is
  over- or under-triggering on background.
- **Seasonal variation**: dry-season vs. monsoon-season wells can look very
  different (standing water vs. none). Consider stratifying your dataset by
  season, or training season-specific models.
- **Dedup distance** in `infer.py` (`DEDUP_DISTANCE_M`) assumes a projected
  CRS in metres — adjust if your data is in a different unit/CRS.
