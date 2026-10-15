import hashlib
import math
import re
import uuid
from datetime import UTC
from pathlib import Path

from sqlalchemy import select

from backend.models import Incident, KnowledgeDocument
from backend.security import redact

ROOT = Path(__file__).resolve().parents[1] / "knowledge-base"
COLLECTION = "aiops_lexical_v1"
DIMENSIONS = 512


def tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9_]{2,}", text.lower())
    return {"postgres" if word == "postgresql" else word for word in words}


def embed(text: str) -> list[float]:
    """Offline lexical feature hashing; deliberately NOT a semantic embedding model."""
    vector = [0.0] * DIMENSIONS
    for word in tokens(text):
        digest = hashlib.sha256(word.encode()).digest()
        vector[int.from_bytes(digest[:4], "big") % DIMENSIONS] += 1.0
    norm = math.sqrt(sum(v * v for v in vector)) or 1
    return [v / norm for v in vector]


def seed(session) -> None:
    for path in sorted(ROOT.glob("*.md")):
        content = path.read_text(encoding="utf-8")
        session.merge(
            KnowledgeDocument(
                id=f"runbook:{path.stem}",
                title=content.splitlines()[0].lstrip("# "),
                content=content,
                source=f"knowledge-base/{path.name}",
                revision=hashlib.sha256(content.encode()).hexdigest(),
            )
        )


def index_incident(session, incident: Incident) -> None:
    content = redact(
        f"{incident.title}\nService: {incident.service_id}\nCheck: {incident.check}\n"
        f"Source kind: {incident.source_kind}\nResolution: {incident.resolution_note}"
    )
    session.merge(
        KnowledgeDocument(
            id=f"incident:{incident.id}",
            title=incident.title,
            content=content,
            source=f"/api/incidents/{incident.id}",
            revision=hashlib.sha256(content.encode()).hexdigest(),
        )
    )


def search(session, query: str, qdrant_url: str = "", client=None) -> list[dict]:
    documents = list(session.scalars(select(KnowledgeDocument)))
    wanted = tokens(query)
    ranked = []
    method = "lexical-overlap"
    if qdrant_url or client:
        from qdrant_client import QdrantClient, models

        own_client = client is None
        client = client or QdrantClient(url=qdrant_url, timeout=5)
        try:
            if not client.collection_exists(COLLECTION):
                client.create_collection(
                    COLLECTION,
                    vectors_config=models.VectorParams(
                        size=DIMENSIONS,
                        distance=models.Distance.COSINE,
                    ),
                )
            if documents:
                client.upsert(
                    COLLECTION,
                    points=[
                        models.PointStruct(
                            id=str(uuid.uuid5(uuid.NAMESPACE_URL, doc.id)),
                            vector=embed(doc.title + " " + doc.content),
                            payload={
                                "document_id": doc.id,
                                "kind": "runbook" if doc.id.startswith("runbook:") else "incident",
                            },
                        )
                        for doc in documents
                    ],
                    wait=True,
                )
                hits = client.query_points(
                    COLLECTION,
                    query=embed(query),
                    limit=20,
                    with_payload=True,
                ).points
                hits += client.query_points(
                    COLLECTION,
                    query=embed(query),
                    limit=3,
                    with_payload=True,
                    query_filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="kind",
                                match=models.MatchValue(value="runbook"),
                            )
                        ]
                    ),
                ).points
                scores = {hit.payload["document_id"]: hit.score for hit in hits}
                ranked = [
                    (scores.get(doc.id, 0), doc)
                    for doc in documents
                    if doc.id in scores and wanted & tokens(doc.title + " " + doc.content)
                ]
            method = "qdrant-lexical-hash"
        finally:
            if own_client:
                client.close()
    else:
        ranked = [
            (len(wanted & tokens(doc.title + " " + doc.content)), doc)
            for doc in documents
            if wanted & tokens(doc.title + " " + doc.content)
        ]
    recency = {
        f"incident:{ident}": timestamp.replace(tzinfo=UTC).timestamp()
        for ident, timestamp in session.execute(
            select(Incident.id, Incident.resolved_at).where(Incident.resolved_at.is_not(None))
        )
    }
    ordered = sorted(
        ranked,
        key=lambda item: (
            -len(wanted & tokens(item[1].title)),
            -item[0],
            -recency.get(item[1].id, 0),
            item[1].id,
        ),
    )
    # Repeated incident summaries must not crowd all operational runbooks out of the context.
    selected = []
    for prefix in ("runbook:", "incident:"):
        candidate = next((item for item in ordered if item[1].id.startswith(prefix)), None)
        if candidate:
            selected.append(candidate)
    selected_ids = {item[1].id for item in selected}
    selected += [item for item in ordered if item[1].id not in selected_ids][: 5 - len(selected)]
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "source": doc.source,
            "revision": doc.revision,
            "content": doc.content[:4000],
            "score": float(score),
            "method": method,
        }
        for score, doc in selected
    ]
