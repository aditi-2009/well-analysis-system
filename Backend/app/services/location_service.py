"""
services/location_service.py

Location hierarchy queries for cascading dropdowns.
"""

import logging

from sqlalchemy.orm import Session

from app.db.repository.location_repository import LocationRepository
from app.schemas.location import (
    StateResponse,
    DistrictResponse,
    TalukaResponse,
    VillageResponse,
)

logger = logging.getLogger(__name__)


class LocationService:
    """Location hierarchy business logic."""

    @staticmethod
    def get_states(db: Session) -> list[StateResponse]:
        """Fetch all states."""
        states = LocationRepository.get_all_states(db)
        return [StateResponse.model_validate(s) for s in states]

    @staticmethod
    def get_districts(db: Session, state_id: int) -> list[DistrictResponse]:
        """Fetch districts in a state."""
        districts = LocationRepository.get_districts_by_state(db, state_id)
        return [DistrictResponse.model_validate(d) for d in districts]

    @staticmethod
    def get_talukas(db: Session, district_id: int) -> list[TalukaResponse]:
        """Fetch talukas in a district."""
        talukas = LocationRepository.get_talukas_by_district(db, district_id)
        return [TalukaResponse.model_validate(t) for t in talukas]

    @staticmethod
    def get_villages(db: Session, taluka_id: int) -> list[VillageResponse]:
        """Fetch villages in a taluka."""
        villages = LocationRepository.get_villages_by_taluka(db, taluka_id)
        return [VillageResponse.model_validate(v) for v in villages]

    @staticmethod
    def get_village_details(db: Session, village_id: int) -> VillageResponse | None:
        """Fetch one village with geospatial details."""
        village = LocationRepository.get_village_by_id(db, village_id)
        if village:
            return VillageResponse.model_validate(village)
        return None
