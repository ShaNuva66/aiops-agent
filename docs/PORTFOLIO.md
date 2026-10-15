# Portfolio and interview materials

## English CV draft — current verified scope
Built a local IT operations platform using Python, FastAPI, PostgreSQL, Docker Compose
and React. Implemented deterministic service monitoring, concurrent alert deduplication,
timestamped evidence collection, structured diagnosis, source-linked knowledge retrieval
and human-approved recovery runbooks. Validated real PostgreSQL outages and HTTP fault
recovery with automated integration tests. Added an optional OpenAI Agents SDK adapter;
live LLM diagnosis evaluation remains future work.

## Five-minute demo script
1. Show the architecture and the distinction between control-db and lab-db.
2. Open the console and explain the rules diagnosis label and read-only default.
3. Stop lab-db. Show service health, the incident, correlated alerts and cited evidence.
4. Start lab-db. Show recovery and the retained incident history.
5. Inject HTTP 500. Request approval, reject once, then create/approve/execute a new action
   in explicitly enabled lab execution mode. Show pre/post checks and audit entries.
6. Search PostgreSQL knowledge and point to a real saved incident source.
7. Show the test results and clearly identify features not yet evaluated.

## Interview prompts
- Alert vs incident: an alert is an observation; an incident is a tracked operational problem.
- Why separate databases? Losing the target must not erase the observer's state.
- Why no LLM thresholds? Numeric checks should be deterministic and independently testable.
- How is repeated delivery safe? Unique source/event IDs and per-correlation PostgreSQL locks.
- What does an agent tool do? It exposes a narrow typed operation with an application-enforced scope.
- Why is a citation insufficient? A valid source can still be misinterpreted; evaluation is separate.
- Why human approval? Diagnosis is not authorization to change a system.
- Why can a failed approval not replay? The durable execution claim is committed before the write.
- What is missing for production? Identity/RBAC, TLS, retention, independent scheduling,
  stronger audit integrity, provider evaluation and an operational recovery policy.

## LinkedIn draft — review before publishing
I built AIOps Agent, a local IT operations lab combining real service monitoring, incident
management and evidence-based troubleshooting. The project handles PostgreSQL outages,
correlates repeated alerts, preserves diagnostic evidence and gates a controlled HTTP
recovery runbook behind explicit human approval. I tested the flow against real Docker
services and documented its limitations. Next: evaluate the optional AI diagnosis adapter
and integrate Zabbix. Repository and demo links will be added after publication.

No post, repository or video has been published automatically.
