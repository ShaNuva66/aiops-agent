# Project overview

## Purpose
Build practical junior IT operations and AI automation skills through a reproducible,
evidence-based local incident workflow for a fictional Istanbul airport company.

## Delivered MVP scope
Real Docker PostgreSQL and API services; deterministic monitoring; deduplicated incidents;
structured diagnosis; a React console; saved runbook/incident retrieval; a narrowly scoped,
human-approved HTTP fault reset; audit history; migrations and automated verification.

## Success criteria
- Stopping the target PostgreSQL generates an incident without losing the control plane.
- Repeated observations correlate; duplicate delivery is idempotent under concurrency.
- Reports reference persisted evidence and disclose uncertainty.
- Human approval is necessary and cannot be replayed or broadened.
- Setup is reproducible with frozen Python and npm dependency locks.
- Actual tests and unverified features are distinguishable.

## Learning path after running the project
1. Follow /telemetry from the sample API into monitoring.poll.
2. Compare a raw MonitoringEvent with an Incident; one incident can collect many alerts.
3. Inspect Evidence and the diagnosis tool boundary.
4. Trace the exact approval fingerprint and durable claim before the external write.
5. Reproduce the PostgreSQL and HTTP faults, then inspect the audit trail.

The business flight endpoint contains explicitly fictional demo data. Telemetry is observed
from the running lab. Simulated resource events use a separate correlation namespace.
