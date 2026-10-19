"""
services/statistics/well_statistics_service.py

Well detection statistics aggregation.
"""

import logging

from sqlalchemy.orm import Session

from app.db.repository.statistics_repository import StatisticsRepository

logger = logging.getLogger(__name__)


class WellStatisticsService:
    """Statistics business logic."""

    @staticmethod
    def get_statistics_by_village(db: Session) -> dict:
        """Get well counts by village."""
        try:
            items = StatisticsRepository.count_wells_by_village(db)
            total = sum(item["well_count"] for item in items)
            return {
                "level": "village",
                "items": items,
                "total_wells": total,
            }
        except Exception as e:
            logger.error(f"Error fetching village statistics: {e}")
            raise

    @staticmethod
    def get_statistics_by_taluka(db: Session) -> dict:
        """Get well counts by taluka."""
        try:
            items = StatisticsRepository.count_wells_by_taluka(db)
            total = sum(item["well_count"] for item in items)
            return {
                "level": "taluka",
                "items": items,
                "total_wells": total,
            }
        except Exception as e:
            logger.error(f"Error fetching taluka statistics: {e}")
            raise

    @staticmethod
    def get_statistics_by_district(db: Session) -> dict:
        """Get well counts by district."""
        try:
            items = StatisticsRepository.count_wells_by_district(db)
            total = sum(item["well_count"] for item in items)
            return {
                "level": "district",
                "items": items,
                "total_wells": total,
            }
        except Exception as e:
            logger.error(f"Error fetching district statistics: {e}")
            raise

    @staticmethod
    def get_overall_statistics(db: Session) -> dict:
        """Get system-wide statistics."""
        try:
            return StatisticsRepository.overall_statistics(db)
        except Exception as e:
            logger.error(f"Error fetching overall statistics: {e}")
            raise
