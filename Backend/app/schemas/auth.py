"""
schemas/auth.py

Authentication request/response schemas (JWT-based).

WHY THIS FILE EXISTS
-----------------------
Master prompt Section 23: implement JWT authentication. This schema
defines login request (email/password), login response (access token),
and token refresh. Actual implementation deferred (per master prompt
Section 31 Phase 10 — security hardening after the detection pipeline
works), but schema needed now so the API contract is documented.

WHO IMPORTS THIS FILE
------------------------
- api/v1/endpoints/auth.py (future) — POST /login, POST /refresh
- auth/jwt_handler.py (future) — creates tokens shaped like TokenData

WHAT THIS FILE IMPORTS
------------------------
stdlib/pydantic only. No project imports.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """POST /login request body."""

    email: EmailStr = Field(description="User email address.")
    password: str = Field(min_length=8, description="User password.")


class Token(BaseModel):
    """Generic token response."""

    access_token: str = Field(description="JWT access token.")
    token_type: str = Field(default="bearer")
    expires_in: int = Field(description="Seconds until token expires.")


class TokenData(BaseModel):
    """
    What's encoded inside a JWT. Not sent to the client — internal use
    only by auth/jwt_handler.py.
    """

    sub: str = Field(description="Subject (user_id or email).")
    exp: datetime = Field(description="Expiration time.")
    iat: datetime = Field(description="Issued at time.")


class UserResponse(BaseModel):
    """
    User details returned after login or from GET /auth/me endpoint.
    """

    id: int = Field(gt=0)
    email: str
    full_name: str | None = Field(default=None)
    is_active: bool = Field(default=True)
    created_at: datetime | None = Field(default=None)