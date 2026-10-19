"""
core/exceptions.py

Custom exception hierarchy for the backend.

WHY THIS FILE EXISTS
-----------------------
Section 23 requires internal stack traces never be exposed to users, and
Section 20/25 require clear failure states (job = "failed", with a
reason) rather than opaque crashes. A bare `except Exception` cannot
distinguish "uploaded file was corrupt" from "database is down" — those
need different HTTP status codes and different messages.

This defines one typed exception per failure category. Every service
layer raises ONE of these instead of a bare Exception, so:

  1. main.py's global exception handler (added later) can catch by TYPE
     and map each to the correct HTTP status code automatically.
  2. Every exception carries a stable error_code string — safe to show
     the frontend/chatbot, and useful for automated handling.
  3. Technical detail is preserved in `detail` for logging, while
     `message` is what's safe to return to the client.

WHO IMPORTS THIS FILE
------------------------
main.py (global handler registration), services/*.py, gis/*.py,
ml/bridge.py, db/repository/*.py — anywhere an operation can fail in a
way the caller needs to distinguish.

WHAT THIS FILE IMPORTS
------------------------
Only the standard library. Exceptions must be importable from anywhere
without risk of a circular import — same rule as config.py.

DESIGN PATTERN
-----------------
Exception hierarchy / "error type as contract". Every exception inherits
from AppException, so a handler can catch AppException once and either
read .status_code directly or isinstance-check for a specific subtype.

HOW IT CONNECTS TO THE WHOLE BACKEND
----------------------------------------
    service raises SpecificException(message, detail)
            |
            v
    main.py global handler catches AppException
            |
            v
    returns JSON {"error_code": ..., "message": ...}
    (detail is LOGGED server-side, never returned to the client)
"""

from typing import Any


class AppException(Exception):
    """
    Base class for every custom exception in this project.

    message:     safe, user-facing description.
    error_code:  stable machine-readable id (e.g. "FILE_TOO_LARGE"),
                 safe to expose to the frontend.
    status_code: HTTP status the global handler should return.
    detail:      technical detail — logged, NEVER returned to the client.
    """

    def __init__(
        self,
        message: str,
        error_code: str = "APP_ERROR",
        status_code: int = 500,
        detail: Any = None,
    ) -> None:
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class ValidationException(AppException):
    """Business-rule validation failures beyond what Pydantic schemas
    already enforce (e.g. a village_id that doesn't exist)."""

    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(message, "VALIDATION_ERROR", 422, detail)


class FileValidationException(AppException):
    """Raised by upload_service when a file fails format/size/integrity
    checks (Section 24: file upload security)."""

    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(message, "FILE_VALIDATION_ERROR", 400, detail)


class ImageProcessingException(AppException):
    """Raised by gis/format_normalizer.py or raster_processor.py when a
    raster can't be read/converted, or CRS metadata is missing/unusable."""

    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(message, "IMAGE_PROCESSING_ERROR", 422, detail)


class AIInferenceException(AppException):
    """Raised by ml/bridge.py when the AI engine fails to load or run.
    The ONLY exception type that should cross from ml/bridge.py into
    services/detection_service.py."""

    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(message, "AI_INFERENCE_ERROR", 502, detail)


class GISProcessingException(AppException):
    """Raised when pixel-to-geographic conversion or geometry
    construction fails."""

    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(message, "GIS_PROCESSING_ERROR", 422, detail)


class SpatialValidationException(AppException):
    """Raised by gis/spatial_validator.py when a detection fails an
    explicit spatial rule (Section 20) — invalid geometry, or outside
    the requested village boundary."""

    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(message, "SPATIAL_VALIDATION_ERROR", 422, detail)


class ResourceNotFoundException(AppException):
    """Raised when a requested entity (prediction_id, village_id,
    job_id) doesn't exist."""

    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(message, "NOT_FOUND", 404, detail)


class DatabaseException(AppException):
    """Raised by the repository layer on connection errors or integrity
    violations."""

    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(message, "DATABASE_ERROR", 500, detail)


class AuthenticationException(AppException):
    """Credentials missing, invalid, or expired — the user is not who
    they claim to be."""

    def __init__(
        self, message: str = "Authentication required.", detail: Any = None
    ) -> None:
        super().__init__(message, "AUTHENTICATION_ERROR", 401, detail)


class AuthorizationException(AppException):
    """User is authenticated but lacks permission (RBAC failure)."""

    def __init__(
        self,
        message: str = "You do not have permission to perform this action.",
        detail: Any = None,
    ) -> None:
        super().__init__(message, "AUTHORIZATION_ERROR", 403, detail)
