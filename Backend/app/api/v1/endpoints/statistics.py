"""
api/v1/endpoints/statistics.py

GET /statistics/* — well detection statistics by location.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.statistics.well_statistics_service import (
    WellStatisticsService,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/statistics",
    tags=["Statistics"],
)


@router.get("/villages")
async def statistics_by_village(db: Session = Depends(get_db)):
    """
    Well count statistics by village.

    Returns:
        {
            "level": "village",
            "items": [
                {
                    "village_id": 1,
                    "village_name": "Arvi",
                    "well_count": 42,
                    "avg_confidence": 0.92,
                }
            ],
            "total_wells": 150,
        }
    """
    try:
        return WellStatisticsService.get_statistics_by_village(db)
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/talukas")
async def statistics_by_taluka(db: Session = Depends(get_db)):
    """
    Well count statistics by taluka.

    Returns:
        {
            "level": "taluka",
            "items": [
                {
                    "taluka_id": 1,
                    "taluka_name": "Wardha",
                    "well_count": 150,
                    "village_count": 5,
                }
            ],
            "total_wells": 500,
        }
    """
    try:
        return WellStatisticsService.get_statistics_by_taluka(db)
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/districts")
async def statistics_by_district(db: Session = Depends(get_db)):
    """
    Well count statistics by district.

    Returns:
        {
            "level": "district",
            "items": [
                {
                    "district_id": 1,
                    "district_name": "Wardha",
                    "well_count": 500,
                    "taluka_count": 3,
                }
            ],
            "total_wells": 1000,
        }
    """
    try:
        return WellStatisticsService.get_statistics_by_district(db)
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overall")
async def overall_statistics(db: Session = Depends(get_db)):
    """
    System-wide well detection summary.

    Returns:
        {
            "total_wells_detected": 1000,
            "total_predictions_run": 50,
            "average_detection_confidence": 0.89,
            "earliest_detection": "2026-09-28T10:30:00",
            "latest_detection": "2026-10-05T14:45:00",
        }
    """
    try:
        return WellStatisticsService.get_overall_statistics(db)
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
