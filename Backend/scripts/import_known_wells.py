"""
scripts/import_known_wells.py

Load officer-verified well POINTS into the known_wells table.

Safety rules:
  * No coordinate system in the file -> stop. Never guess.
  * Coordinates are converted to WGS84 (EPSG:4326: longitude, latitude).
  * Points must fall inside Maharashtra, so a wrong CRS is caught early.
  * All rows are written in ONE transaction: all or nothing.
  * Re-running is safe: rows are matched on (source, well_identifier) and
    updated, never duplicated.

Run from Backend\\ (load dev_env.ps1 first if the file needs reprojecting):
    python -m scripts.import_known_wells <file> --source <name> [options]
"""

import argparse
from collections import Counter

import geopandas as gpd
import pandas as pd
import rasterio
from rasterio.warp import transform_bounds
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.db.models.known_wells import KnownWell
from app.db.session import SessionLocal

BATCH_SIZE = 1000
STATE_BOX = (72.0, 15.0, 81.0, 23.0)  # rough Maharashtra box: minLon, minLat, maxLon, maxLat


def clean(value, default=None):
    """Text from a table cell. Empty or missing cells become the default."""
    if value is None or pd.isna(value):
        return default
    text = str(value).strip()
    return text or default


def pick(rec, column, default):
    """Value from a column if the column was given, otherwise the default."""
    return clean(rec[column], default) if column else default


def main() -> int:
    ap = argparse.ArgumentParser(description="Import officer-verified well points.")
    ap.add_argument("path", help="shapefile, GeoPackage or GeoJSON of point wells")
    ap.add_argument("--source", required=True, help="dataset name, e.g. officer_survey_deoli")
    ap.add_argument("--raster", help="keep only points inside this image's footprint")
    ap.add_argument("--id-column", help="column with a stable well id (strongly recommended)")
    ap.add_argument("--village-column", help="column with the village name")
    ap.add_argument("--taluka-column", help="column with the taluka name")
    ap.add_argument("--district-column", help="column with the district name")
    ap.add_argument("--village", help="village for every row when there is no column")
    ap.add_argument("--taluka", help="taluka for every row when there is no column")
    ap.add_argument("--district", help="district for every row when there is no column")
    args = ap.parse_args()

    gdf = gpd.read_file(args.path)
    if gdf.crs is None:
        print("STOP: this file has no coordinate system (.prj missing). Fix it first.")
        return 1
    print(f"Read {len(gdf)} features, CRS = {gdf.crs.to_string()}")

    points = gdf[gdf.geom_type == "Point"].to_crs(epsg=4326).reset_index(drop=True)
    if len(points) < len(gdf):
        print(f"Skipped {len(gdf) - len(points)} features that are not points")

    if args.raster:
        with rasterio.open(args.raster) as src:
            left, bottom, right, top = transform_bounds(src.crs, "EPSG:4326", *src.bounds)
        points = points.cx[left:right, bottom:top].reset_index(drop=True)
        print(f"Inside {args.raster}: {len(points)} points")

    if points.empty:
        print("STOP: no point features to import.")
        return 1

    minx, miny, maxx, maxy = points.total_bounds
    print(f"Lon range {minx:.4f} .. {maxx:.4f} | Lat range {miny:.4f} .. {maxy:.4f}")
    if minx < STATE_BOX[0] or miny < STATE_BOX[1] or maxx > STATE_BOX[2] or maxy > STATE_BOX[3]:
        print("STOP: points fall outside Maharashtra. The coordinate system is probably wrong.")
        return 1

    if not args.id_column:
        print("WARNING: no --id-column. IDs will be row numbers, which can change if the file is re-exported.")

    rows = []
    for i in range(len(points)):
        rec = points.iloc[i]
        geom = points.geometry.iloc[i]
        ident = pick(rec, args.id_column, None)
        if args.id_column and ident is None:
            print(f"STOP: row {i + 1} has no value in column {args.id_column}.")
            return 1
        rows.append(
            {
                "source": args.source,
                "well_identifier": ident or f"{args.source}-{i + 1:06d}",
                "geom": func.ST_SetSRID(func.ST_MakePoint(geom.x, geom.y), 4326),
                "status": "Verified",
                "district": pick(rec, args.district_column, args.district),
                "taluka": pick(rec, args.taluka_column, args.taluka),
                "village": pick(rec, args.village_column, args.village),
            }
        )

    counts = Counter(r["well_identifier"] for r in rows)
    dupes = [k for k, n in counts.items() if n > 1]
    if dupes:
        print(f"STOP: {len(dupes)} duplicate well ids, for example {dupes[:5]}. Choose a better --id-column.")
        return 1

    with SessionLocal() as db:
        try:
            for start in range(0, len(rows), BATCH_SIZE):
                stmt = insert(KnownWell.__table__).values(rows[start:start + BATCH_SIZE])
                stmt = stmt.on_conflict_do_update(
                    constraint="uq_known_wells_source_well_identifier",
                    set_={
                        "geom": stmt.excluded.geom,
                        "status": stmt.excluded.status,
                        "district": stmt.excluded.district,
                        "taluka": stmt.excluded.taluka,
                        "village": stmt.excluded.village,
                        "updated_at": func.now(),
                    },
                )
                db.execute(stmt)
            db.commit()
            total = db.scalar(
                select(func.count()).select_from(KnownWell).where(KnownWell.source == args.source)
            )
        except Exception:
            db.rollback()
            raise

    print(f"Done. {len(rows)} rows processed. known_wells has {total} rows for source '{args.source}'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
