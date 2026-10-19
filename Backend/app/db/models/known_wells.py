"""
db/models/known_well.py

ORM model for known/reference wells (government, ICAR, field-verified
datasets). Kept completely separate from AI detections.

WHO IMPORTS THIS FILE: db/models/__init__.py (registers the table).
WHAT IT IMPORTS: geoalchemy2 (Geometry), sqlalchemy, db/base.py (Base).
"""

from geoalchemy2 import Geometry
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)

from app.db.base import Base


class KnownWell(Base):
    """One reference well. `geom` is the single source of truth for location."""

    __tablename__ = "known_wells"
    __table_args__ = (
        # The same well id may repeat across different sources, never within one.
        UniqueConstraint("source", "well_identifier"),
        # GiST = the index type that makes "wells inside this polygon" fast.
        # Declared explicitly so Alembic can see and track it.
        Index("ix_known_wells_geom", "geom", postgresql_using="gist"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    well_identifier = Column(String(100), nullable=True)
    source = Column(String(100), nullable=False)
    source_reference = Column(String(500), nullable=True)

    # POINT(longitude latitude), SRID 4326 (WGS84). X = longitude, Y = latitude.
    geom = Column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )

    well_type = Column(String(50), nullable=True)
    status = Column(String(50), nullable=True)

    # Text exactly as the source dataset gave it (not foreign keys on purpose).
    district = Column(String(255), nullable=True)
    taluka = Column(String(255), nullable=True)
    village = Column(String(255), nullable=True)

    created_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return f"<KnownWell(id={self.id}, source={self.source})>"
