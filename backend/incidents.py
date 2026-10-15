from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from backend.knowledge import index_incident
from backend.models import DiagnosisRun, Evidence, Incident, MonitoringEvent, now
from backend.schemas import EventInput
from backend.security import audit, redact


def utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def correlation(event: EventInput) -> str:
    # Simulations must never close, merge into, or suppress real incidents.
    return f"{event.source_kind}:{event.asset_id}:{event.service_id}:{event.check}"


def ingest(session, event: EventInput, provider: str) -> dict:
    if event.observed_at > now() + timedelta(minutes=1):
        raise HTTPException(422, "Event timestamp is in the future")
    for attempt in range(3):
        try:
            if session.get_bind().dialect.name == "postgresql":
                # Serialize both problem and recovery, including when no active row exists.
                session.execute(
                    text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
                    {"key": correlation(event)},
                )
            existing = session.scalar(
                select(MonitoringEvent).where(
                    MonitoringEvent.source == event.source,
                    MonitoringEvent.event_id == event.event_id,
                )
            )
            if existing:
                if existing.payload != redact(event.model_dump(mode="json")):
                    raise HTTPException(409, "Event ID was already used for a different payload")
                return {"incident_id": existing.incident_id, "duplicate": True, "ignored": False}
            key = correlation(event)
            latest = session.scalar(
                select(MonitoringEvent)
                .where(
                    MonitoringEvent.correlation_key == key,
                )
                .order_by(MonitoringEvent.observed_at.desc())
                .limit(1)
            )
            incident = session.scalar(
                select(Incident).where(Incident.active_key == key).with_for_update()
            )
            ignored = latest is not None and utc(event.observed_at) <= utc(latest.observed_at)
            record = MonitoringEvent(
                source=event.source,
                event_id=event.event_id,
                correlation_key=key,
                observed_at=event.observed_at,
                state=event.state,
                payload=redact(event.model_dump(mode="json")),
            )
            if not ignored:
                if event.state == "problem":
                    if incident:
                        incident.alert_count += 1
                        incident.last_seen_at = event.observed_at
                    else:
                        incident = Incident(
                            asset_id=event.asset_id,
                            service_id=event.service_id,
                            check=event.check,
                            title=f"{event.service_id}: {event.check} alert",
                            severity=event.severity,
                            active_key=key,
                            source_kind=event.source_kind,
                            last_seen_at=event.observed_at,
                        )
                        session.add(incident)
                        session.flush()
                        session.add(DiagnosisRun(incident_id=incident.id, provider=provider))
                        audit(session, "monitoring", "incident.created", incident.id)
                    # Limit evidence growth during a prolonged outage: keep initial + diagnosis
                    # snapshots; raw repeated events still have their own payloads.
                    if incident.alert_count == 1:
                        session.add(
                            Evidence(
                                incident_id=incident.id,
                                source=event.source,
                                data=redact(event.model_dump(mode="json")),
                            )
                        )
                elif incident:
                    resolve(session, incident, "Recovery observed by monitoring", "monitoring")
            record.incident_id = incident.id if incident else None
            session.add(record)
            session.commit()
            return {"incident_id": record.incident_id, "duplicate": False, "ignored": ignored}
        except IntegrityError:
            session.rollback()
            if attempt == 2:
                raise
    raise RuntimeError("Unreachable")


def resolve(session, incident: Incident, note: str, actor: str) -> None:
    incident.status = "resolved"
    incident.active_key = None
    incident.resolved_at = now()
    incident.resolution_note = redact(note)
    index_incident(session, incident)
    audit(session, actor, "incident.resolved", incident.id, {"note": note})
