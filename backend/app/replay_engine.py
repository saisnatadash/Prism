"""Releases the next held-back report in chronological order and pushes it
through extract -> cluster re-check -> evidence verification -> confidence
update, in one call."""

from __future__ import annotations

from openai import AsyncOpenAI
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.anomaly_scoring import score_cluster
from app.clustering import run_clustering
from app.core.config import get_settings
from app.evidence_engine import apply_evidence_to_hypothesis
from app.llm_pipeline import _embedding_text, _fetch_unprocessed_reports, extract_observation
from app.models.cluster import Cluster
from app.models.hypothesis import Hypothesis
from app.models.report import Report
from app.models.structured_signal import StructuredSignal
from app.schemas.replay import EvidenceCheckOut, ReplayResult, StructuredSignalOut
from app.services.embeddings import embed_texts


async def replay_next(db: Session) -> ReplayResult | None:
    settings = get_settings()
    next_reports = _fetch_unprocessed_reports(db, limit=1)
    if not next_reports:
        return None
    report = next_reports[0]

    client = AsyncOpenAI(base_url=settings.groq_base_url, api_key=settings.groq_api_key)
    try:
        extraction, used_fallback = await extract_observation(client, settings, report)
    finally:
        await client.close()

    text_for_embedding = _embedding_text(extraction, report.raw_text)
    vector = embed_texts([text_for_embedding])[0]

    signal = StructuredSignal(
        report_id=report.id,
        category=extraction.possible_domain,
        summary=report.raw_text,
        entities={
            "phenomena": extraction.phenomena,
            "entities": extraction.entities,
            "approximate_time": extraction.approximate_time,
            "location": extraction.location,
            "reporter_scale": extraction.reporter_scale,
            "certainty": extraction.certainty,
            "possible_domain": extraction.possible_domain,
            "extraction_status": "fallback" if used_fallback else "ok",
        },
        severity_hint=extraction.severity,
        embedding=vector,
    )
    db.add(signal)
    db.commit()
    db.refresh(signal)

    run_clustering(db)
    db.refresh(signal)

    affected_cluster: Cluster | None = None
    evidence_checks: list[EvidenceCheckOut] = []
    hypotheses: list[Hypothesis] = []
    cluster_out: dict | None = None

    if signal.cluster_id is not None:
        affected_cluster = db.get(Cluster, signal.cluster_id)
        anomaly = score_cluster(
            affected_cluster.report_count, affected_cluster.first_seen_at, affected_cluster.last_seen_at
        )
        affected_cluster.anomaly_score = anomaly.anomaly_score
        db.commit()
        db.refresh(affected_cluster)

        hyp_rows = list(
            db.execute(
                select(Hypothesis).where(Hypothesis.cluster_id == affected_cluster.id, Hypothesis.status == "active")
            )
            .scalars()
            .all()
        )
        for h in hyp_rows:
            check = await apply_evidence_to_hypothesis(db, h, affected_cluster, signal, report)
            evidence_checks.append(EvidenceCheckOut.model_validate(check, from_attributes=True))
        hypotheses = hyp_rows

        cluster_out = {
            **{c.name: getattr(affected_cluster, c.name) for c in affected_cluster.__table__.columns},
            "anomaly_explanation": anomaly.explanation,
            "hypotheses_generated": len(hypotheses) > 0,
        }

    remaining = db.execute(
        select(func.count())
        .select_from(Report)
        .outerjoin(StructuredSignal, StructuredSignal.report_id == Report.id)
        .where(StructuredSignal.id.is_(None))
    ).scalar_one()

    return ReplayResult(
        report=report,
        signal=StructuredSignalOut(
            id=signal.id,
            report_id=signal.report_id,
            category=signal.category,
            severity_hint=signal.severity_hint,
            entities=signal.entities,
        ),
        cluster=cluster_out,
        hypotheses=hypotheses,
        evidence_checks=evidence_checks,
        remaining_unprocessed=remaining,
    )
