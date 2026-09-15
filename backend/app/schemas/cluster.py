import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ClusterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: str | None
    representative_summary: str | None
    location_name: str | None
    location_lat: float | None
    location_lng: float | None
    report_count: int
    anomaly_score: float
    status: str
    first_seen_at: datetime | None
    last_seen_at: datetime | None
    anomaly_explanation: str | None = None
    hypotheses_generated: bool = False
