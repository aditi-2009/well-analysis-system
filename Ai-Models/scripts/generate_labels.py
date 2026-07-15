import os
import geopandas as gpd
import rasterio
from shapely.geometry import box

SHAPEFILE = r"data/shapefiles/Wardha_Arvi_Deoli_Well.shp"

IMAGE_FOLDER = r"tiles/images"

LABEL_FOLDER = r"tiles/labels"

BOX_SIZE = 20        # pixels

CLASS_ID = 0         # well


os.makedirs(LABEL_FOLDER, exist_ok=True)

# Read wells
wells = gpd.read_file(SHAPEFILE)

print("Total wells:", len(wells))
print("CRS:", wells.crs)

total_labels = 0


for image_name in sorted(os.listdir(IMAGE_FOLDER)):

    if not image_name.endswith(".tif"):
        continue

    image_path = os.path.join(IMAGE_FOLDER, image_name)

    with rasterio.open(image_path) as src:

        bounds = src.bounds

        tile_polygon = box(
            bounds.left,
            bounds.bottom,
            bounds.right,
            bounds.top
        )

        # Wells inside tile
        wells_tile = wells[wells.intersects(tile_polygon)]

        label_path = os.path.join(
            LABEL_FOLDER,
            image_name.replace(".tif", ".txt")
        )

        with open(label_path, "w") as f:

            count = 0

            for _, row in wells_tile.iterrows():

                x = row.geometry.x
                y = row.geometry.y

                try:
                    pixel_row, pixel_col = src.index(x, y)
                except:
                    continue

                # Skip if outside image
                if pixel_col < 0 or pixel_col >= src.width:
                    continue

                if pixel_row < 0 or pixel_row >= src.height:
                    continue

                x_center = pixel_col / src.width
                y_center = pixel_row / src.height

                width = BOX_SIZE / src.width
                height = BOX_SIZE / src.height

                f.write(
                    f"{CLASS_ID} "
                    f"{x_center:.6f} "
                    f"{y_center:.6f} "
                    f"{width:.6f} "
                    f"{height:.6f}\n"
                )

                count += 1
                total_labels += 1

        print(f"{image_name} -> {count} wells")

print("\nFinished!")
print("Total labels created:", total_labels)