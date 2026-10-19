"""
db/models/detected_well.py

One AI-detected well: a PostGIS point (WGS84) plus the pixel box it came from.
Kept apart from known_wells (officer-verified) on purpose.

WHO IMPORTS THIS: db/models/__init__.py, db/repository/detection_repository.py
WHAT IT IMPORTS: geoalchemy2 (Geometry), sqlalchemy, db/base.py
"""

from geoalchemy2 import Geometry
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
)

from app.db.base import Base


class DetectedWell(Base):
    """One detected well. geom is POINT(longitude latitude), SRID 4326."""

    __tablename__ = "detected_wells"
    __table_args__ = (
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="confidence_range"),
        # GiST index: keeps "wells inside this area" fast when the table holds millions of rows.
        Index("ix_detected_wells_geom", "geom", postgresql_using="gist"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_id = Column(
        String(36),
        ForeignKey("detection_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )  # delete a job and its wells go with it
    geom = Column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    confidence = Column(Float, nullable=False)
    class_name = Column(String(100), nullable=False, default="well")

    # The box in the image, kept for audit and for drawing it again.
    px_x1 = Column(Integer, nullable=True)
    px_y1 = Column(Integer, nullable=True)
    px_x2 = Column(Integer, nullable=True)
    px_y2 = Column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<DetectedWell(id={self.id}, job={self.job_id}, conf={self.confidence})>"
