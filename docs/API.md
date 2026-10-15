# API contracts

OpenAPI is generated from the actual Pydantic models at /api/openapi.json; interactive
documentation is /api/docs. Success responses are typed resources or lists. Errors use
`{"error":{"code":409,"message":"..."}}`; validation errors also include field paths.
Lists are bounded; incidents and audit support offset pagination.

All operator endpoints also accept the browser's HttpOnly session cookie. Cookie-authenticated
POST/PATCH/PUT/DELETE calls require X-CSRF-Token from /api/auth/me and a matching Origin
when supplied. API_TOKEN remains supported for authenticated machine clients.

| Account endpoint | Contract |
|---|---|
| GET /api/auth/status | Public setup_required flag |
| POST /api/auth/setup | First account only: username, password, optional remember; 201 + session cookie |
| POST /api/auth/login | Username/password + optional remember; session cookie and CSRF token |
| GET /api/auth/me | Current username + CSRF token; 401 for missing/expired session |
| POST /api/auth/logout | Requires cookie + CSRF; revokes session and clears cookie |

Passwords: 8–128 characters. Usernames: 3–64 ASCII letters/digits/dot/underscore/hyphen,
case-insensitive. Remembered sessions last 30 days; ordinary sessions expire after 8 hours
and use a browser-session cookie. Account creation is disabled after bootstrap.

| Method/path | Credential | Purpose |
|---|---|---|
| GET /api/health/live | none | Process liveness |
| GET /api/health/ready | none | Control database readiness |
| GET /api/overview | API_TOKEN | Counts, actual modes and last cycle state |
| GET /api/assets, /api/services | API_TOKEN | Allowlisted inventory and scoped observations |
| POST /api/monitoring/events | INGEST_TOKEN | Idempotent problem/recovery ingestion |
| GET /api/incidents | API_TOKEN | Latest incidents, optional status/limit/offset |
| GET /api/incidents/{id} | API_TOKEN | Incident, evidence, diagnoses and story observations/scoped audit |
| PATCH /api/incidents/{id} | API_TOKEN | Investigate or resolve with a required note |
| POST /api/incidents/{id}/diagnoses | API_TOKEN | Queue one diagnosis; 202 accepted |
| POST /api/operations/cycle | API_TOKEN | Run an authenticated operations cycle |
| POST /api/knowledge/search | API_TOKEN | Retrieve saved sources with revision and method |
| GET/POST /api/approvals | API_TOKEN | List or request a precisely scoped action |
| POST /api/approvals/{id}/decision | API_TOKEN | One-time approve/reject transition |
| POST /api/approvals/{id}/execute | API_TOKEN | Consume approval and attempt fixed runbook |
| GET /api/audit-events | API_TOKEN | Latest audit records, limit/offset |

## Monitoring event
Fields: source, event_id, asset_id, service_id, check, state, severity, source_kind,
timezone-aware observed_at, bounded data object. Allowlisted values are in
backend/schemas.py. Future timestamps more than one minute ahead are rejected.
Test events must use source_kind=simulation. Unknown fields and targets are rejected.

Returns incident_id, duplicate, ignored. Duplicate delivery of identical data returns the
original incident. Reusing the event ID for different data returns 409. An old event can
be stored with ignored=true, without opening/closing an incident. Recovery with no active
incident is valid and returns null incident_id. Simulations have separate correlation keys.

## Incident states
open -> investigating -> resolved, or open -> resolved. Monitoring recovery resolves either
active state. Resolved records cannot reopen through PATCH. A recurrence produces a new
incident ID. Resolution notes describe observed recovery or the operator's stated result,
not necessarily a proven root cause.

## Incident story

Incident detail includes `story.previous` (nearest earlier successful-state observation in
the same correlation, excluding this incident), `story.recovery` (a linked observation after
the last problem, only when monitoring closed the incident), related `approvals`, and the
latest 200 scoped `actions` in chronological order. Null observations indicate missing data.
Manual closure is not presented as monitored health verification. Audit timestamps record
processing time; observation timestamps record measurement time and can precede ingestion.

## Approval

Request: incident_id, runbook=clear-http-fault:v1, target=sample-api, parameters={}.
Eligible only for a real active sample-api availability incident. Default expiry 300s.
Decision payload: {"decision":"approve"} or {"decision":"reject"}.
Execution accepts no target/parameter override; it uses the stored scope only.

Status path: pending -> approved/rejected; approved -> executing -> succeeded/failed.
Expired decisions/actions return 409. In read-only mode execution returns 403. Failed
verification is returned as an execution resource with status=failed, not reported as success.
