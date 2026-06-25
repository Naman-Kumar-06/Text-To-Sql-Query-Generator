from __future__ import annotations
import uuid
import json
import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from models.schemas import (
    QueryGenerateInput, QueryGenerateResult,
    QueryExecuteInput, QueryExecuteResult,
    QueryValidateInput, QueryValidateResult,
    QueryExplainInput, QueryExplainResult,
    SqlBreakdown
)
from services.ai_provider import (
    generate_text, extract_sql,
    SQL_GENERATION_PROMPT, EXPLAIN_PROMPT
)
from services.duckdb_service import (
    get_connection, execute_sql, get_table_schema_string
)
from services.sql_validator import validate_sql, extract_sql_breakdown
from services.chart_detector import detect_chart_type

router = APIRouter()


def _get_schema_for_source(dataset_id=None, connection_id=None, schema_override=None) -> str:
    if schema_override:
        return schema_override
    if dataset_id:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT table_name, columns_json FROM ds_metadata WHERE id = ?", [dataset_id]
            ).fetchone()
            if not row:
                return "No dataset found"
            table_name = row[0]
            return get_table_schema_string(table_name)
        finally:
            conn.close()
    if connection_id:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT name, db_type, host, port, database FROM db_connections WHERE id = ?", [connection_id]
            ).fetchone()
            if row:
                return f"External {row[1]} database: {row[4]} at {row[2]}:{row[3]}"
        finally:
            conn.close()
    return "No schema available - no dataset or connection selected"


def _get_conversation_history(conversation_id: str) -> str:
    if not conversation_id:
        return "No previous context"
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT messages_json FROM conversations WHERE id = ?", [conversation_id]
        ).fetchone()
        if not row or not row[0]:
            return "No previous context"
        messages = json.loads(row[0])
        if not messages:
            return "No previous context"
        history_parts = []
        for msg in messages[-6:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")[:300]
            history_parts.append(f"{role.upper()}: {content}")
        return "\n".join(history_parts)
    finally:
        conn.close()


def _save_history(history_id: str, question: str, sql: str, explanation: str,
                  dataset_id, connection_id, conversation_id, provider: str):
    conn = get_connection()
    try:
        dataset_name = None
        if dataset_id:
            row = conn.execute(
                "SELECT name FROM ds_metadata WHERE id = ?", [dataset_id]
            ).fetchone()
            dataset_name = row[0] if row else None

        created_at = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """INSERT INTO query_history (id, question, sql, explanation, dataset_id, dataset_name,
               connection_id, conversation_id, provider, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [history_id, question, sql, explanation, dataset_id,
             dataset_name, connection_id, conversation_id, provider, created_at]
        )
    finally:
        conn.close()


def _update_conversation(conversation_id: str, question: str, sql: str):
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT messages_json, message_count FROM conversations WHERE id = ?", [conversation_id]
        ).fetchone()
        if not row:
            return
        messages = json.loads(row[0]) if row[0] else []
        messages.append({"role": "user", "content": question})
        messages.append({"role": "assistant", "content": f"Generated SQL: {sql}"})
        updated_at = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "UPDATE conversations SET messages_json = ?, message_count = ?, updated_at = ? WHERE id = ?",
            [json.dumps(messages), row[1] + 1, updated_at, conversation_id]
        )
    finally:
        conn.close()


@router.post("/query/generate")
async def generate_query(body: QueryGenerateInput):
    schema = _get_schema_for_source(body.datasetId, body.connectionId, body.tableSchema)
    history = _get_conversation_history(body.conversationId or "")

    prompt = SQL_GENERATION_PROMPT.format(
        schema=schema,
        history=history,
        question=body.question
    )

    try:
        response_text, provider = await generate_text(prompt)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI provider error: {str(e)}")

    sql = extract_sql(response_text)
    explanation = ""
    if "EXPLANATION:" in response_text:
        parts = response_text.split("EXPLANATION:", 1)
        explanation = parts[1].strip().split("\n")[0].strip()
    if not explanation:
        explanation = "SQL query generated based on your question."

    validation = validate_sql(sql)
    warnings = validation.get("warnings", [])

    conversation_id = body.conversationId
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        conn = get_connection()
        try:
            title = body.question[:50] + ("..." if len(body.question) > 50 else "")
            conn.execute(
                """INSERT INTO conversations (id, title, created_at, updated_at, message_count, dataset_id, messages_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                [conversation_id, title, created_at, created_at, 0, body.datasetId, "[]"]
            )
        finally:
            conn.close()

    history_id = str(uuid.uuid4())
    _save_history(history_id, body.question, sql, explanation,
                  body.datasetId, body.connectionId, conversation_id, provider)
    _update_conversation(conversation_id, body.question, sql)

    return QueryGenerateResult(
        sql=sql,
        explanation=explanation,
        provider=provider,
        conversationId=conversation_id,
        historyId=history_id,
        warnings=warnings
    ).model_dump()


@router.post("/query/execute")
async def execute_query(body: QueryExecuteInput):
    validation = validate_sql(body.sql)
    if not validation["isValid"]:
        raise HTTPException(status_code=400, detail={
            "message": "Invalid SQL",
            "errors": validation["errors"]
        })

    dataset_id = body.datasetId
    table_name = None
    if dataset_id:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT table_name FROM ds_metadata WHERE id = ?", [dataset_id]
            ).fetchone()
            table_name = row[0] if row else None
        finally:
            conn.close()

    try:
        columns, rows, elapsed_ms = execute_sql(body.sql, table_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

    if body.historyId and rows is not None:
        conn = get_connection()
        try:
            conn.execute(
                "UPDATE query_history SET row_count = ?, execution_time_ms = ? WHERE id = ?",
                [len(rows), elapsed_ms, body.historyId]
            )
        finally:
            conn.close()

    chart_type, chart_config = detect_chart_type(columns, rows)

    return QueryExecuteResult(
        columns=columns,
        rows=rows,
        rowCount=len(rows),
        executionTimeMs=round(elapsed_ms, 2),
        chartType=chart_type,
        chartConfig=chart_config
    ).model_dump()


@router.post("/query/validate")
async def validate_query_endpoint(body: QueryValidateInput):
    result = validate_sql(body.sql)
    return QueryValidateResult(**result).model_dump()


@router.post("/query/explain")
async def explain_query(body: QueryExplainInput):
    static_breakdown = extract_sql_breakdown(body.sql)

    prompt = EXPLAIN_PROMPT.format(sql=body.sql)
    try:
        response_text, _ = await generate_text(prompt)
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            data = json.loads(json_match.group())
            explanation = data.get("explanation", "")
            breakdown_data = data.get("breakdown", static_breakdown)
        else:
            explanation = response_text.strip()[:500]
            breakdown_data = static_breakdown
    except Exception:
        explanation = "Unable to generate AI explanation at this time."
        breakdown_data = static_breakdown

    return QueryExplainResult(
        explanation=explanation,
        breakdown=SqlBreakdown(**breakdown_data) if breakdown_data else None
    ).model_dump()
