import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.cluster import ClusterOut
from app.schemas.hypothesis import HypothesisOut
from app.schemas.report import ReportOut


class StructuredSignalOut(BaseModel):
    id: uuid.UUID
    report_id: uuid.UUID
    category: str | None
    severity_hint: str | None
    entities: dict


class EvidenceCheckOut(BaseModel):
    id: uuid.UUID
    hypothesis_id: uuid.UUID
    predicted_evidence: str
    outcome: str
    old_confidence: float | None
    new_confidence: float | None
    reasoning: str | None
    match_score: float | None
    checked_at: datetime


class ReplayResult(BaseModel):
    report: ReportOut
    signal: StructuredSignalOut
    cluster: ClusterOut | None
    hypotheses: list[HypothesisOut]
    evidence_checks: list[EvidenceCheckOut]
    remaining_unprocessed: int
