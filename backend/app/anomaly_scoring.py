"""Pure-statistics anomaly scoring for a cluster. No LLM involved."""

from __future__ import annotations

import math
from datetime import datetime

from pydantic import BaseModel

# Synthetic baseline: how many same-topic reports a single ward "normally"
# generates per day for any one emerging-issue cluster. Tune here.
BASELINE_RATE_PER_DAY = 2.0
BASELINE_STD_PER_DAY = math.sqrt(BASELINE_RATE_PER_DAY)  # Poisson-like variance

# Hypothesis generation only fires once a cluster's anomaly_score crosses this.
ANOMALY_THRESHOLD = 0.6

MIN_DURATION_HOURS = 0.5  # avoid divide-by-zero / absurd rates for near-simultaneous reports


class AnomalyScoreResult(BaseModel):
    anomaly_score: float
    z_score: float
    rate_per_day: float
    explanation: str


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def score_cluster(report_count: int, first_seen_at: datetime, last_seen_at: datetime) -> AnomalyScoreResult:
    duration_hours = max((last_seen_at - first_seen_at).total_seconds() / 3600.0, MIN_DURATION_HOURS)
    rate_per_day = report_count / duration_hours * 24.0
    z = (rate_per_day - BASELINE_RATE_PER_DAY) / BASELINE_STD_PER_DAY
    # Centered so ~2 std devs above baseline is the midpoint of the curve.
    anomaly_score = round(_sigmoid(z - 2.0), 4)

    explanation = (
        f"{report_count} reports in {duration_hours:.1f} hours "
        f"(~{rate_per_day:.0f}/day) vs. baseline of ~{BASELINE_RATE_PER_DAY:.0f}/day (z={z:.1f})"
    )

    return AnomalyScoreResult(
        anomaly_score=anomaly_score,
        z_score=round(z, 2),
        rate_per_day=round(rate_per_day, 2),
        explanation=explanation,
    )
