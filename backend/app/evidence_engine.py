"""Evidence verification (LLM judgment) + deterministic confidence scoring.

The LLM only classifies a new signal against a hypothesis's predictions
(SUPPORTS/CONTRADICTS/NEUTRAL). The actual confidence number is always
computed by the deterministic scoring function below - the LLM never
outputs it directly.
"""

from __future__ import annotations

import json
import logging
import math
from datetime import datetime
from typing import Literal

from openai import AsyncOpenAI
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.llm_pipeline import _call_groq_with_backoff
from app.models.cluster import Cluster
from app.models.evidence_check import EvidenceCheck
from app.models.hypothesis import Hypothesis
from app.models.report import Report
from app.models.structured_signal import StructuredSignal

logger = logging.getLogger(__name__)

# Deterministic scoring weights - tune here.
SUPPORT_WEIGHT = 1.0
CONTRADICT_WEIGHT = -1.0
NEUTRAL_WEIGHT = 0.0
MAX_SWING_POINTS = 22.0  # max |confidence delta| for a maximally-relevant match
BASE_SWING_POINTS = 4.0  # minimum swing even at low relevance, so signal isn't fully ignored
GEO_DECAY_KM = 3.0
TEMPORAL_DECAY_HOURS = 6.0
REPORTER_SATURATION = 20  # reporter_count at which the reporter-count factor saturates


class VerifyResult(BaseModel):
    result: Literal["SUPPORTS", "CONTRADICTS", "NEUTRAL"]
    matched_prediction: str | None = None
    reasoning: str = Field(max_length=400)


SYSTEM_PROMPT = """You judge whether one new citizen report is evidence for or against a specific \
hypothesis being investigated. You will be given the hypothesis's title, assumptions, and its list \
of predictions (what should be observed next if it is true), plus the new report's extracted \
content. Decide:
- SUPPORTS: the new report matches one of the hypothesis's predictions.
- CONTRADICTS: the new report provides evidence against the hypothesis (e.g. an official test result \
that clears it, or a fact incompatible with it).
- NEUTRAL: unrelated or too weak to move the needle either way.

Return ONLY JSON: {"result": "SUPPORTS"|"CONTRADICTS"|"NEUTRAL", "matched_prediction": <one of the \
hypothesis's prediction strings, or null>, "reasoning": "<short reasoning, one sentence>"}"""


async def verify_evidence(hypothesis: Hypothesis, new_signal_summary: str, new_signal_entities: dict) -> VerifyResult:
    settings = get_settings()
    predictions = (hypothesis.details or {}).get("predictions", [])
    assumptions = (hypothesis.details or {}).get("assumptions", [])
    user_prompt = (
        f"Hypothesis: {hypothesis.statement}\n"
        f"Assumptions: {assumptions}\n"
        f"Predictions: {predictions}\n\n"
        f"New report (extracted): {new_signal_summary}\n"
        f"Extracted details: {json.dumps(new_signal_entities, ensure_ascii=False)}"
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
    client = AsyncOpenAI(base_url=settings.groq_base_url, api_key=settings.groq_api_key)
    try:
        for attempt in range(2):
            try:
                content = await _call_groq_with_backoff(client, settings, messages)
                return VerifyResult.model_validate(json.loads(content))
            except (json.JSONDecodeError, ValidationError) as exc:
                logger.warning("Invalid verify_evidence JSON (attempt %d/2): %s", attempt + 1, exc)
                if attempt == 0:
                    messages.append({"role": "user", "content": f"Invalid: {exc}. Reply with ONLY the JSON object."})
                    continue
    except Exception as exc:  # connectivity, etc. - never crash the replay step
        logger.error("verify_evidence failed entirely: %s", exc)
    finally:
        await client.close()

    return VerifyResult(result="NEUTRAL", matched_prediction=None, reasoning="verification failed; treated as neutral")


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    if None in (lat1, lon1, lat2, lon2):
        return 999.0
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def compute_confidence_delta(
    verify_result: Literal["SUPPORTS", "CONTRADICTS", "NEUTRAL"],
    new_embedding: list[float],
    cluster_centroid: list[float] | None,
    new_lat: float | None,
    new_lon: float | None,
    cluster_lat: float | None,
    cluster_lon: float | None,
    new_reported_at: datetime,
    cluster_last_seen_at: datetime | None,
    reporter_count: int,
) -> tuple[float, dict]:
    """Deterministic (no LLM) confidence delta, in +/-confidence points."""
    semantic_similarity = _cosine_similarity(new_embedding, cluster_centroid) if cluster_centroid else 0.0
    semantic_similarity = max(0.0, semantic_similarity)  # cosine can be negative

    distance_km = _haversine_km(new_lat, new_lon, cluster_lat, cluster_lon)
    geo_proximity = math.exp(-distance_km / GEO_DECAY_KM)

    if cluster_last_seen_at is not None:
        gap_hours = abs((new_reported_at - cluster_last_seen_at).total_seconds()) / 3600.0
    else:
        gap_hours = TEMPORAL_DECAY_HOURS
    temporal_proximity = math.exp(-gap_hours / TEMPORAL_DECAY_HOURS)

    relevance = 0.4 * semantic_similarity + 0.3 * geo_proximity + 0.3 * temporal_proximity
    reporter_factor = min(1.0, math.log1p(reporter_count) / math.log1p(REPORTER_SATURATION))

    base_weight = {"SUPPORTS": SUPPORT_WEIGHT, "CONTRADICTS": CONTRADICT_WEIGHT, "NEUTRAL": NEUTRAL_WEIGHT}[
        verify_result
    ]
    swing = BASE_SWING_POINTS + (MAX_SWING_POINTS - BASE_SWING_POINTS) * relevance * (0.5 + 0.5 * reporter_factor)
    delta = base_weight * swing

    factors = {
        "semantic_similarity": round(semantic_similarity, 3),
        "geo_proximity": round(geo_proximity, 3),
        "temporal_proximity": round(temporal_proximity, 3),
        "reporter_factor": round(reporter_factor, 3),
        "relevance": round(relevance, 3),
    }
    return round(delta, 2), factors


async def apply_evidence_to_hypothesis(
    db: Session, hypothesis: Hypothesis, cluster: Cluster, signal: StructuredSignal, report: Report
) -> EvidenceCheck:
    verdict = await verify_evidence(hypothesis, signal.summary, signal.entities or {})

    delta, factors = compute_confidence_delta(
        verify_result=verdict.result,
        new_embedding=list(signal.embedding) if signal.embedding is not None else [],
        cluster_centroid=list(cluster.centroid_embedding) if cluster.centroid_embedding is not None else None,
        new_lat=report.location_lat,
        new_lon=report.location_lng,
        cluster_lat=cluster.location_lat,
        cluster_lon=cluster.location_lng,
        new_reported_at=report.reported_at,
        cluster_last_seen_at=cluster.last_seen_at,
        reporter_count=cluster.report_count,
    )

    old_confidence = hypothesis.confidence
    new_confidence = max(0.0, min(100.0, old_confidence + delta))
    hypothesis.confidence = new_confidence

    details = dict(hypothesis.details or {})
    if verdict.result == "SUPPORTS":
        details.setdefault("supporting_evidence", []).append(signal.summary)
    elif verdict.result == "CONTRADICTS":
        details.setdefault("contradicting_evidence", []).append(signal.summary)
    hypothesis.details = details

    check = EvidenceCheck(
        hypothesis_id=hypothesis.id,
        predicted_evidence=verdict.matched_prediction or "(none matched)",
        observed_report_id=report.id,
        match_score=factors["relevance"],
        outcome=verdict.result,
        old_confidence=old_confidence,
        new_confidence=new_confidence,
        reasoning=verdict.reasoning,
    )
    db.add(check)
    db.commit()
    db.refresh(check)
    db.refresh(hypothesis)
    return check
