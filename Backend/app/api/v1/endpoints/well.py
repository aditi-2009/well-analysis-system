"""
api/v1/endpoints/well.py

Detected wells and detection jobs. Mounted at /api/v1/wells (see router.py).

  POST /wells/detect           start a detection job. Returns 202 at once.
  GET  /wells/jobs             the most recent jobs
  GET  /wells/jobs/{job_id}    one job: status, progress and counts
  GET  /wells                  detected wells, filtered by job, area and/or bbox
  GET  /wells/export           the same wells as a CSV download, with no row limit

WHO IMPORTS THIS: api/v1/router.py
WHAT IT IMPORTS: auth dependency, DB session, repository, services, schemas, gis/bbox
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.exceptions import ValidationException
from app.db.models.user import User
from app.db.repository import detection_repository
from app.db.session import get_db
from app.gis.bbox import parse_bbox
from app.schemas.detection import DetectionJobOut, DetectionRequest
from app.schemas.well import WellOut
from app.services import detection_job_service, well_export_service
from app.services.detection_job_service import DetectionInputError

router = APIRouter(tags=["Wells"])


@router.post("/detect", response_model=DetectionJobOut, status_code=status.HTTP_202_ACCEPTED)
def start_detection(
    body: DetectionRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not detection_job_service.try_claim():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A detection is already running. Wait for it to finish, then start again.",
        )
    try:
        job = detection_job_service.create_job(
            db,
            user_id=user.id,
            image_id=body.image_id,
            district_id=body.district_id,
            taluka_id=body.taluka_id,
            village_id=body.village_id,
            tile_size=body.tile_size,
            normalize=body.normalize,
            confidence=body.confidence,
        )
    except DetectionInputError as exc:
        detection_job_service.release_claim()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception:
        detection_job_service.release_claim()
        raise

    background.add_task(detection_job_service.run_job, job.id)
    return job


@router.get("/jobs", response_model=list[DetectionJobOut])
def list_jobs(
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return detection_repository.list_jobs(db, limit=limit)


@router.get("/jobs/{job_id}", response_model=DetectionJobOut)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    job = detection_repository.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return job


@router.get("/export")
def export_wells_csv(
    job_id: str | None = Query(None, max_length=36),
    district_id: int | None = Query(None, gt=0),
    taluka_id: int | None = Query(None, gt=0),
    village_id: int | None = Query(None, gt=0),
    user: User = Depends(get_current_user),
):
    """Download wells as CSV. Choose a job or an area: an export of everything is refused."""
    if job_id is None and district_id is None and taluka_id is None and village_id is None:
        raise ValidationException("Choose a job, district, taluka or village to export.")
    rows = well_export_service.stream_wells_csv(
        job_id=job_id, district_id=district_id, taluka_id=taluka_id, village_id=village_id
    )
    return StreamingResponse(
        rows,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="wells.csv"'},
    )


@router.get("", response_model=list[WellOut])
def list_wells(
    job_id: str | None = Query(None, max_length=36),
    district_id: int | None = Query(None, gt=0),
    taluka_id: int | None = Query(None, gt=0),
    village_id: int | None = Query(None, gt=0),
    bbox: str | None = Query(None, description="minLon,minLat,maxLon,maxLat"),
    limit: int = Query(5000, ge=1, le=20000),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return detection_repository.list_wells(
        db, job_id=job_id, bbox=parse_bbox(bbox), limit=limit,
        district_id=district_id, taluka_id=taluka_id, village_id=village_id,
    )
