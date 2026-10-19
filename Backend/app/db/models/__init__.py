"""
db/models/

SQLAlchemy ORM models for all database tables. Importing this package
registers every table with Base.metadata, which Alembic relies on.
"""

from app.db.models.satellite_image import SatelliteImage
from app.db.models.state import State
from app.db.models.district import District
from app.db.models.taluka import Taluka
from app.db.models.village import Village
from app.db.models.user import User
from app.db.models.known_wells import KnownWell
from app.db.models.detection_job import DetectionJob
from app.db.models.detected_wells import DetectedWell
from app.db.models.well import Well              # legacy, removed in the cleanup step
from app.db.models.prediction import Prediction  # legacy, removed in the cleanup step

__all__ = [
    "SatelliteImage",
    "State",
    "District",
    "Taluka",
    "Village",
    "User",
    "KnownWell",
    "DetectionJob",
    "DetectedWell",
    "Well",
    "Prediction",
]
