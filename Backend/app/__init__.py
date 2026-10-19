"""
app/__init__.py

Python runs this file before any module under app/ is imported: uvicorn
(app.main:app), every script and the self-check. Keep it small.

WHY THIS FILE EXISTS
--------------------
Coordinate conversion uses PROJ, which reads a database file called proj.db.
This machine has two copies: one installed with PostgreSQL/PostGIS and one
shipped inside rasterio. PROJ_LIB and PROJ_DATA decide which copy a process
uses, and they come from the window that started the process. A window
without dev_env.ps1 can pick the PostgreSQL copy. The program is the new
one and the file is the old one, so every conversion fails with "The EPSG
code is unknown". A run fails only when it finds marks, because only then
does it convert coordinates.

WHAT IT DOES
------------
Points PROJ and GDAL at the data that ships with rasterio, inside this
process, before any module imports rasterio. It finds rasterio with
find_spec, which locates a package without importing it, so nothing starts
too early.

WHAT IT IMPORTS
---------------
Only the standard library: importlib, os, pathlib.
"""

import importlib.util
import os
from pathlib import Path


def _use_rasterio_gis_data() -> None:
    spec = importlib.util.find_spec("rasterio")
    if spec is None or spec.origin is None:
        return  # rasterio is not installed; the imports later will say so
    package_dir = Path(spec.origin).parent
    proj_dir = package_dir / "proj_data"
    gdal_dir = package_dir / "gdal_data"
    if (proj_dir / "proj.db").is_file():
        os.environ["PROJ_DATA"] = str(proj_dir)
        os.environ["PROJ_LIB"] = str(proj_dir)  # older PROJ versions read this name
    if gdal_dir.is_dir():
        os.environ["GDAL_DATA"] = str(gdal_dir)


_use_rasterio_gis_data()