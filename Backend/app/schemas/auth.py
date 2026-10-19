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
from app.schemas.common import OrmBaseModel


class LoginRequest(BaseModel):
    email: EmailStr = Field(description="User email address.")
    password: str = Field(min_length=8, max_length=72)


class Token(BaseModel):
    access_token: str = Field(description="JWT access token.")
    token_type: str = Field(default="bearer")
    expires_in: int = Field(description="Seconds until token expires.")


class TokenData(BaseModel):
    sub: str = Field(description="Subject (user_id or email).")
    exp: datetime = Field(description="Expiration time.")
    iat: datetime = Field(description="Issued at time.")


class UserResponse(OrmBaseModel):
    id: int = Field(gt=0)
    email: str
    full_name: str | None = Field(default=None)
    is_active: bool = Field(default=True)
    created_at: datetime | None = Field(default=None)
    mobile: str | None = None
    organization: str | None = None


class RegisterRequest(LoginRequest):
    full_name: str | None = Field(default=None, max_length=255)
    mobile: str | None = Field(default=None, max_length=20)
    organization: str | None = Field(default=None, max_length=255)
