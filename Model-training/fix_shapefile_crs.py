"""
Fix a shapefile whose .prj CRS tag is WRONG while the coordinate values
themselves are actually correct (e.g. tag says UTM/meters, but the stored
coordinates are really degrees of latitude/longitude).

This does NOT transform any coordinates -- it only relabels which CRS the
existing numbers should be interpreted as, using set_crs(allow_override=True).
Use this only after confirming (e.g. via check_alignment.py) that the
shapefile's "original bounds" look like plausible degrees for your area,
while its declared CRS is something else (like a UTM zone).

Edit INPUT_SHP / CORRECT_CRS / OUTPUT_SHP below, or pass as arguments:
    python fix_shapefile_crs.py input.shp EPSG:4326 output.shp
"""

import sys
from pathlib import Path

import geopandas as gpd

DEFAULT_INPUT = Path("data/raw/Wardha_Arvi_Deoli_Well.shp")
DEFAULT_CORRECT_CRS = "EPSG:4326"
DEFAULT_OUTPUT = Path("data/raw/Wardha_Arvi_Deoli_Well_fixed.shp")


def main():
    if len(sys.argv) == 4:
        input_shp = Path(sys.argv[1])
        correct_crs = sys.argv[2]
        output_shp = Path(sys.argv[3])
    else:
        input_shp = DEFAULT_INPUT
        correct_crs = DEFAULT_CORRECT_CRS
        output_shp = DEFAULT_OUTPUT
        print(f"No arguments given -- using defaults:\n"
              f"  input:  {input_shp}\n"
              f"  crs:    {correct_crs}\n"
              f"  output: {output_shp}\n")

    gdf = gpd.read_file(input_shp)
    print(f"Loaded {len(gdf)} features. Declared CRS was: {gdf.crs}")
    print(f"Coordinate bounds (unchanged by this step): {tuple(gdf.total_bounds)}")

    gdf = gdf.set_crs(correct_crs, allow_override=True)
    print(f"Re-labeled CRS as: {gdf.crs} (coordinate values themselves were NOT changed)")

    output_shp.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_file(output_shp)
    print(f"\nWrote corrected shapefile to: {output_shp}")
    print("Update SHAPEFILE_PATHS in config.py to point at this file, then re-run "
          "check_alignment.py to confirm the bounding boxes now overlap.")


if __name__ == "__main__":
    main()
    