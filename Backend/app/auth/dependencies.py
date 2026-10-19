"""
auth/dependencies.py

FastAPI dependencies for authentication.
"""

import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.user import User
from app.auth.jwt_handler import decode_access_token
from app.core.exceptions import AuthenticationException

logger = logging.getLogger(__name__)
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency: Extract and validate JWT token from request header.
    Returns the authenticated User.

    Usage:
        @app.get("/profile")
        async def profile(user: User = Depends(get_current_user)):
            return {"email": user.email}
    """
    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if not user_id:
            raise AuthenticationException(message="Invalid token payload")

        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise AuthenticationException(message="User not found")

        if not user.is_active:
            raise AuthenticationException(message="User account is inactive")

        return user

    except AuthenticationException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_current_admin(
    user: User = Depends(get_current_user),
) -> User:
    """
    Dependency: Ensure current user is an admin.

    Usage:
        @app.delete("/admin/users/{user_id}")
        async def delete_user(admin: User = Depends(get_current_admin)):
            ...
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
