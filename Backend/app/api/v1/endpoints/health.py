"""
api/v1/endpoints/health.py

Versioned health check endpoint.

WHY THIS FILE EXISTS
-----------------------
main.py already exposes an unversioned /health for infra probes (load
balancers, Docker healthchecks) that shouldn't depend on API versioning.
This file exposes the SAME check under /api/v1/health, for API
consumers (frontend, chatbot, monitoring dashboards) that expect every
endpoint under one versioned prefix.

Duplication risk is intentionally avoided: both return the identical
response shape and both are trivial. If this check ever grows (e.g.
verifying DB connectivity), update BOTH call sites or — better —
extract the check into a small service function both call. Flagged
here so it isn't forgotten later.

WHO IMPORTS THIS FILE
------------------------
app/api/v1/router.py — registers this module's `router`.

WHAT THIS FILE IMPORTS
------------------------
Only app.core.config (get_settings) and FastAPI's APIRouter. No
services, no database, no business logic — per Section 26/27, routers
only receive a request and return a response.

DESIGN PATTERN
-----------------
One APIRouter per endpoint module ("router per resource"). This module
owns nothing but the /health route; it has zero knowledge of any other
endpoint module.
"""

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health")
async def health_check() -> dict:
    """
    Versioned counterpart to the root /health in main.py. Kept
    dependency-free for the same reason as the root one — no DB or AI
    engine check yet, since neither is wired in. Update this once
    db/session.py exists.
    """
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "env": settings.ENV,
    }