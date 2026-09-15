"""Competing-hypothesis generation for an anomalous cluster, via Qwen3-32B."""

from __future__ import annotations

import json
import logging

from openai import AsyncOpenAI
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.llm_pipeline import _call_groq_with_backoff
from app.models.cluster import Cluster
from app.models.hypothesis import Hypothesis
from app.models.structured_signal import StructuredSignal
from app.schemas.hypothesis import HypothesisSet

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a hypothesis-generation engine for PRISM, an early anomaly-intelligence \
system. You will be shown a cluster of citizen reports that a statistical anomaly detector has \
flagged as unusual for its ward. Your job is NOT to diagnose what is happening. You are generating \
hypotheses for human investigators to check, not conclusions.

Rules, all mandatory:
1. Do not diagnose. Never state a hypothesis as a confirmed fact - each is a possibility to be
   investigated.
2. Generate EXACTLY 3 hypotheses that are genuinely, structurally different explanations - not
   three phrasings of the same idea, and not one dominant answer with two throwaway alternatives.
   Consider different causal categories: e.g. a shared-source cause (contamination at supply/
   infrastructure level), a localized/isolated cause (a single household, food, coincidence), and
   a non-causal explanation (reporting bias, an unrelated cluster of illnesses, a rumor snowballing).
   Pick whichever three are most plausible for THIS data, but they must compete, not agree.
2b. Confidence must reflect real disagreement: do not make this a landslide. At least one
   alternative hypothesis must be within 25 points of the top one.
3. For each hypothesis, strictly separate:
   - "supporting_evidence": short quotes/paraphrases drawn ONLY from the reports actually shown to
     you.
   - "assumptions": things this hypothesis requires that are NOT directly observed in the reports.
4. "predictions": 2-3 short, concrete, checkable statements about what NEW evidence should appear
   soon if this specific hypothesis is true (used later to verify incoming reports against it).

Return ONLY a JSON object of the form {"hypotheses": [ {...}, {...}, {...} ]} - no markdown fences,
no commentary. Each hypothesis object must have exactly these keys: title (string), confidence
(number 0-100), supporting_evidence (array of strings), contradicting_evidence (empty array - it is
filled in later as new evidence arrives), assumptions (array of strings), predictions (array of
2-3 strings)."""

RETRY_REMINDER = (
    "Your previous reply was invalid: {error}. Reply again with ONLY the JSON object described "
    "above, with exactly 3 hypotheses, exactly the keys listed, and genuinely competing content."
)


def _build_cluster_context(db: Session, cluster: Cluster) -> str:
    stmt = (
        select(StructuredSignal)
        .where(StructuredSignal.cluster_id == cluster.id)
        .order_by(StructuredSignal.extracted_at)
        .limit(30)
    )
    signals = list(db.execute(stmt).scalars().all())
    lines = []
    for s in signals:
        entities = s.entities or {}
        phenomena = ", ".join(entities.get("phenomena", [])) or "n/a"
        lines.append(f"- [{s.severity_hint or 'n/a'}] {s.summary} (phenomena: {phenomena})")
    return "\n".join(lines)


async def generate_hypotheses(db: Session, cluster: Cluster) -> list[Hypothesis]:
    settings = get_settings()
    context = _build_cluster_context(db, cluster)
    user_prompt = (
        f"Ward: {cluster.location_name}\n"
        f"Report count: {cluster.report_count}\n"
        f"Anomaly score: {cluster.anomaly_score:.2f}\n"
        f"Category guess: {cluster.category}\n\n"
        f"Reports in this cluster:\n{context}"
    )
    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    client = AsyncOpenAI(base_url=settings.groq_base_url, api_key=settings.groq_api_key)
    last_error: Exception | None = None
    try:
        parsed: HypothesisSet | None = None
        for attempt in range(2):
            content = await _call_groq_with_backoff(client, settings, messages, max_tokens=2500)
            try:
                data = json.loads(content)
                parsed = HypothesisSet.model_validate(data)
                break
            except (json.JSONDecodeError, ValidationError) as exc:
                logger.warning("Invalid hypothesis JSON (attempt %d/2): %s", attempt + 1, exc)
                last_error = exc
                if attempt == 0:
                    messages.append({"role": "assistant", "content": content})
                    messages.append({"role": "user", "content": RETRY_REMINDER.format(error=exc)})
                    continue
    finally:
        await client.close()

    if parsed is None:
        raise RuntimeError(f"Hypothesis generation failed after retry: {last_error}")

    # Replace any previous hypotheses for this cluster with the fresh set.
    db.query(Hypothesis).filter(Hypothesis.cluster_id == cluster.id).delete()

    saved: list[Hypothesis] = []
    for h in parsed.hypotheses:
        row = Hypothesis(
            cluster_id=cluster.id,
            statement=h.title,
            rationale=None,
            confidence=h.confidence,
            status="active",
            details={
                "supporting_evidence": h.supporting_evidence,
                "contradicting_evidence": h.contradicting_evidence,
                "assumptions": h.assumptions,
                "predictions": h.predictions,
            },
        )
        db.add(row)
        saved.append(row)
    db.commit()
    for row in saved:
        db.refresh(row)

    saved.sort(key=lambda r: r.confidence, reverse=True)
    return saved
