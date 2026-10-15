# Agent tool contracts

The implemented SDK registry is intentionally small. No tools accept a free-form command,
URL, file path, asset ID or service ID. The assigned incident fixes each tool's scope.

| Tool | Input | Output | Authority |
|---|---|---|---|
| get_incident_evidence | none | JSON snapshots with actual IDs, sources and timestamps | Read assigned incident only |
| search_knowledge_base | none | Retrieved source IDs, revisions, content and retrieval method | Read preselected query results only |
| get_service_status | none | Assigned service health and observation time | Read assigned service; simulation returns unknown |

Before invoking the LLM, the worker performs one real bounded telemetry collection for
real incidents, persists it as evidence and retrieves knowledge. The SDK agent then chooses
read-only tools to examine these records. Every completed report must have invoked the
evidence tool and every finding must reference an actual allowed evidence ID.

The rules provider is deterministic application logic, not a mock LLM agent. It uses the
same persisted evidence and report schema; it does not execute SDK tools or infer causes.

The collector obtains real process CPU, Linux VM-visible memory, container filesystem disk,
application fault/live state, database SELECT 1 status and bounded probe logs through
the fixed authenticated /telemetry endpoint. Database container logs remain an operator
inspection task; the agent is not given Docker access.

## Controlled operations outside the LLM registry
create/update incident, request/decide approval, execute approved runbook and health
verification are application service operations with API authentication and policy checks.
They are deliberately not write tools available to the diagnosis model. The UI and
operator API initiate them. A diagnosis result never grants authorization.

Limits: 8 SDK tool invocations, 5 turns, 90-second run timeout; log count and payload sizes
are bounded; provider tracing disabled. These bound execution, not factual correctness.
