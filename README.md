Agricultural Well Detection & Analysis System

Automatic detection of open agricultural wells from high-resolution satellite imagery using **YOLOv11**, with results shown on an interactive **WebGIS** map.

Case study: **Deoli–Wardha, Maharashtra, India**

## Overview

Open wells are a main source of irrigation water in semi-arid India, but up-to-date, georeferenced well inventories are rare because they rely on slow field surveys or manual digitisation. This project trains a YOLOv8 detector on a single large satellite mosaic plus a point shapefile of known wells, then serves the detector through a web application.

**Pipeline in short**

1. Convert the ECW mosaic to GeoTIFF and fix coordinate systems
2. Turn well points into bounding boxes and cut well-centred crops plus background crops
3. Split data by **spatial blocks** (train / validation / test) to avoid leakage
4. Fine-tune `yolov11m` on RGB crops
5. Run tiled inference on a searched area, merge duplicates (NMS), convert pixels to lat/lon
6. Show detections on a map, colour-coded by confidence (High / Medium / Low)

## Features

- Tiling of a ~49,000 × 55,000 px GeoTIFF using windowed reads (no full-image loading)
- Point-to-box label generation with CRS and unit checks and a QC report (low accuracy)
- generate a anotations using roboflow
- Experimental: 4-channel RGB + seasonal NDVI difference model (weight inflation from pretrained 3-channel weights)
- FastAPI backend that serves the trained model
- React + Leaflet frontend: search by place/village name, detection results, single-well profile, reports
- Confidence-coded markers: green (High, light review), amber (Medium, review on imagery), red (Low, field check)

## Results
| Model | Precision | Recall | mAP@0.5 | F1 score |
| --- | --- | --- | --- | --- |
| Baseline RGB (grid tiles) |   ~84.2%  |  ~87%  | ~87.4%  |   85.6%  |
| RGB, well-centred crops (best config) |   ~84.4%  | ~84.4% | ~81.2%  |  ~84.4%  |


> The baseline was poor mainly because of label problems (wrong CRS declaration and a metre-vs-degree buffer error), not the detector itself.

Fill in the TBD values from your test-block evaluation.

## Tech stack

| Area | Tools |
| --- | --- |
| Deep learning | Ultralytics YOLOv11 (`yolov11m`), PyTorch |
| Geospatial | rasterio, GeoPandas, NumPy, QGIS |
| Backend | Python, FastAPI, Uvicorn |
| Frontend | React (Vite), React-Leaflet, Esri satellite basemap |



## Data

| Dataset | Description |
| --- | --- |
| Optical mosaic | Google Earth RGB mosaic, GeoTIFF, EPSG:4326 |
| Well annotations | Shapefile of 1,258 well points |
| NDVI rasters | Monthly NDVI; seasonal difference = mean(Mar–May) − mean(Dec–Feb) |


## How detection works

1. User searches a place or village name
2. user can uploade a image
3. The area is cropped from the master GeoTIFF
4. The crop is split into overlapping 256 × 256 px tiles
5. `best.pt` runs on each tile and returns boxes with confidence
6. Border duplicates are removed (NMS) and pixel positions converted to latitude/longitude
7. Wells are plotted on the map by confidence level

The deployed model uses plain 3-channel RGB. Channel order matters at inference: the backend uses the flipped (BGR) order, which found more wells in testing.

