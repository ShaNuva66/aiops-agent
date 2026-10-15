# HTTP 500 availability troubleshooting

Applies to sample-api availability incidents. An HTTP 500 can be a controlled injected
fault or an application defect. Confirm the telemetry fault field and database readiness.

The clear-http-fault:v1 runbook only clears an explicitly injected http500 state in
the test API. It cannot repair arbitrary application bugs or a stopped PostgreSQL.
Its precondition is api.fault == http500. It requires a target-bound, time-limited human
approval. After the action, /health/ready must return HTTP 200.

If the database remains unavailable, the action is recorded as failed verification.
Do not repeat using the same approval. Review evidence and request a new action if appropriate.
