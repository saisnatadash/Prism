from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.orm import Dataset
from app.models.schemas import DatasetOut

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("", response_model=list[DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    rows = db.query(Dataset).all()
    return [
        DatasetOut(
            id=d.id, name=d.name, publisher=d.publisher, licence=d.licence,
            coverage=d.coverage, cadence=d.cadence, status=d.status,
            recordCount=d.record_count, description=d.description,
        )
        for d in rows
    ]
