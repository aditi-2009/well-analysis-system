"""
db/repository/location_repository.py

Data access layer for location hierarchy (State → District → Taluka → Village).
"""

from sqlalchemy.orm import Session

from app.db.models.state import State
from app.db.models.district import District
from app.db.models.taluka import Taluka
from app.db.models.village import Village


class LocationRepository:
    """Encapsulates location queries."""

    @staticmethod
    def get_all_states(db: Session) -> list[State]:
        """Fetch all states."""
        return db.query(State).order_by(State.name).all()

    @staticmethod
    def get_districts_by_state(db: Session, state_id: int) -> list[District]:
        """Fetch districts in a state."""
        return (
            db.query(District)
            .filter(District.state_id == state_id)
            .order_by(District.name)
            .all()
        )

    @staticmethod
    def get_talukas_by_district(db: Session, district_id: int) -> list[Taluka]:
        """Fetch talukas in a district."""
        return (
            db.query(Taluka)
            .filter(Taluka.district_id == district_id)
            .order_by(Taluka.name)
            .all()
        )

    @staticmethod
    def get_villages_by_taluka(db: Session, taluka_id: int) -> list[Village]:
        """Fetch villages in a taluka."""
        return (
            db.query(Village)
            .filter(Village.taluka_id == taluka_id)
            .order_by(Village.name)
            .all()
        )

    @staticmethod
    def get_village_by_id(db: Session, village_id: int) -> Village | None:
        """Fetch one village by ID."""
        return db.query(Village).filter(Village.id == village_id).first()
