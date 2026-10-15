# Verification results

Last verified: 2026-10-16 (Europe/Istanbul). Local Windows 11 / Docker Desktop Linux lab.
This report records local verification, not a production certification or live LLM benchmark.

## Automated checks

The backend/security/real-outage results below are retained from the preceding verification.
The subsequent learning-interface change modifies only the frontend; its separate checks
are documented under Learning interface.

| Check | Result |
|---|---|
| pytest API/logic/security/SDK/retrieval/auth/lab | 44 passed |
| Backend statement coverage | 92% displayed (887 statements, 69 not exercised by pytest) |
| Account/session module coverage | 97% displayed |
| Real Docker acceptance suite | 27 checks passed |
| Qdrant 1.19.1 actual server write/query | Passed |
| Alembic upgrade and schema drift check | Passed, no pending schema changes |
| Ruff lint and formatting | Passed |
| TypeScript + Vite production build | Passed on host and Linux build container |
| Prettier formatting | Passed |
| npm audit | Zero reported vulnerabilities at check time |
| GitHub Actions | Initial run started after publication; result pending at handoff ([run](https://github.com/ShaNuva66/aiops-agent/actions/runs/38816622611)) |

Frozen resolved versions are recorded in uv.lock and frontend/package-lock.json; examples
from this session: Python 3.12, FastAPI 0.143.2, SQLAlchemy 2.1.4, Alembic 1.20.0,
OpenAI Agents SDK 0.24.0, Qdrant client/server 1.19.1, Vite 6.4.4.

## Real Docker acceptance
The suite stopped only this project's lab-db and restored it in a finally block. It used
actual PostgreSQL storage/transactions and actual sample API HTTP faults. Diagnosis was
the explicitly labelled rules provider. The 16-delivery race used a simulation-labelled
event against the real PostgreSQL backend, not 16 actual service failures.

Confirmed: independent control database survival, target readiness failure, repeated alert
correlation, cited evidence, uncertain root cause, recovery closure, persisted history,
resolved-incident retrieval, secret masking, absent/rejected approval denial, approved
external fault reset with readiness verification, replay denial and restart persistence.

Final-run monotonic timings:

| Observation | Seconds |
|---|---:|
| PostgreSQL outage detected | 10.250 |
| Next correlated failure observation | 6.078 |
| PostgreSQL recovery observed and incident closed | 3.078 |
| HTTP fault incident detected | 5.062 |
| HTTP recovery observed and incident closed | 2.047 |
| Backend restart with incident history available | 4.562 |

Earlier runs varied (PostgreSQL detection approximately 7–29 seconds), including Docker DNS,
connection timeout and collection/diagnosis scheduling effects. These are observations of
a few local runs, not latency percentiles or guarantees. The report-availability wait is
not reported as LLM inference latency because no LLM inference was performed.

## Browser verification
2026-10-16 account update: Playwright tested first-account creation, wrong-password rejection,
remembered HttpOnly/SameSite=Strict cookie expiry, automatic access in a new tab, ordinary
session-only cookies, session restoration on reload, and logout. These account tests used
an isolated SQLite database and the real application, with no mocked auth responses.
The production Docker proxy's same-origin/foreign-origin checks and untouched setup screen
were also checked. No test account was created in the user's persistent control database.
API tests cover expired sessions, CSRF rejection, revocation, restart persistence, API role
separation, duplicate account setup and login throttling.
The auth-status retry flow was also checked with browser-simulated HTTP 503 responses;
it automatically recovered to the correct sign-in screen. This is a simulated UI resilience
test and is separate from the real Docker outage suite. Screenshots:
[first-account setup](images/account-setup.png), [normal login](images/login.png).

Original 2026-10-15 operations verification:
Playwright CLI drove the actual built app and API, including private-token login, overview,
incident evidence/report display, knowledge search, and request -> review exact scope ->
approve -> execute HTTP recovery. The real lab readiness returned 200 after the UI action.
Desktop and 390px mobile layouts were inspected. Reviewed, credential-free screenshots:
[desktop overview](images/overview.png) and [mobile overview](images/mobile.png).
Additional private screenshots remain under output/playwright/.

Frontend error/recovery handling is tested separately with a **browser-simulated** HTML 503
response, not counted as a real backend failure experiment. Rebuild/restart periods produced
expected transient network errors in the long-running test browser; stable operation and
automatic recovery are checked separately. No browser storage/credential dumps are deliverables.

## Learning interface — 2026-10-16

TypeScript/Vite build and Prettier passed after the Turkish learning UI update.
Playwright CLI checked login, help-toggle persistence across reload, glossary expansion,
all four workflow navigation buttons, infrastructure explanations and exactly three resource
cards scoped to the application/Linux environment rather than duplicated as PostgreSQL metrics.
An incident's Turkish finding linked to its actual evidence anchor; raw JSON remained
expandable. Turkish `veritabanı erişim` search returned the PostgreSQL guide and saved incident,
with simulation source labels and original source text retained. Approvals and audit navigation
were checked without executing a recovery. The 390px overview had no document overflow.

These browser checks used a private SQLite test database and simulation-labelled failure,
recovery and disk-threshold events. Service observations came from a read-only live lab poll.
They do not represent new real outage experiments or live AI evaluation and did not reset the
operator's account/data. Reviewed screenshots: [desktop](images/learning-overview.png),
[mobile](images/learning-mobile.png). The frontend container was rebuilt for local deployment.

## Problems found and corrected
- Browser route registration and Vite origin forwarding were caught by auth API/browser tests.
- An integration run timed out because Docker DNS inside a database probe exceeded the
  telemetry request budget. The lab now bounds observer wait to 2.5 seconds and reuses
  one worker/probe, preserving healthy API observation during a slow database probe.
  A regression test verifies bounded response and no worker proliferation; all 27 real
  Docker acceptance checks passed after this fix.
- SDK tool tests needed a real ToolContext; QdrantClient requires explicit close rather
  than a context-manager protocol in the tested version.
- Availability acceptance tests must wait for a condition rather than assume a fixed delay.
- SQLite drops timezone information; SQL-side expiry conditions use fetch synchronization
  instead of Python comparisons between naive/aware timestamps.
- Duplicate source event IDs with changed content are now rejected.
- PostgreSQL advisory locks serialize problem/recovery races even before an incident exists.
- Incident history could crowd runbooks out of retrieval; category-aware retrieval, title
  matching and recent-incident tie breaking are covered by regression tests.
- Frontend handles non-JSON proxy errors with a readable unavailable message. Nginx resolves
  backend names dynamically after container replacement and returns structured proxy errors.

## Final handoff
Final idle container memory snapshot was approximately 204 MiB combined for the five base
containers. This excludes Docker Desktop/WSL and host overhead and is not a load benchmark.
The optional Qdrant container was stopped after its verification. Both monitored services
were healthy, no incidents were active and execution was disabled at handoff.

## Not verified or included
Live OpenAI model accuracy, live-model injection resistance, model cost/latency, semantic
embedding relevance, actual Zabbix delivery, real host resource exhaustion, isolated DNS
and network fault scenarios, multi-process scaling, Windows Server and Active Directory.
No claims of successful testing are made for these items.
