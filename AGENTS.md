# Project working instructions

At the start of an implementation session read docs/PROGRESS.md, docs/DECISIONS.md,
docs/ARCHITECTURE.md and docs/SECURITY.md. Preserve existing work.

Explain changes to the user in Turkish. Use English code names and technical documentation.
Keep monitoring deterministic. Never present rule-based reports, mocks, simulations,
lexical vector retrieval or untested integrations as real LLM/semantic inference.

Do not add arbitrary shell tools, caller-selected network destinations, Docker socket
mounts or host-level fault injection. Writes require an exact-scope human approval and
the explicit lab execution configuration flag. Keep control and target databases separate.

After changes run relevant pytest tests, Ruff checks, frontend build when affected, and
real Docker tests when infrastructure/flow changes. Run only one backend process.
Update progress and test results, including failures and unverified behaviors.
Never read credentials into tool output or commit .env/browser authentication artifacts.
