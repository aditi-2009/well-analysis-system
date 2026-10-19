"""
db/models/detection_job.py

One detection run: which image, which area, which model, and how it ended.
Every detected well points back to exactly one job.

The area is stored twice on purpose:
  * district_id / taluka_id / village_id: links to the location tables,
    so the database guarantees the area really exists
  * district / taluka / village: the names at the time of the run

WHO IMPORTS THIS: db/models/__init__.py, db/repository/detection_repository.py
WHAT IT IMPORTS: sqlalchemy, db/base.py
"""

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)

from app.db.base import Base


class DetectionJob(Base):
    """One run of the detector over one image."""

    __tablename__ = "detection_jobs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'running', 'completed', 'failed')",
            name="status_valid",
        ),
    )

    id = Column(String(36), primary_key=True)  # uuid4 as text, set by the service
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )  # NULL when the job starts from the command line
    image_id = Column(
        String(255),
        ForeignKey("satellite_image.file_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Area: links to the location tables ...
    district_id = Column(
        Integer, ForeignKey("district.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    taluka_id = Column(
        Integer, ForeignKey("taluka.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    village_id = Column(
        Integer, ForeignKey("village.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    # ... and the names at the time of the run.
    district = Column(String(255), nullable=True)
    taluka = Column(String(255), nullable=True)
    village = Column(String(255), nullable=True)

    # Traceability: exactly which weights and settings produced these wells.
    model_version = Column(String(100), nullable=False)
    params = Column(JSON, nullable=False, default=dict)

    status = Column(String(20), nullable=False, default="pending")
    tiles_total = Column(Integer, nullable=True)
    tiles_done = Column(Integer, nullable=False, default=0)
    total_detections = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)  # safe text for the user; details go to the log

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<DetectionJob(id={self.id}, status={self.status}, wells={self.total_detections})>"
