import base64
import hashlib
import hmac
import json
import secrets
import time

from config import Config


PASSWORD_SCHEME = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 260_000


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return (
        f"{PASSWORD_SCHEME}${PASSWORD_ITERATIONS}$"
        f"{_encode(salt)}${_encode(digest)}"
    )


def password_is_hashed(value: str) -> bool:
    return value.startswith(f"{PASSWORD_SCHEME}$")


def verify_password(password: str, stored_password: str) -> bool:
    # Existing development databases used plain-text passwords. Successful
    # legacy logins are upgraded to PBKDF2 by the login endpoint.
    if not password_is_hashed(stored_password):
        return hmac.compare_digest(password, stored_password)

    try:
        _, iterations, encoded_salt, encoded_digest = stored_password.split(
            "$", 3
        )
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            _decode(encoded_salt),
            int(iterations),
        )
        return hmac.compare_digest(digest, _decode(encoded_digest))
    except (TypeError, ValueError):
        return False


def create_access_token(user_id: int) -> str:
    now = int(time.time())
    payload = {
        "sub": int(user_id),
        "iat": now,
        "exp": now + Config.AUTH_TOKEN_TTL_SECONDS,
    }
    encoded_payload = _encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode(
            "utf-8"
        )
    )
    signature = hmac.new(
        Config.AUTH_SECRET_KEY.encode("utf-8"),
        encoded_payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{encoded_payload}.{_encode(signature)}"


def decode_access_token(token: str) -> int:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
        expected_signature = hmac.new(
            Config.AUTH_SECRET_KEY.encode("utf-8"),
            encoded_payload.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(
            expected_signature,
            _decode(encoded_signature),
        ):
            raise ValueError("Invalid token signature")

        payload = json.loads(_decode(encoded_payload))
        if int(payload["exp"]) < int(time.time()):
            raise ValueError("Token expired")
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise ValueError("Invalid or expired access token") from error
