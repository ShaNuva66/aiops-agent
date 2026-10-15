# Monitoring integrations

The implemented monitor is backend/monitoring.py. It polls the fixed authenticated lab
telemetry endpoint. A collector outage does not establish that its PostgreSQL target is down.

External ingestion contract: POST /api/monitoring/events with INGEST_TOKEN bearer auth.
Supported sources: collector, zabbix, test. Source/event_id must be stable for redelivery.
Recovery must carry the same asset/service/check/source_kind as its problem and a later,
timezone-aware observed_at. Test source must explicitly be simulation.

Example payload (replace event timestamp with the actual observation time):

```json
{
  "source": "zabbix", "event_id": "zabbix-event-123-problem",
  "asset_id": "lab-node", "service_id": "sample-postgres",
  "check": "availability", "state": "problem", "severity": "critical",
  "source_kind": "real", "observed_at": "2026-10-15T12:00:00Z",
  "data": {"message": "Database probe failed"}
}
```

Use a distinct recovery event_id. source=zabbix is an authenticated ingestion contract,
not evidence that a Zabbix deployment is included or has been tested. Zabbix server,
media type, templates and action configuration are explicitly future work.
