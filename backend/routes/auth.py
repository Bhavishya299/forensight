"""Authentication routes: login, refresh, logout, me, forgot-password.

Security model
--------------
- bcrypt password hashes (never SHA-256 for passwords).
- Short-lived JWT access tokens (HS256).
- Opaque refresh tokens stored SHA-256-hashed at rest, rotated on use.
- Login lockout: consecutive failures are counted per user; after
  LOGIN_FAILURE_LIMIT attempts the account is temporarily locked.
- forgot-password always returns the same message (no account enumeration).
- Every mutating action is written to the append-only audit hash chain.
"""

from datetime import datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
from dependencies import get_client_ip, get_current_user, get_user_agent, limiter
from models import RefreshToken, User
from schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
)
from security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    token_expiry,
    verify_password,
)
from services.audit_service import record_audit

settings = get_settings()

router = APIRouter(prefix="/api/auth", tags=["auth"])

ROLE_LABEL = {
    "INVESTIGATOR": "Investigator",
    "ANALYST": "Analyst",
    "ADMIN": "Administrator",
}


def user_payload(user: User) -> dict:
    name = user.name or "User"
    initials = "".join(p[0] for p in name.split() if p)[:2].upper() or "US"
    return {
        "id": user.id,
        "loginId": user.login_id,
        "name": name,
        "email": user.email,
        "department": user.department,
        "role": user.role,
        "roleLabel": ROLE_LABEL.get(user.role, user.role),
        "initials": initials,
        "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
    }


def token_payload(user: User) -> dict:
    access = create_access_token(user.id, user.role)
    raw_refresh = create_refresh_token(user.id)
    return {
        "accessToken": access,
        "refreshToken": raw_refresh,
        "tokenType": "Bearer",
        "expiresIn": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_payload(user),
    }


def _persist_refresh_token(db: Session, user: User, raw: str, request: Request) -> RefreshToken:
    row = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw),
        expires_at=token_expiry(settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _find_user(db: Session, login_id: str) -> User | None:
    return (
        db.query(User)
        .filter(func.lower(User.login_id) == login_id.strip().lower())
        .first()
    )


def _locked_until(user: User) -> datetime | None:
    if user.locked_until and user.locked_until > datetime.utcnow():
        return user.locked_until
    return None


@router.post("/login", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    user = _find_user(db, body.loginId)
    if user is None:
        record_audit(
            db,
            user=None,
            action="LOGIN_FAILED",
            target=body.loginId,
            detail="Invalid credentials.",
            status="FAILED",
            request=request,
        )
        return _invalid_credentials()

    if not user.is_active:
        record_audit(
            db,
            user=user,
            action="LOGIN_FAILED",
            target=user.login_id,
            detail="Account disabled.",
            status="FAILED",
            request=request,
        )
        return _invalid_credentials()

    locked = _locked_until(user)
    if locked is not None:
        remaining = int(max(1, (locked - datetime.utcnow()).total_seconds() // 60))
        record_audit(
            db,
            user=user,
            action="LOGIN_FAILED",
            target=user.login_id,
            detail=f"Account temporarily locked for {remaining} minute(s).",
            status="FAILED",
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Too many failed attempts. Account locked for {remaining} minute(s).",
        )

    if not verify_password(body.password, user.password_hash):
        user.failed_attempts = (user.failed_attempts or 0) + 1
        if user.failed_attempts >= settings.LOGIN_FAILURE_LIMIT:
            user.locked_until = datetime.utcnow() + timedelta(
                minutes=settings.LOGIN_LOCKOUT_MINUTES
            )
        record_audit(
            db,
            user=user,
            action="LOGIN_FAILED",
            target=user.login_id,
            detail=(
                "Invalid password."
                if user.locked_until is None
                else f"Invalid password. Account locked for {settings.LOGIN_LOCKOUT_MINUTES} minute(s)."
            ),
            status="FAILED",
            request=request,
        )
        db.add(user)
        db.commit()
        locked_now = _locked_until(user)
        if locked_now is not None:
            remaining = int(max(1, (locked_now - datetime.utcnow()).total_seconds() // 60))
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Too many failed attempts. Account locked for {remaining} minute(s).",
            )
        return _invalid_credentials()

    # Success: clear lockout state and record attempts.
    user.failed_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    db.add(user)
    db.commit()

    response = token_payload(user)
    raw_refresh = response["refreshToken"]
    _persist_refresh_token(db, user, raw_refresh, request)

    record_audit(
        db,
        user=user,
        action="LOGIN",
        target=user.login_id,
        detail="Authenticated successfully.",
        request=request,
    )
    return response


@router.post("/refresh", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
def refresh(
    request: Request,
    body: RefreshRequest,
    db: Session = Depends(get_db),
):
    raw = body.refreshToken
    try:
        payload = decode_token(raw, expected_type="refresh")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired. Sign in again.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    user_id = int(payload.get("sub", "0"))
    token_hash = hash_token(raw)
    row = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash, RefreshToken.user_id == user_id)
        .first()
    )
    if row is None or row.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token no longer valid. Sign in again.")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account unavailable.")

    # Rotate: revoke the presented token, issue a fresh pair.
    row.revoked = True
    db.add(row)
    db.commit()

    response = token_payload(user)
    _persist_refresh_token(db, user, response["refreshToken"], request)

    record_audit(
        db,
        user=user,
        action="TOKEN_REFRESHED",
        target=user.login_id,
        detail="Refresh token rotated.",
        request=request,
    )
    return response


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    body: LogoutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hash_token(body.refreshToken))
        .first()
    )
    if row is not None and row.user_id == user.id:
        row.revoked = True
        db.add(row)
        db.commit()
    record_audit(
        db,
        user=user,
        action="LOGOUT",
        target=user.login_id,
        detail="Session revoked.",
        status="SUCCESS",
    )
    return {"ok": True, "message": "Signed out."}


@router.get("/me", status_code=status.HTTP_200_OK)
def me(
    request: Request,
    user: User = Depends(get_current_user),
):
    return user_payload(user)


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    # Generic response regardless of whether the account exists —
    # identical wording prevents account enumeration.
    record_audit(
        db,
        user=None,
        action="FORGOT_PASSWORD_REQUESTED",
        detail="Password reset instructions requested.",
        status="SUCCESS",
        request=request,
    )
    return {
        "message": "If an account exists for that identifier, password reset instructions have been sent.",
    }


def _invalid_credentials():
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email/username or password. Please verify your credentials and try again.",
        headers={"WWW-Authenticate": "Bearer"},
    )