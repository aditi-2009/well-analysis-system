"""
api/v1/router.py
Aggregates every v1 endpoint module into a single APIRouter.
WHY THIS FILE EXISTS
-----------------------
main.py must stay a pure composition root — it can't grow a new import
and a new app.include_router() call every time a module (detection,
upload, locations, statistics...) is added. Instead, main.py imports
ONE router from this file. This file is the only place that needs to
change when a new endpoint module is added.
WHO IMPORTS THIS FILE
------------------------
app/main.py — includes `api_v1_router` with the /api/v1 prefix from
Settings.
WHAT THIS FILE IMPORTS
------------------------
Currently only api/v1/endpoints/health.py. Future endpoint modules
(detection.py, upload.py, locations.py, statistics.py, models.py,
gee.py, auth.py) get added here explicitly — one import line and one
include_router() call each — as soon as each one is built and verified
to compile. Nothing is imported speculatively; that would violate "every
import must exist."
DESIGN PATTERN
-----------------
Router aggregation (a thin composition layer, same idea as main.py but
one level down — main.py composes the app, this file composes the API).
Each endpoint module is added EXPLICITLY, not auto-discovered via
directory scanning — explicit registration means a broken/incomplete
endpoint file can never accidentally get wired into the running app
just by existing in the folder.
HOW IT CONNECTS TO THE WHOLE BACKEND
----------------------------------------
    endpoints/health.py --router--> api_v1_router (this file) --> main.py
    [FUTURE] endpoints/detection.py --router--> api_v1_router --> main.py
    [FUTURE] endpoints/upload.py    --router--> api_v1_router --> main.py
    ... and so on, one line per module, in this file only.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    detection,
    locations,
    upload,
    statistics,
    models,
    gee,
    well,
    known_wells
)

api_v1_router = APIRouter()
api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
# old detection router removed: POST /wells/detect is served by well.py
api_v1_router.include_router(locations.router)
api_v1_router.include_router(upload.router)
api_v1_router.include_router(statistics.router)
api_v1_router.include_router(models.router)
api_v1_router.include_router(gee.router)
api_v1_router.include_router(well.router, prefix="/wells")
api_v1_router.include_router(known_wells.router)
