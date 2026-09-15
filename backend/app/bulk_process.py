"""Resumable batch processor: extracts + embeds + commits reports ONE AT A
TIME (not one big commit at the end), so interrupting it (Ctrl-C, a Groq
daily-quota wall, etc.) never loses already-completed work. Re-running it
just picks up wherever it left off, since it only ever selects reports with
no structured_signals row yet.

Usage:
    python -m app.bulk_process                 # all unprocessed reports
    python -m app.bulk_process --limit 80       # just the next 80
    python -m app.bulk_process --exclude-tags supporting_evidence contradictory_evidence
"""

from __future__ import annotations

import argparse
import asyncio
import json
import time

from openai import AsyncOpenAI

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.data_generator import DEFAULT_SEED_PATH
from app.llm_pipeline import CONCURRENCY_LIMIT, _embedding_text, extract_observation
from app.models.report import Report
from app.models.structured_signal import StructuredSignal
from app.services.embeddings import embed_texts


def _select_reports(db, limit: int | None, exclude_tags: set[str]) -> list[Report]:
    already_processed = {row[0] for row in db.query(StructuredSignal.report_id).all()}
    all_reports = db.query(Report).order_by(Report.reported_at).all()

    excluded_texts: set[str] = set()
    if exclude_tags:
        seed = json.loads(DEFAULT_SEED_PATH.read_text(encoding="utf-8"))
        excluded_texts = {item["text"] for item in seed if item["event_tag"] in exclude_tags}

    selected = [
        r for r in all_reports
        if r.id not in already_processed and r.raw_text not in excluded_texts
    ]
    return selected[:limit] if limit else selected


async def main(limit: int | None, exclude_tags: set[str]) -> None:
    db = SessionLocal()
    reports = _select_reports(db, limit, exclude_tags)
    print(f"[{time.strftime('%X')}] {len(reports)} reports to process (resumable — safe to Ctrl-C)", flush=True)
    if not reports:
        return

    settings = get_settings()
    client = AsyncOpenAI(base_url=settings.groq_base_url, api_key=settings.groq_api_key)
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    done = 0

    async def process_one(report: Report) -> None:
        nonlocal done
        async with semaphore:
            extraction, used_fallback = await extract_observation(client, settings, report)
            text = _embedding_text(extraction, report.raw_text)
            vector = (await asyncio.to_thread(embed_texts, [text]))[0]

            session = SessionLocal()
            try:
                session.add(
                    StructuredSignal(
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
                )
                session.commit()
            finally:
                session.close()

            done += 1
            print(f"[{time.strftime('%X')}] {done}/{len(reports)} committed -> {extraction.possible_domain}", flush=True)

    try:
        await asyncio.gather(*(process_one(r) for r in reports))
    finally:
        await client.close()
        db.close()

    print(f"[{time.strftime('%X')}] done: {done}/{len(reports)} committed", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--exclude-tags", nargs="*", default=[])
    args = parser.parse_args()
    asyncio.run(main(args.limit, set(args.exclude_tags)))
