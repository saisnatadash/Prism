from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.data_generator import load_seed_file
from app.models.report import Report
from app.schemas.report import ReportOut, SeedResult

router = APIRouter()


@router.post("/seed", response_model=SeedResult)
def seed_reports(db: Session = Depends(get_db)) -> SeedResult:
    """Wipe the reports table and reload it from the synthetic seed dataset.

    Raw text is stored as-is, unprocessed — no LLM extraction runs here.
    """
    seed_data = load_seed_file()

    db.execute(delete(Report))

    for item in seed_data:
        db.add(
            Report(
                source_language=item["language"],
                raw_text=item["text"],
                reporter_channel=item.get("channel", "simulated"),
                location_name=item["ward"],
                location_lat=item["lat"],
                location_lng=item["lon"],
                reported_at=datetime.fromisoformat(item["reported_at"]),
            )
        )
    db.commit()

    by_language = Counter(item["language"] for item in seed_data)
    by_ward = Counter(item["ward"] for item in seed_data)
    timestamps = sorted(datetime.fromisoformat(item["reported_at"]) for item in seed_data)

    return SeedResult(
        inserted=len(seed_data),
        by_language=dict(by_language),
        by_ward=dict(by_ward),
        time_range=(timestamps[0], timestamps[-1]),
    )


@router.get("", response_model=list[ReportOut])
def list_reports(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[Report]:
    stmt = select(Report).order_by(Report.reported_at.desc()).limit(limit)
    return list(db.execute(stmt).scalars().all())


@router.get("/stats")
def report_stats(db: Session = Depends(get_db)) -> dict:
    total = db.execute(select(func.count()).select_from(Report)).scalar_one()
    languages = db.execute(select(func.count(func.distinct(Report.source_language)))).scalar_one()
    wards = db.execute(select(func.count(func.distinct(Report.location_name)))).scalar_one()
    latest = db.execute(select(func.max(Report.reported_at))).scalar_one()
    earliest = db.execute(select(func.min(Report.reported_at))).scalar_one()
    return {
        "total": total,
        "languages": languages,
        "wards": wards,
        "earliest": earliest,
        "latest": latest,
    }
