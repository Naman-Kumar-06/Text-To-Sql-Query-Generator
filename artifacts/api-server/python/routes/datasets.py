from __future__ import annotations
import uuid
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse

from models.schemas import Dataset, DatasetPreview, ColumnInfo
from services.duckdb_service import (
    get_connection, load_dataset, get_dataset_rows,
    UPLOADS_DIR
)

router = APIRouter()


def _get_dataset_by_id(dataset_id: str) -> dict:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM ds_metadata WHERE id = ?", [dataset_id]
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Dataset not found")
        cols = [d[0] for d in conn.description]
        return dict(zip(cols, row))
    finally:
        conn.close()


def _row_to_dataset(row: dict) -> Dataset:
    columns = json.loads(row["columns_json"]) if row["columns_json"] else []
    return Dataset(
        id=row["id"],
        name=row["name"],
        fileName=row["file_name"],
        fileType=row["file_type"],
        rowCount=row["row_count"] or 0,
        columnCount=row["column_count"] or 0,
        sizeBytes=row["size_bytes"],
        createdAt=row["created_at"],
        tableName=row["table_name"],
        columns=[ColumnInfo(**c) for c in columns]
    )


@router.get("/datasets")
async def list_datasets():
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM ds_metadata ORDER BY created_at DESC"
        ).fetchall()
        if not rows:
            return []
        cols = [d[0] for d in conn.description]
        result = []
        for row in rows:
            d = dict(zip(cols, row))
            result.append(_row_to_dataset(d).model_dump())
        return result
    finally:
        conn.close()


@router.post("/datasets", status_code=201)
async def upload_dataset(file: UploadFile = File(...), name: str = Form(default="")):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = Path(file.filename).suffix.lower().lstrip(".")
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported")
    if ext == "xls":
        ext = "xlsx"

    dataset_id = str(uuid.uuid4())
    table_name = f"ds_{dataset_id.replace('-', '_')}"
    save_path = UPLOADS_DIR / f"{dataset_id}.{ext}"

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    size_bytes = len(content)
    display_name = name.strip() if name.strip() else Path(file.filename).stem

    try:
        row_count, col_count, columns = load_dataset(str(save_path), table_name, ext)
    except Exception as e:
        os.unlink(save_path)
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    created_at = datetime.now(timezone.utc).isoformat()
    columns_json = json.dumps(columns)

    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO ds_metadata (id, name, file_name, file_type, row_count, column_count,
               size_bytes, created_at, table_name, columns_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [dataset_id, display_name, file.filename, ext, row_count, col_count,
             size_bytes, created_at, table_name, columns_json]
        )
    finally:
        conn.close()

    return Dataset(
        id=dataset_id,
        name=display_name,
        fileName=file.filename,
        fileType=ext,
        rowCount=row_count,
        columnCount=col_count,
        sizeBytes=size_bytes,
        createdAt=created_at,
        tableName=table_name,
        columns=[ColumnInfo(**c) for c in columns]
    ).model_dump()


@router.get("/datasets/{dataset_id}")
async def get_dataset(dataset_id: str):
    row = _get_dataset_by_id(dataset_id)
    return _row_to_dataset(row).model_dump()


@router.delete("/datasets/{dataset_id}", status_code=204)
async def delete_dataset(dataset_id: str):
    row = _get_dataset_by_id(dataset_id)
    table_name = row["table_name"]

    conn = get_connection()
    try:
        try:
            conn.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        except Exception:
            pass
        conn.execute("DELETE FROM ds_metadata WHERE id = ?", [dataset_id])
    finally:
        conn.close()

    upload_files = list(UPLOADS_DIR.glob(f"{dataset_id}.*"))
    for f in upload_files:
        try:
            os.unlink(f)
        except Exception:
            pass


@router.get("/datasets/{dataset_id}/rows")
async def get_dataset_rows_endpoint(dataset_id: str):
    row = _get_dataset_by_id(dataset_id)
    table_name = row["table_name"]
    try:
        columns, rows, total = get_dataset_rows(table_name, limit=100)
        return DatasetPreview(
            columns=[ColumnInfo(**c) for c in columns],
            rows=rows,
            totalRows=total
        ).model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/datasets/{dataset_id}/columns")
async def get_dataset_columns(dataset_id: str):
    row = _get_dataset_by_id(dataset_id)
    columns = json.loads(row["columns_json"]) if row["columns_json"] else []
    return [ColumnInfo(**c).model_dump() for c in columns]
