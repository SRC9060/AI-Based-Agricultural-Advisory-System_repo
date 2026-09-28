"""
ReleaseGuard Integration Module for Agri AI Backend.

Provides safe, non-blocking error capturing and lifecycle management
using the vendored ReleaseGuard Python SDK.

Key Guarantees:
- Safe startup: If RELEASEGUARD_API_KEY is missing, application starts normally.
- Fault tolerance: ReleaseGuard network/server outages never crash the Agri AI backend.
- Security: API keys and credentials in URLs are never logged or exposed.
- Non-blocking: Capture calls return in sub-millisecond time.
"""

import logging
import os
import sys
import urllib.parse
from pathlib import Path
from typing import Any, Optional

# Ensure the vendor directory is in sys.path so 'from releaseguard_sdk import ...' works directly
_VENDOR_DIR = str(Path(__file__).resolve().parent / "vendor")
if _VENDOR_DIR not in sys.path:
    sys.path.insert(0, _VENDOR_DIR)

logger = logging.getLogger("agri_backend.releaseguard")

try:
    import releaseguard_sdk
    from releaseguard_sdk import init as _sdk_init
    from releaseguard_sdk import capture_exception as _sdk_capture_exception
    from releaseguard_sdk import capture_message as _sdk_capture_message
    from releaseguard_sdk import flush as _sdk_flush
    from releaseguard_sdk import shutdown as _sdk_shutdown
    from releaseguard_sdk import get_client as _sdk_get_client
    _SDK_AVAILABLE = True
except ImportError as err:
    _SDK_AVAILABLE = False
    logger.warning("ReleaseGuard SDK is not importable from vendor directory: %s", err)
    releaseguard_sdk = None

_IS_INITIALIZED = False


def _sanitize_url(url: str) -> str:
    """
    Strips username:password from a URL string before logging.
    """
    if not url:
        return ""
    try:
        parsed = urllib.parse.urlsplit(url)
        if parsed.password or parsed.username:
            netloc = parsed.hostname or ""
            if parsed.port:
                netloc = f"{netloc}:{parsed.port}"
            return urllib.parse.urlunsplit(
                (parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment)
            )
        return url
    except Exception:
        return "[sanitized-url]"


def is_releaseguard_enabled() -> bool:
    """
    Returns True if the ReleaseGuard SDK is installed, configured, and active.
    """
    global _IS_INITIALIZED
    return _IS_INITIALIZED and _SDK_AVAILABLE


def init_releaseguard(force: bool = False) -> bool:
    """
    Initializes ReleaseGuard SDK using environment variables:
      - RELEASEGUARD_API_KEY (required to activate; if missing, stays disabled safely)
      - RELEASEGUARD_ENDPOINT (base URL of ReleaseGuard backend, default: http://127.0.0.1:8000)
      - RELEASEGUARD_ENVIRONMENT (e.g., development, staging, production)
      - RELEASEGUARD_RELEASE (version/git sha of backend)
      - RELEASEGUARD_PROJECT_ID (integer project ID, default: 1)

    Returns:
      bool: True if successfully initialized, False otherwise.
    """
    global _IS_INITIALIZED

    if _IS_INITIALIZED and not force:
        return True

    if not _SDK_AVAILABLE:
        logger.info("ReleaseGuard SDK unavailable; error capturing disabled.")
        _IS_INITIALIZED = False
        return False

    api_key = (os.getenv("RELEASEGUARD_API_KEY") or "").strip()
    if not api_key:
        logger.info("ReleaseGuard disabled: RELEASEGUARD_API_KEY is not set.")
        _IS_INITIALIZED = False
        return False

    raw_endpoint = (
        os.getenv("RELEASEGUARD_ENDPOINT")
        or "http://127.0.0.1:8000"
    ).strip()

    # Normalize endpoint: SDK appends /api/v1/projects/{project_id}/events
    endpoint = raw_endpoint
    if endpoint.endswith("/api/v1"):
        endpoint = endpoint[:-7]
    elif endpoint.endswith("/api/v1/"):
        endpoint = endpoint[:-8]
    endpoint = endpoint.rstrip("/")

    environment = (
        os.getenv("RELEASEGUARD_ENVIRONMENT")
        or os.getenv("ENVIRONMENT")
        or ("production" if os.getenv("RENDER") else "development")
    ).strip()

    release = (os.getenv("RELEASEGUARD_RELEASE") or "1.0.0").strip()

    try:
        project_id = int(os.getenv("RELEASEGUARD_PROJECT_ID", "1"))
    except ValueError:
        project_id = 1

    sanitized_url = _sanitize_url(endpoint)

    try:
        _sdk_init(
            project_id=project_id,
            base_url=endpoint,
            api_key=api_key,
            release=release,
            environment=environment,
            timeout=float(os.getenv("RELEASEGUARD_TIMEOUT", "5.0")),
            max_retries=int(os.getenv("RELEASEGUARD_MAX_RETRIES", "3")),
        )
        _IS_INITIALIZED = True
        logger.info(
            "ReleaseGuard SDK initialized successfully (project_id=%d, endpoint=%s, env=%s, release=%s)",
            project_id,
            sanitized_url,
            environment,
            release,
        )
        return True
    except Exception as init_err:
        _IS_INITIALIZED = False
        logger.warning(
            "ReleaseGuard SDK initialization encountered an error (application continues safely): %s",
            init_err,
        )
        return False


def capture_releaseguard_exception(exc_info: Any = None) -> None:
    """
    Safely captures an exception and hands it off to ReleaseGuard.
    GUARANTEE: This function NEVER raises an exception back to the caller,
    regardless of network state or internal errors.
    """
    if not is_releaseguard_enabled():
        return

    try:
        _sdk_capture_exception(exc_info=exc_info)
    except Exception as err:
        # Host application stability must never be compromised
        logger.debug("Failed to capture exception to ReleaseGuard (ignored safely): %s", err)


def capture_releaseguard_message(message: str) -> None:
    """
    Safely captures an informational message to ReleaseGuard.
    GUARANTEE: Never raises an exception back to the caller.
    """
    if not is_releaseguard_enabled():
        return

    try:
        _sdk_capture_message(message=message)
    except Exception as err:
        logger.debug("Failed to capture message to ReleaseGuard (ignored safely): %s", err)


def flush_releaseguard(timeout: float = 2.0) -> bool:
    """
    Flushes queued events. Safe and non-crashing.
    """
    if not is_releaseguard_enabled():
        return True
    try:
        return bool(_sdk_flush(timeout=timeout))
    except Exception:
        return False


def shutdown_releaseguard(timeout: float = 1.5) -> None:
    """
    Flushes and cleanly shuts down ReleaseGuard background worker.
    """
    global _IS_INITIALIZED
    if not is_releaseguard_enabled():
        _IS_INITIALIZED = False
        return
    try:
        _sdk_shutdown(timeout=timeout)
    except Exception as err:
        logger.debug("ReleaseGuard shutdown error (ignored safely): %s", err)
    finally:
        _IS_INITIALIZED = False
