"""
schemas/statistics.py

Aggregated well detection statistics by administrative boundaries.

WHY THIS FILE EXISTS
-----------------------
Master prompt Section 22 (analytics) + Section 31 Phase 7. A user
asks "how many wells in Arvi village?" or "average detection confidence
by taluka?" These endpoints return aggregated counts/averages across
predictions grouped by location. This schema documents those responses.

WHO IMPORTS THIS FILE
------------------------
- api/v1/endpoints/statistics.py (future) — returns these
- services/statistics/well_statistics_service.py (future) — computes
  aggregates from prediction rows

WHAT THIS FILE IMPORTS
------------------------
schemas/common.py (OrmBaseModel, PaginatedResponse), stdlib.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import OrmBaseModel, PaginatedResponse


class WellCountByVillage(OrmBaseModel):
    """One row in a village-wise well count report."""

    village_id: int = Field(gt=0)
    village_name: str
    well_count: int = Field(ge=0)
    average_confidence: float | None = Field(default=None, ge=0, le=1)
    latest_detection: datetime | None = Field(default=None)


class WellCountByTaluka(OrmBaseModel):
    """One row in a taluka-wise well count report."""

    taluka_id: int = Field(gt=0)
    taluka_name: str
    well_count: int = Field(ge=0)
    average_confidence: float | None = Field(default=None, ge=0, le=1)
    village_count: int = Field(ge=0, description="Number of distinct villages in this taluka with detections.")


class WellCountByDistrict(OrmBaseModel):
    """One row in a district-wise well count report."""

    district_id: int = Field(gt=0)
    district_name: str
    well_count: int = Field(ge=0)
    average_confidence: float | None = Field(default=None, ge=0, le=1)
    taluka_count: int = Field(ge=0)


class OverallStatistics(BaseModel):
    """
    System-wide well detection summary. Useful for a dashboard showing
    overall platform statistics.
    """

    total_wells_detected: int = Field(ge=0)
    total_predictions_run: int = Field(ge=0)
    total_villages_analyzed: int = Field(ge=0)
    average_detection_confidence: float | None = Field(default=None, ge=0, le=1)
    earliest_detection: datetime | None = Field(default=None)
    latest_detection: datetime | None = Field(default=None)


class WellStatisticsResponse(BaseModel):
    """
    Wrapper for a statistics query result — could be village-wise,
    taluka-wise, or district-wise depending on the endpoint.
    """

    level: str = Field(description="'village', 'taluka', or 'district'.")
    items: list[WellCountByVillage | WellCountByTaluka | WellCountByDistrict]
    total_count: int = Field(ge=0, description="Total across all items.")


class WellStatisticsListResponse(PaginatedResponse[WellStatisticsResponse]):
    """Paginated list of statistics responses."""

    pass