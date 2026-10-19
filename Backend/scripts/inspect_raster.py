"""
scripts/inspect_raster.py

Checks every image in a folder against what this backend can use:
  OK          readable and georeferenced: usable for detection and maps
  NOT GEOREF  readable, but has no coordinates (needs a world file or a GeoTIFF)
  FAILED      GDAL cannot open it (for example ECW when GDAL has no ECW support)

Run from Backend\\ :
    python -m scripts.inspect_raster "..\\Model-Training\\data"
"""

import sys
from pathlib import Path

import rasterio
from rasterio.errors import RasterioIOError

IMAGE_EXTENSIONS = {
    ".tif", ".tiff", ".ecw", ".jp2", ".img", ".jpg", ".jpeg", ".png", ".vrt",
}


def inspect(path: Path) -> str:
    try:
        with rasterio.open(path) as src:
            georef = src.crs is not None and not src.transform.is_identity
            verdict = "OK" if georef else "NOT GEOREF"
            return (
                f"{verdict:<11} driver={src.driver:<10} crs={src.crs} "
                f"res={src.res[0]:.4f} size={src.width}x{src.height} "
                f"bands={src.count} dtype={src.dtypes[0]} nodata={src.nodata}"
            )
    except RasterioIOError as e:
        return f"FAILED      {str(e)[:100]}"


def main() -> None:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    files = sorted(
        p for p in root.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )
    print(f"{len(files)} image files under {root.resolve()}")
    for p in files:
        print(f"{p.name[:35]:<35} {inspect(p)}")


if __name__ == "__main__":
    main()
