"""
api/v1/endpoints/auth.py

POST /auth/login — user authentication endpoint.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.db.session import get_db
from app.db.models.user import User
from app.auth.password import verify_password, hash_password
from app.auth.jwt_handler import create_access_token
from app.auth.dependencies import get_current_user
from app.schemas.auth import LoginRequest, RegisterRequest, Token, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/login", response_model=Token)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    try:
        email = request.email.lower()
        user = db.query(User).filter(User.email == email).first()

        if not user or not verify_password(
            request.password,
            user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )
        user.last_login_at = datetime.now(timezone.utc)
        db.commit()
        access_token = create_access_token(data={"sub": str(user.id)})

        logger.info(f"User logged in: {user.email}")

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 86400,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Login error")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    user: User = Depends(get_current_user),
):
    return UserResponse.model_validate(user)


@router.post("/register", response_model=UserResponse)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    try:
        # Check if user exists
        email = request.email.lower()
        existing = db.query(User).filter(User.email == email).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Create new user
        hashed = hash_password(request.password)
        user = User(
            email=email,
            hashed_password=hashed,
            full_name=request.full_name,
            mobile=request.mobile,
            organization=request.organization,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info(f"New user registered: {user.email}")

        return UserResponse.model_validate(user)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )
