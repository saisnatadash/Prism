from pydantic import BaseModel
from typing import Literal


class DatasetOut(BaseModel):
    id: str
    name: str
    publisher: str
    licence: str
    coverage: str
    cadence: str
    status: Literal["connected", "planned"]
    recordCount: int
    description: str

    class Config:
        from_attributes = True


class EvidenceOut(BaseModel):
    id: str
    text: str
    stance: Literal["supports", "contradicts", "gap"]
    sourceDatasetId: str


class HypothesisOut(BaseModel):
    id: str
    code: str
    name: str
    status: Literal["supported", "challenged", "insufficient"]
    supporting: int
    contradicting: int
    missing: int
    evidence: list[EvidenceOut]
    assumptions: list[str]
    recommendedCheck: str


class InvestigationOut(BaseModel):
    id: str
    title: str
    location: str
    openedFrom: str
    statusNote: str
    sourcesLinked: int
    evidenceGaps: int
    hypotheses: list[HypothesisOut]


class GraphNodeOut(BaseModel):
    id: str
    label: str
    kind: Literal["observation", "data", "hypothesis"]
    x: float
    y: float
    r: float
    note: str | None = None


class GraphOut(BaseModel):
    nodes: list[GraphNodeOut]
    edges: list[dict]
