import pytest
from fastapi.testclient import TestClient

from backend.config import Settings
from backend.db import session_factory
from backend.main import create_app
from backend.models import Base


@pytest.fixture
def settings(tmp_path):
    return Settings(
        _env_file=None,
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        api_token="operator-" + "a" * 32,
        ingest_token="ingest-" + "b" * 32,
        lab_token="lab-" + "c" * 32,
        monitor_enabled=False,
        lab_url="http://127.0.0.1:1",
        enable_lab_execution=False,
        qdrant_url="",
        diagnosis_provider="rules",
        openai_api_key="",
        openai_model="",
    )


@pytest.fixture
def factory(settings):
    factory = session_factory(settings)
    Base.metadata.create_all(factory.kw["bind"])
    yield factory
    factory.kw["bind"].dispose()


@pytest.fixture
def client(settings, factory):
    with TestClient(create_app(settings, factory)) as client:
        yield client


@pytest.fixture
def operator(settings):
    return {"Authorization": f"Bearer {settings.api_token}"}


@pytest.fixture
def ingester(settings):
    return {"Authorization": f"Bearer {settings.ingest_token}"}
