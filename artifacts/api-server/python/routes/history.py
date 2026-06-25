from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from models.schemas import HistoryEntry
from services.duckdb_service import get_connection

router = APIRouter()


def _row_to_entry(row: dict) -> HistoryEntry:
    return HistoryEntry(
        id=row["id"],
        question=row["question"],
        sql=row["sql"],
        explanation=row.get("explanation"),
        datasetId=row.get("dataset_id"),
        datasetName=row.get("dataset_name"),
        connectionId=row.get("connection_id"),
        conversationId=row.get("conversation_id"),
        rowCount=row.get("row_count"),
        executionTimeMs=row.get("execution_time_ms"),
        provider=row.get("provider"),
        createdAt=row["created_at"]
    )


@router.get("/history")
async def list_history(
    limit: int = Query(default=50, ge=1, le=200),
    conversationId: Optional[str] = Query(default=None)
):
    conn = get_connection()
    try:
        if conversationId:
            rows = conn.execute(
                "SELECT * FROM query_history WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?",
                [conversationId, limit]
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM query_history ORDER BY created_at DESC LIMIT ?",
                [limit]
            ).fetchall()
        if not rows:
            return []
        cols = [d[0] for d in conn.description]
        return [_row_to_entry(dict(zip(cols, r))).model_dump() for r in rows]
    finally:
        conn.close()


@router.get("/history/{history_id}")
async def get_history_entry(history_id: str):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM query_history WHERE id = ?", [history_id]
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="History entry not found")
        cols = [d[0] for d in conn.description]
        return _row_to_entry(dict(zip(cols, row))).model_dump()
    finally:
        conn.close()


@router.delete("/history/{history_id}", status_code=204)
async def delete_history_entry(history_id: str):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM query_history WHERE id = ?", [history_id]
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="History entry not found")
        conn.execute("DELETE FROM query_history WHERE id = ?", [history_id])
    finally:
        conn.close()
