# Test plan

## Layers
1. pytest API/logic tests using isolated temporary SQLite databases, not Docker data.
2. Actual SDK object/tool/schema tests with a mocked model runner; no claim of LLM quality.
3. Actual local Qdrant engine retrieval using deterministic lexical vectors.
4. Real Docker suite against PostgreSQL, sample API, control API and Nginx dashboard.
5. Browser workflow/visual checks against the built dashboard, without mocked API data.

## Acceptance scenarios
Account scenarios: one-time bootstrap, hashed password, wrong username/password, 8-hour
session vs 30-day remembered cookie, HttpOnly/SameSite flags, cross-origin/CSRF rejection,
logout revocation, expiration, backend restart and login throttling. Browser account tests
use isolated temporary data so the owner's real first-account setup remains untouched.

| Scenario | Method | Expected |
|---|---|---|
| PostgreSQL stopped | docker compose stop lab-db | Detect, one incident, control DB survives, cited diagnosis, recovery closes |
| Repeated/redelivered alert | Unit + 16 concurrent real PG requests | No duplicate active incident; same event processed once |
| HTTP 500 | Explicit lab fault state, actual HTTP 500 | Incident, rejected write denied, valid approval repairs, readiness verified |
| CPU/memory/disk threshold | Injected unit observations/simulation events | >=90 triggers; data explicitly not real host stress |
| Missing observer/network | Mocked collector connection failure | API unavailable; database unknown, not invented outage |
| Malicious log | Untrusted text in event | Mask secret, preserve as data, never execute; citations validated |
| Missing/fake citations | Structured output validator | Reject invalid report |
| Rejected/expired/pending/tampered approval | API tests | Zero external writes |
| Replayed approval | API + real lab test | Deny second attempt |
| Restart | Real backend restart | Persist incidents; do not replay execution |
| Knowledge history | Resolve and retrieve | Source ID references an actual stored incident |

## Measurements
Detection and recovery timings use monotonic wall time in scripts/e2e_lab.py. Timings are
one local run, not p95/p99 service-level guarantees. Record dependency versions from locks.
Use docker stats for process resource snapshots; do not confuse it with host overhead.
Report backend unit-test coverage separately from live-model diagnosis accuracy.

No live OpenAI, real disk fill, host CPU exhaustion, dedicated DNS fault, Windows Server,
Zabbix deployment or semantic retrieval quality claim may be made without new evidence.
