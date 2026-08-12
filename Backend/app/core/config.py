"""
core/config.py

Centralized application configuration.

WHY THIS FILE EXISTS
---------------------
Every other module needs configuration values (database URL, JWT secret,
storage paths, CORS origins, AI-Models location, etc.) but NONE of them
should read environment variables directly. If ten files each called
os.getenv(...), a typo in one would fail silently and be nearly
impossible to trace. Centralizing config in one Pydantic-validated object
means:

  1. Missing/malformed required config fails at STARTUP, not mid-request.
  2. Every module gets typed, validated values (int stays int).
  3. There is exactly one place to look for "where does the backend get
     its DB URL / secret key / storage path?"

This file replaces the old app/config/settings.py, which has been
deleted. core/config.py is now the ONLY source of truth for configuration.

WHO IMPORTS THIS FILE
----------------------
core/logging_config.py, db/session.py, auth/jwt_handler.py,
services/upload_service.py, ml/bridge.py, main.py — essentially every
layer, directly or indirectly.

WHAT THIS FILE IMPORTS
------------------------
Only third-party (pydantic-settings) and stdlib (pathlib, functools).
Nothing else from this project — config must sit at the bottom of the
dependency graph, or every importer risks a circular import.

DESIGN PATTERN
----------------
Singleton via functools.lru_cache(). get_settings() always returns the
SAME Settings instance after the first call — .env is parsed once per
process, not once per request.

HOW IT CONNECTS TO THE WHOLE BACKEND
--------------------------------------
    .env --loaded by--> Settings (this file) --imported by--> every layer
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Typed, validated application settings. Each field maps to an
    environment variable of the same name in .env. Fields WITHOUT a
    default are required — startup fails with a clear error if missing.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---------------- Application identity ----------------
    APP_NAME: str = "ICAR Agricultural Intelligence Backend"
    ENV: str = "development"          # development | staging | production
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ---------------- CORS ----------------
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ---------------- Database (PostgreSQL + PostGIS) ----------------
    # Local default provided so Phase 1 (no DB yet) isn't blocked on it.
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/agri_intel"

    # ---------------- Authentication (JWT) ----------------
    # No default on the secret — it MUST be supplied via .env.
    JWT_SECRET_KEY: str = Field(..., description="Required. Set in .env only, never hardcode.")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ---------------- Storage paths ----------------
    UPLOAD_DIR: Path = Path("storage/uploads")
    RESULTS_DIR: Path = Path("storage/results")
    MAX_UPLOAD_SIZE_MB: int = 500
    ALLOWED_UPLOAD_EXTENSIONS: str = ".tif,.tiff,.geotiff"

    @property
    def allowed_upload_extensions_list(self) -> list[str]:
        return [e.strip().lower() for e in self.ALLOWED_UPLOAD_EXTENSIONS.split(",") if e.strip()]

    # ---------------- AI-Models bridge ----------------
    # The ONLY thing the backend knows about the AI engine: where it
    # lives, and which logical task to request. No model name (YOLO,
    # Faster R-CNN) appears anywhere here — that's the whole point.
    AI_MODELS_PATH: Path = Path("../Ai-Models")
    AI_DETECTION_TASK: str = "well_detection"

    # ---------------- Google Earth Engine ----------------
    # Path to credentials, never the credentials themselves.
    GEE_SERVICE_ACCOUNT_EMAIL: str = ""
    GEE_SERVICE_ACCOUNT_KEY_PATH: str = ""

    # ---------------- Logging ----------------
    LOG_LEVEL: str = "INFO"
    LOG_DIR: Path = Path("logs")

    @field_validator("UPLOAD_DIR", "RESULTS_DIR", "LOG_DIR", mode="after")
    @classmethod
    def _ensure_directory_exists(cls, value: Path) -> Path:
        """
        Guarantees required directories exist the moment settings load,
        so no downstream service has to remember os.makedirs() itself.
        """
        value.mkdir(parents=True, exist_ok=True)
        return value


@lru_cache
def get_settings() -> Settings:
    """
    Returns the single, cached Settings instance for the whole app.
    Settings() parses .env and runs all validators — lru_cache ensures
    that happens exactly once per process, no matter how many modules
    call get_settings(). Singleton pattern via decorator.
    """
    return Settings()