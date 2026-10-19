"""
utils/validators.py

Reusable validation helpers. Raise typed exceptions that main.py turns
into clean JSON errors. Imports only config + exceptions.
"""

from pathlib import PurePath

from app.core.config import get_settings
from app.core.exceptions import FileValidationException, ValidationException

settings = get_settings()


def validate_upload_extension(filename: str) -> str:
    """Return the lower-case extension, or raise."""
    ext = PurePath(filename or "").suffix.lower()
    allowed = settings.allowed_upload_extensions_list
    if ext not in allowed:
        raise FileValidationException(
            f"Unsupported file type '{ext or 'none'}'. "
            f"Allowed: {', '.join(allowed)}"
        )
    return ext


def validate_lat_lon(lat: float, lon: float) -> None:
    if not -90 <= lat <= 90:
        raise ValidationException("Latitude must be between -90 and 90.")
    if not -180 <= lon <= 180:
        raise ValidationException("Longitude must be between -180 and 180.")
