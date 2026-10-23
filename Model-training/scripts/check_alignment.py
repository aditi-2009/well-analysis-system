"""
Diagnostic: check whether the configured raster and shapefile actually
overlap spatially. Run this BEFORE prepare_dataset.py whenever tile counts
come out as zero -- it will point at exactly what's misaligned.

Run:
    python check_alignment.py
"""

import geopandas as gpd
import rasterio

import config as C


def main():
    raster_path = C.RASTER_PATHS[0]
    shp_path = C.SHAPEFILE_PATHS[0]

    print(f"Raster: {raster_path}")
    with rasterio.open(raster_path) as src:
        raster_crs = src.crs
        raster_bounds = src.bounds  # left, bottom, right, top
        print(f"  CRS: {raster_crs}")
        print(f"  Size: {src.width} x {src.height} px, {src.count} band(s)")
        print(f"  Bounds (native CRS units): {raster_bounds}")

    print(f"\nShapefile: {shp_path}")
    gdf = gpd.read_file(shp_path)
    print(f"  Feature count: {len(gdf)}")
    print(f"  Geometry type(s): {gdf.geom_type.unique().tolist()}")
    print(f"  Original CRS: {gdf.crs}")
    print(f"  Original bounds: {tuple(gdf.total_bounds)}")

    if gdf.crs is None:
        print("\n*** PROBLEM: shapefile has NO CRS defined (.prj missing or empty). ***")
        print("Cannot safely reproject -- this alone can cause total misalignment.")
        return

    gdf_reproj = gdf.to_crs(raster_crs)
    rb = tuple(gdf_reproj.total_bounds)
    print(f"\n  Bounds after reprojecting to raster CRS ({raster_crs}): {rb}")

    r_left, r_bottom, r_right, r_top = raster_bounds
    s_left, s_bottom, s_right, s_top = rb

    overlap = not (s_right < r_left or s_left > r_right or s_top < r_bottom or s_bottom > r_top)

    print("\n--- Result ---")
    print(f"Raster extent : left={r_left}, bottom={r_bottom}, right={r_right}, top={r_top}")
    print(f"Shapefile ext.: left={s_left}, bottom={s_bottom}, right={s_right}, top={s_top}")

    if overlap:
        print("\nOK: bounding boxes DO overlap. If prepare_dataset.py still found 0 wells,")
        print("check whether individual points fall within gaps, or whether "
              "POINT_BUFFER_METERS is being applied in the wrong units (see note below).")
    else:
        print("\n*** PROBLEM: bounding boxes DO NOT overlap at all. ***")
        print("The shapefile and raster do not cover the same location after reprojection.")
        print("Most likely causes:")
        print("  1. The shapefile's .prj is present but describes the WRONG coordinate")
        print("     system (e.g. says UTM but coordinates are actually already lat/lon,")
        print("     or vice versa) -- reprojection then sends points to a nonsense location.")
        print("  2. The shapefile genuinely covers a different area than this raster.")
        print("  3. The raster's embedded CRS/geotransform is wrong (rare, but check the")
        print("     .aux.xml / export settings used when saving from QGIS).")

    if raster_crs is not None and raster_crs.is_geographic:
        print("\nNOTE: raster CRS is geographic (degrees), not projected (meters).")
        print("POINT_BUFFER_METERS in config.py assumes METERS -- applying it directly")
        print("in a degree-based CRS creates wildly incorrect buffer sizes.")
        print("See the recommended fix in the follow-up guidance.")


if __name__ == "__main__":
    main()
    