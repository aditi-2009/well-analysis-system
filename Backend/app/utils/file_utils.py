"""
utils/file_utils.py

Safe filenames, streamed upload saving with a size cap, quiet cleanup.
Imports: config, exceptions, utils.validators (one direction only).
"""

import logging
import re
import tempfile
import unicodedata
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.exceptions import FileValidationException
from app.utils.validators import validate_upload_extension

logger = logging.getLogger(__name__)
settings = get_settings()

CHUNK_SIZE = 1024 * 1024  # 1 MB
WRITE_BLOCK = 8 * 1024 * 1024  # bytes gathered before one disk write (fewer, larger writes)


def safe_filename(filename: str) -> str:
    """'../../my file (1).tif' -> 'my_file__1_.tif'"""
    name = re.split(r"[\\/]", filename or "")[-1]  # drop any directories
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name).lstrip(".")
    return name or "file"


def delete_quietly(path: Path | str) -> None:
    """Delete a file; never raise (cleanup must not mask real errors)."""
    try:
        Path(path).unlink(missing_ok=True)
    except OSError as e:
        logger.warning("Could not delete %s: %s", path, e)


def save_upload_to_temp(upload: UploadFile) -> Path:
    """Stream an upload to a temp file, enforcing extension and size.
    Caller must delete the file (or move it)."""
    ext = validate_upload_extension(upload.filename or "")
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    written = 0
    tmp_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp_path = Path(tmp.name)
            while chunk := upload.file.read(CHUNK_SIZE):
                written += len(chunk)
                if written > max_bytes:
                    raise FileValidationException(
                        f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit."
                    )
                tmp.write(chunk)
        if written == 0:
            raise FileValidationException("Uploaded file is empty.")
    except Exception:
        if tmp_path:
            delete_quietly(tmp_path)  # after the with-block: Windows can't
        raise  # delete a file that is still open
    return tmp_path


async def stream_to_temp(
    chunks: AsyncIterator[bytes], extension: str, directory: Path, max_bytes: int
) -> Path:
    """Write an incoming byte stream (request.stream()) to a temp file INSIDE `directory`.

    The file is written once, and the body is never held in memory, so the size of the
    upload does not matter, only the free disk space. Because the temp file is in the same
    folder as the final file, the later move is an instant rename.
    The caller must move or delete the returned file.
    """
    directory.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(
        prefix=".incoming-", suffix=extension, dir=directory, delete=False
    )
    path = Path(handle.name)
    written = 0
    buffer = bytearray()
    try:
        with handle:
            async for chunk in chunks:
                written += len(chunk)
                if written > max_bytes:
                    raise FileValidationException(
                        f"File exceeds the {max_bytes // (1024 * 1024)} MB limit."
                    )
                buffer += chunk
                if len(buffer) >= WRITE_BLOCK:
                    await run_in_threadpool(handle.write, buffer)
                    buffer.clear()
            if buffer:
                await run_in_threadpool(handle.write, buffer)
        if written == 0:
            raise FileValidationException("Uploaded file is empty.")
    except BaseException:
        # Also reached when the client disconnects mid-upload or the task is cancelled.
        # The with-block has closed the file by now, which Windows needs before deleting.
        delete_quietly(path)
        raise
    return path
