"""
One-time conversion helper: ECW -> GeoTIFF.

ECW is a proprietary format (Hexagon/ERDAS). Standard open-source GDAL builds
do NOT include the ECW driver due to licensing, so this step requires either:
  - A GDAL build with the ECW SDK compiled in (Hexagon Geospatial distribution,
    or a conda-forge/vendor build that includes it), or
  - QGIS with the ECW plugin (which itself depends on the SDK), or
  - ArcGIS / ERDAS IMAGINE doing the export.

If `gdal_translate` on your machine reports the ECW driver is unavailable,
you do NOT have ECW read support installed -- this script cannot work around
that; you'll need to do the conversion on a machine that has the ECW SDK,
then run the rest of this pipeline on the resulting GeoTIFFs.

Usage:
    python convert_ecw.py input.ecw output.tif
"""

import subprocess
import sys
from pathlib import Path


def convert(input_path: Path, output_path: Path) -> None:
    # Check the ECW driver is actually available before attempting anything.
    check = subprocess.run(
        ["gdalinfo", "--formats"], capture_output=True, text=True, check=True
    )
    if "ECW" not in check.stdout:
        raise RuntimeError(
            "GDAL on this system was not built with ECW support. "
            "Install a GDAL distribution with the ECW SDK, or perform the "
            "ECW -> GeoTIFF conversion on a machine that has it, then copy "
            "the resulting GeoTIFFs here."
        )

    cmd = [
        "gdal_translate",
        "-of", "GTiff",
        str(input_path),
        str(output_path),
        "-co", "COMPRESS=DEFLATE",
        "-co", "BIGTIFF=YES",
        "-co", "TILED=YES",
    ]
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True)
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_ecw.py input.ecw output.tif")
        sys.exit(1)
    convert(Path(sys.argv[1]), Path(sys.argv[2]))
