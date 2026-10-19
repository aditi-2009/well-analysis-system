"""
db/repository/well_repository.py

Data access for individual detected wells.
"""

from sqlalchemy.orm import Session

from app.db.models.well import Well


def get_all(db: Session) -> list[Well]:
    return db.query(Well).all()


def add_many(db: Session, wells: list[Well]) -> int:
    """Insert many wells in one transaction. Returns how many."""
    if not wells:
        return 0
    db.add_all(wells)
    db.commit()
    return len(wells)
