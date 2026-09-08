"""Pydantic request/response schemas.

Response payloads are additionally shaped as plain dictionaries in the
route layer so they match the frontend's exact property names (e.g. the
`mockAlerts` / `caseStore` contracts). These schemas cover validation of
incoming request bodies.
"""

from typing import Any, Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    loginId: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class RefreshRequest(BaseModel):
    refreshToken: str


class LogoutRequest(BaseModel):
    refreshToken: str


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)


class AccessRequestIn(BaseModel):
    loginId: str = Field(min_length=3, max_length=64)
    fullName: str = Field(min_length=1, max_length=128)
    department: str = Field(min_length=1, max_length=128)
    email: Optional[str] = Field(default=None, max_length=255)
    password: str = Field(min_length=8, max_length=256)
    justification: Optional[str] = Field(default=None, max_length=2000)


class CaseCreateIn(BaseModel):
    number: str = Field(min_length=1, max_length=16)
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default="", max_length=4000)
    status: Optional[str] = Field(default="Active", max_length=32)
    priority: Optional[str] = Field(default="Medium", max_length=16)
    owner: Optional[str] = Field(default=None, max_length=128)
    tags: Optional[list[str]] = Field(default_factory=list)


class EvidenceJsonIn(BaseModel):
    id: Optional[str] = Field(default=None, max_length=64)
    type: str = Field(min_length=1, max_length=64)
    source: str = Field(min_length=1, max_length=32)
    description: str = Field(min_length=1, max_length=2000)
    status: Optional[str] = Field(default="Ready for analysis", max_length=32)
    addedAt: Optional[str] = Field(default=None, max_length=32)
    addedBy: Optional[str] = Field(default=None, max_length=128)
    details: Optional[dict[str, Any]] = Field(default_factory=dict)


class AlertStatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=32)


class AnalystNote(BaseModel):
    note: str = Field(min_length=1, max_length=4000)


class AccessRequestDecision(BaseModel):
    decision: str = Field(pattern="^(approve|deny)$")