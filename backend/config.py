"""
Application configuration.

Secrets are read from .env (python-dotenv via pydantic-settings) and are
NEVER hardcoded. If SECRET_KEY or FERNET_KEY are missing on first start
they are generated cryptographically and persisted into .env so any
restart of the process sees the same values.
"""

import re
import secrets
from functools import lru_cache
from pathlib import Path

from cryptography.fernet import Fernet
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"


def _ensure_secrets() -> None:
    """Fill missing secret-like vars into .env so they persist across runs."""
    contents = ""
    if ENV_FILE.exists():
        contents = ENV_FILE.read_text(encoding="utf-8")

    lines = contents.splitlines()
    present = set()
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, _ = stripped.partition("=")
        present.add(key.strip())

    additions = []
    if "SECRET_KEY" not in present:
        additions.append(f"SECRET_KEY={secrets.token_urlsafe(48)}")
    if "FERNET_KEY" not in present:
        additions.append(f"FERNET_KEY={Fernet.generate_key().decode('ascii')}")
    if "DATABASE_URL" not in present:
        additions.append("DATABASE_URL=sqlite:///forensight.db")

    if additions:
        with ENV_FILE.open("a", encoding="utf-8") as fh:
            fh.write("\n# --- auto-generated on first start ---\n")
            for line in additions:
                fh.write(line + "\n")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE), env_file_encoding="utf-8", extra="ignore"
    )

    APP_NAME: str = "FORENSIGHT Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    LOGIN_FAILURE_LIMIT: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    FERNET_KEY: str = ""
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'forensight.db'}"
    EVIDENCE_STORAGE_DIR: Path = BASE_DIR / "evidence_store"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    TRUSTED_HOSTS: str = "*"

    ANALYSIS_SLIDING_WINDOW_MINUTES: int = 20
    ANALYSIS_SLIDING_STEP_MINUTES: int = 10
    ANOMALY_ZSCORE_THRESHOLD: float = 2.0
    ANOMALY_BASELINE_AMOUNT: float = 100000.0
    ANOMALY_MODEL_PATH: str = str(BASE_DIR / "models" / "anomaly_scorer.pkl")

    MAX_UPLOAD_MB: int = 25

    @property
    def cors_origin_list(self) -> list[str]:
        value = self.CORS_ORIGINS
        if isinstance(value, str):
            return [x.strip() for x in value.split(",") if x.strip()]
        return list(value)

    @property
    def trusted_hosts_list(self) -> list[str]:
        value = self.TRUSTED_HOSTS
        if isinstance(value, str):
            return [x.strip() for x in value.split(",") if x.strip()]
        return list(value)


_ensure_secrets()


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Normalize dotted DATABASE_URL to an absolute file path.
def absolute_database_url(url: str) -> str:
    if url.startswith("sqlite:///"):
        path = url[len("sqlite:///"):]
        if not re.match(r"^[A-Za-z]:[\\/]", path) and not path.startswith("/"):
            return f"sqlite:///{(BASE_DIR / path).resolve()}"
    return url