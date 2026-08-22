"""
core/__init__.py

Marks `core` as a package and re-exports its commonly used symbols so
other files can write `from app.core import get_settings` instead of
`from app.core.config import get_settings`. Convenience only — no logic
lives here.

WHO IMPORTS THIS FILE
------------------------
Implicitly, every file that imports anything from app.core — Python
runs __init__.py the first time any submodule of core is imported.

WHAT THIS FILE IMPORTS
------------------------
Only its own sibling modules (config, exceptions). Nothing external.
"""

from app.core.config import Settings, get_settings
from app.core.exceptions import (
    AIInferenceException,
    AppException,
    AuthenticationException,
    AuthorizationException,
    DatabaseException,
    FileValidationException,
    GISProcessingException,
    ImageProcessingException,
    ResourceNotFoundException,
    SpatialValidationException,
    ValidationException,
)

__all__ = [
    "Settings",
    "get_settings",
    "AppException",
    "ValidationException",
    "FileValidationException",
    "ImageProcessingException",
    "AIInferenceException",
    "GISProcessingException",
    "SpatialValidationException",
    "ResourceNotFoundException",
    "DatabaseException",
    "AuthenticationException",
    "AuthorizationException",
]