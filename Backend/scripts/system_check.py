# version: well-detection-3
r"""
scripts/system_check.py

Tests every layer of the project, in order, and keeps going after an error.
Each check prints PASS, FAIL or WARN with the reason. The whole report is saved
to selftest_report.txt in the project folder.

Layers
  1 files      expected files exist, compile, and have the expected version
  2 contract   every URL the Detect wells page calls exists in the backend
  3 database   PostGIS, tables, row counts, saved wells, recent jobs, migrations
  4 training   model weights, training results, labels, the test picture
  5 model      the model loads and answers on the test picture
  6 pipeline   the code that turns a picture into wells, run in this process
  7 api        the running server, end to end: login, places, upload, detection

Run from the Backend folder, with dev_env.ps1 loaded in the same window.
Layer 7 needs uvicorn running in another window:
    .\.venv\Scripts\python.exe -m scripts.system_check --email you@example.com
    .\.venv\Scripts\python.exe -m scripts.system_check --email you@example.com --skip-api
The password is asked for and is not shown. You can also set SELFTEST_PASSWORD.
"""

import argparse
import getpass
import json
import math
import os
import py_compile
import re
import socket
import subprocess
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # the project folder
BACKEND = ROOT / "Backend"
TRAINING = ROOT / "Model-Training"
UI = ROOT / "UI"
REPORT = ROOT / "selftest_report.txt"
LABELS = TRAINING / "data" / "raw" / "Wardha_Arvi_Deoli_Well_fixed.shp"
API_ROOT = "http://127.0.0.1:8000"
PICTURE_NAME = "tile_00067"
RADIUS_M = 6.0

LINES = []
COUNT = {"PASS": 0, "FAIL": 0, "WARN": 0}

BACKEND_FILES = [
    "app/main.py", "app/core/config.py", "app/core/exceptions.py", "app/core/logging_config.py",
    "app/middleware/logging_middleware.py",
    "app/db/base.py", "app/db/session.py", "app/db/models/__init__.py", "app/db/models/user.py",
    "app/db/models/satellite_image.py", "app/db/models/state.py", "app/db/models/district.py",
    "app/db/models/taluka.py", "app/db/models/village.py", "app/db/models/known_wells.py",
    "app/db/models/detection_job.py", "app/db/models/detected_wells.py",
    "app/db/repository/upload_repository.py", "app/db/repository/location_repository.py",
    "app/db/repository/known_well_repository.py", "app/db/repository/detection_repository.py",
    "app/schemas/common.py", "app/schemas/auth.py", "app/schemas/upload.py", "app/schemas/location.py",
    "app/schemas/known_well.py", "app/schemas/detection.py", "app/schemas/well.py",
    "app/schemas/ai_model.py", "app/schemas/gee.py",
    "app/api/v1/router.py", "app/api/v1/endpoints/__init__.py", "app/api/v1/endpoints/health.py",
    "app/api/v1/endpoints/auth.py", "app/api/v1/endpoints/locations.py", "app/api/v1/endpoints/upload.py",
    "app/api/v1/endpoints/well.py", "app/api/v1/endpoints/known_wells.py", "app/api/v1/endpoints/models.py",
    "app/api/v1/endpoints/statistics.py", "app/api/v1/endpoints/gee.py",
    "app/services/detection_job_service.py", "app/services/tiled_detection.py",
    "app/services/upload_service.py", "app/services/location_service.py", "app/services/gee_service.py",
    "app/services/statistics/well_statistics_service.py",
    "app/ml/bridge.py", "app/gis/raster_tiling.py", "app/gis/raster_processor.py",
    "app/gis/bbox.py", "app/gis/geojson_builder.py",
    "app/utils/file_utils.py", "app/utils/validators.py",
    "app/auth/dependencies.py", "app/auth/jwt_handler.py", "app/auth/password.py",
    "scripts/detect_clip.py", "alembic/env.py", "alembic.ini", "dev_env.ps1", ".env",
]
UI_FILES = [
    "src/main.jsx", "src/App.jsx", "src/routes/AppRoutes.js", "src/context/AuthContext.jsx",
    "src/services/api.js", "src/services/authService.js", "src/services/wellService.js",
    "src/services/detectionService.js", "src/services/locationService.js",
    "src/services/exportService.js", "src/services/reportService.js",
    "src/utils/wellMapper.js", "src/utils/constants.js", "src/utils/validators.js",
    "src/components/map/WellMap.jsx", "src/components/map/WellMarker.jsx",
    "src/components/wells/WellTable.jsx", "src/components/wells/WellDetails.jsx",
    "src/pages/WellDetection.jsx", "src/pages/MapView.jsx", "src/pages/Results.jsx",
    "package.json", ".env",
]
TRAINING_FILES = ["make_test_clip.py", "fix_shapefile_crs.py", "check_model_input.py"]
VERSIONED = [
    ("well-detection-3", BACKEND / "app/services/upload_service.py"),
    ("well-detection-2", BACKEND / "app/services/tiled_detection.py"),
    ("well-detection-2", BACKEND / "app/services/detection_job_service.py"),
    ("well-detection-2", BACKEND / "app/schemas/detection.py"),
    ("well-detection-2", UI / "src/services/detectionService.js"),
    ("well-detection-3", UI / "src/pages/WellDetection.jsx"),
    ("well-detection-3", TRAINING / "check_model_input.py"),
]


def say(status, layer, text):
    COUNT[status] = COUNT.get(status, 0) + 1
    line = "[" + status.ljust(4) + "] " + layer.ljust(10) + " " + text
    print(line, flush=True)
    LINES.append(line)


def info(layer, text):
    line = "         " + layer.ljust(10) + " " + text
    print(line, flush=True)
    LINES.append(line)


def heading(text):
    line = "\n===== " + text + " ====="
    print(line, flush=True)
    LINES.append(line)


def run_layer(title, function):
    heading(title)
    short = title.split()[-1]
    try:
        function()
    except Exception as exc:  # keep going: later layers may still show useful results
        say("FAIL", short, "this layer stopped with an error: " + type(exc).__name__ + ": " + str(exc)[:300])
        for line in traceback.format_exc().strip().splitlines()[-4:]:
            info(short, line.strip())


def metres_apart(lon1, lat1, lon2, lat2):
    dx = (lon1 - lon2) * 111320.0 * math.cos(math.radians((lat1 + lat2) / 2))
    dy = (lat1 - lat2) * 110574.0
    return math.hypot(dx, dy)


def labels_hit(labels, wells, radius_m=RADIUS_M):
    """How many labelled wells have at least one well within radius_m metres."""
    return sum(1 for lon, lat in labels if any(metres_apart(lon, lat, x, y) <= radius_m for x, y in wells))


def labels_lonlat(picture):
    """Labelled wells as (lon, lat), when the picture is in degrees (EPSG:4326)."""
    import geopandas as gpd
    import rasterio

    if not LABELS.is_file():
        return None, "labels file not found: " + str(LABELS)
    with rasterio.open(picture) as src:
        if src.crs is None or src.crs.to_epsg() != 4326:
            return None, "the test picture is not in degrees (EPSG:4326), so the labels cannot be compared"
        b = src.bounds
    labels = gpd.read_file(LABELS).to_crs("EPSG:4326")
    labels = labels.cx[b.left:b.right, b.bottom:b.top]
    return [(p.x, p.y) for p in labels.geometry], None


def labels_in_raster(raster):
    import geopandas as gpd
    import rasterio

    with rasterio.open(raster) as src:
        crs, b = src.crs, src.bounds
    labels = gpd.read_file(LABELS).to_crs(crs)
    return len(labels.cx[b.left:b.right, b.bottom:b.top])


def find_picture(arg):
    if arg:
        return Path(arg)
    for folder in (BACKEND / "storage" / "uploads", TRAINING / "data"):
        if folder.is_dir():
            hits = sorted(folder.rglob("*" + PICTURE_NAME + "*.tif"))
            if hits:
                return hits[0]
    return None


def find_by_name(items, name):
    if not isinstance(items, list):
        return None
    for item in items:
        if str(item.get("name", "")).lower() == name:
            return item
    return None


def http(method, url, token=None, body=None, form=None, timeout=900):
    headers = {}
    data = None
    if token:
        headers["Authorization"] = "Bearer " + token
    if form is not None:
        field, filename, payload, mime = form
        boundary = uuid.uuid4().hex
        data = b"".join([
            ("--" + boundary + "\r\n").encode(),
            ('Content-Disposition: form-data; name="' + field + '"; filename="' + filename + '"\r\n').encode(),
            ("Content-Type: " + mime + "\r\n\r\n").encode(),
            payload,
            ("\r\n--" + boundary + "--\r\n").encode(),
        ])
        headers["Content-Type"] = "multipart/form-data; boundary=" + boundary
    elif body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8", "replace")
            return response.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", "replace")
        try:
            return err.code, json.loads(raw)
        except ValueError:
            return err.code, raw[:300]
    except urllib.error.URLError as err:
        return 0, str(err.reason)


# ---------------------------------------------------------------- layer 1
def layer_files():
    for rel in BACKEND_FILES:
        path = BACKEND / rel
        if not path.is_file():
            say("FAIL", "files", "Backend/" + rel + " is MISSING")
            continue
        if path.suffix == ".py":
            try:
                py_compile.compile(str(path), doraise=True)
            except py_compile.PyCompileError as err:
                say("FAIL", "files", "Backend/" + rel + " has a syntax error: " + str(err).strip()[-200:])
                continue
        say("PASS", "files", "Backend/" + rel)

    expected = set(BACKEND_FILES)
    for path in sorted((BACKEND / "app").rglob("*.py")):
        rel = path.relative_to(BACKEND).as_posix()
        if rel in expected:
            continue
        old = any(word in rel for word in
                  ("prediction", "detection_service", "endpoints/detection", "well_repository", "models/well.py"))
        if old:
            say("WARN", "files", "Backend/" + rel + " is OLD code, still in the project: delete it after the search")
        else:
            info("files", "Backend/" + rel + " is not in the expected list: check it is still used")

    for rel in TRAINING_FILES:
        path = TRAINING / rel
        if path.is_file():
            say("PASS", "files", "Model-Training/" + rel + " exists")
        else:
            say("FAIL", "files", "Model-Training/" + rel + " is MISSING")

    for version, path in VERSIONED:
        if not path.is_file():
            say("FAIL", "files", path.name + " is missing")
        elif version in path.read_text(encoding="utf-8", errors="replace")[:400]:
            say("PASS", "files", path.name + " has the " + version + " version")
        else:
            say("FAIL", "files", path.name + " is NOT the " + version + " version: the copy on disk is older. Replace it")

    missing = [rel for rel in UI_FILES if not (UI / rel).is_file()]
    for rel in missing:
        say("FAIL", "files", "UI/" + rel + " is MISSING")
    if not missing:
        say("PASS", "files", "all " + str(len(UI_FILES)) + " expected UI files exist")

    env_file = UI / ".env"
    if env_file.is_file():
        found = re.search(r"VITE_API_BASE_URL\s*=\s*(\S+)", env_file.read_text(encoding="utf-8", errors="replace"))
        value = found.group(1) if found else None
        ok = bool(value) and value.rstrip("/").endswith("/api/v1")
        say("PASS" if ok else "FAIL", "files", "UI/.env: VITE_API_BASE_URL=" + str(value) + " (must end with /api/v1)")
    else:
        say("FAIL", "files", "UI/.env is missing")

    mock = UI / "src" / "data" / "mockWells.js"
    if mock.exists():
        say("FAIL", "files", "UI/src/data/mockWells.js still exists: delete it")
    else:
        say("PASS", "files", "UI/src/data/mockWells.js is removed")

    page = UI / "src" / "pages" / "WellDetection.jsx"
    if page.is_file():
        text = page.read_text(encoding="utf-8", errors="replace")
        left = [w for w in ("min-confidence", "tile-size", 'id="contrast"', "advanced-settings") if w in text]
        if left:
            say("FAIL", "files", "the Detect wells page still has advanced controls: " + ", ".join(left))
        else:
            say("PASS", "files", "the Detect wells page has no advanced controls")


# ---------------------------------------------------------------- layer 2
def layer_contract():
    from app.main import app

    served = set()
    for route in app.routes:
        path = getattr(route, "path", "")
        if path.startswith("/api/v1"):
            for method in getattr(route, "methods", None) or []:
                served.add((method, re.sub(r"\{[^}]*\}", "0", path)))

    pattern = re.compile(r"""api\.(get|post|put|patch|delete)\(\s*(["'`])(.*?)\2""")
    calls = []
    for js in sorted((UI / "src" / "services").glob("*.js")):
        text = js.read_text(encoding="utf-8", errors="replace")
        for found in pattern.finditer(text):
            raw = found.group(3)
            calls.append((js.name, found.group(1).upper(), raw,
                          "/api/v1" + re.sub(r"\$\{[^}]*\}", "0", raw)))

    if not calls:
        say("WARN", "contract", "no api calls were found in UI/src/services")
    for file_name, verb, raw, path in calls:
        if (verb, path) in served:
            say("PASS", "contract", file_name + ": " + verb + " " + raw)
        else:
            say("FAIL", "contract", file_name + ": " + verb + " " + raw + " has no matching backend route")
    info("contract", "backend routes under /api/v1: " + str(len(served)))


# ---------------------------------------------------------------- layer 3
def layer_database():
    from sqlalchemy import text
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        version = db.execute(text("SELECT version()")).scalar()
        say("PASS", "database", "connected: " + version.split(",")[0])
        postgis = db.execute(text("SELECT count(*) FROM pg_extension WHERE extname = 'postgis'")).scalar()
        say("PASS" if postgis else "FAIL", "database", "PostGIS extension " + ("is installed" if postgis else "is MISSING"))

        tables = {r[0] for r in db.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))}
        for name in ("state", "district", "taluka", "village", "users", "satellite_image",
                     "known_wells", "detection_jobs", "detected_wells", "alembic_version"):
            if name in tables:
                count = db.execute(text("SELECT count(*) FROM " + name)).scalar()
                say("PASS", "database", "table " + name + ": " + str(count) + " rows")
            else:
                say("FAIL", "database", "table " + name + " is MISSING: run alembic upgrade head")

        if "detected_wells" in tables:
            outside = db.execute(text(
                "SELECT count(*) FROM detected_wells "
                "WHERE NOT (ST_X(geom) BETWEEN 72 AND 81 AND ST_Y(geom) BETWEEN 15 AND 23)")).scalar()
            say("PASS" if outside == 0 else "FAIL", "database",
                "saved wells outside Maharashtra: " + str(outside) + " (expected 0)")
            srids = [r[0] for r in db.execute(text("SELECT DISTINCT ST_SRID(geom) FROM detected_wells"))]
            say("PASS" if srids in ([], [4326]) else "FAIL", "database",
                "coordinate systems of saved wells: " + str(srids) + " (expected [4326])")

        if "detection_jobs" in tables:
            stuck = db.execute(text(
                "SELECT count(*) FROM detection_jobs WHERE status IN ('pending', 'running')")).scalar()
            say("WARN" if stuck else "PASS", "database", "jobs stuck as pending or running: " + str(stuck))
            rows = db.execute(text(
                "SELECT left(j.id, 8), j.status, j.params->'stats'->>'model_boxes', "
                "(SELECT count(*) FROM detected_wells w WHERE w.job_id = j.id), left(j.error_message, 60) "
                "FROM detection_jobs j ORDER BY j.created_at DESC LIMIT 5")).fetchall()
            for r in rows:
                info("database", "job " + str(r[0]) + " status=" + str(r[1]) + " model_boxes=" + str(r[2])
                     + " wells_saved=" + str(r[3]) + " error=" + str(r[4]))
    finally:
        db.close()

    result = subprocess.run([sys.executable, "-m", "alembic", "check"], cwd=str(BACKEND),
                            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
    output = (result.stdout or "") + (result.stderr or "")
    if "No new upgrade operations" in output:
        say("PASS", "database", "alembic check: the database matches the models")
    else:
        last = output.strip().splitlines()[-1] if output.strip() else "no output"
        say("FAIL", "database", "alembic check: " + last[:200])


# ---------------------------------------------------------------- layer 4
def layer_training(picture):
    import numpy as np
    import rasterio
    from app.core.config import get_settings

    settings = get_settings()
    weights = Path(str(settings.MODEL_WEIGHTS_PATH))
    if not weights.is_absolute():
        weights = BACKEND / weights
    if weights.is_file():
        say("PASS", "training", "model weights found: " + str(weights))
    else:
        say("FAIL", "training", "model weights NOT found at " + str(weights) + ". Check MODEL_WEIGHTS_PATH in Backend/.env")

    results = TRAINING / "runs" / "detect" / "runs" / "train" / "results.csv"
    if results.is_file():
        rows = results.read_text(encoding="utf-8", errors="replace").strip().splitlines()
        header = [h.strip() for h in rows[0].split(",")]
        last = dict(zip(header, [v.strip() for v in rows[-1].split(",")]))
        info("training", "last epoch " + str(last.get("epoch")) + ": precision " + str(last.get("metrics/precision(B)"))
             + ", recall " + str(last.get("metrics/recall(B)")) + ", mAP50 " + str(last.get("metrics/mAP50(B)")))
        say("PASS", "training", "training results file found")
    else:
        say("WARN", "training", "no training results at " + str(results))

    missing = [ext for ext in (".shp", ".shx", ".dbf", ".prj") if not LABELS.with_suffix(ext).is_file()]
    if missing:
        say("FAIL", "training", "label files missing: " + ", ".join(missing))
    else:
        import geopandas as gpd
        labels = gpd.read_file(LABELS)
        epsg = labels.crs.to_epsg() if labels.crs else None
        say("PASS" if epsg == 4326 else "FAIL", "training",
            "labels: " + str(len(labels)) + " wells, coordinate system EPSG:" + str(epsg) + " (expected 4326)")

    deoli = TRAINING / "data" / "dataset" / "DEOLI.tif"
    if deoli.is_file():
        with rasterio.open(deoli) as src:
            info("training", "DEOLI.tif: " + str(src.width) + " x " + str(src.height) + " px, CRS " + str(src.crs))
        inside = labels_in_raster(deoli)
        say("PASS" if inside > 0 else "FAIL", "training", "labelled wells inside DEOLI.tif: " + str(inside))
    else:
        say("FAIL", "training", "DEOLI.tif not found at " + str(deoli))

    clip = TRAINING / "data" / "test_clip.tif"
    if clip.is_file():
        with rasterio.open(clip) as src:
            values = int(np.unique(src.read(1)).size)
        if values > 1:
            say("PASS", "training", "test_clip.tif has " + str(values) + " distinct values: a real picture")
        else:
            say("WARN", "training", "test_clip.tif is one flat colour: not a valid test, ignore it")

    if picture is not None:
        with rasterio.open(picture) as src:
            info("training", "test picture " + picture.name + ": " + str(src.width) + " x " + str(src.height)
                 + " px, CRS " + str(src.crs))
        here, why = labels_lonlat(picture)
        if here is None:
            say("WARN", "training", why)
        else:
            say("PASS" if here else "WARN", "training", "labelled wells inside the test picture: " + str(len(here)))


# ---------------------------------------------------------------- layer 5
def layer_model(picture):
    import numpy as np
    import rasterio
    from rasterio.windows import Window
    from app.ml.bridge import load_model, predict_tile

    model = load_model()
    names = list(getattr(model, "names", {}).values())
    say("PASS", "model", "the model loads; classes: " + str(names))

    blank = predict_tile(np.zeros((640, 640, 3), dtype=np.uint8), conf=0.05, imgsz=640)
    say("PASS" if not blank else "WARN", "model", "a blank tile gives " + str(len(blank)) + " marks (expected 0)")

    if picture is None:
        say("WARN", "model", "no test picture: the model was not run on a real picture")
        return
    with rasterio.open(picture) as src:
        h, w = min(640, src.height), min(640, src.width)
        window = Window((src.width - w) // 2, (src.height - h) // 2, w, h)
        arr = src.read([1, 2, 3], window=window)
    rgb = np.ascontiguousarray(np.transpose(arr, (1, 2, 0)))
    marks = predict_tile(rgb, conf=0.05, imgsz=640)
    best = max([m["confidence"] for m in marks], default=0.0)
    say("PASS" if marks else "WARN", "model",
        "centre " + str(w) + " x " + str(h) + " px of the test picture: " + str(len(marks))
        + " marks at minimum 0.05, best score " + format(best, ".3f"))


# ---------------------------------------------------------------- layer 6
def layer_pipeline(picture):
    from app.core.config import get_settings
    from app.ml.bridge import predict_tile
    from app.services.detection_job_service import _to_wells
    from app.services.tiled_detection import detect_raster

    s = get_settings()
    info("pipeline", "settings from Backend/.env: tile " + str(s.DETECTION_TILE_SIZE)
         + ", overlap " + str(s.DETECTION_OVERLAP) + ", colours " + str(s.DETECTION_NORMALIZE)
         + ", minimum " + str(s.AI_CONFIDENCE_THRESHOLD) + ", duplicate overlap " + str(s.DETECTION_NMS_IOU))
    if picture is None:
        say("WARN", "pipeline", "skipped: no test picture")
        return {}

    detections, stats = detect_raster(
        str(picture),
        lambda rgb: predict_tile(rgb, conf=s.AI_CONFIDENCE_THRESHOLD, imgsz=640),
        tile_size=s.DETECTION_TILE_SIZE,
        overlap=s.DETECTION_OVERLAP,
        normalize=s.DETECTION_NORMALIZE,
        nms_iou=s.DETECTION_NMS_IOU,
    )
    info("pipeline", "tiles " + str(stats.get("tiles")) + ", model marks " + str(stats.get("model_boxes"))
         + ", kept after edge check " + str(stats.get("raw_boxes"))
         + ", wells after duplicates " + str(stats.get("wells")))
    wells = _to_wells(str(picture), detections)
    labels, why = labels_lonlat(picture)
    if labels is None:
        say("WARN", "pipeline", why)
    else:
        hit = labels_hit(labels, [(w["longitude"], w["latitude"]) for w in wells])
        say("PASS" if hit > 0 else "FAIL", "pipeline",
            "labelled wells hit by this code: " + str(hit) + " of " + str(len(labels)))
    if wells:
        first = wells[0]
        info("pipeline", "first well: lon " + format(first["longitude"], ".5f") + ", lat "
             + format(first["latitude"], ".5f") + ", score " + format(first["confidence"], ".3f"))
    else:
        say("WARN", "pipeline", "this code produced 0 wells for the test picture")
    return stats


# ---------------------------------------------------------------- layer 7
def layer_api(args, picture, local_stats):
    if args.skip_api:
        say("WARN", "api", "skipped because of --skip-api")
        return
    try:
        socket.create_connection(("127.0.0.1", 8000), timeout=3).close()
    except OSError:
        say("FAIL", "api", "the server is not running on 127.0.0.1:8000: start uvicorn in another window")
        return

    code, _ = http("GET", API_ROOT + "/health")
    say("PASS" if code == 200 else "FAIL", "api", "GET /health -> " + str(code))

    code, _ = http("GET", API_ROOT + "/api/v1/wells")
    say("PASS" if code in (401, 403) else "FAIL", "api",
        "GET /api/v1/wells without a login -> " + str(code) + " (expected 401 or 403)")

    email = args.email or input("Email for the test login: ").strip()
    password = os.environ.get("SELFTEST_PASSWORD") or getpass.getpass("Password (typed hidden): ")
    code, body = http("POST", API_ROOT + "/api/v1/auth/login", body={"email": email, "password": password})
    if code != 200 or not isinstance(body, dict) or "access_token" not in body:
        say("FAIL", "api", "login -> " + str(code) + " " + str(body)[:200])
        return
    token = body["access_token"]
    say("PASS", "api", "login works")

    code, _ = http("GET", API_ROOT + "/api/v1/auth/me", token=token)
    say("PASS" if code == 200 else "FAIL", "api", "GET /auth/me -> " + str(code))

    code, states = http("GET", API_ROOT + "/api/v1/locations/states", token=token)
    maharashtra = find_by_name(states, "maharashtra") if code == 200 else None
    if maharashtra is None:
        say("FAIL", "api", "GET /locations/states -> " + str(code) + ": Maharashtra not found")
        return

    wardha = taluka = deoli = None
    code, districts = http("GET", API_ROOT + "/api/v1/locations/districts/" + str(maharashtra["id"]), token=token)
    if code == 200:
        wardha = find_by_name(districts, "wardha")
    if wardha is not None:
        code, talukas = http("GET", API_ROOT + "/api/v1/locations/talukas/" + str(wardha["id"]), token=token)
        if code == 200:
            taluka = find_by_name(talukas, "wardha")
    if taluka is not None:
        code, villages = http("GET", API_ROOT + "/api/v1/locations/villages/" + str(taluka["id"]), token=token)
        if code == 200:
            deoli = find_by_name(villages, "deoli")
    say("PASS" if deoli is not None else "FAIL", "api",
        "places: Wardha " + ("found" if wardha else "missing") + ", Wardha taluka "
        + ("found" if taluka else "missing") + ", Deoli " + ("found" if deoli else "missing"))
    if wardha is None:
        return

    code, _ = http("GET", API_ROOT + "/api/v1/images/list", token=token)
    say("PASS" if code == 200 else "FAIL", "api", "GET /images/list -> " + str(code))

    if picture is None:
        say("FAIL", "api", "no test picture: run again with --picture")
        return
    code, up = http("POST", API_ROOT + "/api/v1/images/upload", token=token,
                    form=("file", picture.name, picture.read_bytes(), "image/tiff"))
    if code != 200 or not isinstance(up, dict):
        say("FAIL", "api", "POST /images/upload -> " + str(code) + " " + str(up)[:300])
        return
    file_id = up["file_id"]
    say("PASS", "api", "upload works: " + picture.name + " is file " + file_id[:8]
        + ", format " + str(up.get("detected_format")) + ", coordinates " + str(up.get("crs")))

    area = {"district_id": wardha["id"]}
    if taluka is not None:
        area["taluka_id"] = taluka["id"]
    if deoli is not None:
        area["village_id"] = deoli["id"]
    code, job = http("POST", API_ROOT + "/api/v1/wells/detect", token=token, body=dict(area, image_id=file_id))
    if code != 202 or not isinstance(job, dict):
        say("FAIL", "api", "POST /wells/detect -> " + str(code) + " " + str(job)[:300])
        return
    job_id = job["id"]
    say("PASS", "api", "detection started: job " + job_id[:8] + ", status " + str(job.get("status")))

    started = time.time()
    last_state = None
    while True:
        code, job = http("GET", API_ROOT + "/api/v1/wells/jobs/" + job_id, token=token)
        if code != 200 or not isinstance(job, dict):
            say("FAIL", "api", "GET /wells/jobs -> " + str(code) + " " + str(job)[:300])
            return
        state = (job.get("status"), job.get("tiles_done"), job.get("tiles_total"))
        if state != last_state:
            info("api", "job " + job_id[:8] + ": " + str(job.get("status")) + ", tiles "
                 + str(job.get("tiles_done")) + " of " + str(job.get("tiles_total")))
            last_state = state
        if job.get("status") in ("completed", "failed"):
            break
        if time.time() - started > 900:
            say("FAIL", "api", "the job did not finish within 15 minutes")
            return
        time.sleep(2)

    params = job.get("params") or {}
    stats = params.get("stats") or {}
    info("api", "server settings for this job: tile " + str(params.get("tile_size")) + ", colours "
         + str(params.get("normalize")) + ", minimum " + str(params.get("confidence")))
    if job.get("status") == "failed":
        say("FAIL", "api", "the job failed: " + str(job.get("error_message")))
        return
    say("PASS", "api", "job completed: model marks " + str(stats.get("model_boxes"))
        + ", wells " + str(stats.get("wells")))

    query = urllib.parse.urlencode({"job_id": job_id, "limit": 20000})
    code, wells = http("GET", API_ROOT + "/api/v1/wells?" + query, token=token)
    if code != 200 or not isinstance(wells, list):
        say("FAIL", "api", "GET /wells?job_id -> " + str(code) + " " + str(wells)[:300])
        return
    if len(wells) == stats.get("wells"):
        say("PASS" if wells else "WARN", "api", "GET /wells returns " + str(len(wells)) + " wells for the job")
    else:
        say("FAIL", "api", "GET /wells returns " + str(len(wells)) + " wells, but the job reports "
            + str(stats.get("wells")))

    if local_stats:
        same = all(stats.get(k) == local_stats.get(k) for k in ("tiles", "model_boxes", "wells"))
        if same:
            say("PASS", "api", "the server run matches this check's run")
        else:
            say("WARN", "api", "the server run differs from this check: server marks " + str(stats.get("model_boxes"))
                + ", check marks " + str(local_stats.get("model_boxes"))
                + ". Restart uvicorn after changing .env")

    labels, why = labels_lonlat(picture)
    if labels is None:
        say("WARN", "api", why)
    elif wells:
        hit = labels_hit(labels, [(w["longitude"], w["latitude"]) for w in wells])
        say("PASS" if hit > 0 else "FAIL", "api",
            "labelled wells hit by the saved wells: " + str(hit) + " of " + str(len(labels)))

    code, _ = http("POST", API_ROOT + "/api/v1/wells/detect", token=token,
                   body={"image_id": "no-such-file", "district_id": wardha["id"]})
    say("PASS" if code == 422 else "FAIL", "api", "an unknown file is refused -> " + str(code) + " (expected 422)")

    code, text_up = http("POST", API_ROOT + "/api/v1/images/upload", token=token,
                         form=("file", "selftest.txt", b"not a picture\n", "text/plain"))
    if code == 200 and isinstance(text_up, dict):
        code, _ = http("POST", API_ROOT + "/api/v1/wells/detect", token=token,
                       body={"image_id": text_up["file_id"], "district_id": wardha["id"]})
        say("PASS" if code == 422 else "FAIL", "api",
            "a text file is refused for detection -> " + str(code) + " (expected 422)")
    else:
        say("FAIL", "api", "uploading selftest.txt -> " + str(code))

    query = urllib.parse.urlencode({"bbox": "78.0,20.0,79.5,21.5", "limit": 20000})
    code, boxed = http("GET", API_ROOT + "/api/v1/wells?" + query, token=token)
    say("PASS" if code == 200 else "FAIL", "api", "GET /wells with a map box -> " + str(code)
        + (", " + str(len(boxed)) + " wells" if isinstance(boxed, list) else ""))

    code, _ = http("GET", API_ROOT + "/api/v1/known-wells?limit=5", token=token)
    say("PASS" if code == 200 else "FAIL", "api", "GET /known-wells -> " + str(code))


# ---------------------------------------------------------------- main
def main():
    parser = argparse.ArgumentParser(description="Test every layer of the well detection project.")
    parser.add_argument("--email", default=None, help="the login email of a user in the database")
    parser.add_argument("--picture", default=None, help="a test picture (default: tile_00067 in storage)")
    parser.add_argument("--skip-api", action="store_true", help="do not test the running server")
    args = parser.parse_args()

    say("PASS", "start", "python " + sys.version.split()[0] + " at " + sys.executable)
    picture = find_picture(args.picture)
    if picture is not None and picture.is_file():
        say("PASS", "start", "test picture: " + str(picture))
    else:
        picture = None
        say("FAIL", "start", "no test picture found: run again with --picture and the full path of a tif file")

    local_stats = {}

    def pipeline():
        local_stats.update(layer_pipeline(picture) or {})

    run_layer("1 files", layer_files)
    run_layer("2 contract", layer_contract)
    run_layer("3 database", layer_database)
    run_layer("4 training", lambda: layer_training(picture))
    run_layer("5 model", lambda: layer_model(picture))
    run_layer("6 pipeline", pipeline)
    run_layer("7 api", lambda: layer_api(args, picture, local_stats))

    summary = "SUMMARY: PASS " + str(COUNT["PASS"]) + "  FAIL " + str(COUNT["FAIL"]) + "  WARN " + str(COUNT["WARN"])
    LINES.append("\n" + summary)
    REPORT.write_text("\n".join(LINES) + "\n", encoding="utf-8")
    print("\n" + summary)
    print("Report saved to " + str(REPORT))


if __name__ == "__main__":
    main()