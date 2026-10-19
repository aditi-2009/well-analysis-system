"""
db/repository/

Data access layer — all repository classes.
"""

from app.db.repository.prediction_repository import PredictionRepository
from app.db.repository.location_repository import LocationRepository
from app.db.repository.upload_repository import UploadRepository
from app.db.repository.statistics_repository import StatisticsRepository

__all__ = [
    "PredictionRepository",
    "LocationRepository",
    "UploadRepository",
    "StatisticsRepository",
]
