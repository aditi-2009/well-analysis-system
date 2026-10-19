"""
Detection + prediction history endpoints.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, File, Query, Form, UploadFile
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.exceptions import ResourceNotFoundException
from app.db.models.prediction import Prediction
from app.db.models.user import User
from app.db.repository.prediction_repository import PredictionRepository
from app.db.session import get_db
from app.services.detection_service import detect_wells_in_image
from app.utils.file_utils import delete_quietly, save_upload_to_temp

router = APIRouter(prefix="/wells", tags=["Wells Detection"])


def _total_pages(total: int, page_size: int) -> int:
    return (total + page_size - 1) // page_size


def _summary(p: Prediction) -> dict:
    return {
        "prediction_id": p.prediction_id,
        "status": p.status,
        "model_id": p.model_id,
        "detection_count": p.detection_count,
        "created_at": p.created_at.isoformat(),
    }


@router.post("/detect")
def detect_wells(
    file: UploadFile = File(...),
    district: str | None = Form(None),
    taluka: str | None = Form(None),
    village: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tmp_path = save_upload_to_temp(file)  # validates extension + size
    try:
        return detect_wells_in_image(
            str(tmp_path), db, user_id=user.id,
            district=district, taluka=taluka, village=village,
        )
    finally:
        delete_quietly(tmp_path)


@router.get("/predictions/search")
def search_predictions(
    status: str | None = Query(None),
    model_id: str | None = Query(None),
    start_date: datetime | None = Query(None, description="ISO 8601"),
    end_date: datetime | None = Query(None, description="ISO 8601"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern="^(created_at|detection_count)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items, total = PredictionRepository.search(
        db,
        status=status,
        model_id=model_id,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        order=order,
    )
    return {
        "items": [_summary(p) for p in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": _total_pages(total, page_size),
        "filters": {
            "status": status,
            "model_id": model_id,
            "date_range": (
                f"{start_date.isoformat() if start_date else 'any'} to "
                f"{end_date.isoformat() if end_date else 'any'}"
            ),
        },
    }


@router.get("/predictions")
def list_predictions(
    status: str = Query("completed"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items, total = PredictionRepository.list_by_status(db, status, page, page_size)
    return {
        "items": [_summary(p) for p in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": _total_pages(total, page_size),
    }


@router.get("/predictions/{prediction_id}")
def get_prediction_details(
    prediction_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    prediction = PredictionRepository.get_by_id(db, prediction_id)
    if not prediction:
        raise ResourceNotFoundException("Prediction not found.")
    return {
        **_summary(prediction),
        "detections": prediction.detections or [],
        "completed_at": (
            prediction.completed_at.isoformat() if prediction.completed_at else None
        ),
    }


@router.delete("/predictions/{prediction_id}")
def delete_prediction(
    prediction_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not PredictionRepository.delete_prediction(db, prediction_id):
        raise ResourceNotFoundException("Prediction not found.")
    return {"message": "Prediction deleted", "prediction_id": prediction_id}
