from __future__ import annotations
from fastapi import APIRouter

from models.schemas import PlatformStats, DatasetStat
from services.duckdb_service import get_connection

router = APIRouter()


@router.get("/stats")
async def get_stats():
    conn = get_connection()
    try:
        total_datasets = conn.execute("SELECT COUNT(*) FROM ds_metadata").fetchone()[0]
        total_queries = conn.execute("SELECT COUNT(*) FROM query_history").fetchone()[0]
        total_connections = conn.execute("SELECT COUNT(*) FROM db_connections").fetchone()[0]
        total_conversations = conn.execute("SELECT COUNT(*) FROM conversations").fetchone()[0]

        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        recent = conn.execute(
            "SELECT COUNT(*) FROM query_history WHERE created_at >= ?", [cutoff]
        ).fetchone()[0]

        top_rows = conn.execute("""
            SELECT ds.name, COUNT(qh.id) as query_count
            FROM ds_metadata ds
            LEFT JOIN query_history qh ON qh.dataset_id = ds.id
            GROUP BY ds.id, ds.name
            ORDER BY query_count DESC
            LIMIT 5
        """).fetchall()

        top_datasets = [DatasetStat(name=r[0], queryCount=r[1]) for r in top_rows]

        return PlatformStats(
            totalDatasets=total_datasets,
            totalQueries=total_queries,
            totalConnections=total_connections,
            totalConversations=total_conversations,
            recentQueriesCount=recent,
            topDatasets=top_datasets
        ).model_dump()
    finally:
        conn.close()
