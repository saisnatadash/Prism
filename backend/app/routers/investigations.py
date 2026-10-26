import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.orm import Investigation, Hypothesis, EvidenceItem
from app.models.schemas import InvestigationOut, HypothesisOut, EvidenceOut, GraphOut, GraphNodeOut
from app.core.engine import compute_status, recommend_next_check

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


def _build_hypothesis_out(h: Hypothesis, evidence_rows: list[EvidenceItem]) -> HypothesisOut:
    stances = [e.stance for e in evidence_rows]
    status = compute_status(stances)
    missing = sum(1 for s in stances if s == "gap")
    return HypothesisOut(
        id=h.id, code=h.code, name=h.name, status=status,
        supporting=sum(1 for s in stances if s == "supports"),
        contradicting=sum(1 for s in stances if s == "contradicts"),
        missing=missing,
        evidence=[EvidenceOut(id=e.id, text=e.text, stance=e.stance, sourceDatasetId=e.dataset_id) for e in evidence_rows],
        assumptions=json.loads(h.assumptions or "[]"),
        recommendedCheck=h.recommended_check or recommend_next_check(status, missing),
    )


@router.get("/{investigation_id}", response_model=InvestigationOut)
def get_investigation(investigation_id: str, db: Session = Depends(get_db)):
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(404, "Investigation not found")

    hyp_outs = []
    gap_count = 0
    dataset_ids = set()
    for h in inv.hypotheses:
        rows = db.query(EvidenceItem).filter(EvidenceItem.hypothesis_id == h.id).all()
        hyp_outs.append(_build_hypothesis_out(h, rows))
        for e in rows:
            dataset_ids.add(e.dataset_id)
            if e.stance == "gap":
                gap_count += 1

    return InvestigationOut(
        id=inv.id, title=inv.title, location=inv.location, openedFrom=inv.opened_from,
        statusNote=inv.status_note, sourcesLinked=len(dataset_ids), evidenceGaps=gap_count,
        hypotheses=hyp_outs,
    )


@router.get("/{investigation_id}/hypotheses/{hypothesis_id}/challenge", response_model=HypothesisOut)
def challenge_hypothesis(investigation_id: str, hypothesis_id: str, db: Session = Depends(get_db)):
    """Recomputes a hypothesis's status from its linked evidence on demand —
    this is the deterministic core the frontend's "Challenge this hypothesis"
    button calls."""
    h = db.query(Hypothesis).filter(Hypothesis.id == hypothesis_id, Hypothesis.investigation_id == investigation_id).first()
    if not h:
        raise HTTPException(404, "Hypothesis not found")
    rows = db.query(EvidenceItem).filter(EvidenceItem.hypothesis_id == h.id).all()
    return _build_hypothesis_out(h, rows)


@router.get("/{investigation_id}/graph", response_model=GraphOut)
def get_graph(investigation_id: str, db: Session = Depends(get_db)):
    """
    Returns a layout for the signal-to-evidence graph. Node positions are
    computed here (simple deterministic layout) rather than stored, so any
    investigation renders a graph without needing hand-placed coordinates.
    """
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(404, "Investigation not found")

    nodes = [GraphNodeOut(id="obs", label="Observation", kind="observation", x=380, y=280, r=34, note=inv.opened_from)]
    edges = []
    angle_step = 360 / max(len(inv.hypotheses), 1)
    for i, h in enumerate(inv.hypotheses):
        import math
        a = math.radians(i * angle_step)
        x = 380 + 230 * math.cos(a)
        y = 280 + 160 * math.sin(a)
        rows = db.query(EvidenceItem).filter(EvidenceItem.hypothesis_id == h.id).all()
        status = compute_status([e.stance for e in rows])
        nodes.append(GraphNodeOut(id=h.id, label=f"Hyp. {h.code}", kind="hypothesis", x=x, y=y, r=30, note=h.name))
        edges.append({"from": "obs", "to": h.id, "kind": "contradicts" if status == "challenged" else "normal"})

    return GraphOut(nodes=nodes, edges=edges)
