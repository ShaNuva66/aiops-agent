export type Evidence = {
  id: string;
  source: string;
  collected_at: string;
  data: unknown;
};
export type Report = {
  summary: string;
  findings: { statement: string; confidence: string; evidence_ids: string[] }[];
  unknowns: string[];
  recommendations: string[];
  source_ids: string[];
};
export type Diagnosis = {
  id: string;
  status: string;
  provider: string;
  created_at: string;
  error: string | null;
  report: Report | null;
};
export type Incident = {
  id: string;
  title: string;
  service_id: string;
  check: string;
  status: string;
  severity: string;
  source_kind: string;
  alert_count: number;
  created_at: string;
  last_seen_at: string;
  resolution_note: string | null;
  resolved_at?: string | null;
  story?: {
    previous: { observed_at: string; payload: unknown } | null;
    recovery: { observed_at: string; payload: unknown } | null;
    approvals: Approval[];
    actions: Audit[];
    actions_limit: number;
  };
  evidence?: Evidence[];
  diagnoses?: Diagnosis[];
};
export type Overview = {
  incidents_total: number;
  incidents_active: number;
  incidents_resolved: number;
  pending_approvals: number;
  diagnosis_provider: string;
  execution_enabled: boolean;
  knowledge_mode: string;
  monitor_enabled: boolean;
  runtime: { last_cycle_at: string | null; last_error: string | null };
};
export type Service = {
  id: string;
  name: string;
  status: string;
  checked_at: string | null;
  latest: {
    metrics?: Record<string, number>;
    scope?: string;
    logs?: unknown[];
  };
};
export type Approval = {
  id: string;
  incident_id: string;
  runbook: string;
  target: string;
  status: string;
  expires_at: string;
  result: unknown;
};
export type Audit = {
  id: string;
  created_at: string;
  actor: string;
  action: string;
  target: string;
  details: unknown;
};
export type Source = {
  id: string;
  title: string;
  source: string;
  content: string;
  revision: string;
  method: string;
};
