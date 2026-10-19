"""
utils/rate_limiter.py

Simple in-memory sliding-window limiter, used as a dependency:
    @router.post("/login", dependencies=[Depends(RateLimiter(5, 60))])

LIMITATION: state lives in one process. With several workers/servers use
Redis (or the `slowapi` package). Fine for dev and a single instance.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.exceptions import AppException


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def __call__(self, request: Request) -> None:
        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.max_requests:
                raise AppException(
                    "Too many requests. Please try again later.",
                    error_code="RATE_LIMITED",
                    status_code=429,
                )
            hits.append(now)
