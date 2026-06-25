from __future__ import annotations
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.duckdb_service import init_metadata_tables
from routes.datasets import router as datasets_router
from routes.connections import router as connections_router
from routes.query import router as query_router
from routes.history import router as history_router
from routes.conversations import router as conversations_router
from routes.insights import router as insights_router
from routes.export import router as export_router
from routes.stats import router as stats_router

app = FastAPI(title="AI SQL Generator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_metadata_tables()

app.include_router(datasets_router, prefix="/api")
app.include_router(connections_router, prefix="/api")
app.include_router(query_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(conversations_router, prefix="/api")
app.include_router(insights_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(stats_router, prefix="/api")


@app.get("/api/healthz")
async def health_check():
    return {"status": "ok"}
