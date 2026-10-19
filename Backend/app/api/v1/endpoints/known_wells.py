"""
api/v1/endpoints/known_wells.py

GET /api/v1/known-wells: officer-verified (reference) wells as GeoJSON.
Kept separate from AI detections on purpose.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.exceptions import ValidationException
from app.db.models.user import User
from app.db.repository import known_well_repository
from app.db.session import get_db
from app.schemas.known_well import KnownWellCollection

router = APIRouter(prefix="/known-wells", tags=["Known Wells"])


def _parse_bbox(raw: str | None) -> tuple[float, float, float, float] | None:
    """'minLon,minLat,maxLon,maxLat' -> four floats, or None when not given."""
    if raw is None:
        return None
    try:
        minx, miny, maxx, maxy = (float(v) for v in raw.split(","))
    except ValueError as e:
        raise ValidationException(
            "bbox must be four numbers: minLon,minLat,maxLon,maxLat"
        ) from e
    if not (-180 <= minx <= maxx <= 180 and -90 <= miny <= maxy <= 90):
        raise ValidationException("bbox is out of range, or the minimum is above the maximum")
    return minx, miny, maxx, maxy


@router.get("", response_model=KnownWellCollection)
def list_known_wells(
    village: str | None = Query(None, max_length=255),
    bbox: str | None = Query(None, description="minLon,minLat,maxLon,maxLat"),
    limit: int = Query(5000, ge=1, le=20000),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = known_well_repository.list_points(
        db, village=village, bbox=_parse_bbox(bbox), limit=limit
    )
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]},
            "properties": {
                "id": r["id"],
                "well_identifier": r["well_identifier"],
                "source": r["source"],
                "district": r["district"],
                "taluka": r["taluka"],
                "village": r["village"],
                "status": r["status"],
                "well_type": r["well_type"],
            },
        }
        for r in rows
    ]
    return {"type": "FeatureCollection", "count": len(features), "features": features}
