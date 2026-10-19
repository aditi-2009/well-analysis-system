"""
gis/raster_tiling.py

Tile (patch) geometry for large rasters. Pure arithmetic + a rasterio
Window helper, easy to unit-test without any image.
"""

from collections.abc import Iterator
from dataclasses import dataclass

from rasterio.windows import Window


@dataclass(frozen=True)
class Tile:
    col_off: int
    row_off: int
    width: int
    height: int

    def to_window(self) -> Window:
        """For src.read(window=tile.to_window())."""
        return Window(self.col_off, self.row_off, self.width, self.height)

    def to_image_coords(self, x: float, y: float) -> tuple[float, float]:
        """Tile-local pixel -> full-image pixel."""
        return x + self.col_off, y + self.row_off


def _offsets(size: int, patch: int, stride: int) -> Iterator[int]:
    if size <= patch:
        yield 0
        return
    off = 0
    while off + patch < size:
        yield off
        off += stride
    yield size - patch  # last tile is flush with the edge and full-size


def generate_tiles(
    width: int, height: int, patch_size: int, overlap: int = 0
) -> Iterator[Tile]:
    if patch_size <= 0:
        raise ValueError("patch_size must be > 0")
    if not 0 <= overlap < patch_size:
        raise ValueError("overlap must satisfy 0 <= overlap < patch_size")

    stride = patch_size - overlap
    for row in _offsets(height, patch_size, stride):
        for col in _offsets(width, patch_size, stride):
            yield Tile(
                col_off=col,
                row_off=row,
                width=min(patch_size, width - col),
                height=min(patch_size, height - row),
            )
