import uuid

import httpx
from sqlalchemy import select

from backend.incidents import ingest
from backend.models import Asset, Service, now
from backend.schemas import EventInput
from backend.security import redact

THRESHOLDS = {"cpu": 90, "memory": 90, "disk": 90}


def seed_inventory(session) -> None:
    if not session.get(Asset, "lab-node"):
        session.add(
            Asset(
                id="lab-node",
                name="Airport operations lab",
                scope="Docker Linux lab; metrics do not represent Windows host",
            )
        )
        session.flush()
    for ident, name in [
        ("sample-api", "Operations API"),
        ("sample-postgres", "Application PostgreSQL"),
    ]:
        if not session.get(Service, ident):
            session.add(Service(id=ident, asset_id="lab-node", name=name))


def collect(settings) -> dict:
    """Only the administrator-configured lab URL is reachable; no caller-supplied URLs."""
    with httpx.Client(timeout=4, follow_redirects=False, trust_env=False) as client:
        response = client.get(
            settings.lab_url + "/telemetry",
            headers={"Authorization": f"Bearer {settings.lab_token}"},
        )
        response.raise_for_status()
        if len(response.content) > 128_000:
            raise ValueError("Telemetry exceeded maximum size")
        return redact(response.json())


def poll(session, settings) -> None:
    asset = session.get(Asset, "lab-node")
    if not asset or not asset.enabled:
        return
    try:
        telemetry = collect(settings)
    except (httpx.HTTPError, ValueError) as exc:
        telemetry = {
            "api": {"healthy": False, "error": type(exc).__name__},
            "database": {"healthy": None, "error": "Collector unavailable; unknown"},
            "metrics": {},
            "logs": [],
        }
    for service in session.scalars(select(Service)):
        section = "api" if service.id == "sample-api" else "database"
        observation = telemetry.get(section, {})
        healthy = observation.get("healthy")
        service.status = "unknown" if healthy is None else ("healthy" if healthy else "down")
        service.checked_at = now()
        service.latest = {
            "observation": observation,
            "metrics": telemetry.get("metrics", {}),
            "logs": telemetry.get("logs", [])[-30:],
            "scope": telemetry.get("scope", "unavailable"),
            "source_kind": "real",
        }
        if healthy is None:
            service.failure_streak = 0
            continue  # An unreachable observer does not prove PostgreSQL is down.
        service.failure_streak = 0 if healthy else service.failure_streak + 1
        if healthy or service.failure_streak >= settings.failure_threshold:
            session.flush()
            ingest(
                session,
                EventInput(
                    source="collector",
                    event_id=str(uuid.uuid4()),
                    asset_id="lab-node",
                    service_id=service.id,
                    check="availability",
                    state="recovery" if healthy else "problem",
                    observed_at=now(),
                    data=service.latest,
                ),
                settings.diagnosis_provider,
            )
        if service.id == "sample-api":
            for metric, threshold in THRESHOLDS.items():
                value = telemetry.get("metrics", {}).get(metric)
                if not isinstance(value, (int, float)):
                    continue
                ingest(
                    session,
                    EventInput(
                        source="collector",
                        event_id=str(uuid.uuid4()),
                        asset_id="lab-node",
                        service_id=service.id,
                        check=metric,
                        severity="warning",
                        observed_at=now(),
                        state="problem" if value >= threshold else "recovery",
                        data={
                            "value": value,
                            "threshold": threshold,
                            "scope": telemetry.get("scope"),
                        },
                    ),
                    settings.diagnosis_provider,
                )
    session.commit()
