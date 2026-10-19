"""
api/v1/endpoints/locations.py

Location hierarchy cascading endpoints.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.location_service import LocationService
from app.schemas.location import (
    StateResponse,
    DistrictResponse,
    TalukaResponse,
    VillageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/locations",
    tags=["Locations"],
)


@router.get("/states", response_model=list[StateResponse])
def get_states(db: Session = Depends(get_db)):
    """Fetch all states."""
    try:
        return LocationService.get_states(db)
    except Exception as e:
        logger.error(f"Error fetching states: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/districts/{state_id}", response_model=list[DistrictResponse])
def get_districts(state_id: int, db: Session = Depends(get_db)):
    """Fetch districts in a state."""
    try:
        return LocationService.get_districts(db, state_id)
    except Exception as e:
        logger.error(f"Error fetching districts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/talukas/{district_id}", response_model=list[TalukaResponse])
def get_talukas(district_id: int, db: Session = Depends(get_db)):
    """Fetch talukas in a district."""
    try:
        return LocationService.get_talukas(db, district_id)
    except Exception as e:
        logger.error(f"Error fetching talukas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/villages/{taluka_id}", response_model=list[VillageResponse])
def get_villages(taluka_id: int, db: Session = Depends(get_db)):
    """Fetch villages in a taluka."""
    try:
        return LocationService.get_villages(db, taluka_id)
    except Exception as e:
        logger.error(f"Error fetching villages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/village/{village_id}", response_model=VillageResponse)
def get_village_details(village_id: int, db: Session = Depends(get_db)):
    """Fetch one village with geospatial boundary."""
    try:
        village = LocationService.get_village_details(db, village_id)
        if not village:
            raise HTTPException(status_code=404, detail="Village not found")
        return village
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching village: {e}")
        raise HTTPException(status_code=500, detail=str(e))
