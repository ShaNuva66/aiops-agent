# Roadmap

## Implemented local MVP
- [x] Phase 0: architecture, contracts, security, acceptance plan and project memory.
- [x] Phase 1: separate databases, real API, health, telemetry, explicit fault injection.
- [x] Phase 2: deterministic Python collector, thresholds, idempotency and correlation.
- [x] Phase 3: incident APIs, inventory, dashboard, API tests, Alembic and audit trail.
- [x] Phase 4 implementation: structured rules/provider adapter and SDK contract tests.
- [x] Phase 5 initial retrieval: saved runbooks/incident sources; optional lexical Qdrant index.
- [x] Phase 6 initial execution: exact-scope approval and verified HTTP fault reset.
- [x] Phase 7 initial evaluation: unit/API tests plus real PostgreSQL/HTTP recovery acceptance.
- [x] Phase 8 initial materials: setup, architecture, measured results and demo/CV drafts.

## Still required for the broader master-project scope
- [ ] Live OpenAI diagnosis evaluation with explicit model/provider configuration.
- [ ] Zabbix deployment, templates and tested webhook delivery/recovery semantics.
- [ ] Learned semantic embedding adapter, retrieval relevance dataset and quality comparison.
- [ ] Separate collection scheduling from slow LLM inference using a leased durable worker.
- [ ] Real DNS/network fault isolation in a dedicated disposable lab network.
- [ ] Dedicated Linux VM for authentic host metrics and systemd/journal exercises.
- [ ] More evidence sources and separately reviewed recovery runbooks.
- [ ] Data retention/archive and stronger user identity/RBAC before any public deployment.
- [ ] Windows Server / Active Directory extension after resource review.
- [ ] Recorded demo video, reviewed screenshots and GitHub publication by the owner.

Next priority is live AI evaluation, then Zabbix. Do not label unfinished checks complete.
