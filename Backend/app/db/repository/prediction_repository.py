"""
Data access for detection runs (Prediction rows).
"""

from datetime import datetime

from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.db.models.prediction import Prediction

SORT_COLUMNS = {
    "created_at": Prediction.created_at,
    "detection_count": Prediction.detection_count,
}


def _paginate(query, page: int, page_size: int):
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


class PredictionRepository:
    """Encapsulates database queries for predictions."""

    @staticmethod
    def save_prediction(db: Session, prediction: Prediction) -> Prediction:
        db.add(prediction)
        db.commit()
        db.refresh(prediction)
        return prediction

    @staticmethod
    def get_by_id(db: Session, prediction_id: str) -> Prediction | None:
        """Fetch one prediction; soft-deleted ones count as missing."""
        return (
            db.query(Prediction)
            .filter(
                Prediction.prediction_id == prediction_id,
                Prediction.status != "deleted",
            )
            .first()
        )

    @staticmethod
    def list_by_status(
        db: Session, status: str, page: int = 1, page_size: int = 20
    ) -> tuple[list[Prediction], int]:
        query = (
            db.query(Prediction)
            .filter(Prediction.status == status)
            .order_by(desc(Prediction.created_at))
        )
        return _paginate(query, page, page_size)

    @staticmethod
    def search(
        db: Session,
        status: str | None = None,
        model_id: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        order: str = "desc",
    ) -> tuple[list[Prediction], int]:
        """Filtered, sorted, paginated search. Deleted rows are hidden
        unless status='deleted' is requested explicitly."""
        query = db.query(Prediction)

        if status:
            query = query.filter(Prediction.status == status)
        else:
            query = query.filter(Prediction.status != "deleted")
        if model_id:
            query = query.filter(Prediction.model_id == model_id)
        if start_date:
            query = query.filter(Prediction.created_at >= start_date)
        if end_date:
            query = query.filter(Prediction.created_at <= end_date)

        sort_col = SORT_COLUMNS.get(sort_by, Prediction.created_at)
        direction = asc if order == "asc" else desc
        query = query.order_by(direction(sort_col))
        return _paginate(query, page, page_size)

    @staticmethod
    def update_status(
        db: Session, prediction_id: str, new_status: str
    ) -> Prediction | None:
        prediction = (
            db.query(Prediction)
            .filter(Prediction.prediction_id == prediction_id)
            .first()
        )
        if prediction:
            prediction.status = new_status
            db.commit()
            db.refresh(prediction)
        return prediction

    @staticmethod
    def delete_prediction(db: Session, prediction_id: str) -> bool:
        """Soft delete: status becomes 'deleted', row is kept."""
        prediction = PredictionRepository.get_by_id(db, prediction_id)
        if not prediction:
            return False
        prediction.status = "deleted"
        db.commit()
        return True
