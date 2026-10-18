"""One real HTTP fault + live model run in a separate host/SQLite lab.

Run explicitly: .venv/Scripts/python -m scripts.live_ai_case
Uses the private .env OpenAI credentials. Exports only a redacted case, never secrets.
No Docker or production database writes. A fixed HTTP runbook is approved explicitly
for the incident created here; the lab fault is always cleared in finally.
"""

import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from backend import diagnosis
from backend.config import Settings
from backend.db import session_factory
from backend.diagnosis import process_one
from backend.main import create_app
from backend.models import Base
from backend.monitoring import poll
from backend.security import redact

ROOT = Path(__file__).resolve().parents[1]


def main():
    output = ROOT / "artifacts" / ("live-ai-" + uuid.uuid4().hex)
    output.mkdir(parents=True)
    settings = Settings(
        database_url="sqlite:///" + (output / "control.db").as_posix(),
        lab_url="http://127.0.0.1:8121",
        monitor_enabled=False,
        diagnosis_provider="openai",
        enable_lab_execution=True,
        qdrant_url="",
    )
    factory = session_factory(settings)
    original_validate = diagnosis.validate_report

    def inspect_references(report, evidence_ids, source_ids):
        print(
            "Model reference validation:",
            json.dumps(
                {
                    "findings": len(report.findings),
                    "evidence_valid": all(
                        bool(f.evidence_ids) and set(f.evidence_ids) <= evidence_ids
                        for f in report.findings
                    ),
                    "sources_valid": set(report.source_ids) <= source_ids,
                }
            ),
            flush=True,
        )
        original_validate(report, evidence_ids, source_ids)

    diagnosis.validate_report = inspect_references
    Base.metadata.create_all(factory.kw["bind"])
    env = dict(
        os.environ,
        LAB_TOKEN=settings.lab_token,
        LAB_DATABASE_URL="sqlite:///" + (output / "target.db").as_posix(),
        LAB_SCOPE="Windows host process lab; SQLite target; not Docker/PostgreSQL",
    )
    log = (output / "lab.log").open("w", encoding="utf-8")
    lab = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "infrastructure.lab.app:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8121",
        ],
        cwd=ROOT,
        env=env,
        stdout=log,
        stderr=log,
    )
    headers = {"Authorization": "Bearer " + settings.api_token}
    checks = []

    def check(name, condition):
        if not condition:
            raise RuntimeError(name + " failed")
        checks.append(name)
        print("PASS " + name, flush=True)

    try:
        with httpx.Client(
            base_url=settings.lab_url,
            timeout=10,
            trust_env=False,
            headers={"Authorization": "Bearer " + settings.lab_token},
        ) as target:
            for _ in range(50):
                try:
                    if target.get("/health/ready").status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                if lab.poll() is not None:
                    raise RuntimeError("Local lab startup failed")
                time.sleep(0.2)
            with TestClient(create_app(settings, factory)) as api:
                check("initial HTTP 200", target.get("/health/ready").status_code == 200)
                with factory() as session:
                    poll(session, settings)
                target.post("/admin/fault", json={"fault": "http500"}).raise_for_status()
                check("real injected HTTP 500", target.get("/health/ready").status_code == 500)
                with factory() as session:
                    poll(session, settings)
                    poll(session, settings)
                incidents = api.get("/api/incidents", headers=headers).json()
                incident = next(
                    i
                    for i in incidents
                    if i["service_id"] == "sample-api" and i["check"] == "availability"
                )
                ident = incident["id"]
                print("Running live OpenAI diagnosis; no mock runner", flush=True)
                with factory() as session:
                    process_one(session, settings, ident)
                detail = api.get("/api/incidents/" + ident, headers=headers).json()
                job = detail["diagnoses"][0]
                check(
                    "live model report completed",
                    job["provider"] == "openai" and job["status"] == "completed",
                )
                check(
                    "agent inspected evidence",
                    any(
                        a["action"] == "tool.get_incident_evidence"
                        for a in detail["story"]["actions"]
                    ),
                )
                check(
                    "model returned findings and recommendations",
                    bool(job["report"]["findings"] and job["report"]["recommendations"]),
                )
                # Use existing scope-bound approval/executor, never a model write tool.
                approval = api.post(
                    "/api/approvals",
                    headers=headers,
                    json={
                        "incident_id": ident,
                        "runbook": "clear-http-fault:v1",
                        "target": "sample-api",
                        "parameters": {},
                    },
                )
                approval.raise_for_status()
                aid = approval.json()["id"]
                api.post(
                    "/api/approvals/" + aid + "/decision",
                    headers=headers,
                    json={"decision": "approve"},
                ).raise_for_status()
                result = api.post("/api/approvals/" + aid + "/execute", headers=headers)
                result.raise_for_status()
                check("approved fixed runbook succeeded", result.json()["status"] == "succeeded")
                check("post-action HTTP 200", target.get("/health/ready").status_code == 200)
                with factory() as session:
                    poll(session, settings)
                detail = api.get("/api/incidents/" + ident, headers=headers).json()
                check(
                    "monitoring closed incident with recovery",
                    detail["status"] == "resolved" and bool(detail["story"]["recovery"]),
                )
                case = redact(
                    {
                        "model": settings.openai_model,
                        "scope": (
                            "Windows host / SQLite; real HTTP fault and live OpenAI inference. "
                            "Not a Docker/PostgreSQL test."
                        ),
                        "approval_actor": (
                            "User-authorized demonstration harness, using operator API approval; "
                            "not autonomous model authorization."
                        ),
                        "checks": checks,
                        "incident": detail,
                    }
                )
                # Refuse export if any known private credential survived redaction.
                serialized = json.dumps(case, ensure_ascii=False, indent=2)
                if any(
                    secret and secret in serialized
                    for secret in [
                        settings.api_token,
                        settings.ingest_token,
                        settings.lab_token,
                        settings.openai_api_key,
                    ]
                ):
                    raise RuntimeError("Private credential detected in export")
                (ROOT / "frontend/src/live-case.json").write_text(serialized, encoding="utf-8")
                (output / "case.json").write_text(serialized, encoding="utf-8")
                print("Published sanitized case data for incident " + ident, flush=True)
    finally:
        diagnosis.validate_report = original_validate
        try:
            with httpx.Client(timeout=3, trust_env=False) as client:
                client.post(
                    settings.lab_url + "/admin/fault",
                    json={"fault": "none"},
                    headers={"Authorization": "Bearer " + settings.lab_token},
                )
        except httpx.HTTPError:
            pass
        lab.terminate()
        try:
            lab.wait(timeout=10)
        except subprocess.TimeoutExpired:
            lab.kill()
            lab.wait(timeout=5)
        log.close()
        factory.kw["bind"].dispose()


if __name__ == "__main__":
    main()
