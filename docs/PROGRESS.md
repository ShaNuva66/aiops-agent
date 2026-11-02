# Project progress

## Current milestone
Working local MVP delivered and verified on Windows 11 / Docker Desktop Linux engine.
Last implementation session: 2026-11-02, Europe/Istanbul.
Presentation restored to the pre-3D Observatory version at the user's request.
Typography-only readability pass: 18px desktop/17px phone main copy, larger labels and controls, with existing layout and animations preserved.
Whole-site visual pass: deep navy/slate surfaces, cyan monitoring, blue AI and amber action accents across the presentation, sign-in and operations console. White page/card backgrounds removed at the user's request, including expanded technical data and native dark controls. Shared decorative mouse halo/card spotlight, persistent motion preference, slow ambient light, card entrances and button feedback. The readable layout and typography are retained.

## Completed
- 2026-11-02: polished the click-driven introduction with clearer section questions, actor labels, proof-derived record summaries, numbered/labeled explanation controls and a calmer background. Directed illustration paths and active-stage outlines clarify the causal sequence. Action/recovery visuals settle within their matching explanation; the fault boundary distinguishes the recorded healthy database. Click feedback resets on reopen. All 28 explanations fit five checked desktop/tablet/phone layouts; touch selectors retain at least 44px targets and 18px phone body copy.
- 2026-11-01: opening now advances on a short left click/touch tap rather than a next-step button. Each gesture plays one 1.4-second bounded illustration step and waits. Opening animates only the first explanation. Controls, text selection, long holds and non-primary/cancelled pointers do not double-advance; rapid clicks replace the previous RAF. Space/Enter/right arrow and reduced-motion alternatives remain available. The final result requires an explicit exit.
- 2026-11-01: replaced the media-player opening with an automatic full-viewport animated introduction. Large illustrations, short explanations and stronger cyan/AI-blue/coral/amber/green surfaces fill the viewport. All 28 explanations remain reachable through next/previous, section and cue controls. Every public reload opens it; the authenticated dashboard does not. Video timeline, time/speed controls and framed scene panels were removed. Escape/skip, focus return, hidden-tab pause and reduced-motion are retained.
- 2026-11-01: opening presentation extended into a 102-second film with seven scenes and 28 synchronized captions. Progress drives request/response packets, evidence and guide reading, report formation, scoped approval and recovery. Video controls include pause, scrub, +/-10 seconds, 0.75x–1.5x speed and exact scene/caption selection. Hidden-tab pause, motion-off, reduced-motion and phone controls are verified; no lab or model action is connected.
- 2026-11-01: seven-slide opening presentation explains purpose, stack and the recorded fault-to-recovery process. Native modal, session dismissal/reopen, manual/optional automatic playback, keyboard focus, phone controls and reduced-motion support. Slide links select the matching existing case stage or evidence ledger; the public explanation makes no model or lab request.
- Architecture, data model, API/tool contracts, security boundaries and roadmap.
- Frozen uv/npm dependencies, Alembic initial migration and local secret generation.
- Separate control PostgreSQL and fault-target PostgreSQL; authenticated lab telemetry.
- Deterministic availability/resource rules, concurrent deduplication and recovery lifecycle.
- Durable diagnosis queue, evidence snapshots, structured reports and citation checks.
- Rules provider and optional OpenAI Agents SDK adapter, tested with a mocked runner.
- Saved runbook/resolved-incident retrieval and actual Qdrant HTTP index verification.
- Exact-scope expiring approval, rejection, single-attempt execution and pre/post checks.
- React console: overview, inventory, incidents, evidence, knowledge, approvals and audit.
- Real Docker outage/recovery tests, browser workflow checks and portfolio/demo drafts.
- Published public GitHub repository: https://github.com/ShaNuva66/aiops-agent on 2026-10-16. Initial GitHub Actions run started; its results are separate from local verification.
- Normal username/password dashboard login, first-account creation and remember-me sessions.
- Hashed passwords, revocable HttpOnly cookies, CSRF/origin checks and login throttling.
- Turkish explanations on every operations screen, a glossary, four-step navigation and readable evidence summaries.
- Optional learning explanations, preserved original technical data and common Turkish knowledge-search keywords.
- Interactive HTTP/database fault walkthrough with changing topology and playback; explicitly educational and without backend writes.
- Incident story from prior observations, evidence, scoped approvals/audit and verified recovery, separating manual closure from monitored recovery.
- 2026-10-19: one completed live gpt-4o-mini HTTP-fault case in an isolated Windows/SQLite lab; public read-only case page at /?case=1 with model findings, tools, scoped approval, HTTP 200 verification and recovery.
- 2026-10-25: Observatory presentation with animated topology, six-stage replay, plain/technical views, role boundaries, original AI report, evidence navigation and case download; default public route, operations retained at /?dashboard=1.
- 2026-10-26: shared multi-accent palette and motion controls across public/authenticated routes; fine-pointer halo, local card lighting, no input/click interception, touch and reduced-motion fallbacks. Production build, formatting, Ruff and browser checks passed; console inspected against a disposable SQLite fixture, not the user's account.
- 2026-10-31: exact, focusable proof navigation and cited guide visibility; offline readable incident export with escaped data and no scripts/network assets. Verified record derivation avoids successful outcomes when required records are missing. Turkish reconnect/stale-data states preserve uncertainty and block interventions during disconnect. One-click Windows presentation launcher preserves credentials and existing services. Frontend contract tests now run in CI.

- 2026-10-31: bounded diagnosis context retains original/fresh evidence beyond 50 rows; enqueue retries serialize per incident. Historical telemetry is timestamped and malformed bearer headers return 401.

## Last test results
- 61 pytest tests passed on 2026-10-31; measured backend coverage 93.61%.
- 71 frontend contract tests passed on 2026-11-02; TypeScript/Vite, Prettier and Ruff passed. Narrative contracts cover missing/unrelated proof and exact animation boundaries. Current browser checks include one-click bounded animation, all 28 explanations at five viewport sizes, touch/keyboard behavior, focus restoration, proof navigation and matching action/recovery results. No backend or model call was needed for this frontend pass.
- 27 real Docker acceptance checks passed on GitHub Actions on 2026-10-31; the local Docker engine was unavailable.
- Actual Qdrant 1.19.1 server storage/query check passed.
- TypeScript/Vite production build, Prettier, Ruff and Alembic drift checks passed.
- npm audit reported zero vulnerabilities at the time of the check.
- Browser login, source search, incident reports and approval/recovery interaction checked.
- Learning UI checked separately with an isolated database, simulation incidents and read-only live telemetry; desktop and 390px mobile views inspected.
- See TEST_RESULTS.md for measured timings and verification boundaries.

## In progress / next task
Extend live-model evaluation across labelled faults. One HTTP case completed; early runs
exposed invalid knowledge references and unsupported causality on an unrelated disk case.
Do not treat a single successful case as diagnosis accuracy or production reliability.
After evaluation, integrate and test a real Zabbix deployment using the existing ingestion contract.

## Known limitations
- Live OpenAI inference was exercised for one successful HTTP case, with failures documented; broad accuracy and semantic retrieval quality remain unverified.
- No Zabbix deployment, Windows Server or Active Directory integration yet.
- One local operator account; email recovery and public multi-user registration are not implemented.
- Single API process; slow probes/diagnosis delay the next monitoring cycle.
- Resource metrics are scoped to the Linux lab, not Windows host/server-wide measurements.
- Database container logs are inspected by the operator, not a privileged agent tool.
- Local administrator tokens, best-effort redaction, no automated retention and no immutable audit store.
- Raw monitoring events accumulate; not suitable for unbounded production operation.
- DNS/network faults are not isolated end-to-end exercises yet.

## Important decisions
Use the Python collector first, keep default operation read-only, keep fault targets separate
from control storage, and label all simulation/mock/lexical behavior explicitly. Full decision
records: DECISIONS.md. Full master-project scope remains tracked in ROADMAP.md.

## Local handoff
Public Observatory: http://127.0.0.1:8080 (also /?case=1).
Authenticated dashboard: http://127.0.0.1:8080/?dashboard=1; API docs: http://127.0.0.1:8000/api/docs.
Create your account in the browser on first use; then sign in with username/password.
No dashboard API token is needed. Machine integrations still use their separate .env tokens.
Test-created incident/audit history is retained.
Base Compose configuration disables runbook execution; optional Qdrant can be started on demand.
