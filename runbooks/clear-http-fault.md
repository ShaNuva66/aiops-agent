# clear-http-fault:v1

- **Target:** sample-api in the fixed local lab.
- **Parameters:** empty object; any extra parameter is rejected.
- **Precondition:** current telemetry api.fault equals http500.
- **Authorization:** execution flag enabled, unexpired exact-scope approved action.
- **Action:** authenticated POST to the fixed /admin/clear-http-fault endpoint.
- **Verification:** /health/ready returns HTTP 200 after clearing the fault.
- **Failure:** persist failed attempt; do not reuse approval; inspect current target state.
- **Rollback:** no automatic reintroduction of an outage; an operator can explicitly inject
  http500 again for a new lab exercise with scripts/lab_fault.py.
- **Implementation:** backend/resolution.py; no document content is interpreted as code.

This cannot restart PostgreSQL, delete files, edit networks or execute shell commands.
