# Security model

## Trust boundary
Local single-operator lab. Admin-controlled configuration chooses the lab URL. Request
inputs cannot select arbitrary hosts, URLs, files or commands. Only lab-node, sample-api
and sample-postgres are accepted inventory targets. Agents never receive a shell tool.

## Credentials and authorization
Independent randomly generated operator, monitoring-ingestion and lab tokens. Required
minimum length: 24 characters; settings reject equal tokens. No default working secrets.
Operator routes accept an authenticated browser session or API_TOKEN; event ingestion requires
INGEST_TOKEN; lab telemetry
and fault controls require LAB_TOKEN. Machine-local plaintext .env is ignored by Git.
Secrets are environment-injected into containers. This is not a managed secret vault.

The dashboard creates one operator account on first use; a unique bootstrap slot prevents
concurrent creation of multiple first accounts. Usernames are case-insensitive. Passwords
use salted scrypt (N=32768, r=8, p=3) and are never stored or returned as plaintext.
Opaque session IDs are stored only as SHA-256 hashes on the server. Browser cookies are
HttpOnly, SameSite=Strict and scoped to /api. No dashboard token is stored in web storage.
Legacy sessionStorage tokens are removed when the updated UI starts.

Default browser sessions expire server-side after 8 hours; remembered sessions and cookies
expire after 30 days. Logout deletes the server session and clears the cookie. Cookie-authenticated
writes require a per-session CSRF token plus matching Origin when supplied. Login/setup also
check Origin. The reverse proxy preserves Host so the origin check applies to the browser origin.
Login is limited after 10 failed attempts in 5 minutes per server-observed client address;
behind this local proxy, clients share a proxy address. Password hashing concurrency is capped.

Local HTTP uses COOKIE_SECURE=false. HTTPS deployment must set COOKIE_SECURE=true and
review proxy scheme handling. No CORS allowlist is opened globally. All published ports are
loopback-only. Public deployment still requires TLS, account recovery, RBAC and proxy-aware
rate limiting. This is one local operator account, not a public multi-user identity service.

## Data handling
Key-based and common string-pattern credential redaction before storing monitoring payloads,
evidence and audit details. This is best-effort, not a complete DLP system. Personal data
and unusual secret formats can remain. Review evidence before using a remote model.
Raw provider errors are not persisted. Provider tracing is disabled. Request bodies
are bounded to 128 KB; telemetry and log count are also bounded.

## Prompt injection
Logs/documents are untrusted evidence; instructions explicitly forbid following their
commands. Tool closures restrict the incident and disclose only permitted data. The SDK
tool registry has no write tools; execution authorization is implemented outside the LLM.
Evidence and source references are verified after generation. A model may still produce
a misleading explanation, so no diagnosis automatically authorizes or executes a change.
Offline tests cannot establish live-model prompt-injection resistance.

## Writes
Default execution disabled. Only clear-http-fault:v1 for sample-api with empty parameters.
Approval binds runbook version, target, canonical parameters and expires in 300 seconds.
Approve/reject is a one-time transition. Executor validates scope and expiry, atomically
claims approved -> executing, commits the claim and start audit BEFORE external I/O.
Then it checks the explicit injected fault, clears it and verifies readiness.
Failure, rejection, expiry, tampering and consumed approvals never allow replay.

The operator-only fault injector is an explicit local test instrument, not an agent tool.
It can change the sample API state with the private lab token. Anyone possessing LAB_TOKEN
can bypass the platform workflow at the test API; it is a trusted administrator credential.

## Container controls and limitations
Python services run as numeric non-root user, with read-only root filesystems, dropped
capabilities, no-new-privileges, temporary /tmp and memory limits. No privileged containers,
host filesystem mounts or Docker socket. Docker administrators can inspect environment
secrets and control containers; they remain outside this application's threat boundary.

Audit events have no mutation API, but database administrators can change them. This is
not a tamper-proof compliance log. Retention is not automated; raw events accumulate.
Only one backend process is supported. Interrupted external writes require manual inspection.
