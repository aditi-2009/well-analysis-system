"""
imagery/base_provider.py

Abstract contract for imagery sources. Services depend on THIS, never
on a concrete provider, so GEE can be swapped for another source.
"""

from abc import ABC, abstractmethod


class BaseImageryProvider(ABC):
    @abstractmethod
    def search(
        self,
        bbox: tuple[float, float, float, float],
        start_date: str | None = None,
        end_date: str | None = None,
        max_cloud_percent: float | None = None,
    ) -> list[dict]:
        """Return scene metadata dicts for the (minx, miny, maxx, maxy)
        bbox in lon/lat."""

    @abstractmethod
    def download(
        self,
        scene_id: str,
        bbox: tuple[float, float, float, float],
        output_path: str,
    ) -> str:
        """Download a scene as GeoTIFF; return the written path."""
