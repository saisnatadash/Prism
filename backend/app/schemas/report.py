import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_language: str
    raw_text: str
    reporter_channel: str | None
    location_name: str | None
    location_lat: float | None
    location_lng: float | None
    reported_at: datetime


class SeedResult(BaseModel):
    inserted: int
    by_language: dict[str, int]
    by_ward: dict[str, int]
    time_range: tuple[datetime, datetime]
