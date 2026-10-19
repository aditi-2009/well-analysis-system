"""
utils/logger.py

Enhanced logging utilities.
"""

import logging
import json
import time
from functools import wraps

logger = logging.getLogger(__name__)


def log_execution_time(func):
    """Decorator: log function execution time."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        logger.info(f"Starting: {func.__name__}")

        try:
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            logger.info(f"Completed: {func.__name__} (took {elapsed:.2f}s)")
            return result

        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                f"Failed: {func.__name__} after {elapsed:.2f}s | Error: {e}",
                exc_info=True,
            )
            raise

    return wrapper


def log_api_call(request_method, request_path, status_code, elapsed_ms):
    """Log API call details."""
    logger.info(
        json.dumps(
            {
                "event": "api_call",
                "method": request_method,
                "path": request_path,
                "status": status_code,
                "elapsed_ms": elapsed_ms,
            }
        )
    )
