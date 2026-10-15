# PostgreSQL availability troubleshooting

Applies to sample-postgres availability incidents in the local airport lab.

An unavailable database can result from a stopped process, network failure, authentication
failure, startup recovery, resource exhaustion, or misconfiguration. A failed SELECT 1
does not establish which cause applies.

1. Compare the monitoring event timestamp with current database health.
2. The operator can inspect `docker compose ps lab-db` and `docker compose logs --tail 50 lab-db`.
3. Check storage and database logs before concluding that disk space is exhausted.
4. If the lab exercise deliberately stopped the database, the operator can restore it using
   `docker compose start lab-db`. The agent has no permission to run this command.
5. Verify readiness and wait for a recovery event before declaring recovery.

Never delete PostgreSQL data files as a generic repair. Root cause may remain unknown.
