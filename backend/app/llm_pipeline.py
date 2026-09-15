"""Structured-observation extraction pipeline: raw report -> Qwen3-32B (via
Groq) -> validated JSON -> structured_signals row (with an embedding).

Entry point: `process_unprocessed_reports(db)`.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time

from openai import APIError, AsyncOpenAI, RateLimitError
from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models.report import Report
from app.models.structured_signal import StructuredSignal
from app.schemas.extraction import ExtractedObservation, fallback_observation
from app.services.embeddings import embed_texts

logger = logging.getLogger(__name__)

# Free-tier Groq rate limits mean we should never fire all reports at once.
# This account's OTPM (output-tokens/minute) budget for qwen3.8-27b is tight
# (~1000/min), so a small concurrency smooths pacing rather than bursting
# into repeated 429s.
CONCURRENCY_LIMIT = 3
RATE_LIMIT_MAX_ATTEMPTS = 5
RATE_LIMIT_BASE_DELAY_SECONDS = 3.0

SYSTEM_PROMPT = """You are an information-extraction system for PRISM, a citizen-report \
anomaly-detection pipeline covering Bhubaneswar, India. You will be given one raw citizen \
report, which may be written in English, Hindi (Devanagari or Romanized), or Odia (Odia \
script or Romanized). Read it in its original language and extract a structured observation.

Return ONLY a single valid JSON object. No markdown code fences, no explanation, no text \
before or after the JSON. The JSON object must have exactly these keys:

- "phenomena": array of short English strings for the concrete phenomena/symptoms/events \
described (e.g. ["vomiting", "foul smell in tap water"]). Empty array if the report \
describes nothing concrete.
- "entities": array of short English strings for concrete named entities mentioned (place \
names, facilities, counts of people, organizations), e.g. ["Old Town market", "canal", \
"3 people"]. Empty array if none.
- "severity": one of "low", "medium", "high" - your best-effort assessment of how serious \
this report sounds.
- "approximate_time": a short relative-time phrase in English describing when this \
happened, e.g. "this morning", "last few hours", "unspecified".
- "location": the ward or locality named in the report, translated/transliterated to \
English if needed; "unspecified" if none is mentioned.
- "reporter_scale": one of "single person", "multiple people", "widespread" - how many \
people the report's own wording implicates.
- "certainty": a float between 0 and 1 - your confidence in this extraction given how \
clear the report is.
- "possible_domain": a short free-text guess (2-5 words, in English) at what general \
domain this report belongs to, e.g. "water contamination", "traffic", "power outage", \
"public event", "unrelated chatter". Describe what you actually see - do not pick from a \
fixed list.

Always translate any non-English content into English within the JSON values. Never \
include markdown, comments, or keys other than the ones listed above."""

RETRY_REMINDER = (
    "Your previous reply was invalid: {error}. Reply again with ONLY the JSON object "
    "described above - no markdown fences, no commentary - and make sure every key is "
    "present with the exact type requested."
)


class ProcessResult(BaseModel):
    considered: int
    processed: int
    fallback_used: int
    duration_seconds: float


def _strip_code_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t.lstrip("`")
        if t.endswith("```"):
            t = t[:-3]
    return t.strip()


async def _call_groq_with_backoff(
    client: AsyncOpenAI, settings: Settings, messages: list[dict], max_tokens: int = 600
) -> str:
    """Call Groq, retrying transient/rate-limit failures with backoff.

    This is about *connectivity*, not JSON correctness - schema validation
    retries are handled separately in `extract_observation`.
    """
    delay = RATE_LIMIT_BASE_DELAY_SECONDS
    last_exc: Exception | None = None
    for _ in range(RATE_LIMIT_MAX_ATTEMPTS):
        try:
            response = await client.chat.completions.create(
                model=settings.groq_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content or ""
        except (RateLimitError, APIError) as exc:
            last_exc = exc
            await asyncio.sleep(delay)
            delay *= 2
    assert last_exc is not None
    raise last_exc


async def extract_observation(
    client: AsyncOpenAI, settings: Settings, report: Report
) -> tuple[ExtractedObservation, bool]:
    """Extract one report's structured observation. Never raises: falls back
    to a minimal safe record (and logs) after one retry."""
    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": report.raw_text},
    ]

    for attempt in range(2):
        try:
            content = await _call_groq_with_backoff(client, settings, messages)
        except Exception as exc:  # connectivity/rate-limit exhausted
            logger.warning("Groq call failed (attempt %d/2) for report %s: %s", attempt + 1, report.id, exc)
            if attempt == 0:
                messages.append({"role": "user", "content": RETRY_REMINDER.format(error=exc)})
                continue
            break

        try:
            data = json.loads(_strip_code_fences(content))
            return ExtractedObservation.model_validate(data), False
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.warning(
                "Invalid extraction JSON (attempt %d/2) for report %s: %s", attempt + 1, report.id, exc
            )
            if attempt == 0:
                messages.append({"role": "assistant", "content": content})
                messages.append({"role": "user", "content": RETRY_REMINDER.format(error=exc)})
                continue
            break

    logger.error("Extraction failed twice for report %s; using fallback record", report.id)
    return fallback_observation(location_hint=report.location_name or "unspecified"), True


async def _extract_with_semaphore(
    client: AsyncOpenAI, settings: Settings, report: Report, semaphore: asyncio.Semaphore
) -> tuple[Report, ExtractedObservation, bool]:
    async with semaphore:
        extraction, used_fallback = await extract_observation(client, settings, report)
        return report, extraction, used_fallback


def _fetch_unprocessed_reports(db: Session, limit: int | None) -> list[Report]:
    """Reports with no structured_signals row yet."""
    stmt = (
        select(Report)
        .outerjoin(StructuredSignal, StructuredSignal.report_id == Report.id)
        .where(StructuredSignal.id.is_(None))
        .order_by(Report.reported_at)
    )
    if limit is not None:
        stmt = stmt.limit(limit)
    return list(db.execute(stmt).scalars().all())


def _embedding_text(extraction: ExtractedObservation, raw_text: str) -> str:
    parts = [*extraction.phenomena, *extraction.entities]
    return "; ".join(parts) if parts else raw_text[:500]


async def process_unprocessed_reports(db: Session, limit: int | None = None) -> ProcessResult:
    """Run extraction + embedding for every report without a structured_signals
    row yet, and persist the results. Raw report text is never modified -
    each structured_signals row keeps its own copy in `summary`."""
    started = time.monotonic()
    settings = get_settings()
    reports = _fetch_unprocessed_reports(db, limit)
    if not reports:
        return ProcessResult(considered=0, processed=0, fallback_used=0, duration_seconds=0.0)

    client = AsyncOpenAI(base_url=settings.groq_base_url, api_key=settings.groq_api_key)
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    try:
        results = await asyncio.gather(
            *(_extract_with_semaphore(client, settings, report, semaphore) for report in reports)
        )
    finally:
        await client.close()

    texts = [_embedding_text(extraction, report.raw_text) for report, extraction, _ in results]
    vectors = await asyncio.to_thread(embed_texts, texts)

    fallback_count = 0
    for (report, extraction, used_fallback), vector in zip(results, vectors):
        if used_fallback:
            fallback_count += 1
        db.add(
            StructuredSignal(
                report_id=report.id,
                category=extraction.possible_domain,
                # The raw text is preserved verbatim here (never an LLM
                # paraphrase) so it's never lost even if reports is pruned.
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
        )
    db.commit()

    return ProcessResult(
        considered=len(reports),
        processed=len(results),
        fallback_used=fallback_count,
        duration_seconds=round(time.monotonic() - started, 2),
    )
