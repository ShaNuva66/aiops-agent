# Project progress

## Current milestone
Working local MVP delivered and verified on Windows 11 / Docker Desktop Linux engine.
Last implementation session: 2026-10-16, Europe/Istanbul.

## Completed
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

## Last test results
- 44 pytest tests passed; backend statement coverage displayed as 92%.
- 27 real Docker acceptance checks passed in the final run.
- Actual Qdrant 1.19.1 server storage/query check passed.
- TypeScript/Vite production build, Prettier, Ruff and Alembic drift checks passed.
- npm audit reported zero vulnerabilities at the time of the check.
- Browser login, source search, incident reports and approval/recovery interaction checked.
- Learning UI checked separately with an isolated database, simulation incidents and read-only live telemetry; desktop and 390px mobile views inspected.
- See TEST_RESULTS.md for measured timings and verification boundaries.

## In progress / next task
Configure an owner-selected model and API key privately, then run a live diagnosis evaluation
against labelled faults. Do not count mock/rules results as AI diagnosis accuracy.
After evaluation, integrate and test a real Zabbix deployment using the existing ingestion contract.

## Known limitations
- Live OpenAI inference and semantic retrieval quality have not been tested.
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
Dashboard: http://127.0.0.1:8080; API docs: http://127.0.0.1:8000/api/docs.
Create your account in the browser on first use; then sign in with username/password.
No dashboard API token is needed. Machine integrations still use their separate .env tokens.
Test-created incident/audit history is retained.
Base Compose configuration disables runbook execution; optional Qdrant can be started on demand.
