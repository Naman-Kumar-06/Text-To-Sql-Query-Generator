from __future__ import annotations
import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from models.schemas import Conversation, ConversationInput
from services.duckdb_service import get_connection

router = APIRouter()


def _row_to_conversation(row: dict) -> Conversation:
    return Conversation(
        id=row["id"],
        title=row["title"],
        createdAt=row["created_at"],
        updatedAt=row.get("updated_at", row["created_at"]),
        messageCount=row.get("message_count", 0),
        datasetId=row.get("dataset_id")
    )


@router.get("/conversations")
async def list_conversations():
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM conversations ORDER BY updated_at DESC"
        ).fetchall()
        if not rows:
            return []
        cols = [d[0] for d in conn.description]
        return [_row_to_conversation(dict(zip(cols, r))).model_dump() for r in rows]
    finally:
        conn.close()


@router.post("/conversations", status_code=201)
async def create_conversation(body: ConversationInput):
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO conversations (id, title, created_at, updated_at, message_count, dataset_id, messages_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            [conv_id, body.title, now, now, 0, body.datasetId, "[]"]
        )
    finally:
        conn.close()

    return Conversation(
        id=conv_id,
        title=body.title,
        createdAt=now,
        updatedAt=now,
        messageCount=0,
        datasetId=body.datasetId
    ).model_dump()


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id FROM conversations WHERE id = ?", [conversation_id]
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conn.execute("DELETE FROM conversations WHERE id = ?", [conversation_id])
    finally:
        conn.close()
