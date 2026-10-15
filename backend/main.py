import asyncio
import contextlib
import hmac
import logging
import threading
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from backend import auth, diagnosis, knowledge, monitoring, resolution
from backend.config import Settings, get_settings
from backend.db import session_factory
from backend.incidents import ingest, resolve
from backend.models import (
    Approval,
    Asset,
    AuditEvent,
    DiagnosisRun,
    Evidence,
    Incident,
    MonitoringEvent,
    Service,
    now,
)
from backend.schemas import (
    ApprovalDecision,
    ApprovalInput,
    EventInput,
    IncidentUpdate,
    SearchInput,
)
from backend.security import audit

logger = logging.getLogger("aiops")
bearer = HTTPBearer(auto_error=False)


def record(row) -> dict:
    return {column.name: getattr(row, column.name) for column in row.__table__.columns}


def create_app(settings: Settings | None = None, factory=None) -> FastAPI:
    settings = settings or get_settings()
    factory = factory or session_factory(settings)
    cycle_lock = threading.Lock()
    runtime = {"last_cycle_at": None, "last_error": None}

    def cycle() -> None:
        if not cycle_lock.acquire(blocking=False):
            return
        try:
            with factory() as session:
                if settings.monitor_enabled:
                    monitoring.poll(session, settings)
                diagnosis.process_one(session, settings)
            runtime.update(last_cycle_at=now().isoformat(), last_error=None)
        except Exception as exc:
            runtime["last_error"] = type(exc).__name__
            logger.error("Operations cycle failed: %s", type(exc).__name__)
        finally:
            cycle_lock.release()

    async def background() -> None:
        while True:
            await asyncio.to_thread(cycle)
            await asyncio.sleep(settings.monitor_interval)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        with factory() as session:
            monitoring.seed_inventory(session)
            knowledge.seed(session)
            # Single API process is a documented deployment requirement. Never replay writes.
            session.execute(
                update(DiagnosisRun)
                .where(DiagnosisRun.status == "running")
                .values(
                    status="failed",
                    error="Interrupted by backend restart",
                    finished_at=now(),
                )
            )
            session.execute(
                update(Approval)
                .where(Approval.status == "executing")
                .values(
                    status="failed",
                    result={"message": "Interrupted; verify target manually"},
                )
            )
            audit(session, "system", "backend.started", "control-plane")
            session.commit()
        task = asyncio.create_task(background()) if settings.monitor_enabled else None
        yield
        if task:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

    app = FastAPI(
        title="AIOps Agent",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url=None,
    )
    app.state.factory = factory
    app.state.settings = settings
    app.state.cycle = cycle
    app.include_router(auth.router(factory, settings))

    @app.middleware("http")
    async def request_limits(request: Request, call_next):
        if request.method in {"POST", "PATCH", "PUT"}:
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 128_000:
                    return JSONResponse(
                        {"error": {"code": 413, "message": "Body too large"}}, status_code=413
                    )
            request._body = bytes(body)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        if exc.status_code in {401, 403, 409}:
            with factory() as session:
                audit(
                    session,
                    "request",
                    "request.denied",
                    request.url.path,
                    {"status": exc.status_code},
                )
                session.commit()
        return JSONResponse(
            {"error": {"code": exc.status_code, "message": exc.detail}}, status_code=exc.status_code
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Do not echo rejected input values (they may contain credentials).
        errors = [
            {"field": ".".join(map(str, e["loc"])), "message": e["msg"]} for e in exc.errors()
        ]
        return JSONResponse(
            {"error": {"code": 422, "message": "Validation failed", "fields": errors}},
            status_code=422,
        )

    def authorize(credentials, key):
        if not credentials or not hmac.compare_digest(credentials.credentials, key):
            raise HTTPException(401, "Valid bearer token required")

    def operator(
        request: Request,
        credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    ):
        if credentials:
            authorize(credentials, settings.api_token)
        else:
            with factory() as session:
                item = auth.require_browser(session, request)
                request.state.username = session.get(auth.User, item.user_id).username

    def ingestion(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
        authorize(credentials, settings.ingest_token)

    def db():
        with factory() as session:
            yield session

    Db = Annotated[Session, Depends(db)]
    protected = [Depends(operator)]

    def required(session, model, ident):
        item = session.get(model, ident)
        if not item:
            raise HTTPException(404, "Resource not found")
        return item

    @app.get("/api/health/live")
    def live():
        return {"status": "alive"}

    @app.get("/api/health/ready")
    def ready(session: Db):
        session.execute(select(1))
        return {"status": "ready"}

    @app.get("/api/overview", dependencies=protected)
    def overview(session: Db):
        all_count = session.scalar(select(func.count()).select_from(Incident))
        active = session.scalar(
            select(func.count()).select_from(Incident).where(Incident.status != "resolved")
        )
        return {
            "incidents_total": all_count,
            "incidents_active": active,
            "incidents_resolved": all_count - active,
            "pending_approvals": session.scalar(
                select(func.count()).select_from(Approval).where(Approval.status == "pending")
            ),
            "diagnosis_provider": settings.diagnosis_provider,
            "execution_enabled": settings.enable_lab_execution,
            "knowledge_mode": "qdrant-lexical-hash" if settings.qdrant_url else "lexical",
            "monitor_enabled": settings.monitor_enabled,
            "runtime": runtime,
        }

    @app.get("/api/assets", dependencies=protected)
    def assets(session: Db):
        return [record(row) for row in session.scalars(select(Asset))]

    @app.get("/api/services", dependencies=protected)
    def services(session: Db):
        return [record(row) for row in session.scalars(select(Service))]

    @app.post("/api/monitoring/events", dependencies=[Depends(ingestion)])
    def event(payload: EventInput, session: Db):
        if payload.source == "test" and payload.source_kind != "simulation":
            raise HTTPException(422, "Test events must be marked simulation")
        asset = required(session, Asset, payload.asset_id)
        service = required(session, Service, payload.service_id)
        if not asset.enabled or service.asset_id != asset.id:
            raise HTTPException(403, "Target is not allowed")
        return ingest(session, payload, settings.diagnosis_provider)

    @app.get("/api/incidents", dependencies=protected)
    def incidents(
        session: Db,
        status: str | None = None,
        limit: int = Query(50, ge=1, le=200),
        offset: int = Query(0, ge=0),
    ):
        query = select(Incident)
        if status:
            query = query.where(Incident.status == status)
        return [
            record(row)
            for row in session.scalars(
                query.order_by(Incident.created_at.desc()).limit(limit).offset(offset),
            )
        ]

    @app.get("/api/incidents/{ident}", dependencies=protected)
    def detail(ident: str, session: Db):
        item = record(required(session, Incident, ident))
        item["evidence"] = [
            record(row)
            for row in session.scalars(
                select(Evidence)
                .where(Evidence.incident_id == ident)
                .order_by(Evidence.collected_at),
            )
        ]
        item["diagnoses"] = [
            record(row)
            for row in session.scalars(
                select(DiagnosisRun)
                .where(DiagnosisRun.incident_id == ident)
                .order_by(DiagnosisRun.created_at.desc()),
            )
        ]
        incident = required(session, Incident, ident)
        # Initial evidence keeps the actual event timestamp, including delayed ingestion.
        initial = next((e["data"] for e in item["evidence"] if "observed_at" in e["data"]), None)
        key = f"{incident.source_kind}:{incident.asset_id}:{incident.service_id}:{incident.check}"
        previous = None
        if initial:
            previous = session.scalar(
                select(MonitoringEvent)
                .where(
                    MonitoringEvent.correlation_key == key,
                    MonitoringEvent.state == "recovery",
                    MonitoringEvent.incident_id.is_distinct_from(ident),
                    MonitoringEvent.observed_at < datetime.fromisoformat(initial["observed_at"]),
                )
                .order_by(MonitoringEvent.observed_at.desc())
                .limit(1)
            )
        approvals = list(session.scalars(select(Approval).where(Approval.incident_id == ident)))
        actions = list(
            session.scalars(
                select(AuditEvent)
                .where(AuditEvent.target.in_([ident, *(a.id for a in approvals)]))
                .order_by(AuditEvent.created_at.desc(), AuditEvent.id)
                .limit(200)
            )
        )
        monitoring_closed = any(
            a.action == "incident.resolved" and a.actor == "monitoring" for a in actions
        )
        recovery = None
        if monitoring_closed:
            recovery = session.scalar(
                select(MonitoringEvent)
                .where(
                    MonitoringEvent.incident_id == ident,
                    MonitoringEvent.state == "recovery",
                    MonitoringEvent.observed_at > incident.last_seen_at,
                )
                .order_by(MonitoringEvent.observed_at)
                .limit(1)
            )
        item["story"] = {
            "previous": record(previous) if previous else None,
            "recovery": record(recovery) if recovery else None,
            "approvals": [record(a) for a in approvals],
            "actions": [record(a) for a in reversed(actions)],
            "actions_limit": 200,
        }
        return item

    @app.patch("/api/incidents/{ident}", dependencies=protected)
    def change(ident: str, payload: IncidentUpdate, session: Db):
        item = required(session, Incident, ident)
        if item.status == "resolved":
            raise HTTPException(
                409, "Resolved incidents are immutable; a new failure opens a new one"
            )
        if payload.status == "resolved":
            resolve(session, item, payload.note, "operator")
        else:
            item.status = payload.status
            audit(session, "operator", "incident.investigating", item.id, {"note": payload.note})
        session.commit()
        return record(item)

    @app.post("/api/incidents/{ident}/diagnoses", dependencies=protected, status_code=202)
    def queue(ident: str, session: Db):
        required(session, Incident, ident)
        running = session.scalar(
            select(DiagnosisRun).where(
                DiagnosisRun.incident_id == ident,
                DiagnosisRun.status.in_(["queued", "running"]),
            )
        )
        if running:
            raise HTTPException(409, "Diagnosis already queued or running")
        item = DiagnosisRun(incident_id=ident, provider=settings.diagnosis_provider)
        session.add(item)
        session.flush()
        audit(session, "operator", "diagnosis.queued", item.id)
        session.commit()
        return record(item)

    @app.post("/api/operations/cycle", dependencies=protected)
    async def run_cycle():
        await asyncio.to_thread(cycle)
        return runtime

    @app.get("/api/approvals", dependencies=protected)
    def approvals(session: Db, limit: int = Query(100, ge=1, le=200)):
        return [
            record(row)
            for row in session.scalars(
                select(Approval).order_by(Approval.created_at.desc()).limit(limit),
            )
        ]

    @app.post("/api/approvals", dependencies=protected, status_code=201)
    def approval(payload: ApprovalInput, session: Db):
        return record(resolution.request_approval(session, payload, settings))

    @app.post("/api/approvals/{ident}/decision", dependencies=protected)
    def decision(ident: str, payload: ApprovalDecision, session: Db):
        return record(resolution.decide(session, ident, payload.decision))

    @app.post("/api/approvals/{ident}/execute", dependencies=protected)
    def execution(ident: str, session: Db):
        return record(resolution.execute(session, ident, settings))

    @app.post("/api/knowledge/search", dependencies=protected)
    def search(payload: SearchInput, session: Db):
        try:
            return knowledge.search(session, payload.query, settings.qdrant_url)
        except Exception:
            raise HTTPException(503, "Knowledge index unavailable") from None

    @app.get("/api/audit-events", dependencies=protected)
    def audit_events(
        session: Db, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)
    ):
        return [
            record(row)
            for row in session.scalars(
                select(AuditEvent)
                .order_by(AuditEvent.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ]

    return app
