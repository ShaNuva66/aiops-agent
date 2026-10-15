import hashlib
import json
import re
from typing import Any

from backend.models import AuditEvent


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            k: "[REDACTED]"
            if re.search(r"password|secret|token|api.?key|authorization|cookie", k, re.I)
            else redact(v)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [redact(v) for v in value]
    if isinstance(value, str):
        value = re.sub(r"(?i)(bearer\s+)[\w.\-]+", r"\1[REDACTED]", value)
        value = re.sub(
            r"(?i)((?:password|secret|token|api[_-]?key)\s*[=:]\s*)[^\s,;]+",
            r"\1[REDACTED]",
            value,
        )
        value = re.sub(r"(://[^:\s/]+:)[^@\s]+(@)", r"\1[REDACTED]\2", value)
        return value[:16000]
    return value


def fingerprint(runbook: str, target: str, parameters: dict[str, Any]) -> str:
    raw = json.dumps([runbook, target, parameters], sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


def audit(session, actor: str, action: str, target: str, details: dict | None = None) -> None:
    session.add(
        AuditEvent(actor=actor, action=action, target=target, details=redact(details or {}))
    )
