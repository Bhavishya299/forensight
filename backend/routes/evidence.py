"""Evidence routes.

Two ingestion paths, both integrity-protected:

1. POST /api/cases/{case_id}/evidence  — JSON body, exactly what
   CreateCase.jsx sends: {id, type, source, description, status,
   addedAt, addedBy, details}. `addedAt` is a "YYYY-MM-DD HH:MM"
   string (never ISO) and `status` defaults to "Ready for analysis".
2. POST /api/cases/{case_id}/evidence/upload — multipart/form-data for
   the standalone Evidence screen (file + optional metadata fields).

On BOTH paths the SHA-256 is taken over the raw request bytes BEFORE any
parsing, and the raw bytes are persisted so verification re-hashes the
exact bytes that were ingested. Detail payloads are Fernet-encrypted into
`details_enc` (never stored in plaintext).
"""

import hashlib
import json
import re
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
from dependencies import get_current_user, require_roles
from models import Case, EvidenceRecord, User
from schemas import EvidenceJsonIn
from security import decrypt_json, encrypt_json
from services.audit_service import record_audit
from services.source_data import source_label

settings = get_settings()

router = APIRouter(prefix="/api/cases", tags=["evidence"])

WRITE_ROLES = require_roles("INVESTIGATOR", "ADMIN")
SAFE = re.compile(r"^[A-Za-z0-9_\-]+$")


def _now_stamp() -> str:
    now = datetime.utcnow()
    return now.strftime("%Y-%m-%d %H:%M")


def _ensure_case(db: Session, case_id: str) -> Case:
    row = db.query(Case).filter(Case.id == case_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    return row


def _safe_id(case_id: str, evidence_id: str) -> tuple[str, str]:
    case_dir, evid = str(case_id).strip(), str(evidence_id).strip()
    if not SAFE.match(case_dir) or not SAFE.match(evid):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid case or evidence identifier.",
        )
    return case_dir, evid


def _store_bytes(case_id: str, evidence_id: str, payload: bytes) -> str:
    case_dir, evid = _safe_id(case_id, evidence_id)
    target = settings.EVIDENCE_STORAGE_DIR / case_dir
    target.mkdir(parents=True, exist_ok=True)
    path = target / f"{evid}.bin"
    path.write_bytes(payload)
    return str(path.resolve())


def _next_evidence_id(db: Session, case_id: str, source: str) -> str:
    prefix = re.sub(r"[^A-Za-z0-9]", "", source or "").upper()[:3] or "SRC"
    rows = (
        db.query(EvidenceRecord.evidence_id)
        .filter(EvidenceRecord.case_id == case_id, EvidenceRecord.evidence_id.like(f"{prefix}-%"))
        .all()
    )
    max_seq = 0
    for (rid,) in rows:
        m = re.search(r"(\d+)$", rid)
        if m:
            max_seq = max(max_seq, int(m.group(1)))
    return f"{prefix}-{max_seq + 1:03d}"


def _refresh_case_counts(db: Session, case_id: str) -> None:
    case = _ensure_case(db, case_id)
    counts = (
        db.query(EvidenceRecord.source, func.count(EvidenceRecord.id))
        .filter(EvidenceRecord.case_id == case_id)
        .group_by(EvidenceRecord.source)
        .all()
    )
    case.record_count = sum(c for _, c in counts)
    case.source_count = len(counts)
    case.updated_at = _now_stamp()[:10]
    db.add(case)
    db.commit()


def evidence_payload(row: EvidenceRecord) -> dict:
    return {
        "id": row.evidence_id,
        "type": row.type,
        "source": row.source,
        "description": row.description or "",
        "status": row.status,
        "addedAt": row.added_at or "",
        "addedBy": row.added_by or "Bulk import",
        "sha256": row.sha256,
        "sizeBytes": row.size_bytes,
        "uploadedVia": row.uploaded_via,
        "verified": row.verified_at is not None,
        "hasDetails": bool(row.details_enc),
    }


def _insert_row(
    db: Session,
    *,
    case_id: str,
    evidence_id: str,
    etype: str,
    source: str,
    description: str,
    status_: str,
    added_at: str | None,
    added_by: str | None,
    details: dict,
    sha256: str,
    stored_path: str,
    content_type: str | None,
    size_bytes: int,
    original_filename: str | None,
    uploaded_via: str,
) -> EvidenceRecord:
    row = EvidenceRecord(
        case_id=case_id,
        evidence_id=evidence_id,
        type=etype,
        source=source,
        description=description,
        status=status_,
        added_at=added_at,
        added_by=added_by,
        details_enc=encrypt_json(details if details else {}),
        sha256=sha256,
        stored_path=stored_path,
        content_type=content_type,
        size_bytes=size_bytes,
        original_filename=original_filename,
        uploaded_via=uploaded_via,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _get_row_or_404(db: Session, case_id: str, evidence_id: str) -> EvidenceRecord:
    row = (
        db.query(EvidenceRecord)
        .filter(
            EvidenceRecord.case_id == case_id,
            EvidenceRecord.evidence_id == evidence_id,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence record not found.")
    return row


@router.get("/{case_id}/evidence", status_code=status.HTTP_200_OK)
def list_evidence(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _ensure_case(db, case_id)
    rows = (
        db.query(EvidenceRecord)
        .filter(EvidenceRecord.case_id == case_id)
        .order_by(EvidenceRecord.id.desc())
        .all()
    )
    return {"items": [evidence_payload(r) for r in rows], "total": len(rows)}


@router.get("/{case_id}/evidence/{evidence_id}", status_code=status.HTTP_200_OK)
def get_evidence(
    case_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = _get_row_or_404(db, case_id, evidence_id)
    payload = evidence_payload(row)
    payload["details"] = decrypt_json(row.details_enc) if row.details_enc else {}
    record_audit(
        db,
        user=user,
        action="EVIDENCE_VIEWED",
        target=row.evidence_id,
        detail=f"Evidence {row.evidence_id} viewed in case #{case_id}.",
        status="SUCCESS",
        metadata={"case_number": case_id},
    )
    return payload


@router.get("/{case_id}/evidence/{evidence_id}/verify", status_code=status.HTTP_200_OK)
def verify_evidence(
    case_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = _get_row_or_404(db, case_id, evidence_id)
    digest = row.sha256 or ""
    verified = False
    note = "No stored bytes for this record."
    if row.stored_path:
        try:
            path = row.stored_path
            if not __import__("os").path.isabs(path):
                from config import BASE_DIR

                path = str(BASE_DIR / path)
            with open(path, "rb") as fh:
                raw = fh.read()
            digest = hashlib.sha256(raw).hexdigest()
            verified = digest == (row.sha256 or "")
            note = "Hash matches ingested bytes." if verified else "Hash mismatch — bytes differ from ingestion time."
        except FileNotFoundError:
            # Fallback remains the stored digest (row.sha256 or ""), never a re-hash of the hash.
            note = "Stored bytes no longer present."

    if verified:
        row.verified_at = datetime.utcnow()
        db.add(row)
        db.commit()

    record_audit(
        db,
        user=user,
        action="EVIDENCE_VERIFIED",
        target=row.evidence_id,
        detail=f"{'Verified' if verified else 'Verification FAILED'} for {row.evidence_id}.",
        status="SUCCESS" if verified else "FAILED",
        metadata={"case_number": case_id},
    )
    return {
        "evidenceId": row.evidence_id,
        "caseId": case_id,
        "verified": verified,
        "sha256": digest,
        "matches": verified,
        "sizeBytes": row.size_bytes,
        "uploadedVia": row.uploaded_via,
        "note": note,
    }


@router.post("/{case_id}/evidence", status_code=status.HTTP_201_CREATED)
async def add_evidence_json(
    case_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(WRITE_ROLES),
):
    _ensure_case(db, case_id)
    raw = await request.body()
    if not raw:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Empty request body.")

    # Integrity anchor FIRST — hash the raw bytes before any parsing.
    sha256 = hashlib.sha256(raw).hexdigest()

    try:
        body = EvidenceJsonIn(**json.loads(raw.decode("utf-8")))
    except Exception:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Malformed JSON payload.")

    evidence_id = (body.id or "").strip() or _next_evidence_id(db, case_id, body.source)
    if body.id and db.query(EvidenceRecord).filter(
        EvidenceRecord.case_id == case_id, EvidenceRecord.evidence_id == body.id
    ).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Evidence {body.id} already exists in this case.")

    stored_path = _store_bytes(case_id, evidence_id, raw)
    row = _insert_row(
        db,
        case_id=case_id,
        evidence_id=evidence_id,
        etype=body.type,
        source=body.source,
        description=body.description,
        status_=body.status or "Ready for analysis",
        added_at=body.addedAt or _now_stamp(),
        added_by=body.addedBy,
        details=body.details or {},
        sha256=sha256,
        stored_path=stored_path,
        content_type="application/json",
        size_bytes=len(raw),
        original_filename=None,
        uploaded_via="json",
    )
    _refresh_case_counts(db, case_id)

    record_audit(
        db,
        user=user,
        action="EVIDENCE_UPLOADED",
        target=row.evidence_id,
        detail=f"Evidence {row.evidence_id} ingested ({row.source}, {row.size_bytes} bytes).",
        status="SUCCESS",
        metadata={"case_number": case_id},
    )

    return {"id": row.evidence_id, "caseId": case_id}


@router.post("/{case_id}/evidence/upload", status_code=status.HTTP_201_CREATED)
async def upload_evidence_file(
    case_id: str,
    file: UploadFile = File(...),
    source: str = Form(...),
    description: str = Form(""),
    status_: str = Form("Ready for analysis"),
    added_at: str = Form(""),
    added_by: str = Form(""),
    meta: str = Form("{}"),
    db: Session = Depends(get_db),
    user: User = Depends(WRITE_ROLES),
):
    _ensure_case(db, case_id)

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Uploaded file is empty.")
    if len(raw) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit.",
        )

    sha256 = hashlib.sha256(raw).hexdigest()
    try:
        details = json.loads(meta) if meta.strip() else {}
    except Exception:
        details = {}

    source = (source or "").strip()[:32]
    if not source:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Source is required.")
    description = (description or "").strip()[:2000]
    status_ = (status_ or "Ready for analysis").strip()[:32]
    added_at = (added_at or "").strip()[:32] or _now_stamp()
    added_by = (added_by or "").strip()[:128]

    evidence_id = _next_evidence_id(db, case_id, source)
    stored_path = _store_bytes(case_id, evidence_id, raw)
    row = _insert_row(
        db,
        case_id=case_id,
        evidence_id=evidence_id,
        etype=source_label(source),
        source=source,
        description=description,
        status_=status_,
        added_at=added_at,
        added_by=added_by,
        details=details,
        sha256=sha256,
        stored_path=stored_path,
        content_type=file.content_type,
        size_bytes=len(raw),
        original_filename=file.filename,
        uploaded_via="multipart",
    )
    _refresh_case_counts(db, case_id)

    record_audit(
        db,
        user=user,
        action="EVIDENCE_UPLOADED",
        target=row.evidence_id,
        detail=f"File {file.filename or row.evidence_id} ingested ({source}, {row.size_bytes} bytes).",
        status="SUCCESS",
        metadata={"case_number": case_id},
    )

    return {"id": row.evidence_id, "caseId": case_id, "filename": file.filename}