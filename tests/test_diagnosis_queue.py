"""Queue concurrency uses local SQLite fixtures; no provider or service is called."""

import threading
import time
from concurrent.futures import ThreadPoolExecutor

import pytest
from sqlalchemy import event, select

from backend.models import AuditEvent, DiagnosisRun, now
from tests.test_incidents import post


def finished_incident(client, ingester, factory, **overrides):
    response = post(client, ingester, **overrides)
    assert response.status_code == 200
    ident = response.json()["incident_id"]
    with factory() as session:
        initial = session.scalar(select(DiagnosisRun).where(DiagnosisRun.incident_id == ident))
        initial.status = "completed"
        initial.finished_at = now()
        session.commit()
    return ident


def parallel_retries(client, operator, ident, workers=8):
    barrier = threading.Barrier(workers)

    def retry(_):
        barrier.wait(timeout=10)
        return client.post(f"/api/incidents/{ident}/diagnoses", headers=operator)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(retry, range(workers)))


def test_concurrent_retries_enqueue_one_job_and_one_audit(client, operator, ingester, factory):
    ident = finished_incident(client, ingester, factory)
    engine = factory.kw["bind"]

    def allow_competing_requests_to_reach_the_check(
        connection, cursor, statement, parameters, context, executemany
    ):
        # Widen the scheduling window after the active-job read. With an unlocked
        # check/insert, concurrent requests can all observe no queued/running job.
        # A database lock makes competing readers wait outside this window.
        if "FROM diagnosis_runs" in statement and "diagnosis_runs.status IN" in statement:
            time.sleep(0.06)

    event.listen(engine, "after_cursor_execute", allow_competing_requests_to_reach_the_check)
    try:
        responses = parallel_retries(client, operator, ident)
    finally:
        event.remove(engine, "after_cursor_execute", allow_competing_requests_to_reach_the_check)

    assert sorted(response.status_code for response in responses) == [202] + [409] * 7
    accepted = next(response.json() for response in responses if response.status_code == 202)
    with factory() as session:
        jobs = list(
            session.scalars(
                select(DiagnosisRun).where(
                    DiagnosisRun.incident_id == ident,
                    DiagnosisRun.status.in_(["queued", "running"]),
                )
            )
        )
        queued_audits = list(
            session.scalars(select(AuditEvent).where(AuditEvent.action == "diagnosis.queued"))
        )
    assert len(jobs) == 1 and jobs[0].id == accepted["id"]
    assert jobs[0].provider == "rules"
    assert len(queued_audits) == 1 and queued_audits[0].target == accepted["id"]


@pytest.mark.parametrize("status", ["queued", "running"])
def test_active_job_blocks_retry_without_another_job(client, operator, ingester, factory, status):
    ident = post(client, ingester).json()["incident_id"]
    with factory() as session:
        initial = session.scalar(select(DiagnosisRun).where(DiagnosisRun.incident_id == ident))
        initial.status = status
        session.commit()
    response = client.post(f"/api/incidents/{ident}/diagnoses", headers=operator)
    assert response.status_code == 409
    with factory() as session:
        jobs = list(session.scalars(select(DiagnosisRun).where(DiagnosisRun.incident_id == ident)))
    assert len(jobs) == 1 and jobs[0].status == status


@pytest.mark.parametrize("status", ["completed", "failed"])
def test_finished_job_allows_one_new_retry(client, operator, ingester, factory, status):
    ident = finished_incident(client, ingester, factory)
    with factory() as session:
        initial = session.scalar(select(DiagnosisRun).where(DiagnosisRun.incident_id == ident))
        initial.status = status
        session.commit()
    assert client.post(f"/api/incidents/{ident}/diagnoses", headers=operator).status_code == 202
    assert client.post(f"/api/incidents/{ident}/diagnoses", headers=operator).status_code == 409


def test_missing_incident_does_not_poison_the_next_enqueue(client, operator, ingester, factory):
    assert client.post("/api/incidents/missing/diagnoses", headers=operator).status_code == 404
    ident = finished_incident(client, ingester, factory)
    assert client.post(f"/api/incidents/{ident}/diagnoses", headers=operator).status_code == 202


def test_separate_incidents_each_accept_a_retry(client, operator, ingester, factory):
    first = finished_incident(client, ingester, factory, service_id="sample-api")
    second = finished_incident(client, ingester, factory, service_id="sample-postgres")
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(
            pool.map(
                lambda ident: client.post(f"/api/incidents/{ident}/diagnoses", headers=operator),
                [first, second],
            )
        )
    assert [response.status_code for response in responses] == [202, 202]
    assert {response.json()["incident_id"] for response in responses} == {first, second}
