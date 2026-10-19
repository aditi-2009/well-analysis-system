"""
GET /models, GET /models/active: which AI model is in use.
Backed by ml.bridge.describe_model() until an ai_model table exists.
"""

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.db.models.user import User
from app.ml.bridge import describe_model
from app.schemas.ai_model import ActiveModelResponse, AIModelResponse

router = APIRouter(prefix="/models", tags=["AI Models"])


@router.get("", response_model=list[AIModelResponse])
def list_models(user: User = Depends(get_current_user)):
    return [AIModelResponse(**describe_model())]


@router.get("/active", response_model=ActiveModelResponse)
def active_model(user: User = Depends(get_current_user)):
    return ActiveModelResponse(**describe_model())
