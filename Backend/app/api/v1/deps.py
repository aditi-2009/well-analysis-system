"""
api/v1/deps.py

Reusable FastAPI dependencies, so endpoint signatures stay short:
    def f(db: DbSession, user: CurrentUser, pg: Pagination): ...
"""

from typing import Annotated

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin, get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.common import PaginationParams

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]


def pagination_params(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)


Pagination = Annotated[PaginationParams, Depends(pagination_params)]
