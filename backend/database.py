"""SQLAlchemy engine, session factory and declarative base."""

from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import absolute_database_url, get_settings

settings = get_settings()

_ENGINE_URL = absolute_database_url(settings.DATABASE_URL)
if _ENGINE_URL.startswith("sqlite:"):
    # keep the directory on disk so sqlite files always resolve
    _DB_FILE = Path("forensight.db")
    if not _DB_FILE.is_absolute():
        _DB_FILE = Path(__file__).resolve().parent / _DB_FILE.name

engine = create_engine(
    _ENGINE_URL,
    connect_args={"check_same_thread": False} if _ENGINE_URL.startswith("sqlite:") else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine, autocommit=False, autoflush=False, expire_on_commit=False
)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Import models so all tables are registered on Base.metadata.
    from models import (  # noqa: F401
        AlertRecord,
        AuditLog,
        Case,
        CameraRecord,
        ContradictionRecord,
        EntityCaseRecord,
        EntityRecord,
        EventRecord,
        EvidenceRecord,
        GraphEdge,
        GraphNode,
        RefreshToken,
        User,
        AccessRequest,
        VehicleCorrelation,
        VehicleRecord,
        VehicleSighting,
        WeakLinkRecord,
    )

    Base.metadata.create_all(bind=engine)