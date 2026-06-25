from __future__ import annotations
import sqlglot
import sqlglot.errors
import re

DANGEROUS_KEYWORDS = {"UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "INSERT", "REPLACE", "MERGE", "CREATE"}
WARN_KEYWORDS = {"UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE"}


def validate_sql(sql: str) -> dict:
    errors = []
    warnings = []
    dangerous_statements = []
    is_dangerous = False

    if not sql or not sql.strip():
        return {"isValid": False, "isDangerous": False, "errors": ["SQL query is empty"], "warnings": [], "dangerousStatements": []}

    sql_upper = sql.upper()
    for kw in WARN_KEYWORDS:
        pattern = r'\b' + kw + r'\b'
        if re.search(pattern, sql_upper):
            is_dangerous = True
            dangerous_statements.append(kw)
            warnings.append(f"Query contains {kw} statement which will modify data")

    try:
        parsed = sqlglot.parse(sql, dialect="duckdb")
        if not parsed or all(p is None for p in parsed):
            errors.append("Could not parse SQL query")
            return {
                "isValid": False,
                "isDangerous": is_dangerous,
                "errors": errors,
                "warnings": warnings,
                "dangerousStatements": dangerous_statements
            }
    except sqlglot.errors.ParseError as e:
        errors.append(f"SQL syntax error: {str(e)[:200]}")
        return {
            "isValid": False,
            "isDangerous": is_dangerous,
            "errors": errors,
            "warnings": warnings,
            "dangerousStatements": dangerous_statements
        }
    except Exception as e:
        errors.append(f"Validation error: {str(e)[:200]}")
        return {
            "isValid": False,
            "isDangerous": is_dangerous,
            "errors": errors,
            "warnings": warnings,
            "dangerousStatements": dangerous_statements
        }

    return {
        "isValid": len(errors) == 0,
        "isDangerous": is_dangerous,
        "errors": errors,
        "warnings": warnings,
        "dangerousStatements": dangerous_statements
    }


def extract_sql_breakdown(sql: str) -> dict:
    try:
        parsed = sqlglot.parse_one(sql, dialect="duckdb")
        if not parsed:
            return {}

        tables = []
        for table in parsed.find_all(sqlglot.exp.Table):
            if table.name:
                tables.append(table.name)

        columns = []
        for col in parsed.find_all(sqlglot.exp.Column):
            if col.name and col.name != "*":
                columns.append(col.name)

        filters = []
        for where in parsed.find_all(sqlglot.exp.Where):
            filters.append(str(where.this)[:100])

        joins = []
        for join in parsed.find_all(sqlglot.exp.Join):
            joins.append(str(join)[:100])

        group_by = []
        for gb in parsed.find_all(sqlglot.exp.Group):
            for expr in gb.expressions:
                group_by.append(str(expr)[:50])

        order_by = []
        for ob in parsed.find_all(sqlglot.exp.Order):
            for expr in ob.expressions:
                order_by.append(str(expr)[:50])

        return {
            "tables": list(set(tables)),
            "columns": list(set(columns))[:10],
            "filters": filters[:5],
            "joins": joins[:5],
            "groupBy": group_by[:5],
            "orderBy": order_by[:5]
        }
    except Exception:
        return {}
