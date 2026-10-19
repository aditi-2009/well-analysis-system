"""
ORM model for one detection run (one uploaded image -> N wells).
Individual wells live in the `wells` table (db/models/well.py).
"""

from datetime import datetime

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
)

from app.db.base import Base


class Prediction(Base):
    """Metadata + GeoJSON result of a single detection run."""

    __tablename__ = "prediction"

    prediction_id = Column(String(36), primary_key=True)
    task = Column(String(100), nullable=False, default="well_detection")
    status = Column(String(50), nullable=False, default="queued", index=True)
    model_id = Column(String(255), nullable=True, index=True)
    file_id = Column(
        String(255),
        ForeignKey("satellite_image.file_id"),
        nullable=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True)
    detection_count = Column(Integer, nullable=False, default=0)
    detections = Column(JSON, nullable=True)  # GeoJSON Feature list
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<Prediction(id={self.prediction_id}, status={self.status}, "
            f"count={self.detection_count})>"
        )
