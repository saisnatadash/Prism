"""
Counterfactual Evidence Engine — rule-based core.

This is deliberately NOT a black box. Hypothesis status is derived
transparently from the evidence actually linked to it:

  - "challenged"    if any evidence item contradicts the hypothesis
  - "supported"     if it has supporting evidence and nothing contradicts it
  - "insufficient"  otherwise (no evidence, or only gaps)

A free-text LLM layer (e.g. Qwen2.5 via an OpenAI-compatible endpoint) can
sit in front of this to *draft* new hypotheses and evidence candidates from
raw observations — see `draft_hypothesis()` below, which is stubbed with a
clear interface so a real model call can be dropped in without touching the
rest of the app. The engine's own status computation always stays
rule-based and auditable: PRISM never lets a generative model silently
decide what counts as "supported."
"""
from typing import Literal

Stance = Literal["supports", "contradicts", "gap"]
Status = Literal["supported", "challenged", "insufficient"]


def compute_status(stances: list[Stance]) -> Status:
    if "contradicts" in stances:
        return "challenged"
    if "supports" in stances:
        return "supported"
    return "insufficient"


def recommend_next_check(status: Status, missing_count: int) -> str:
    if missing_count == 0:
        return "No outstanding evidence gaps for this hypothesis."
    if status == "challenged":
        return "Resolve the contradicting evidence before re-testing this hypothesis."
    return "Request the single missing record most likely to confirm or rule this out before escalating."


def draft_hypothesis(observation_summary: str) -> dict:
    """
    Interface stub for an LLM-drafted hypothesis.

    Wire a real call here (e.g. an OpenAI-compatible client pointed at a
    hosted Qwen2.5 endpoint) to turn a raw observation into a candidate
    hypothesis + assumptions list. Until an API key is configured, this
    returns a clearly-labelled placeholder so the rest of the pipeline can
    be exercised end-to-end.
    """
    return {
        "name": "Candidate hypothesis (LLM drafting not configured)",
        "assumptions": [
            "Set OPENAI_API_KEY / QWEN_API_URL in the backend environment to enable automatic drafting.",
        ],
        "source_observation": observation_summary,
        "is_llm_drafted": False,
    }
