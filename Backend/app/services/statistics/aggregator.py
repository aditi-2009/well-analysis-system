"""
services/statistics/aggregator.py

Statistics aggregation utilities.
"""

import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


class StatisticsAggregator:
    """Aggregates detection statistics."""

    @staticmethod
    def aggregate_by_field(
        items: List[Dict],
        field: str,
        count_field: str = "count",
    ) -> Dict[str, int]:
        """
        Aggregate counts by a field value.

        Args:
            items: List of dictionaries
            field: Field to group by
            count_field: Field to sum

        Returns:
            {field_value: total_count}
        """
        aggregated = {}
        for item in items:
            key = item.get(field)
            count = item.get(count_field, 1)

            if key:
                aggregated[key] = aggregated.get(key, 0) + count

        return aggregated

    @staticmethod
    def calculate_average_confidence(
        detections: List[Dict],
    ) -> float:
        """
        Calculate average confidence across detections.

        Args:
            detections: List of detection dicts

        Returns:
            Average confidence (0-1)
        """
        if not detections:
            return 0.0

        confidences = [d.get("confidence", 0) for d in detections if "confidence" in d]

        if not confidences:
            return 0.0

        return sum(confidences) / len(confidences)

    @staticmethod
    def group_by_location(
        detections: List[Dict],
        location_field: str = "village_id",
    ) -> Dict[str, List[Dict]]:
        """
        Group detections by location.

        Args:
            detections: List of detections
            location_field: Field to group by

        Returns:
            {location_value: [detections]}
        """
        grouped = {}
        for detection in detections:
            location = detection.get(location_field)
            if location:
                if location not in grouped:
                    grouped[location] = []
                grouped[location].append(detection)

        return grouped
