from datetime import timedelta

import httpx
import pytest

from backend.models import Approval, now
from tests.test_incidents import post


def request(client, operator, ingester):
    ident = post(
        client, ingester, source="collector", source_kind="real", service_id="sample-api"
    ).json()["incident_id"]
    return client.post(
        "/api/approvals",
        headers=operator,
        json={
            "incident_id": ident,
            "runbook": "clear-http-fault:v1",
            "target": "sample-api",
            "parameters": {},
        },
    )


def enable(settings):
    settings.enable_lab_execution = True


def test_read_only_by_default(client, operator, ingester):
    ident = request(client, operator, ingester).json()["id"]
    client.post(f"/api/approvals/{ident}/decision", headers=operator, json={"decision": "approve"})
    assert client.post(f"/api/approvals/{ident}/execute", headers=operator).status_code == 403


@pytest.mark.parametrize("state", ["pending", "rejected", "expired", "tampered"])
def test_no_side_effect_without_valid_approval(
    client,
    operator,
    ingester,
    settings,
    factory,
    monkeypatch,
    state,
):
    enable(settings)
    ident = request(client, operator, ingester).json()["id"]
    with factory() as session:
        item = session.get(Approval, ident)
        if state == "rejected":
            item.status = "rejected"
        elif state == "expired":
            item.status = "approved"
            item.expires_at = now() - timedelta(seconds=1)
        elif state == "tampered":
            item.status = "approved"
            item.target = "control-db"
        session.commit()
    monkeypatch.setattr(httpx.Client, "post", lambda *a, **k: pytest.fail("Unauthorized write"))
    assert client.post(f"/api/approvals/{ident}/execute", headers=operator).status_code == 409


def test_rejection_is_final_and_audited(client, operator, ingester):
    ident = request(client, operator, ingester).json()["id"]
    path = f"/api/approvals/{ident}/decision"
    assert client.post(path, headers=operator, json={"decision": "reject"}).status_code == 200
    assert client.post(path, headers=operator, json={"decision": "approve"}).status_code == 409
    events = client.get("/api/audit-events", headers=operator).json()
    assert any(e["action"] == "approval.rejected" for e in events)
    assert any(e["action"] == "request.denied" for e in events)


def test_success_pre_post_checks_and_single_use(
    client,
    operator,
    ingester,
    settings,
    monkeypatch,
):
    enable(settings)
    ident = request(client, operator, ingester).json()["id"]
    client.post(f"/api/approvals/{ident}/decision", headers=operator, json={"decision": "approve"})
    writes = []

    def fake_get(self, url, **kwargs):
        return httpx.Response(
            200,
            json={"api": {"fault": "http500"}, "database": {"healthy": True}},
            request=httpx.Request("GET", url),
        )

    def fake_post(self, url, **kwargs):
        writes.append(url)
        return httpx.Response(200, json={"fault": "none"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.Client, "get", fake_get)
    monkeypatch.setattr(httpx.Client, "post", fake_post)
    result = client.post(f"/api/approvals/{ident}/execute", headers=operator)
    assert result.json()["status"] == "succeeded"
    assert "before" in result.json()["result"] and "after" in result.json()["result"]
    assert client.post(f"/api/approvals/{ident}/execute", headers=operator).status_code == 409
    assert len(writes) == 1


def test_failed_execution_cannot_replay(client, operator, ingester, settings, monkeypatch):
    enable(settings)
    ident = request(client, operator, ingester).json()["id"]
    client.post(f"/api/approvals/{ident}/decision", headers=operator, json={"decision": "approve"})

    def failure(*args, **kwargs):
        raise httpx.ConnectError("offline")

    monkeypatch.setattr(httpx.Client, "get", failure)
    result = client.post(f"/api/approvals/{ident}/execute", headers=operator)
    assert result.json()["status"] == "failed"
    assert client.post(f"/api/approvals/{ident}/execute", headers=operator).status_code == 409


def test_unknown_runbook_and_parameters_rejected(client, operator, ingester):
    ident = post(client, ingester).json()["incident_id"]
    for patch in [
        {"runbook": "shell"},
        {"parameters": {"command": "anything"}},
        {"target": "production"},
    ]:
        data = {
            "incident_id": ident,
            "runbook": "clear-http-fault:v1",
            "target": "sample-api",
            "parameters": {},
        }
        data.update(patch)
        assert client.post("/api/approvals", headers=operator, json=data).status_code == 422
