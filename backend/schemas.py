from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EventInput(StrictModel):
    source: Literal["collector", "zabbix", "test"]
    event_id: str = Field(min_length=1, max_length=120)
    asset_id: Literal["lab-node"]
    service_id: Literal["sample-api", "sample-postgres"]
    check: Literal["availability", "cpu", "memory", "disk"]
    state: Literal["problem", "recovery"]
    severity: Literal["warning", "critical"] = "critical"
    source_kind: Literal["real", "simulation"] = "real"
    observed_at: datetime
    data: dict[str, Any] = Field(default_factory=dict)

    @field_validator("observed_at")
    @classmethod
    def timezone_required(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("Timezone-aware timestamp required")
        return value


class IncidentUpdate(StrictModel):
    status: Literal["investigating", "resolved"]
    note: str = Field(min_length=5, max_length=2000)


class Finding(StrictModel):
    statement: str
    evidence_ids: list[str]
    confidence: Literal["low", "medium", "high"]


class DiagnosisReport(StrictModel):
    summary: str
    findings: list[Finding]
    unknowns: list[str]
    recommendations: list[str]
    source_ids: list[str]


class ApprovalInput(StrictModel):
    incident_id: str
    runbook: Literal["clear-http-fault:v1"]
    target: Literal["sample-api"]
    parameters: dict[str, Any] = Field(default_factory=dict)

    @field_validator("parameters")
    @classmethod
    def no_parameters(cls, value: dict[str, Any]) -> dict[str, Any]:
        if value:
            raise ValueError("This runbook accepts no parameters")
        return value


class ApprovalDecision(StrictModel):
    decision: Literal["approve", "reject"]


class SearchInput(StrictModel):
    query: str = Field(min_length=2, max_length=500)
