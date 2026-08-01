import os
import secrets
import threading
import time
from collections import defaultdict, deque
from hashlib import sha256

from fastapi import Header, HTTPException, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
try:
    from redis.asyncio import Redis
except ImportError:
    Redis = None

load_dotenv()

RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "30"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_TRUST_PROXY = os.getenv("RATE_LIMIT_TRUST_PROXY", "false").lower() == "true"
REDIS_URL = os.getenv("REDIS_URL", "").strip()
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")

_request_times = defaultdict(deque)
_rate_lock = threading.Lock()
_redis = Redis.from_url(REDIS_URL, decode_responses=True) if (REDIS_URL and Redis is not None) else None

_RATE_LIMITED_PREFIXES = (
    "/chat",
    "/speech-to-text",
    "/speak",
    "/translate",
    "/schemes",
    "/weather",
    "/market",
    "/login",
    "/register",
)


def _client_identifier(request: Request) -> str:
    client = request.client.host if request.client else "unknown"
    if RATE_LIMIT_TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if forwarded:
            client = forwarded
    # Avoid putting a raw address into a shared Redis key.
    return sha256(client.encode("utf-8")).hexdigest()[:24]


def _local_rate_limited(client: str, now: float) -> bool:
    with _rate_lock:
        timestamps = _request_times[client]
        while timestamps and now - timestamps[0] > RATE_LIMIT_WINDOW_SECONDS:
            timestamps.popleft()
        if len(timestamps) >= RATE_LIMIT_REQUESTS:
            return True
        timestamps.append(now)
    return False


async def _distributed_rate_limited(client: str) -> bool | None:
    if _redis is None:
        return None
    bucket = int(time.time()) // RATE_LIMIT_WINDOW_SECONDS
    key = f"agriadvisor:rate:{client}:{bucket}"
    try:
        async with _redis.pipeline(transaction=True) as pipeline:
            pipeline.incr(key)
            pipeline.expire(key, RATE_LIMIT_WINDOW_SECONDS * 2)
            count, _ = await pipeline.execute()
        return int(count) > RATE_LIMIT_REQUESTS
    except Exception as error:
        # Keep the API available if Redis has a brief outage. The locked
        # in-process limiter remains safe for a single worker.
        print(f"Redis rate limiter unavailable; using local limiter: {error}")
        return None


async def enforce_rate_limit(request: Request, call_next):
    path = request.url.path
    if any(path == prefix or path.startswith(f"{prefix}/") for prefix in _RATE_LIMITED_PREFIXES):
        client = _client_identifier(request)
        limited = await _distributed_rate_limited(client)
        if limited is None:
            limited = _local_rate_limited(client, time.monotonic())
        if limited:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please wait a minute and try again."
                },
                headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)},
            )
    return await call_next(request)


def require_admin_key(x_admin_key: str = Header(default="")):
    if not ADMIN_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Admin access is not configured.",
        )
    if not secrets.compare_digest(x_admin_key, ADMIN_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid admin key.")
