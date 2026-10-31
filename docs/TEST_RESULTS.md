# Verification results

Last verified: 2026-10-25 (Europe/Istanbul). Frontend replay verified; prior host/Docker results retained.
Latest rollback: restored the pre-3D Observatory presentation (3275644 equivalent frontend).
TypeScript/Vite build passed; Prettier passed after whitespace formatting. Backend unchanged.
Subsequent typography-only update passed the frontend build and Prettier. Browser measurements
confirmed 18px main copy at 1512px and 17px at 390px, with no document overflow including
phone technical view. Existing layout/animation and backend behavior were preserved.

Latest calm-polish pass: frontend build and Prettier passed. Desktop browser measurement
confirmed 18px hero text with identical bounding box across an 800ms sample while background
animations ran. Motion-off stopped all CSS animations, removed SVG animateMotion and left
zero pending reveal cards. OS reduced-motion also stopped movement; all cards remained visible.
The 390px phone view retained 17px text without document overflow and mobile navigation worked.
The interaction request listener recorded zero writes. These are visual checks; backend/model
tests were not rerun. Reviewed desktop/phone images: images/calm-desktop.png, images/calm-mobile.png.
This report records local verification, not a production certification or live LLM benchmark.

## Automated checks

The real-outage results below are retained from the preceding verification.
The current pytest run includes the incident-story read API checks. Learning interface
and visual walkthrough checks are documented separately below.

| Check | Result |
|---|---|
| pytest API/logic/security/SDK/retrieval/auth/lab | 47 passed in 60.52s (latest run) |
| Backend statement coverage | 92% displayed (901 statements, 69 not exercised by pytest) |
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

## Visual walkthrough and incident story — 2026-10-16

46 pytest tests passed in 83.13s with 92.34% coverage (901 statements, 69 missed).
New API checks verify prior observations, out-of-order recovery, manual versus monitored
closure, authentication, real/simulation isolation and incident-scoped approval/audit records.
Ruff check/format, Prettier and TypeScript/Vite host/container builds passed.

Playwright CLI exercised all six HTTP and database stages, restart, playback and pause.
Changing node states and response labels were inspected on desktop and at 390px with no
document overflow. A request listener observed no write requests from the educational player.
An isolated simulation incident displayed its monitored recovery and chronological audit.
Private fixture login produced expected unauthenticated 401s and a missing favicon 404;
no runtime UI errors were observed after login. These fixtures are not real fault tests.
Docker Desktop was initially stopped; it was started and the updated backend/frontend were
rebuilt. Ten existing Docker incident stories were checked read-only for incident/recovery
and approval isolation; API readiness and frontend returned HTTP 200. No new real faults
were injected and the prior 27 acceptance results are retained, not counted again.
Reviewed screenshots: [player](images/story-player.png), [recorded incident](images/story-incident.png),
[mobile](images/story-mobile.png). The incident screenshot contains explicitly simulated data.

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
Broad OpenAI model accuracy, live-model injection resistance, model cost/latency, semantic
embedding relevance, actual Zabbix delivery, real host resource exhaustion, isolated DNS
and network fault scenarios, multi-process scaling, Windows Server and Active Directory.
No claims of successful testing are made for these items.

## Live model case — 2026-10-19

The web-crew credential was reused privately at the user's explicit request. Model access
was verified for gpt-4o-mini. Docker Desktop failed during inference-manager startup, so
this exercise used a separate real HTTP lab process and SQLite control/target databases
on Windows. Existing Docker data and account were not changed. The shared deployment
remains in rules/read-only mode; the exercise config alone enabled OpenAI and scoped execution.

Eight checks passed: initial HTTP 200, injected actual HTTP 500, live model completion,
evidence-tool invocation, findings/recommendations, approved fixed-runbook success,
post-action HTTP 200 and monitoring-based closure. The exported case is
bd2c0d10-b4e3-4b07-9b0e-fc113f7450fc. Its original model report is retained unchanged.
Evidence references are valid; the model recommended the HTTP error guide and database/
health checks. It did not independently execute the fix. Operator API approval and execution
were performed by the user-authorized demonstration harness, not clicked by a human in UI.

Failures are part of the result: early live attempts confused evidence UUIDs with knowledge
document IDs and were rejected. Another attempt processed a pre-existing high-disk alarm
instead of the intended HTTP incident and made an unsupported disk→HTTP causal claim.
Prompt ID distinctions were clarified and the harness now selects its exact incident.
That causal error demonstrates why structural citation validation does not establish truth.
This is one completed case, not an accuracy benchmark. No further live calls are made when
opening the page. Pytest initially failed creating sandbox temp directories; rerunning in
the allowed workspace outside the restricted runtime passed all 47 tests.

Final host Vite build, Prettier and Ruff passed. Playwright checked the actual built case
page at /?case=1 without login, model output, selected execution/recovery stages, tool
history and visible evidence anchors. A request listener observed no writes during page
interactions. Initial mobile overflow from a long ID and an inherited header layout were
corrected; final 390px check passed. The case page is served by a host-only Vite preview
while Docker is unavailable; the live authenticated operations backend was not deployed.
Reviewed [desktop](images/live-ai-case.png) and [mobile](images/live-ai-mobile.png) images
show the real recorded case. The only browser resource error was a missing favicon 404.

## Observatory redesign — 2026-10-25

Frontend-only presentation changes. The default route and /?case=1 now render the visual
Observatory; the existing authenticated App remains at /?dashboard=1. No monitoring,
authorization, execution policy, private configuration or recorded model output changed.
The live-case.json fixture is a retained real run, not a newly executed fault or model call.
Prior 47 pytest results and 27 Docker checks are historical; they were not rerun for styling.

TypeScript/Vite production build and Prettier passed. Playwright exercised actual localhost
pages: six replay stages, pause/resume, automatic completion, restart, manual stage selection,
plain/technical mode, evidence selection and the original JSON case download. A request
listener observed zero POST/PATCH/PUT/DELETE requests during replay interactions. Model tool
count is two; orchestration collection is not counted as a model tool. Dates use Europe/Istanbul.

Desktop 1512px, tablet 920px and phone 390px layouts were checked without document overflow,
including expanded technical data. Mobile navigation opens, closes after selection and on
Escape; hidden navigation is removed from focus order. First keyboard Tab reaches the skip
link. OS reduced-motion and the explicit motion toggle resulted in zero running animations.
The production page loaded without console errors in the clean final session.

Issues corrected during browser review: inherited global aside styling created an unintended
fixed panel; role/report markup needed scoped styles; the focused skip link overlapped the
mobile menu; immediate Escape after menu opening did not bubble to the sidebar. All were
repaired and relevant interactions rechecked. The earlier dev browser logged expected HMR
disconnect errors when switching to the built preview; these were absent on a clean load.

Final built preview is served only on 127.0.0.1:8080. This task did not redeploy or reverify the
Docker backend. Reviewed [desktop](images/observatory-desktop.png),
[incident replay](images/observatory-story.png) and [phone](images/observatory-mobile.png) screenshots.

## Whole-site color and motion pass — 2026-10-26

Frontend presentation changes only: multi-accent navy/pearl/cyan/blue/amber surfaces across
Observatory, sign-in and operations; shared fine-pointer halo and local card spotlight;
persisted motion preference; panel entrances and button feedback. No new fault injection,
model call, backend policy change or deployment was performed. The 47 pytest tests and 27
Docker checks above remain historical and were not rerun for this UI change.

Final TypeScript/Vite production build, frontend Prettier check, Ruff and Git whitespace
check passed. Playwright checked the built public page at 1512px and a separate 390px
touch context. Main copy remains 18px desktop/17px phone; technical view produced no
horizontal document overflow. The touch context reported a coarse pointer and no halo.

The desktop halo appeared over buttons, stayed pointer-events:none, and did not prevent
navigation. Card hover set local spotlight coordinates and leaving cleared the active
spotlight. Form hover and keyboard Tab hid the halo after its short opacity transition.
Disabling motion produced zero running CSS/Web Animations, zero SVG animateMotion nodes,
zero pending hidden reveals and no pointer. The choice survived reload; an OS reduced-motion
change also stopped effects and paused replay. Public replay/navigation/technical-view
interactions produced zero POST/PUT/PATCH/DELETE requests and zero JavaScript page errors.

Sign-in/logout and the overview, systems, knowledge, approvals and audit views were checked
against a temporary API on 8021 with a disposable SQLite database and random test password,
through a separate frontend preview on 8081. No user account was modified. Test records were
explicitly labelled simulations; missing live lab telemetry was not treated as healthy.
Desktop routes and the 390px systems view had no horizontal document overflow. Shared
operator motion-off produced zero running animations. No JavaScript page errors occurred;
the unauthenticated session lookup returned the expected 401 before sign-in.

Reviewed screenshots: [desktop](images/spectrum-desktop.png), [AI report](images/spectrum-ai.png),
[phone](images/spectrum-mobile.png), [sign-in](images/spectrum-login.png) and
[operations](images/spectrum-operator.png). The public preview on 8080 serves the saved case;
the authenticated Docker/PostgreSQL deployment remains unverified in this session. Private
test services were stopped and their temporary password file removed after inspection.

### Dark background follow-up — 2026-10-26

Replaced white canvas/cards with coordinated navy/slate surfaces, including login,
operations tables, topology status panels, technical details and native dark controls.
Light text and separate cyan/blue/amber/green/coral states retain readable hierarchy.
Production build, Prettier and Ruff passed. Playwright checked all six replay stages,
AI report, expanded evidence/audit, motion-off (zero running animations), and 390px
touch/technical mode (17px main copy, no horizontal overflow, no pointer halo).
Public interactions produced no write requests or JavaScript page errors. A scan of
large solid backgrounds found no remaining pale surfaces in these public views.

Sign-in/logout and five console views were checked against a disposable SQLite fixture;
none had pale large backgrounds or horizontal overflow. The initial temporary preview
process exited, producing fetch errors; after restarting it, the repeated console checks
had no JavaScript page errors or visible network error. Updated preview images show the
final theme. Temporary API/preview processes and password artifacts were removed afterward.
No backend behavior, model calls or Docker verification were part of this color change.
