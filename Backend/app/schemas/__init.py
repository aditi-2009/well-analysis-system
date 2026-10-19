"""
schemas/

Pydantic request/response schemas — data validation and serialization.
"""

from app.schemas.common import (
    OrmBaseModel,
    PaginationParams,
    PaginatedResponse,
    ErrorResponse,
)
from app.schemas.detection import (
    WellDetection,
    BoundingBox,
    WellDetectionResponse,
    FileDetectionRequest,
    LocationDetectionRequest,
    DetectionStatus,
)
from app.schemas.upload import UploadResponse, FileFormat, UploadStatus
from app.schemas.location import (
    StateResponse,
    DistrictResponse,
    TalukaResponse,
    VillageResponse,
    LocationCascadeResponse,
)
from app.schemas.statistics import (
    WellCountByVillage,
    WellCountByTaluka,
    WellCountByDistrict,
    OverallStatistics,
    WellStatisticsResponse,
)
from app.schemas.ai_model import AIModelResponse, ActiveModelResponse
from app.schemas.auth import LoginRequest, Token, TokenData, UserResponse
from app.schemas.gee import (
    ImagerySearchRequest,
    ImagerySearchResponse,
    ImageryDownloadRequest,
    ImageryDownloadResponse,
    SatelliteSensor,
)

__all__ = [
    "OrmBaseModel",
    "PaginationParams",
    "PaginatedResponse",
    "ErrorResponse",
    "WellDetection",
    "BoundingBox",
    "WellDetectionResponse",
    "FileDetectionRequest",
    "LocationDetectionRequest",
    "DetectionStatus",
    "UploadResponse",
    "FileFormat",
    "UploadStatus",
    "StateResponse",
    "DistrictResponse",
    "TalukaResponse",
    "VillageResponse",
    "LocationCascadeResponse",
    "WellCountByVillage",
    "WellCountByTaluka",
    "WellCountByDistrict",
    "OverallStatistics",
    "WellStatisticsResponse",
    "AIModelResponse",
    "ActiveModelResponse",
    "LoginRequest",
    "Token",
    "TokenData",
    "UserResponse",
    "ImagerySearchRequest",
    "ImagerySearchResponse",
    "ImageryDownloadRequest",
    "ImageryDownloadResponse",
    "SatelliteSensor",
]
