from sqlalchemy import select

from backend import monitoring
from backend.models import Incident, Service


def telemetry(api=True, database=True, cpu=1, memory=20, disk=10):
    return {
        "api": {"healthy": api},
        "database": {"healthy": database},
        "metrics": {"cpu": cpu, "memory": memory, "disk": disk},
        "logs": [],
        "scope": "test observation",
    }


def test_debounce_recovery_and_resource_thresholds(client, factory, settings, monkeypatch):
    monkeypatch.setattr(monitoring, "collect", lambda _: telemetry(database=False, disk=95))
    with factory() as session:
        monitoring.poll(session, settings)
        incidents = list(session.scalars(select(Incident)))
        assert len(incidents) == 1 and incidents[0].check == "disk"
        monitoring.poll(session, settings)
        incidents = list(session.scalars(select(Incident)))
        assert len(incidents) == 2
        assert session.get(Service, "sample-postgres").status == "down"
        monkeypatch.setattr(monitoring, "collect", lambda _: telemetry())
        monitoring.poll(session, settings)
        assert all(i.status == "resolved" for i in session.scalars(select(Incident)))


def test_observer_failure_does_not_invent_database_outage(client, factory, settings, monkeypatch):
    import httpx

    def fail(_):
        raise httpx.ConnectError("unreachable")

    monkeypatch.setattr(monitoring, "collect", fail)
    with factory() as session:
        monitoring.poll(session, settings)
        monitoring.poll(session, settings)
        incidents = list(session.scalars(select(Incident)))
        assert len(incidents) == 1 and incidents[0].service_id == "sample-api"
        assert session.get(Service, "sample-postgres").status == "unknown"
