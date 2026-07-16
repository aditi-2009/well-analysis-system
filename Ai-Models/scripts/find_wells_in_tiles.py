import os
import geopandas as gpd
import rasterio
from shapely.geometry import box

# Load shapefile
wells = gpd.read_file(
    r"D:\ICAR dataset\well-analysis-system\Ai-Models\data\shapefiles\Wardha_Arvi_Deoli_Well.shp"
)

# Folder containing image tiles
tile_folder = r"D:\ICAR dataset\well-analysis-system\Ai-Models\tiles\images"

# Loop through all tiles
for tile_name in os.listdir(tile_folder):

    if not tile_name.endswith(".tif"):
        continue

    tile_path = os.path.join(tile_folder, tile_name)

    with rasterio.open(tile_path) as src:

        # Get tile boundary
        bounds = src.bounds

        tile_box = box(
            bounds.left,
            bounds.bottom,
            bounds.right,
            bounds.top
        )

        # Find wells inside tile
        wells_in_tile = wells[wells.geometry.within(tile_box)]

        print(f"{tile_name} --> {len(wells_in_tile)} wells")