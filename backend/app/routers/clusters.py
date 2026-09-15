import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.anomaly_scoring import score_cluster
from app.clustering import run_clustering
from app.core.db import get_db
from app.hypothesis_engine import generate_hypotheses
from app.models.cluster import Cluster
from app.models.hypothesis import Hypothesis
from app.schemas.cluster import ClusterOut
from app.schemas.hypothesis import HypothesisOut

router = APIRouter()


@router.post("/detect", response_model=list[ClusterOut])
def detect_clusters(db: Session = Depends(get_db)) -> list[ClusterOut]:
    """Recompute clusters (pgvector SQL, no LLM) and score each for anomaly."""
    clusters = run_clustering(db)
    out: list[ClusterOut] = []
    for cluster in clusters:
        anomaly = score_cluster(cluster.report_count, cluster.first_seen_at, cluster.last_seen_at)
        cluster.anomaly_score = anomaly.anomaly_score
        db.commit()
        db.refresh(cluster)

        hyp_count = db.execute(
            select(func.count()).select_from(Hypothesis).where(Hypothesis.cluster_id == cluster.id)
        ).scalar_one()

        out.append(
            ClusterOut(
                **{c.name: getattr(cluster, c.name) for c in cluster.__table__.columns},
                anomaly_explanation=anomaly.explanation,
                hypotheses_generated=hyp_count > 0,
            )
        )
    out.sort(key=lambda c: c.anomaly_score, reverse=True)
    return out


@router.post("/{cluster_id}/hypotheses", response_model=list[HypothesisOut])
async def create_hypotheses(cluster_id: uuid.UUID, db: Session = Depends(get_db)) -> list[Hypothesis]:
    cluster = db.get(Cluster, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return await generate_hypotheses(db, cluster)


@router.get("/{cluster_id}/hypotheses", response_model=list[HypothesisOut])
def list_hypotheses(cluster_id: uuid.UUID, db: Session = Depends(get_db)) -> list[Hypothesis]:
    stmt = select(Hypothesis).where(Hypothesis.cluster_id == cluster_id).order_by(Hypothesis.confidence.desc())
    return list(db.execute(stmt).scalars().all())
