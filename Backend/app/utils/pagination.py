"""
utils/pagination.py

Pagination utilities for list endpoints.
"""

from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    """Query parameters for paginated endpoints."""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="created_at")
    order: str = Field(default="desc")

    @property
    def offset(self) -> int:
        """Calculate offset for database query."""
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper."""

    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
