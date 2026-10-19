"""
db/repository/detection_repository.py

Every read and write for detection jobs and detected wells. Services and
endpoints call these functions. Nothing else writes these two tables.

WHO IMPORTS THIS: services/detection_job_service.py, services/well_export_service.py,
api/v1/endpoints/well.py
WHAT IT IMPORTS: sqlalchemy, the detection models
"""

from collections.abc import Iterator

from sqlalchemy import func, insert, select, update
from sqlalchemy.orm import Session

from app.db.models.detected_wells import DetectedWell
from app.db.models.detection_job import DetectionJob

INSERT_BATCH_SIZE = 1000
STALE_MESSAGE = "Interrupted: the server restarted before this run finished."


def create_job(db: Session, job: DetectionJob) -> DetectionJob:
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_job(db: Session, job_id: str) -> DetectionJob | None:
    return db.get(DetectionJob, job_id)


def list_jobs(db: Session, limit: int = 20) -> list[DetectionJob]:
    stmt = select(DetectionJob).order_by(DetectionJob.created_at.desc()).limit(limit)
    return list(db.execute(stmt).scalars())


def update_job(db: Session, job: DetectionJob, **fields) -> None:
    """Set fields on a job and commit."""
    for name, value in fields.items():
        setattr(job, name, value)
    db.commit()


def fail_stale_jobs(db: Session) -> int:
    """Mark jobs left 'pending' or 'running' by an earlier server process as failed.
    Call only while the run lock is held, so no live run can be affected."""
    result = db.execute(
        update(DetectionJob)
        .where(DetectionJob.status.in_(["pending", "running"]))
        .values(status="failed", error_message=STALE_MESSAGE, completed_at=func.now())
    )
    db.commit()
    return result.rowcount or 0


def insert_wells(db: Session, job_id: str, wells: list[dict]) -> int:
    """Add the wells of one job. Does not commit: the caller decides when."""
    for start in range(0, len(wells), INSERT_BATCH_SIZE):
        chunk = wells[start:start + INSERT_BATCH_SIZE]
        db.execute(
            insert(DetectedWell.__table__).values(
                [
                    {
                        "job_id": job_id,
                        # ST_MakePoint takes (longitude, latitude). The order matters.
                        "geom": func.ST_SetSRID(
                            func.ST_MakePoint(w["longitude"], w["latitude"]), 4326
                        ),
                        "confidence": w["confidence"],
                        "class_name": w["class_name"],
                        "px_x1": w["px_x1"],
                        "px_y1": w["px_y1"],
                        "px_x2": w["px_x2"],
                        "px_y2": w["px_y2"],
                    }
                    for w in chunk
                ]
            )
        )
    return len(wells)


def _wells_statement(
    *,
    job_id: str | None = None,
    bbox: tuple[float, float, float, float] | None = None,
    district_id: int | None = None,
    taluka_id: int | None = None,
    village_id: int | None = None,
):
    """The one query behind every well listing: wells from COMPLETED jobs only.
    The area filters match the area chosen when the job was started."""
    stmt = (
        select(
            DetectedWell.id,
            DetectedWell.job_id,
            func.ST_Y(DetectedWell.geom).label("latitude"),
            func.ST_X(DetectedWell.geom).label("longitude"),
            DetectedWell.confidence,
            DetectedWell.class_name,
            DetectedWell.px_x1,
            DetectedWell.px_y1,
            DetectedWell.px_x2,
            DetectedWell.px_y2,
            DetectionJob.district,
            DetectionJob.taluka,
            DetectionJob.village,
            DetectionJob.model_version,
            DetectionJob.completed_at.label("detected_on"),
        )
        .join(DetectionJob, DetectionJob.id == DetectedWell.job_id)
        .where(DetectionJob.status == "completed")
    )
    if job_id:
        stmt = stmt.where(DetectedWell.job_id == job_id)
    if district_id is not None:
        stmt = stmt.where(DetectionJob.district_id == district_id)
    if taluka_id is not None:
        stmt = stmt.where(DetectionJob.taluka_id == taluka_id)
    if village_id is not None:
        stmt = stmt.where(DetectionJob.village_id == village_id)
    if bbox:
        min_lon, min_lat, max_lon, max_lat = bbox
        envelope = func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
        stmt = stmt.where(func.ST_Intersects(DetectedWell.geom, envelope))
    return stmt


def list_wells(
    db: Session,
    job_id: str | None = None,
    bbox: tuple[float, float, float, float] | None = None,
    limit: int = 5000,
    district_id: int | None = None,
    taluka_id: int | None = None,
    village_id: int | None = None,
) -> list[dict]:
    """Wells from COMPLETED jobs, optionally limited to one job, one area or a map box."""
    stmt = _wells_statement(
        job_id=job_id, bbox=bbox,
        district_id=district_id, taluka_id=taluka_id, village_id=village_id,
    ).order_by(DetectedWell.id).limit(limit)
    return [dict(row._mapping) for row in db.execute(stmt)]


def iter_wells(
    db: Session,
    *,
    job_id: str | None = None,
    district_id: int | None = None,
    taluka_id: int | None = None,
    village_id: int | None = None,
    batch: int = 2000,
) -> Iterator[dict]:
    """The same wells with no row limit, read in batches from a server-side cursor,
    so memory stays flat however many wells there are. Used by the CSV export."""
    stmt = _wells_statement(
        job_id=job_id, district_id=district_id, taluka_id=taluka_id, village_id=village_id,
    ).order_by(DetectedWell.id).execution_options(yield_per=batch)
    for row in db.execute(stmt):
        yield dict(row._mapping)
