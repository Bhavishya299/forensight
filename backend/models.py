"""SQLAlchemy ORM models for the FORENSIGHT backend.

Design notes
------------
- `EvidenceRecord.details_enc` stores the sensitive field values Fernet-encrypted
  at rest. Only the ciphertext touches the database; decryption happens in the
  application layer with the key from `.env`.
- `AuditLog` carries `prev_hash` / `hash` forming an append-only, tamper-evident
  hash chain.
- Passwords are never stored in plaintext: only bcrypt hashes (`password_hash`).
"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    login_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="INVESTIGATOR")
    department = Column(String(128), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    failed_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    token_hash = Column(String(128), unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, nullable=False, default=False)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    login_id = Column(String(64), unique=True, nullable=False, index=True)
    full_name = Column(String(128), nullable=False)
    department = Column(String(128), nullable=False)
    email = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    justification = Column(Text, nullable=True)
    role = Column(String(32), nullable=False, default="INVESTIGATOR")
    status = Column(String(32), nullable=False, default="PENDING")
    decided_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Case(Base):
    __tablename__ = "cases"

    id = Column(String(16), primary_key=True)
    title = Column(String(255), nullable=False)
    status = Column(String(32), nullable=False, default="Active")
    priority = Column(String(16), nullable=False, default="Medium")
    description = Column(Text, nullable=False, default="")
    owner = Column(String(128), nullable=True)
    tags = Column(JSON, nullable=True, default=list)
    record_count = Column(Integer, nullable=False, default=0)
    source_count = Column(Integer, nullable=False, default=0)
    analysis_status = Column(String(32), nullable=False, default="Not analyzed")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(String(24), nullable=True)
    updated_at = Column(String(24), nullable=True)


class EvidenceRecord(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(16), ForeignKey("cases.id"), nullable=False, index=True)
    evidence_id = Column(String(64), nullable=False, index=True)
    type = Column(String(64), nullable=True)
    source = Column(String(32), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="Ready for analysis")
    added_at = Column(String(32), nullable=True)
    added_by = Column(String(128), nullable=True, default="Bulk import")
    details_enc = Column(Text, nullable=True)  # Fernet-encrypted JSON payload
    original_filename = Column(String(255), nullable=True)
    content_type = Column(String(128), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    sha256 = Column(String(64), nullable=True, index=True)
    stored_path = Column(String(512), nullable=True)
    uploaded_via = Column(String(16), nullable=False, default="json")
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EventRecord(Base):
    __tablename__ = "events"

    id = Column(String(64), primary_key=True)
    case_id = Column(String(16), ForeignKey("cases.id"), nullable=False, index=True)
    timestamp = Column(String(32), index=True)  # "2026-09-07 18:02"
    time = Column(String(16))  # "18:02" display label
    source = Column(String(32))
    event_type = Column(String(64))
    entity1 = Column(String(128))
    entity2 = Column(String(128))
    location = Column(String(128))
    description = Column(Text)
    evidence_id = Column(String(64))
    in_window = Column(Boolean, nullable=False, default=False)
    event_metadata = Column(JSON, nullable=True, default=dict)


class GraphNode(Base):
    __tablename__ = "graph_nodes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(16), ForeignKey("cases.id"), nullable=False, index=True)
    node_id = Column(String(64), nullable=False)
    type = Column(String(32), nullable=False)
    label = Column(String(128), nullable=False)
    position_x = Column(Float, nullable=False, default=0.0)
    position_y = Column(Float, nullable=False, default=0.0)
    related_records = Column(Integer, nullable=False, default=0)
    related_entities = Column(Integer, nullable=False, default=0)
    sources = Column(JSON, nullable=True, default=list)
    in_window = Column(Boolean, nullable=False, default=False)
    centrality = Column(Float, nullable=True)


class GraphEdge(Base):
    __tablename__ = "graph_edges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(16), ForeignKey("cases.id"), nullable=False, index=True)
    edge_id = Column(String(64), nullable=False)
    label = Column(String(64), nullable=True)
    relationship = Column(String(64), nullable=False)
    source_node_id = Column(String(64), nullable=False)
    target_node_id = Column(String(64), nullable=False)
    source_type = Column(String(32), nullable=False)
    source_types = Column(JSON, nullable=True, default=list)
    cross_source = Column(Boolean, nullable=False, default=False)
    timestamp = Column(String(16), nullable=True)
    evidence_ids = Column(JSON, nullable=True, default=list)
    note = Column(Text, nullable=True)
    via = Column(String(64), nullable=True)


class AlertRecord(Base):
    __tablename__ = "alerts"

    id = Column(String(32), primary_key=True)
    case_id = Column(String(16), ForeignKey("cases.id"), nullable=False, index=True)
    alert_type = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    severity = Column(String(16), nullable=False)
    status = Column(String(32), nullable=False, default="Requires review")
    description = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    timestamp = Column(String(32), nullable=True)
    entities = Column(JSON, nullable=True, default=list)
    evidence_ids = Column(JSON, nullable=True, default=list)
    primary_evidence = Column(String(64), nullable=True)
    source_types = Column(JSON, nullable=True, default=list)
    related_event_ids = Column(JSON, nullable=True, default=list)
    cross_source = Column(Boolean, nullable=False, default=False)
    confidence = Column(String(16), nullable=True)
    alert_metadata = Column(JSON, nullable=True, default=dict)


class ContradictionRecord(Base):
    __tablename__ = "contradictions"

    id = Column(String(32), primary_key=True)
    case_id = Column(String(16), ForeignKey("cases.id"), nullable=False, index=True)
    severity = Column(String(16), nullable=False)
    status = Column(String(32), nullable=False, default="Requires review")
    claimed_by = Column(String(128), nullable=True)
    claim = Column(Text, nullable=False)
    claimed_location = Column(String(128), nullable=True)
    start_time = Column(String(16), nullable=True)
    end_time = Column(String(16), nullable=True)
    claim_source = Column(String(64), nullable=True)
    independent_evidence = Column(JSON, nullable=True, default=list)
    evidence_ids = Column(JSON, nullable=True, default=list)
    entities = Column(JSON, nullable=True, default=list)
    assessment = Column(Text, nullable=True)
    sources = Column(JSON, nullable=True, default=list)


class EntityRecord(Base):
    __tablename__ = "entities"

    slug = Column(String(64), primary_key=True)
    id = Column(String(32), nullable=False)
    type = Column(String(32), nullable=False)
    label = Column(String(128), nullable=False)
    summary = Column(Text, nullable=True)
    status = Column(String(64), nullable=True)
    first_seen = Column(String(32), nullable=True)
    last_seen = Column(String(32), nullable=True)
    cases = Column(JSON, nullable=True, default=list)
    metrics = Column(JSON, nullable=True, default=dict)


class EntityCaseRecord(Base):
    __tablename__ = "entity_cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String(64), ForeignKey("entities.slug"), index=True)
    case_id = Column(String(16), ForeignKey("cases.id"), index=True)
    events = Column(Integer, nullable=False, default=0)
    evidence = Column(JSON, nullable=True, default=list)
    from_date = Column(String(32), nullable=True)
    to_date = Column(String(32), nullable=True)


class WeakLinkRecord(Base):
    __tablename__ = "weak_links"

    id = Column(String(32), primary_key=True)
    case_id = Column(String(16), ForeignKey("cases.id"), nullable=False, index=True)
    type_label = Column(String(64), nullable=False)
    confidence = Column(String(16), nullable=False)
    status = Column(String(32), nullable=False, default="Requires verification")
    entities = Column(JSON, nullable=True, default=list)
    entity_labels = Column(JSON, nullable=True, default=list)
    connection = Column(String(128), nullable=True)
    window = Column(String(64), nullable=True)
    activity_sequence = Column(JSON, nullable=True, default=list)
    supporting_evidence = Column(JSON, nullable=True, default=list)
    reason = Column(Text, nullable=True)
    interpretation = Column(Text, nullable=True)


class VehicleRecord(Base):
    __tablename__ = "vehicles"

    plate = Column(String(32), primary_key=True)
    type = Column(String(64), nullable=False)
    color = Column(String(32), nullable=False)
    confidence = Column(String(16), nullable=False)
    status = Column(String(64), nullable=False)
    first_seen = Column(String(16), nullable=False)
    last_seen = Column(String(16), nullable=False)
    duration_seconds = Column(Integer, nullable=False, default=0)


class CameraRecord(Base):
    __tablename__ = "cameras"

    id = Column(String(32), primary_key=True)
    sector = Column(String(64), nullable=False)
    area = Column(String(128), nullable=False)
    position_x = Column(Float, nullable=False, default=0.0)
    position_y = Column(Float, nullable=False, default=0.0)


class VehicleSighting(Base):
    __tablename__ = "vehicle_sightings"

    id = Column(String(64), primary_key=True)
    plate = Column(String(32), ForeignKey("vehicles.plate"), index=True)
    camera = Column(String(32), nullable=False)
    camera_name = Column(String(64), nullable=True)
    sector = Column(String(64), nullable=True)
    area = Column(String(128), nullable=True)
    location = Column(String(128), nullable=True)
    time = Column(String(16), nullable=False)
    time_short = Column(String(16), nullable=True)
    direction = Column(String(32), nullable=True)
    direction_short = Column(String(16), nullable=True)
    plate_confidence = Column(Float, nullable=True)
    match_confidence = Column(Float, nullable=True)
    evidence_id = Column(String(64), nullable=True)
    source = Column(String(16), nullable=False, default="CCTV")


class VehicleCorrelation(Base):
    __tablename__ = "vehicle_correlations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle = Column(String(32), ForeignKey("vehicles.plate"), index=True)
    source = Column(String(32), nullable=False)
    source_label = Column(String(64), nullable=True)
    detail = Column(Text, nullable=True)
    time = Column(String(16), nullable=True)
    sector = Column(String(128), nullable=True)
    evidence_id = Column(String(64), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(128), nullable=True)
    role = Column(String(32), nullable=True)
    action = Column(String(64), nullable=False, index=True)
    target = Column(String(255), nullable=True)
    detail = Column(Text, nullable=True)
    status = Column(String(16), nullable=False, default="SUCCESS")
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    timestamp = Column(String(32), nullable=True)
    audit_metadata = Column(JSON, nullable=True, default=dict)
    prev_hash = Column(String(64), nullable=False, default="")
    hash = Column(String(64), nullable=False, index=True)