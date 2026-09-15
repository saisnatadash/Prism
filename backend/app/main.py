from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers.reports import router as reports_router

settings = get_settings()

app = FastAPI(title="PRISM API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports_router, prefix="/api/reports", tags=["reports"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
