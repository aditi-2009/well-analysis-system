"""
db/repository/upload_repository.py

Data access layer for uploaded satellite images.
"""

from sqlalchemy.orm import Session

from app.db.models.satellite_image import SatelliteImage


class UploadRepository:
    """Encapsulates satellite image database queries."""

    @staticmethod
    def save_satellite_image(db: Session, sat_image: SatelliteImage) -> SatelliteImage:
        """Save a new satellite image record."""
        db.add(sat_image)
        db.commit()
        db.refresh(sat_image)
        return sat_image

    @staticmethod
    def get_by_file_id(db: Session, file_id: str) -> SatelliteImage | None:
        """Fetch one satellite image by file_id."""
        return (
            db.query(SatelliteImage).filter(SatelliteImage.file_id == file_id).first()
        )

    @staticmethod
    def list_recent(
        db: Session, page: int = 1, page_size: int = 20
    ) -> tuple[list[SatelliteImage], int]:
        """Fetch recent uploads, paginated."""
        query = db.query(SatelliteImage).order_by(SatelliteImage.created_at.desc())
        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()
        return items, total
