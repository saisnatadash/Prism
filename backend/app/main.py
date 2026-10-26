from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.core.db import Base, engine
from app.routers import datasets, investigations
from app import seed as seed_module

app = FastAPI(
    title="PRISM API",
    description="Environmental Signal-to-Evidence Engine — backend API. "
                 "All data returned by this instance is synthetic demonstration "
                 "data unless the dataset's `status` is 'connected' AND the "
                 "deployment's real-data ingest job has been run (see README).",
    version="0.1.0",
)

origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
app.include_router(datasets.router)
app.include_router(investigations.router)


@app.on_event("startup")
def seed_on_startup():
    if os.getenv("AUTO_SEED", "true").lower() == "true":
        seed_module.run()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "prism-backend"}
