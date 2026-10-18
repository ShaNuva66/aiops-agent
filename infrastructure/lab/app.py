import hmac
import logging
import os
from collections import deque
from concurrent.futures import Future, ThreadPoolExecutor
from datetime import UTC, datetime
from threading import Lock
from typing import Literal

import psutil
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import create_engine, text

app = FastAPI(title="Airport Operations Test API", docs_url=None, redoc_url=None)
engine = create_engine(
    os.environ.get("LAB_DATABASE_URL", "sqlite:///./lab.db"),
    pool_pre_ping=True,
    connect_args={"connect_timeout": 2}
    if os.environ.get("LAB_DATABASE_URL", "").startswith("postgresql")
    else {},
)
logs: deque = deque(maxlen=100)
state = {"fault": "none"}
lock = Lock()
logger = logging.getLogger("lab")
db_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="lab-db-probe")
db_lock = Lock()
db_future: Future | None = None
DB_PROBE_TIMEOUT = 2.5


def log(message: str) -> None:
    with lock:
        logs.append({"at": datetime.now(UTC).isoformat(), "message": message})
    logger.info(message)


def authorized(request: Request) -> None:
    expected = os.environ.get("LAB_TOKEN", "")
    if not expected or not hmac.compare_digest(
        request.headers.get("Authorization", ""),
        "Bearer " + expected,
    ):
        raise HTTPException(401, "Lab authorization required")


def probe_database() -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def database_status() -> dict:
    global db_future
    # DNS resolution can outlast psycopg connect_timeout after a Docker service stops.
    # Reuse one pending probe so slow DNS never blocks telemetry or spawns unbounded work.
    with db_lock:
        if db_future is None or db_future.done():
            db_future = db_executor.submit(probe_database)
        pending = db_future
    try:
        pending.result(timeout=DB_PROBE_TIMEOUT)
        return {"healthy": True}
    except Exception as exc:
        log("Database health probe failed: " + type(exc).__name__)
        return {"healthy": False, "error": type(exc).__name__}


@app.get("/health/live")
def live():
    return {"status": "alive"}


@app.get("/health/ready")
def ready():
    db = database_status()
    if state["fault"] == "http500":
        log("Injected HTTP 500 fault is active")
        return JSONResponse({"status": "failed", "reason": "injected_http500"}, status_code=500)
    if not db["healthy"]:
        return JSONResponse({"status": "failed", "reason": "database_unavailable"}, status_code=503)
    return {"status": "ready"}


@app.get("/telemetry", dependencies=[Depends(authorized)])
def telemetry():
    database = database_status()
    with lock:
        recent = list(logs)[-30:]
    return {
        "observed_at": datetime.now(UTC).isoformat(),
        "scope": os.environ.get(
            "LAB_SCOPE", "Linux container process CPU; Linux VM memory; container filesystem disk"
        ),
        "api": {"healthy": state["fault"] != "http500", "fault": state["fault"]},
        "database": database,
        "metrics": {
            "cpu": psutil.Process().cpu_percent(interval=0.1),
            "memory": psutil.virtual_memory().percent,
            "disk": psutil.disk_usage("/").percent,
        },
        "logs": recent,
    }


class FaultInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fault: Literal["http500", "none"]


@app.post("/admin/fault", dependencies=[Depends(authorized)])
def fault(payload: FaultInput):
    state["fault"] = payload.fault
    log("Operator set fault to " + payload.fault)
    return state


@app.post("/admin/clear-http-fault", dependencies=[Depends(authorized)])
def clear_fault():
    if state["fault"] != "http500":
        raise HTTPException(409, "No HTTP fault is active")
    state["fault"] = "none"
    log("Approved runbook cleared HTTP fault")
    return state


@app.get("/flights")
def flights():
    response = ready()
    if isinstance(response, JSONResponse):
        return response
    # Domain demo data, clearly separate from actual monitoring observations.
    return {
        "data_kind": "fictional_business_demo",
        "flights": [
            {"flight": "LAB-101", "destination": "Istanbul", "status": "boarding"},
        ],
    }
