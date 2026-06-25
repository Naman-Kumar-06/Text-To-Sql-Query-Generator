from __future__ import annotations
import duckdb
import pandas as pd
import os
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Any

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = str(DATA_DIR / "app.duckdb")

UPLOADS_DIR = DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

EXPORTS_DIR = DATA_DIR / "exports"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


def get_connection() -> duckdb.DuckDBPyConnection:
    return duckdb.connect(DB_PATH)


def init_metadata_tables():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ds_metadata (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            file_name VARCHAR NOT NULL,
            file_type VARCHAR NOT NULL,
            row_count INTEGER,
            column_count INTEGER,
            size_bytes BIGINT,
            created_at VARCHAR NOT NULL,
            table_name VARCHAR NOT NULL,
            columns_json VARCHAR NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS db_connections (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            db_type VARCHAR NOT NULL,
            host VARCHAR,
            port INTEGER,
            database VARCHAR,
            username VARCHAR,
            password_enc VARCHAR,
            connection_string VARCHAR,
            created_at VARCHAR NOT NULL,
            is_active BOOLEAN DEFAULT true
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id VARCHAR PRIMARY KEY,
            title VARCHAR NOT NULL,
            created_at VARCHAR NOT NULL,
            updated_at VARCHAR NOT NULL,
            message_count INTEGER DEFAULT 0,
            dataset_id VARCHAR,
            messages_json VARCHAR DEFAULT '[]'
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS query_history (
            id VARCHAR PRIMARY KEY,
            question VARCHAR NOT NULL,
            sql VARCHAR NOT NULL,
            explanation VARCHAR,
            dataset_id VARCHAR,
            dataset_name VARCHAR,
            connection_id VARCHAR,
            conversation_id VARCHAR,
            row_count INTEGER,
            execution_time_ms DOUBLE,
            provider VARCHAR,
            created_at VARCHAR NOT NULL
        )
    """)
    conn.close()


def load_dataset(file_path: str, table_name: str, file_type: str) -> tuple[int, int, list[dict]]:
    conn = get_connection()
    try:
        if file_type == "csv":
            conn.execute(f"""
                CREATE OR REPLACE TABLE "{table_name}" AS
                SELECT * FROM read_csv_auto('{file_path}', ignore_errors=true)
            """)
        else:
            df = pd.read_excel(file_path)
            conn.execute(f"""
                CREATE OR REPLACE TABLE "{table_name}" AS SELECT * FROM df
            """)

        count_result = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()
        row_count = count_result[0] if count_result else 0

        cols_result = conn.execute(f'DESCRIBE "{table_name}"').fetchall()
        columns = []
        for col in cols_result:
            col_name = col[0]
            col_type = col[1]

            sample_rows = conn.execute(
                f'SELECT "{col_name}" FROM "{table_name}" WHERE "{col_name}" IS NOT NULL LIMIT 3'
            ).fetchall()
            sample_values = [r[0] for r in sample_rows if r[0] is not None]

            columns.append({
                "name": col_name,
                "type": col_type,
                "nullable": True,
                "sampleValues": [str(v) for v in sample_values]
            })

        return row_count, len(columns), columns
    finally:
        conn.close()


def get_dataset_rows(table_name: str, limit: int = 100) -> tuple[list[dict], list[dict], int]:
    conn = get_connection()
    try:
        count_result = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()
        total = count_result[0] if count_result else 0

        cols_result = conn.execute(f'DESCRIBE "{table_name}"').fetchall()
        columns = [{"name": c[0], "type": c[1], "nullable": True, "sampleValues": []} for c in cols_result]

        rows_result = conn.execute(f'SELECT * FROM "{table_name}" LIMIT {limit}').fetchall()
        col_names = [c[0] for c in cols_result]
        rows = [dict(zip(col_names, row)) for row in rows_result]

        for row in rows:
            for k, v in row.items():
                if hasattr(v, 'isoformat'):
                    row[k] = v.isoformat()
                elif v is not None:
                    row[k] = v

        return columns, rows, total
    finally:
        conn.close()


def execute_sql(sql: str, table_name: Optional[str] = None) -> tuple[list[str], list[dict[str, Any]], float]:
    import time
    conn = get_connection()
    try:
        start = time.time()
        result = conn.execute(sql)
        elapsed = (time.time() - start) * 1000

        if result.description is None:
            return [], [], elapsed

        columns = [desc[0] for desc in result.description]
        rows_raw = result.fetchall()

        rows = []
        for row in rows_raw:
            row_dict = {}
            for col, val in zip(columns, row):
                if hasattr(val, 'isoformat'):
                    row_dict[col] = val.isoformat()
                elif val is not None:
                    row_dict[col] = val
                else:
                    row_dict[col] = None
            rows.append(row_dict)

        return columns, rows, elapsed
    finally:
        conn.close()


def get_table_schema_string(table_name: str) -> str:
    conn = get_connection()
    try:
        cols = conn.execute(f'DESCRIBE "{table_name}"').fetchall()
        parts = [f'  "{c[0]}" {c[1]}' for c in cols]
        return f'TABLE "{table_name}" (\n' + ',\n'.join(parts) + '\n)'
    finally:
        conn.close()


def list_dataset_tables() -> list[str]:
    conn = get_connection()
    try:
        result = conn.execute("SHOW TABLES").fetchall()
        skip = {"ds_metadata", "db_connections", "conversations", "query_history"}
        return [r[0] for r in result if r[0] not in skip]
    finally:
        conn.close()
