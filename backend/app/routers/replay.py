from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.replay_engine import replay_next
from app.schemas.replay import ReplayResult

router = APIRouter()


@router.post("/next", response_model=ReplayResult | None)
async def replay_next_report(db: Session = Depends(get_db)) -> ReplayResult | None:
    """Release the next held-back report and push it through the full
    extract -> cluster -> verify -> confidence-update pipeline."""
    return await replay_next(db)
