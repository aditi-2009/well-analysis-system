"""
schemas/common.py

Shared Pydantic building blocks used across every other schema file.

WHY THIS FILE EXISTS
-----------------------
Without this, every future schema (detection, upload, statistics,
location) would redefine its own pagination fields and its own way of
reading SQLAlchemy ORM objects — duplicate logic, the exact thing the
project rules forbid. This file defines those pieces ONCE.

WHO IMPORTS THIS FILE
------------------------
Every future request/response schema module:
  - schemas/detection.py, upload.py, statistics.py, location.py
    -> OrmBaseModel (base class for any schema built from a DB row)
    -> PaginatedResponse (any "list of X" endpoint response)
  - Optionally main.py or individual endpoint files, to reference
    ErrorResponse in route `responses=` metadata for OpenAPI docs.

WHAT THIS FILE IMPORTS
------------------------
Only pydantic and stdlib typing. No project imports — schemas, like
core/, must stay import-safe from anywhere without risk of a circular
import.

DESIGN PATTERN
-----------------
- OrmBaseModel: mixin pattern for any schema built `from` a SQLAlchemy
  model instance.
- PaginatedResponse[T]: generic container pattern for any "list of X"
  response.
- ErrorResponse: documents the JSON shape main.py's global exception
  handlers already return.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T", bound=BaseModel)


class OrmBaseModel(BaseModel):
    """
    Base class for any response schema built from a SQLAlchemy ORM
    instance, e.g. PredictionResponse.model_validate(db_row).
    from_attributes=True lets Pydantic read row.id instead of
    requiring row["id"].
    """

    model_config = ConfigDict(from_attributes=True)


class PaginationParams(BaseModel):
    """
    Query-parameter schema for any list endpoint. FastAPI parses
    ?page=2&page_size=50 into this automatically when used as a
    dependency. Bounds are enforced by Pydantic itself.
    """

    page: int = Field(default=1, ge=1, description="1-indexed page number.")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page, max 100.")

    @property
    def offset(self) -> int:
        """Convenience for repository queries: LIMIT page_size OFFSET offset."""
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic wrapper for any paginated list response, e.g.:
        class PredictionListResponse(PaginatedResponse[PredictionResponse]):
            pass
    """

    items: list[T]
    total: int = Field(ge=0, description="Total matching records across all pages.")
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total_pages: int = Field(ge=0)


class ErrorResponse(BaseModel):
    """
    Documents the JSON shape main.py's global exception handlers
    return. Not used to construct responses — main.py builds those as
    plain dicts — this exists purely so /docs shows an accurate error
    schema.
    """

    error_code: str = Field(description="Stable machine-readable error identifier.")
    message: str = Field(description="Human-readable, safe-to-display error message.")
    fields: list[dict] | None = Field(
        default=None,
        description="Present only for request validation errors (422).",
    )