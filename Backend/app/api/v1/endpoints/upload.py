"""
api/v1/endpoints/upload.py

POST /images/upload         store an image sent as a form (small files, API clients)
PUT  /images/upload-stream  store an image sent as a raw stream (any size; the web page uses this)
GET  /images/list           recent uploads

All need a logged-in user. File type and size are checked before anything is kept.

WHO IMPORTS THIS: api/v1/router.py
WHAT IT IMPORTS: auth dependency, config, exceptions, User model, DB session, upload service,
upload repository, upload schema, file helpers
"""

import logging
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.auth.dependencies import get_current_user
from app.core.config import get_settings
from app.core.exceptions import AppException, FileValidationException
from app.db.models.user import User
from app.db.repository.upload_repository import UploadRepository
from app.db.session import get_db
from app.schemas.upload import UploadResponse
from app.services.upload_service import UploadService
from app.utils.file_utils import delete_quietly, save_upload_to_temp, stream_to_temp
from app.utils.validators import validate_upload_extension

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/images", tags=["Images"])

DISK_RESERVE_BYTES = 2 * 1024**3  # always leave 2 GB free for the database, logs and results


@router.post("/upload", response_model=UploadResponse)
def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload a GeoTIFF as a form. Fine for small files; very large files use /upload-stream."""
    tmp_path = save_upload_to_temp(file)  # checks the extension and the size
    try:
        return UploadService.process_upload(
            str(tmp_path),
            file.filename or "upload.tif",
            db,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Upload failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to process uploaded image.",
        )
    finally:
        delete_quietly(tmp_path)


@router.put("/upload-stream", response_model=UploadResponse)
async def upload_image_stream(
    request: Request,
    filename: str = Query(..., min_length=1, max_length=255),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload an image of any size as the raw request body.

    The body is written once to the upload folder, never held in memory and never copied
    by a form parser. The file name travels in the query string.
    """
    validate_upload_extension(filename)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    declared = request.headers.get("content-length", "")
    if declared.isdigit():  # refuse early: a bad upload must not run for an hour first
        size = int(declared)
        if size > max_bytes:
            raise FileValidationException(
                f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit."
            )
        free = shutil.disk_usage(settings.UPLOAD_DIR).free
        if size + DISK_RESERVE_BYTES > free:
            raise AppException(
                "The server does not have enough free disk space for this file.",
                error_code="INSUFFICIENT_STORAGE",
                status_code=507,
            )

    tmp_path = await stream_to_temp(
        request.stream(), Path(filename).suffix.lower(), Path(settings.UPLOAD_DIR), max_bytes
    )
    try:
        # Reading the picture's details and saving the record are blocking calls.
        return await run_in_threadpool(
            UploadService.process_upload, str(tmp_path), filename, db
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Streamed upload failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to process uploaded image.",
        )
    finally:
        delete_quietly(tmp_path)  # nothing is left behind if it was moved, or if it failed


@router.get("/list")
def list_uploads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List recent uploads."""
    try:
        items, total = UploadRepository.list_recent(db, page, page_size)
    except Exception:
        logger.exception("List uploads failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve uploaded images.",
        )
    return {
        "items": [
            {
                "file_id": img.file_id,
                "filename": img.original_filename,
                "width": img.image_width,
                "height": img.image_height,
                "crs": img.crs,
                "size_bytes": img.file_size_bytes,
                "format": img.detected_format,
                "created_at": img.created_at.isoformat(),
            }
            for img in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
