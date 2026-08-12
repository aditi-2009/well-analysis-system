"""
core/logging_config.py

Centralized logging setup for the backend.

WHY THIS FILE EXISTS
---------------------
Section 23 of the project brief requires every request and error to be
logged and auditable. If every module called logging.basicConfig()
independently, format/level/output would be inconsistent and could
silently override each other. This configures the ROOT logger ONCE at
startup, so every module simply does:

    import logging
    logger = logging.getLogger(__name__)

and inherits consistent formatting and output automatically.

WHO IMPORTS THIS FILE
------------------------
main.py — calls setup_logging() once, at startup, before any request
is served.

WHAT THIS FILE IMPORTS
------------------------
Only core/config.py (get_settings) — needs LOG_LEVEL and LOG_DIR. Sits
low in the dependency graph so every module can safely log without risk
of a circular import.

DESIGN PATTERN
-----------------
"Configure once at the composition root": only main.py calls
setup_logging(); every other file only calls
logging.getLogger(__name__) and never reconfigures logging itself.

HOW IT CONNECTS TO THE WHOLE BACKEND
---------------------------------------
    main.py --calls--> setup_logging() --configures--> root logger
                                                            |
                        every module's logging.getLogger(__name__)
                        inherits this configuration automatically
"""

import logging
import logging.handlers
import sys

from app.core.config import get_settings

settings = get_settings()

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging() -> None:
    """
    Configures the root logger with a console handler and a rotating
    file handler. Must be called exactly once, at startup, before any
    other module logs anything.

    Idempotency guard: existing handlers are cleared first, so calling
    this more than once (e.g. during tests) never duplicates log lines.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL.upper())
    root_logger.handlers.clear()

    formatter = logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT)

    # Console — what you see in the terminal during development.
    console_handler = logging.StreamHandler(stream=sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Rotating file — persists logs for audit purposes (Section 23),
    # capped at 10MB x 5 backups so logs don't grow unbounded.
    log_file_path = settings.LOG_DIR / "backend.log"
    file_handler = logging.handlers.RotatingFileHandler(
        filename=log_file_path,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    # Quiet noisy third-party loggers so INFO-level app logs aren't
    # drowned out. Uvicorn's own access logs are configured separately.
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)

    root_logger.info(
        "Logging configured | level=%s | file=%s", settings.LOG_LEVEL.upper(), log_file_path
    )