import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HypothesisLLM(BaseModel):
    """One hypothesis as returned by Qwen."""

    title: str
    confidence: float = Field(ge=0, le=100)
    supporting_evidence: list[str] = Field(default_factory=list)
    contradicting_evidence: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    predictions: list[str] = Field(min_length=2, max_length=3)


class HypothesisSet(BaseModel):
    """Exactly 3 genuinely competing hypotheses."""

    hypotheses: list[HypothesisLLM] = Field(min_length=3, max_length=3)


class HypothesisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cluster_id: uuid.UUID
    statement: str
    rationale: str | None
    confidence: float
    status: str
    details: dict
    created_at: datetime
    updated_at: datetime
