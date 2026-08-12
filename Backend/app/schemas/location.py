"""
schemas/location.py

Administrative geographic hierarchy: State → District → Taluka → Village.

WHY THIS FILE EXISTS
-----------------------
Master prompt Section 13/24: location-based detection requires cascading
dropdowns (State → District → Taluka → Village). The frontend calls
/locations/states, then /locations/districts/{state_id}, etc. This
schema defines the response shape for each level, plus a full Village
response with geographic boundary (needed for imagery acquisition and
spatial validation).

WHO IMPORTS THIS FILE
------------------------
- api/v1/endpoints/locations.py (future) — returns these schemas
- services/location_service.py (future) — queries DB, builds responses
- schemas/statistics.py — references villages for stat grouping
- schemas/gee.py — needs village bounds for imagery queries

WHAT THIS FILE IMPORTS
------------------------
Only schemas/common.py and stdlib/pydantic.
"""

from pydantic import BaseModel, Field

from app.schemas.common import OrmBaseModel


class StateResponse(OrmBaseModel):
    """
    A state (e.g., Maharashtra). Minimal — just id and name, since
    cascading endpoint returns a list of these.
    """

    id: int = Field(gt=0)
    name: str = Field(min_length=1)


class DistrictResponse(OrmBaseModel):
    """
    A district (e.g., Wardha). References its state for hierarchical
    context.
    """

    id: int = Field(gt=0)
    name: str = Field(min_length=1)
    state_id: int = Field(gt=0)


class TalukaResponse(OrmBaseModel):
    """
    A taluka (administrative subdivision). References its district.
    """

    id: int = Field(gt=0)
    name: str = Field(min_length=1)
    district_id: int = Field(gt=0)


class VillageResponse(OrmBaseModel):
    """
    A village — the finest-grain location users select. Includes:
    - Administrative hierarchy (state/district/taluka ids)
    - Geographic boundary (geom_geojson) for imagery acquisition + 
      spatial validation
    - Descriptive metadata
    
    geom_geojson stores a GeoJSON Feature string (not validated here —
    the DB layer ensures it's valid). Later, gis/geojson_builder.py
    converts AI detections to the same format so frontend can overlay
    detections on the village boundary directly.
    """

    id: int = Field(gt=0)
    name: str = Field(min_length=1)
    state_id: int = Field(gt=0)
    district_id: int = Field(gt=0)
    taluka_id: int = Field(gt=0)
    geom_geojson: str | None = Field(
        default=None,
        description=(
            "GeoJSON Feature string defining the village boundary. "
            "Parsed by frontend/GIS services to clip imagery and validate detections. "
            "Null if boundary data is unavailable."
        ),
    )
    population: int | None = Field(default=None, ge=0)
    area_km2: float | None = Field(
        default=None,
        ge=0,
        description="Village area in square kilometers.",
    )


class LocationCascadeResponse(BaseModel):
    """
    Response wrapper when a cascading endpoint succeeds. Keeps it clear
    that the caller got a list of one level (states, districts, etc.),
    not a single entity.
    """

    level: str = Field(description="Which level: 'states', 'districts', 'talukas', 'villages'.")
    items: list[StateResponse | DistrictResponse | TalukaResponse | VillageResponse]
    total: int = Field(ge=0)