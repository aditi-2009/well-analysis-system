"""
middleware/logging_middleware.py

Middleware to log all HTTP requests/responses.
"""

import logging
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Logs all HTTP requests and responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        """Log request and response."""
        start_time = time.time()

        # Log request
        logger.info(
            f"→ {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )

        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"✗ Request failed: {e}", exc_info=True)
            raise

        # Log response
        elapsed = time.time() - start_time
        elapsed_ms = int(elapsed * 1000)

        logger.info(
            f"← {response.status_code} {request.method} "
            f"{request.url.path} ({elapsed_ms}ms)"
        )

        return response
