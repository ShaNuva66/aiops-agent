from datetime import timedelta

import httpx
from fastapi import HTTPException
from sqlalchemy import update

from backend.incidents import utc
from backend.models import Approval, Incident, now
from backend.schemas import ApprovalInput
from backend.security import audit, fingerprint

RUNBOOK = "clear-http-fault:v1"


def request_approval(session, payload: ApprovalInput, settings) -> Approval:
    incident = session.get(Incident, payload.incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")
    if (
        incident.status == "resolved"
        or incident.service_id != payload.target
        or incident.check != "availability"
        or incident.source_kind != "real"
    ):
        raise HTTPException(409, "Runbook is not applicable to this incident")
    approval = Approval(
        incident_id=incident.id,
        runbook=payload.runbook,
        target=payload.target,
        parameters=payload.parameters,
        fingerprint=fingerprint(payload.runbook, payload.target, payload.parameters),
        expires_at=now() + timedelta(seconds=settings.approval_ttl_seconds),
    )
    session.add(approval)
    session.flush()
    audit(
        session,
        "operator",
        "approval.requested",
        approval.id,
        {"runbook": approval.runbook, "target": approval.target},
    )
    session.commit()
    return approval


def decide(session, ident: str, decision: str) -> Approval:
    approval = session.get(Approval, ident)
    if not approval:
        raise HTTPException(404, "Approval not found")
    if utc(approval.expires_at) <= now():
        raise HTTPException(409, "Approval expired")
    status = "approved" if decision == "approve" else "rejected"
    changed = session.execute(
        update(Approval)
        .where(
            Approval.id == ident,
            Approval.status == "pending",
            Approval.expires_at > now(),
        )
        .values(status=status, decided_by="operator")
        .execution_options(synchronize_session="fetch")
    )
    if changed.rowcount != 1:
        session.rollback()
        raise HTTPException(409, "Approval has already been decided")
    audit(session, "operator", "approval." + status, ident)
    session.commit()
    session.refresh(approval)
    return approval


def execute(session, ident: str, settings) -> Approval:
    approval = session.get(Approval, ident)
    if not approval:
        raise HTTPException(404, "Approval not found")
    if not settings.enable_lab_execution:
        raise HTTPException(403, "Lab execution is disabled; read-only mode")
    if utc(approval.expires_at) <= now():
        raise HTTPException(409, "Approval expired")
    if (
        approval.runbook != RUNBOOK
        or approval.target != "sample-api"
        or approval.parameters
        or approval.fingerprint
        != fingerprint(
            approval.runbook,
            approval.target,
            approval.parameters,
        )
    ):
        raise HTTPException(409, "Approval scope or integrity check failed")
    incident = session.get(Incident, approval.incident_id)
    if incident.status == "resolved":
        raise HTTPException(409, "Incident is already resolved")
    claimed = session.execute(
        update(Approval)
        .where(
            Approval.id == ident,
            Approval.status == "approved",
            Approval.expires_at > now(),
            Approval.fingerprint == approval.fingerprint,
        )
        .values(status="executing")
        .execution_options(synchronize_session="fetch")
    )
    if claimed.rowcount != 1:
        session.rollback()
        raise HTTPException(409, "A fresh approved action is required")
    audit(session, "executor", "runbook.started", ident)
    session.commit()  # Consume approval durably BEFORE any external side effect.
    result = {}
    try:
        with httpx.Client(timeout=5, trust_env=False, follow_redirects=False) as client:
            headers = {"Authorization": f"Bearer {settings.lab_token}"}
            before = client.get(settings.lab_url + "/telemetry", headers=headers)
            before.raise_for_status()
            observed = before.json()
            result["before"] = {"api": observed.get("api"), "database": observed.get("database")}
            if observed.get("api", {}).get("fault") != "http500":
                raise ValueError("Runbook precondition failed: no injected HTTP fault")
            response = client.post(settings.lab_url + "/admin/clear-http-fault", headers=headers)
            response.raise_for_status()
            after = client.get(settings.lab_url + "/health/ready")
            result["after"] = {"http_status": after.status_code}
            if after.status_code != 200:
                raise ValueError("Post-action readiness verification failed")
        approval.status = "succeeded"
    except Exception as exc:
        approval.status = "failed"
        result["error_type"] = type(exc).__name__
        result["message"] = "Action or verification failed; approval cannot be reused"
    approval.result = result
    audit(session, "executor", "runbook." + approval.status, ident, result)
    session.commit()
    return approval
