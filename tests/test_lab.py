from threading import Event

from fastapi.testclient import TestClient
from starlette.requests import Request

from infrastructure.lab import app as lab


def test_non_ascii_lab_authorization_is_denied_without_a_server_error(monkeypatch):
    token = "lab-unit-" + "x" * 32
    monkeypatch.setenv("LAB_TOKEN", token)
    with TestClient(lab.app) as client:
        response = client.get("/telemetry", headers=[(b"authorization", b"Bearer \xff\xfe")])
    assert response.status_code == 401
    # A valid token still passes without invoking telemetry or a database probe.
    request = Request(
        {"type": "http", "headers": [(b"authorization", ("Bearer " + token).encode())]}
    )
    assert lab.authorized(request) is None


def test_slow_database_probe_returns_unhealthy_without_unbounded_workers(monkeypatch):
    release = Event()
    entered = Event()
    calls = []

    def slow_probe():
        calls.append(1)
        entered.set()
        release.wait(timeout=5)

    monkeypatch.setattr(lab, "probe_database", slow_probe)
    monkeypatch.setattr(lab, "db_future", None)
    monkeypatch.setattr(lab, "DB_PROBE_TIMEOUT", 0.02)
    try:
        status = lab.database_status()
        assert entered.is_set() and status == {"healthy": False, "error": "TimeoutError"}
        assert not lab.db_future.done()
        assert lab.database_status()["healthy"] is False
        assert len(calls) == 1
    finally:
        release.set()
        if lab.db_future:
            lab.db_future.result(timeout=2)
