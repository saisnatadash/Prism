"""Semantic + geo + temporal clustering of structured_signals, via pgvector
SQL (no LLM). Connected-components over a candidate-edge query: two signals
are linked when they're from the same ward, within a rolling time window,
and cosine-similar. Clusters below MIN_CLUSTER_REPORTS (a proxy for
"multiple independent reporters") are discarded.
"""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import datetime

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.cluster import Cluster
from app.models.report import Report
from app.models.structured_signal import StructuredSignal

SIMILARITY_THRESHOLD = 0.5  # cosine similarity, tune here
TIME_WINDOW_HOURS = 6  # rolling window for "same episode"
# 3 was too low: with ~20 wards x 4 background topics, coincidental 3-report
# clumps of routine chatter (e.g. 3 garbage complaints in one ward) cross the
# anomaly threshold by chance. 5 makes random background clumping much less
# likely while the real planted event still clears it by a wide margin.
MIN_CLUSTER_REPORTS = 5

_EDGE_SQL = text(
    """
    SELECT a.id AS id_a, b.id AS id_b
    FROM structured_signals a
    JOIN structured_signals b ON a.id < b.id
    JOIN reports ra ON ra.id = a.report_id
    JOIN reports rb ON rb.id = b.report_id
    WHERE a.embedding IS NOT NULL
      AND b.embedding IS NOT NULL
      AND ra.location_name = rb.location_name
      AND ABS(EXTRACT(EPOCH FROM (ra.reported_at - rb.reported_at))) <= :window_seconds
      AND (1 - (a.embedding <=> b.embedding)) >= :similarity_threshold
    """
)



class _UnionFind:
    def __init__(self, ids: list[uuid.UUID]):
        self.parent = {i: i for i in ids}

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb


def _fetch_nodes(db: Session) -> dict[uuid.UUID, dict]:
    # Goes through the ORM (not raw SQL) so pgvector's Vector type properly
    # deserializes `embedding` into a list of floats rather than raw wire text.
    stmt = (
        select(StructuredSignal, Report)
        .join(Report, Report.id == StructuredSignal.report_id)
        .where(StructuredSignal.embedding.isnot(None))
    )
    nodes: dict[uuid.UUID, dict] = {}
    for signal, report in db.execute(stmt).all():
        embedding = signal.embedding
        nodes[signal.id] = {
            "id": signal.id,
            "report_id": signal.report_id,
            "embedding": list(embedding) if embedding is not None else None,
            "location_name": report.location_name,
            "location_lat": report.location_lat,
            "location_lng": report.location_lng,
            "reported_at": report.reported_at,
            "category": signal.category,
            "severity_hint": signal.severity_hint,
        }
    return nodes


def _fetch_edges(db: Session) -> list[tuple[uuid.UUID, uuid.UUID]]:
    rows = db.execute(
        _EDGE_SQL,
        {"window_seconds": TIME_WINDOW_HOURS * 3600, "similarity_threshold": SIMILARITY_THRESHOLD},
    ).all()
    return [(r.id_a, r.id_b) for r in rows]


def _components(nodes: dict[uuid.UUID, dict], edges: list[tuple[uuid.UUID, uuid.UUID]]) -> list[list[uuid.UUID]]:
    uf = _UnionFind(list(nodes.keys()))
    for a, b in edges:
        uf.union(a, b)
    groups: dict[uuid.UUID, list[uuid.UUID]] = {}
    for node_id in nodes:
        root = uf.find(node_id)
        groups.setdefault(root, []).append(node_id)
    return list(groups.values())


def _mean_vector(vectors: list[list[float]]) -> list[float]:
    n = len(vectors)
    dim = len(vectors[0])
    return [sum(v[i] for v in vectors) / n for i in range(dim)]


def run_clustering(db: Session) -> list[Cluster]:
    """Recompute clusters from all processed signals. Existing clusters are
    reused (by member overlap) so cluster_id - and therefore any hypotheses
    already attached to it - stays stable across repeated calls."""
    nodes = _fetch_nodes(db)
    if not nodes:
        return []
    edges = _fetch_edges(db)
    components = [c for c in _components(nodes, edges) if len(c) >= MIN_CLUSTER_REPORTS]

    # Map existing structured_signals.cluster_id -> Cluster, to reuse ids.
    existing_by_signal: dict[uuid.UUID, uuid.UUID] = {}
    for row in db.execute(text("SELECT id, cluster_id FROM structured_signals WHERE cluster_id IS NOT NULL")):
        existing_by_signal[row.id] = row.cluster_id

    result: list[Cluster] = []

    for member_ids in components:
        member_nodes = [nodes[i] for i in member_ids]
        centroid = _mean_vector([n["embedding"] for n in member_nodes])
        lats = [n["location_lat"] for n in member_nodes if n["location_lat"] is not None]
        lngs = [n["location_lng"] for n in member_nodes if n["location_lng"] is not None]
        timestamps = [n["reported_at"] for n in member_nodes]
        ward = member_nodes[0]["location_name"]
        # Most common category as the representative label.
        # most_common() breaks ties by first-seen order (deterministic),
        # unlike max(set(...), key=count) whose set-iteration order varies
        # per-process with Python's hash randomization.
        categories = [n["category"] for n in member_nodes if n["category"]]
        category = Counter(categories).most_common(1)[0][0] if categories else None

        # Reuse an existing cluster id if any member already belongs to one.
        reused_id = None
        for mid in member_ids:
            if mid in existing_by_signal:
                reused_id = existing_by_signal[mid]
                break

        cluster = db.get(Cluster, reused_id) if reused_id else None
        if cluster is None:
            cluster = Cluster(id=reused_id or uuid.uuid4())
            db.add(cluster)

        cluster.category = category
        cluster.representative_summary = f"{len(member_ids)} related reports in {ward}"
        cluster.centroid_embedding = centroid
        cluster.location_name = ward
        cluster.location_lat = sum(lats) / len(lats) if lats else None
        cluster.location_lng = sum(lngs) / len(lngs) if lngs else None
        cluster.report_count = len(member_ids)
        cluster.first_seen_at = min(timestamps)
        cluster.last_seen_at = max(timestamps)
        cluster.status = "active"
        db.flush()  # ensure cluster.id is populated for a new row

        for mid in member_ids:
            db.execute(
                text("UPDATE structured_signals SET cluster_id = :cid WHERE id = :sid"),
                {"cid": cluster.id, "sid": mid},
            )

        result.append(cluster)

    # Any signal no longer in a qualifying component loses its cluster link,
    # and clusters that dissolved entirely are dropped.
    all_member_ids = {mid for members in components for mid in members}
    orphaned = [sid for sid in nodes if sid not in all_member_ids and sid in existing_by_signal]
    for sid in orphaned:
        db.execute(text("UPDATE structured_signals SET cluster_id = NULL WHERE id = :sid"), {"sid": sid})

    # Note: clusters that lose all members are left in place rather than
    # deleted, since hypotheses may already reference them (ON DELETE CASCADE
    # would silently wipe out generated hypotheses).

    db.commit()
    return result
