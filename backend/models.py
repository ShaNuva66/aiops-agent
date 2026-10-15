import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def now() -> datetime:
    return datetime.now(UTC)


def uid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Asset(Base):
    __tablename__ = "assets"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    scope: Mapped[str] = mapped_column(String(160))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class Service(Base):
    __tablename__ = "services"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"))
    name: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(32), default="unknown")
    failure_streak: Mapped[int] = mapped_column(Integer, default=0)
    latest: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"))
    service_id: Mapped[str] = mapped_column(ForeignKey("services.id"))
    check: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(200))
    severity: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(24), default="open")
    active_key: Mapped[str | None] = mapped_column(String(200), unique=True, nullable=True)
    source_kind: Mapped[str] = mapped_column(String(24))
    alert_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)


class MonitoringEvent(Base):
    __tablename__ = "monitoring_events"
    __table_args__ = (UniqueConstraint("source", "event_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    source: Mapped[str] = mapped_column(String(40))
    event_id: Mapped[str] = mapped_column(String(120))
    correlation_key: Mapped[str] = mapped_column(String(200), index=True)
    incident_id: Mapped[str | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    state: Mapped[str] = mapped_column(String(20))
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)


class Evidence(Base):
    __tablename__ = "evidence"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"), index=True)
    source: Mapped[str] = mapped_column(String(160))
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    data: Mapped[dict[str, Any]] = mapped_column(JSON)


class DiagnosisRun(Base):
    __tablename__ = "diagnosis_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="queued")
    provider: Mapped[str] = mapped_column(String(24))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    report: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(200))
    revision: Mapped[str] = mapped_column(String(64))


class Approval(Base):
    __tablename__ = "approvals"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"))
    runbook: Mapped[str] = mapped_column(String(80))
    target: Mapped[str] = mapped_column(String(80))
    parameters: Mapped[dict[str, Any]] = mapped_column(JSON)
    fingerprint: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(24), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    decided_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    actor: Mapped[str] = mapped_column(String(80))
    action: Mapped[str] = mapped_column(String(100))
    target: Mapped[str] = mapped_column(String(100))
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    username: Mapped[str] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    bootstrap_slot: Mapped[int] = mapped_column(Integer, unique=True, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class UserSession(Base):
    __tablename__ = "user_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    csrf_token: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
