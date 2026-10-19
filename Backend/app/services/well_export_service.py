"""
services/well_export_service.py

Saved wells -> CSV text, one block at a time, so an area with hundreds of thousands
of wells never has to fit in memory.

It opens its OWN database session. A session handed in by a FastAPI dependency is closed
before a streaming response has finished, which would cut the download off halfway.

WHO IMPORTS THIS: api/v1/endpoints/well.py
WHAT IT IMPORTS: csv, io, detection repository, DB session factory
"""

import csv
import io
from collections.abc import Iterator

from app.db.repository import detection_repository
from app.db.session import SessionLocal

HEADERS = [
    "well_id", "job_id", "latitude", "longitude", "confidence", "class",
    "district", "taluka", "village", "model_version", "detected_on",
    "px_x1", "px_y1", "px_x2", "px_y2",
]
FLUSH_CHARS = 64 * 1024


def stream_wells_csv(
    *,
    job_id: str | None = None,
    district_id: int | None = None,
    taluka_id: int | None = None,
    village_id: int | None = None,
) -> Iterator[str]:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\r\n")
    buffer.write("\ufeff")  # byte-order mark: Excel then reads the file as UTF-8
    writer.writerow(HEADERS)

    with SessionLocal() as db:
        for w in detection_repository.iter_wells(
            db, job_id=job_id, district_id=district_id,
            taluka_id=taluka_id, village_id=village_id,
        ):
            detected = w["detected_on"]
            writer.writerow([
                w["id"],
                w["job_id"],
                round(w["latitude"], 7),
                round(w["longitude"], 7),
                round(w["confidence"], 4),
                w["class_name"],
                w["district"] or "",
                w["taluka"] or "",
                w["village"] or "",
                w["model_version"] or "",
                detected.isoformat() if detected else "",
                w["px_x1"], w["px_y1"], w["px_x2"], w["px_y2"],
            ])
            if buffer.tell() >= FLUSH_CHARS:
                yield buffer.getvalue()
                buffer.seek(0)
                buffer.truncate(0)
    yield buffer.getvalue()
