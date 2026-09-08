"""FORENSIGHT FastAPI application entry point.

Security posture
----------------
- CORS is locked to the configured frontend origins (never ``*``).
- Cross-site privacy headers are pinned on every response.
- The slowapi rate limiter is mounted on ``app.state`` so registered routes
  (e.g. login, forgot-password) are enforced.
- Audit-tamper verification and evidence integrity endpoints are included.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import get_settings
from database import SessionLocal, init_db
from dependencies import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

settings = get_settings()

routers = [
    # Auth / access management (public where declared).
    "routes.auth",
    "routes.access_requests",
    "routes.admin",
    # Case data.
    "routes.cases",
    "routes.evidence",
    "routes.analysis",
    # Analytical surfaces.
    "routes.graph",
    "routes.timeline",
    "routes.alerts",
    "routes.contradictions",
    "routes.entities",
    "routes.vehicles",
    "routes.reports",
    "routes.audit",
    "routes.dashboard",
    "routes.search",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Cross-source forensics REST API with a tamper-evident audit trail.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
)

# --- Rate limiting: mount the shared limiter + its 429 handler. ----------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# --- App-level exception handling -----------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": True},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "error": True,
            "summary": "Request validation failed.",
        },
    )


# --- Middleware ----------------------------------------------------------
@app.middleware("http")
async def pin_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

trusted_hosts = settings.trusted_hosts_list
if trusted_hosts and trusted_hosts != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

# --- Route registration ---------------------------------------------------
from routes import (
    access_requests,
    admin,
    alerts,
    analysis,
    audit,
    auth,
    cases,
    contradictions,
    dashboard,
    entities,
    evidence,
    graph,
    reports,
    search,
    timeline,
    vehicles,
)

for module in routers:
    router = getattr(
        {
            "routes.auth": auth,
            "routes.access_requests": access_requests,
            "routes.admin": admin,
            "routes.cases": cases,
            "routes.evidence": evidence,
            "routes.analysis": analysis,
            "routes.graph": graph,
            "routes.timeline": timeline,
            "routes.alerts": alerts,
            "routes.contradictions": contradictions,
            "routes.entities": entities,
            "routes.vehicles": vehicles,
            "routes.reports": reports,
            "routes.audit": audit,
            "routes.dashboard": dashboard,
            "routes.search": search,
        }[module],
        "router",
    )
    app.include_router(router)


# --- Health / info ---------------------------------------------------------
@app.get("/api/v1/health")
def health():
    db_ok = False
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/api/v1/info")
def info():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "routes": len(app.routes),
    }