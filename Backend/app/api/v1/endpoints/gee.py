"""
POST /gee/search: find imagery for a village boundary.
Download is not exposed yet because GEEService.download_imagery is
still a stub; exposing a fake download would be misleading.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.exceptions import ResourceNotFoundException, ValidationException
from app.db.models.user import User
from app.db.repository.location_repository import LocationRepository
from app.db.session import get_db
from app.gis.geojson_builder import bbox_from_geojson
from app.schemas.gee import (
    ImagerySceneMetadata,
    ImagerySearchRequest,
    ImagerySearchResponse,
)
from app.services.gee_service import GEEService

router = APIRouter(prefix="/gee", tags=["Google Earth Engine"])


@router.post("/search", response_model=ImagerySearchResponse)
def search_imagery(
    request: ImagerySearchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    village = LocationRepository.get_village_by_id(db, request.village_id)
    if village is None:
        raise ResourceNotFoundException("Village not found.")
    if not village.geom_geojson:
        raise ValidationException("This village has no boundary loaded yet.")

    minx, miny, maxx, maxy = bbox_from_geojson(village.geom_geojson)
    raw_scenes = GEEService.search_imagery(
        minx,
        miny,
        maxx,
        maxy,
        start_date=request.min_date.date().isoformat() if request.min_date else None,
        end_date=request.max_date.date().isoformat() if request.max_date else None,
        cloud_cover_max=(
            int(request.max_cloud_percent)
            if request.max_cloud_percent is not None
            else 100
        ),
    )
    scenes = [
        ImagerySceneMetadata(
            scene_id=s["id"],
            acquisition_date=datetime.fromisoformat(s["date"]),
            cloud_percent=s["cloud_cover"],
            spatial_resolution_m=10.0,  # Sentinel-2 visible bands
            sensor=request.sensor,
        )
        for s in raw_scenes
    ]
    return ImagerySearchResponse(
        village_id=request.village_id,
        total_scenes=len(scenes),
        scenes=scenes,
    )
