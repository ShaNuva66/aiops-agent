# Architecture decisions

| ID | Decision | Reason and consequence |
|---|---|---|
| ADR-001 | Modular monolith, single API process | Clear ownership and low operational overhead; not horizontally scalable yet. |
| ADR-002 | Separate control and target PostgreSQL | The monitoring platform survives the primary fault exercise. |
| ADR-003 | Python collector first | Fastest verifiable vertical slice; Zabbix deployment remains a later integration. |
| ADR-004 | Rules default; SDK optional | No required paid service. Rules output is explicitly not an AI quality result. |
| ADR-005 | Durable DB diagnosis jobs | Inspectable state without Redis/Celery; interrupted jobs fail rather than disappear. |
| ADR-006 | Single fixed HTTP recovery runbook | Real external side effect without privileged Docker socket or a general shell. |
| ADR-007 | Scope-bound, expiring, single-attempt approvals | Prevent silent target/parameter changes, rejection bypass and replay. |
| ADR-008 | Lexical retrieval and optional Qdrant hashing | Lightweight reproducible retrieval. Semantic embeddings intentionally not claimed. |
| ADR-009 | SQLite only for host development/unit tests | PostgreSQL remains the actual Compose storage and concurrency test target. |
| ADR-010 | React never renders raw HTML from logs or reports | Preserve untrusted content as escaped text, reducing XSS risk. |
| ADR-011 | Frozen uv.lock and package-lock.json | Repeatable dependency resolution; upgrades require renewed verification. |
| ADR-012 | No host resource exhaustion exercises | Resource threshold tests are mocked/unit or simulation-labelled, not real host stress. |
| ADR-013 | Username/password login with first-use account creation | Normal users do not handle API keys; one local account with a unique bootstrap slot. |
| ADR-014 | Opaque server-side sessions in HttpOnly cookies | Revocable logout, optional 30-day persistence, CSRF/origin checks; no API key in browser storage. |
| ADR-015 | Turkish learning explanations alongside original technical records | Novice operators can understand each check and follow its evidence; source IDs, timestamps, simulation labels and original data remain visible or expandable. Common Turkish search terms map to fixed lexical keywords, not model inference. |

These decisions are current implementation choices, not promises of production readiness.
