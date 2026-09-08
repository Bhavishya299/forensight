"""
Security primitives.

- Password hashing/verification: bcrypt (never SHA-256 for passwords).
- JWT access/refresh tokens: PyJWT HS256, short-lived access tokens.
- At-rest field encryption: Fernet (AES-128-CBC + HMAC) from `FERNET_KEY`.
- Opaque refresh tokens are stored SHA-256 hashed, never plaintext.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from cryptography.fernet import Fernet, InvalidToken

from config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str | int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str | int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "jti": secrets.token_urlsafe(24),
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_type: str | None = None) -> dict:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    if expected_type and payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Unexpected token type")
    return payload


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def token_expiry(exp_days: int) -> datetime:
    return datetime.utcnow() + timedelta(days=exp_days)


def random_token() -> str:
    return secrets.token_urlsafe(48)


# ------------------------------------------------------------------
# At-rest field encryption (Fernet)
# ------------------------------------------------------------------


def _cipher() -> Fernet:
    key = settings.FERNET_KEY or ""
    try:
        return Fernet(key.encode("ascii"))
    except Exception:
        raise RuntimeError("FERNET_KEY is missing or invalid. Check backend/.env.")


def encrypt_text(plain: str | None) -> str | None:
    if plain is None:
        return None
    return _cipher().encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_text(token: str | None) -> str | None:
    if not token:
        return None
    try:
        return _cipher().decrypt(token.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        return None


def encrypt_json(obj) -> str | None:
    """Serialize and encrypt a JSON-serializable object."""
    if obj is None:
        return None
    import json

    return _cipher().encrypt(json.dumps(obj, default=str).encode("utf-8")).decode("utf-8")


def decrypt_json(token: str | None):
    """Decrypt and parse a Fernet-encrypted JSON value. Never raises."""
    if not token:
        return {}
    import json

    try:
        text = _cipher().decrypt(token.encode("utf-8")).decode("utf-8")
        return json.loads(text)
    except Exception:
        return {}