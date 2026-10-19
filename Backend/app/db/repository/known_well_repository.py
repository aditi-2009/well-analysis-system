"""
db/repository/known_well_repository.py

Read queries for known_wells. PostGIS gives longitude and latitude
directly (ST_X = longitude, ST_Y = latitude).
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.known_wells import KnownWell

BBox = tuple[float, float, float, float]  # minLon, minLat, maxLon, maxLat


def list_points(
    db: Session,
    village: str | None = None,
    bbox: BBox | None = None,
    limit: int = 5000,
) -> list[dict]:
    stmt = select(
        KnownWell.id,
        KnownWell.well_identifier,
        KnownWell.source,
        KnownWell.district,
        KnownWell.taluka,
        KnownWell.village,
        KnownWell.status,
        KnownWell.well_type,
        func.ST_X(KnownWell.geom).label("lon"),
        func.ST_Y(KnownWell.geom).label("lat"),
    )
    if village:
        stmt = stmt.where(func.lower(KnownWell.village) == village.strip().lower())
    if bbox:
        minx, miny, maxx, maxy = bbox
        envelope = func.ST_MakeEnvelope(minx, miny, maxx, maxy, 4326)
        # ST_Intersects on the geom column uses the GiST index, so it stays fast on big tables.
        stmt = stmt.where(func.ST_Intersects(KnownWell.geom, envelope))
    stmt = stmt.order_by(KnownWell.id).limit(limit)
    return [dict(row._mapping) for row in db.execute(stmt)]
