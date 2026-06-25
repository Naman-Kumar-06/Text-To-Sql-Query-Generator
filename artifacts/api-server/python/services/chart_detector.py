from __future__ import annotations
from typing import Any, Optional


NUMERIC_TYPES = {"integer", "int", "int32", "int64", "float", "float32", "float64", "double", "decimal", "numeric", "bigint", "smallint", "hugeint"}
DATE_TYPES = {"date", "timestamp", "datetime", "time"}
TEMPORAL_KEYWORDS = {"date", "month", "year", "week", "day", "quarter", "time", "period", "created", "updated"}


def is_numeric(col_name: str, sample_values: list[Any]) -> bool:
    if sample_values:
        return all(isinstance(v, (int, float)) for v in sample_values if v is not None)
    return False


def is_temporal(col_name: str, sample_values: list[Any]) -> bool:
    name_lower = col_name.lower()
    if any(kw in name_lower for kw in TEMPORAL_KEYWORDS):
        return True
    if sample_values:
        first = sample_values[0]
        if isinstance(first, str) and (len(first) >= 8) and ("-" in first or "/" in first):
            return True
    return False


def detect_chart_type(columns: list[str], rows: list[dict[str, Any]]) -> tuple[Optional[str], Optional[dict[str, Any]]]:
    if not rows or not columns:
        return None, None

    if len(columns) == 1:
        val = rows[0].get(columns[0])
        if isinstance(val, (int, float)):
            return "kpi", {"value": val, "label": columns[0]}
        return None, None

    sample = rows[:20]

    numeric_cols = []
    categorical_cols = []
    temporal_cols = []

    for col in columns:
        vals = [r.get(col) for r in sample if r.get(col) is not None]
        if not vals:
            continue
        if is_temporal(col, vals):
            temporal_cols.append(col)
        elif is_numeric(col, vals):
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)

    if temporal_cols and numeric_cols:
        x_col = temporal_cols[0]
        y_col = numeric_cols[0]
        return "line", {
            "x": x_col,
            "y": y_col,
            "title": f"{y_col} over {x_col}"
        }

    if len(numeric_cols) >= 2 and not categorical_cols:
        return "scatter", {
            "x": numeric_cols[0],
            "y": numeric_cols[1],
            "title": f"{numeric_cols[1]} vs {numeric_cols[0]}"
        }

    if categorical_cols and numeric_cols:
        x_col = categorical_cols[0]
        y_col = numeric_cols[0]
        unique_cats = len(set(str(r.get(x_col)) for r in sample if r.get(x_col) is not None))

        if unique_cats <= 6 and unique_cats >= 2:
            return "pie", {
                "labels": x_col,
                "values": y_col,
                "title": f"{y_col} by {x_col}"
            }
        return "bar", {
            "x": x_col,
            "y": y_col,
            "title": f"{y_col} by {x_col}"
        }

    if numeric_cols and not categorical_cols and not temporal_cols:
        if len(numeric_cols) == 1:
            return "kpi", {"value": rows[0].get(numeric_cols[0]), "label": numeric_cols[0]}
        return "bar", {
            "x": columns[0],
            "y": numeric_cols[0],
            "title": numeric_cols[0]
        }

    return None, None
