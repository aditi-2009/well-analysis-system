# version: well-detection-2
"""
services/detection_job_service.py

One detection job, from the request to the saved wells.
  1. create_job() checks the file and the area, reads the picture, saves a
     'pending' job and returns at once.
  2. run_job() runs in the background: it tiles the picture, runs the model,
     removes duplicate boxes, turns each box into longitude and latitude, and
     saves the wells.
  3. The statistics are saved as soon as the tiling ends, so they survive a
     later failure.
Only one run at a time, because the model is shared.

WHO IMPORTS THIS: api/v1/endpoints/well.py
WHAT IT IMPORTS: rasterio, DB session and models, detection repository,
ml/bridge.py, services/tiled_detection.py, core/config.py
"""

import logging
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

import rasterio
from rasterio.transform import xy
from rasterio.warp import transform as transform_points
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models.detection_job import DetectionJob
from app.db.models.district import District
from app.db.models.satellite_image import SatelliteImage
from app.db.models.taluka import Taluka
from app.db.models.village import Village
from app.db.repository import detection_repository
from app.db.session import SessionLocal
from app.ml.bridge import load_model, predict_tile
from app.services.tiled_detection import detect_raster, read_info

logger = logging.getLogger(__name__)
settings = get_settings()

MODEL_IMGSZ = 640  # the size the model was trained at; the tile size is separate
FAILED_MESSAGE = "Detection failed. The details are in the server log."
_run_lock = threading.Lock()


class DetectionInputError(Exception):
    """The file or the area cannot be used. The message is safe to show the user."""


def try_claim() -> bool:
    return _run_lock.acquire(blocking=False)


def release_claim() -> None:
    _run_lock.release()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def image_path(image: SatelliteImage) -> Path:
    """Where the file is on disk. Uploads always carry a stored file name."""
    if image.storage_uri:
        return Path(image.storage_uri)
    if image.stored_filename:
        return settings.UPLOAD_DIR / image.stored_filename
    raise DetectionInputError("The file record has no stored file name.")


def _check_area(db: Session, district_id, taluka_id, village_id):
    """Returns (district, taluka, village). All None when no area is given."""
    if district_id is None:
        if taluka_id is not None or village_id is not None:
            raise DetectionInputError("Choose a district before a taluka or village.")
        return None, None, None
    district = db.get(District, district_id)
    if district is None:
        raise DetectionInputError("District not found.")
    taluka = None
    if taluka_id is not None:
        taluka = db.get(Taluka, taluka_id)
        if taluka is None or taluka.district_id != district.id:
            raise DetectionInputError("That taluka does not belong to the chosen district.")
    village = None
    if village_id is not None:
        village = db.get(Village, village_id)
        if village is None or village.district_id != district.id:
            raise DetectionInputError("That village does not belong to the chosen district.")
        if taluka is not None and village.taluka_id != taluka.id:
            raise DetectionInputError("That village does not belong to the chosen taluka.")
    return district, taluka, village


def create_job(db, *, user_id, image_id, district_id, taluka_id, village_id,
               tile_size, normalize, confidence) -> DetectionJob:
    """Checks the input and saves a 'pending' job. The caller must hold the run lock."""
    image = db.query(SatelliteImage).filter(SatelliteImage.file_id == image_id).first()
    if image is None:
        raise DetectionInputError("File not found. Upload it first.")
    path = image_path(image)
    if not path.is_file():
        raise DetectionInputError("The file is missing from the server storage.")
    try:
        with rasterio.open(path) as src:
            info = read_info(src)
    except Exception as exc:
        raise DetectionInputError(
            "This file cannot be read as a picture. Use an image format such as GeoTIFF, JPEG or PNG."
        ) from exc

    district, taluka, village = _check_area(db, district_id, taluka_id, village_id)
    params = {
        "tile_size": tile_size or settings.DETECTION_TILE_SIZE,
        "overlap": settings.DETECTION_OVERLAP,
        "normalize": normalize or settings.DETECTION_NORMALIZE,
        "confidence": settings.AI_CONFIDENCE_THRESHOLD if confidence is None else confidence,
        "nms_iou": settings.DETECTION_NMS_IOU,
        "imgsz": MODEL_IMGSZ,
        "image": info,
    }
    # The caller holds the run lock, so no run is active. A job still 'pending' or
    # 'running' belongs to an earlier server process and can never finish.
    detection_repository.fail_stale_jobs(db)

    job = DetectionJob(
        id=str(uuid.uuid4()),
        user_id=user_id,
        image_id=image.file_id,
        district_id=district.id if district else None,
        taluka_id=taluka.id if taluka else None,
        village_id=village.id if village else None,
        district=district.name if district else None,
        taluka=taluka.name if taluka else None,
        village=village.name if village else None,
        model_version=Path(settings.MODEL_WEIGHTS_PATH).name,
        params=params,
        status="pending",
        tiles_done=0,
    )
    return detection_repository.create_job(db, job)


def run_job(job_id: str) -> None:
    """Background task. Never raises, and always releases the run lock."""
    try:
        _execute(job_id)
    finally:
        release_claim()


def _failure_text(exc: Exception) -> str:
    if settings.DEBUG:
        return f"{FAILED_MESSAGE} Reason: {type(exc).__name__}: {str(exc)[:300]}"
    return FAILED_MESSAGE


def _execute(job_id: str) -> None:
    db = SessionLocal()
    try:
        job = detection_repository.get_job(db, job_id)
        if job is None:
            return
        params = dict(job.params or {})
        image = db.query(SatelliteImage).filter(SatelliteImage.file_id == job.image_id).first()
        if image is None:
            raise DetectionInputError("The file record is no longer in the database.")
        picture = str(image_path(image))

        detection_repository.update_job(db, job, status="running", started_at=_now())
        load_model()

        def predict(rgb):
            return predict_tile(rgb, conf=params["confidence"], imgsz=params["imgsz"])

        def on_progress(done, total):
            detection_repository.update_job(db, job, tiles_done=done, tiles_total=total)

        detections, stats = detect_raster(
            picture,
            predict,
            tile_size=params["tile_size"],
            overlap=params["overlap"],
            normalize=params["normalize"],
            nms_iou=params["nms_iou"],
            progress=on_progress,
        )
        # Keep the statistics now, so they survive a failure in the next steps.
        params["stats"] = stats
        detection_repository.update_job(db, job, params=params, tiles_total=stats["tiles"])

        wells = _to_wells(picture, detections)
        detection_repository.insert_wells(db, job.id, wells)
        detection_repository.update_job(
            db, job,
            status="completed",
            tiles_done=stats["tiles"],
            total_detections=len(wells),
            completed_at=_now(),
        )
        logger.info("Detection job %s completed: %d wells", job_id, len(wells))
    except DetectionInputError as exc:
        logger.warning("Detection job %s stopped: %s", job_id, exc)
        _mark_failed(db, job_id, str(exc))
    except Exception as exc:
        logger.exception("Detection job %s failed", job_id)
        _mark_failed(db, job_id, _failure_text(exc))
    finally:
        db.close()


def _mark_failed(db: Session, job_id: str, message: str) -> None:
    """Roll back first, because the session may hold a half-finished change."""
    try:
        db.rollback()
        job = detection_repository.get_job(db, job_id)
        if job is not None:
            detection_repository.update_job(
                db, job, status="failed", error_message=message, completed_at=_now()
            )
    except Exception:
        logger.exception("Could not record the failure of job %s", job_id)


def _to_wells(picture: str, detections: list[dict]) -> list[dict]:
    """Each box centre, as longitude and latitude (WGS 84)."""
    if not detections:
        return []
    with rasterio.open(picture) as src:
        if src.crs is None:
            raise DetectionInputError(
                "The model found wells, but this file has no map coordinates, so they cannot "
                "be placed on a map. Use a GeoTIFF with coordinates."
            )
        centre_rows = [(d["y1"] + d["y2"]) / 2 for d in detections]
        centre_cols = [(d["x1"] + d["x2"]) / 2 for d in detections]
        xs, ys = xy(src.transform, centre_rows, centre_cols)
        lons, lats = transform_points(src.crs, "EPSG:4326", xs, ys)
    return [
        {
            "longitude": float(lon),
            "latitude": float(lat),
            "confidence": float(d["confidence"]),
            "class_name": str(d.get("class_name", "well")),
            "px_x1": int(round(d["x1"])),
            "px_y1": int(round(d["y1"])),
            "px_x2": int(round(d["x2"])),
            "px_y2": int(round(d["y2"])),
        }
        for d, lon, lat in zip(detections, lons, lats)
    ]