"""
main.py

FastAPI application entry point — the composition root.

WHY THIS FILE EXISTS
-----------------------
Per the project's architecture rules, main.py ONLY:
- creates the FastAPI app
- loads configuration
- enables CORS
- registers global exception handlers
- runs startup/shutdown logic
- exposes a health endpoint
- includes routers (once they exist)

It must never contain business logic, AI code, GIS algorithms, or
database queries. If you find yourself writing an `if` statement here
that isn't about wiring, it probably belongs in a service instead.

WHO IMPORTS THIS FILE
------------------------
Nobody. Uvicorn imports and runs it: `uvicorn app.main:app`.

WHAT THIS FILE IMPORTS
------------------------
Only app.core.* — config, logging, exceptions. These are the only
modules verified to exist and work so far in this project. The v1
router import is intentionally NOT included yet (see NOTE below) —
adding an import for a file that doesn't compile yet would violate the
"every import must exist" rule.
app.db.session — database initialization
app.ml.bridge — model loading (optional warm-up)
app.api.v1.router — all endpoints

DESIGN PATTERN
-----------------
Composition root. Also implements a global exception handler: every
service in this project raises a typed AppException subclass instead
of a bare Exception, so this ONE handler can catch AppException and
return a consistent {error_code, message} JSON shape for all of them,
while logging the technical `.detail` server-side only (Section 23:
never expose internal stack traces to users).

HOW IT CONNECTS TO THE REST OF THE BACKEND
----------------------------------------------
    .env --> Settings (core.config) --> main.py reads app-level values
    core.logging_config --> configured once, at startup, here
    core.exceptions --> caught globally, here
    [FUTURE] api.v1.router --> included here once it exists
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.middleware.logging_middleware import LoggingMiddleware
from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.logging_config import setup_logging
from app.ml.bridge import load_model
from sqlalchemy import text
from app.db.base import engine

settings = get_settings()
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once at startup (before 'yield') and once at shutdown (after).
    This is FastAPI's recommended replacement for the older
    @app.on_event("startup") / @app.on_event("shutdown") decorators.

    Startup responsibilities here are intentionally minimal right now:
    configure logging, and log that the app is up. As real dependencies
    arrive (database connection pool, AI bridge warm-up) they get
    initialized here too — NOT inside route handlers.
    """
    logger.info(
        "Starting %s | env=%s | debug=%s",
        settings.APP_NAME,
        settings.ENV,
        settings.DEBUG,
    )
    # STARTUP: Initialize database
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection OK")
    except Exception as e:
        logger.error("Database connection failed: %s", e)
        raise

    # STARTUP: Warm-up ML model (optional, but recommended)
    try:
        logger.info("Loading YOLOv11 model...")
        model = load_model()
        logger.info(f"Model loaded: {type(model)}")
    except Exception as e:
        logger.warning(f" Model warm-up failed (inference will be slower): {e}")
    yield  # ---- application runs here ----

    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI-Powered Agricultural Intelligence System",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)


# ---------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------
# Allows the React frontend (running on a different origin during dev)
# to call this API from the browser. Origins come from Settings, not
# hardcoded, so staging/production can restrict this via .env without
# touching code.
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """
    Catches EVERY custom exception defined in core/exceptions.py
    (ValidationException, FileValidationException, AIInferenceException,
    etc.) in one place. The technical `.detail` is logged server-side
    only; the client only ever sees `.message` and `.error_code`.
    """
    logger.error(
        "AppException | path=%s | code=%s | message=%s | detail=%s",
        request.url.path,
        exc.error_code,
        exc.message,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_code": exc.error_code, "message": exc.message},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Catches FastAPI/Pydantic's own request validation errors — e.g. a
    missing required field or wrong type in a request body — and
    reshapes them into the same {error_code, message} contract as our
    custom exceptions, so the frontend only ever handles one error
    shape regardless of which layer rejected the request.
    """
    logger.warning(
        "RequestValidationError | path=%s | errors=%s",
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_code": "REQUEST_VALIDATION_ERROR",
            "message": "The request was invalid.",
            "fields": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Last-resort catch-all. If this ever fires, it means some code raised
    a bare Exception instead of a typed AppException — that's a bug to
    fix at the source, not something to rely on. It exists purely so a
    programming error never leaks a raw stack trace to the client
    (Section 23), while still logging the full exception server-side.
    """
    logger.exception("Unhandled exception | path=%s", request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred.",
        },
    )


# ---------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health_check() -> dict:
    """
    Liveness/readiness probe. Deliberately dependency-free right now —
    it does not check the database or AI engine, because neither is
    wired in yet. Once db/session.py exists, this should verify the DB
    connection too, so /health means "the app AND its dependencies are
    actually usable," not just "the process is running."
    """
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "env": settings.ENV,
    }


# NOTE: app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)
# goes here once app/api/v1/router.py actually exists and compiles.
# Intentionally omitted for now — see docstring above.

# Include versioned API routes
from app.api.v1.router import api_v1_router  # noqa: E402

app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=settings.DEBUG)
