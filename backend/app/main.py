import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers.clusters import router as clusters_router
from app.routers.replay import router as replay_router
from app.routers.reports import router as reports_router
from app.services.embeddings import get_embedding_model

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the embedding model once at startup so the first /api/reports/process
    # call isn't stuck behind a ~40s cold weight-load.
    await asyncio.to_thread(get_embedding_model)
    yield


app = FastAPI(title="PRISM API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports_router, prefix="/api/reports", tags=["reports"])
app.include_router(clusters_router, prefix="/api/clusters", tags=["clusters"])
app.include_router(replay_router, prefix="/api/replay", tags=["replay"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
