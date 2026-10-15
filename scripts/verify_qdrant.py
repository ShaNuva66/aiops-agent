"""Run inside the backend container: python -m scripts.verify_qdrant.

This script performs real HTTP vector storage/query without displaying credentials.
"""

from backend.config import get_settings
from backend.db import session_factory
from backend.knowledge import search

settings = get_settings()
with session_factory(settings)() as session:
    sources = search(session, "PostgreSQL availability", qdrant_url="http://qdrant:6333")
    assert any(item["id"] == "runbook:postgres-unavailable" for item in sources)
    assert all(item["method"] == "qdrant-lexical-hash" for item in sources)
    print("PASS real Qdrant server storage and retrieval; lexical hashing (not semantic)")
