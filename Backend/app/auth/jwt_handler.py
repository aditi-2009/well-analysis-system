"""
auth/jwt_handler.py

JWT token creation and validation.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt

from app.core.config import get_settings
from app.core.exceptions import AuthenticationException

logger = logging.getLogger(__name__)
settings = get_settings()

ALGORITHM = "HS256"


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a JWT access token.

    Args:
        data: Payload to encode (e.g., {"sub": "user_id"})
        expires_delta: Token expiration time (default: 24 hours)

    Returns:
        JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.

    Args:
        token: JWT token string

    Returns:
        Decoded payload

    Raises:
        AuthenticationException: If token is invalid/expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        return payload
    except JWTError as e:
        logger.error(f"Token validation failed: {e}")
        raise AuthenticationException(
            message="Invalid or expired token",
            detail=str(e),
        )
