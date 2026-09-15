from typing import Literal

from pydantic import BaseModel, Field


class ExtractedObservation(BaseModel):
    """The structured observation Qwen extracts from one raw citizen report."""

    phenomena: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    severity: Literal["low", "medium", "high"]
    approximate_time: str
    location: str
    reporter_scale: Literal["single person", "multiple people", "widespread"]
    certainty: float = Field(ge=0.0, le=1.0)
    possible_domain: str


def fallback_observation(location_hint: str = "unspecified") -> ExtractedObservation:
    """A minimal, always-valid record used when extraction fails twice."""
    return ExtractedObservation(
        phenomena=[],
        entities=[],
        severity="low",
        approximate_time="unknown",
        location=location_hint,
        reporter_scale="single person",
        certainty=0.0,
        possible_domain="unknown",
    )
