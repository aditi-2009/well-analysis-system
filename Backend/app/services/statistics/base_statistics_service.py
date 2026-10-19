"""
services/statistics/base_statistics_service.py

Base class for statistics services.
"""

import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseStatisticsService(ABC):
    """Abstract base class for statistics aggregation."""

    @abstractmethod
    def get_statistics(self, db) -> dict:
        """
        Get statistics (must be implemented by subclasses).

        Args:
            db: Database session

        Returns:
            Statistics dictionary
        """
        pass

    @staticmethod
    def format_statistics(
        level: str,
        items: list,
        total: int,
    ) -> dict:
        """
        Format statistics response.

        Args:
            level: Aggregation level (village, taluka, district)
            items: Aggregated items
            total: Total count

        Returns:
            Formatted response dict
        """
        return {
            "level": level,
            "items": items,
            "total": total,
        }
