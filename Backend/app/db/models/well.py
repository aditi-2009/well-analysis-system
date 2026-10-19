"""
db/models/well.py

SQLAlchemy ORM model for detected wells.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime

from app.db.base import Base


class Well(Base):
    """
    A detected agricultural well from satellite imagery.
    This table stores every well found by the AI model.
    Each row represents one detected well.
    """

    __tablename__ = "wells"

    # Unique identifier (auto-increment)
    id = Column(Integer, primary_key=True, autoincrement=True)

    # GPS coordinates
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # AI model's confidence (0.0 to 1.0)
    confidence = Column(Float, nullable=False)

    # Status of detection
    status = Column(String(50), nullable=False, default="Detected")

    # Administrative location (hierarchical)
    village = Column(String(255), nullable=True)
    taluka = Column(String(255), nullable=True)
    district = Column(String(255), nullable=True)

    # When it was detected
    detected_on = Column(DateTime, nullable=False)

    # When it was added to database
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.utcnow,
        onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return (
            f"<Well(id={self.id}, latitude={self.latitude}, "
            f"longitude={self.longitude}, confidence={self.confidence})>"
        )
