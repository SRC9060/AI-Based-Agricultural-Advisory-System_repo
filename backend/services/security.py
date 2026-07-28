import os
import secrets
import threading
import time
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "30"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")

_request_times = defaultdict(deque)
_rate_lock = threading.Lock()


async def enforce_rate_limit(request: Request, call_next):
    if request.url.path in {"/chat", "/speech-to-text", "/speak"}:
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        client = forwarded or (request.client.host if request.client else "unknown")
        now = time.monotonic()
        with _rate_lock:
            timestamps = _request_times[client]
            while timestamps and now - timestamps[0] > RATE_LIMIT_WINDOW_SECONDS:
                timestamps.popleft()
            if len(timestamps) >= RATE_LIMIT_REQUESTS:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please wait a minute and try again."
                    },
                )
            timestamps.append(now)
    return await call_next(request)


def require_admin_key(x_admin_key: str = Header(default="")):
    if not ADMIN_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Admin access is not configured.",
        )
    if not secrets.compare_digest(x_admin_key, ADMIN_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid admin key.")
