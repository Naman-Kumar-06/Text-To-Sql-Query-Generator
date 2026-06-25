from __future__ import annotations
import os
import httpx
import json
import re
from typing import Optional

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Free models to try in order (first working one wins)
OPENROUTER_FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-coder:free",
    "google/gemma-4-31b-it:free",
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
]


async def _call_gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048}
            }
        )
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


async def _call_groq(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 2048
            }
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def _call_openrouter(prompt: str) -> str:
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not set")
    last_err: Exception | None = None
    async with httpx.AsyncClient(timeout=30) as client:
        for model in OPENROUTER_FREE_MODELS:
            try:
                resp = await client.post(
                    OPENROUTER_URL,
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "HTTP-Referer": "https://ai-sql-generator.repl.co",
                        "X-Title": "AI SQL Generator"
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1,
                        "max_tokens": 2048
                    }
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                last_err = e
                continue
    raise RuntimeError(f"All OpenRouter free models failed. Last error: {last_err}")


async def generate_text(prompt: str) -> tuple[str, str]:
    """
    Try providers in cascade: Gemini -> Groq -> OpenRouter.
    Returns (text, provider_name).
    """
    providers = []
    if GEMINI_API_KEY:
        providers.append(("gemini", _call_gemini))
    if GROQ_API_KEY:
        providers.append(("groq", _call_groq))
    if OPENROUTER_API_KEY:
        providers.append(("openrouter", _call_openrouter))

    if not providers:
        raise RuntimeError("No AI provider API keys configured. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY.")

    errors: list[str] = []
    for name, fn in providers:
        try:
            text = await fn(prompt)
            return text, name
        except Exception as e:
            errors.append(f"{name}: {e}")
            continue

    detail = " | ".join(errors)
    raise RuntimeError(f"All AI providers failed. Details: {detail}")


def extract_sql(text: str) -> str:
    """Extract SQL from markdown code blocks or raw text."""
    sql_block = re.search(r'```(?:sql)?\s*([\s\S]+?)\s*```', text, re.IGNORECASE)
    if sql_block:
        return sql_block.group(1).strip()
    lines = text.strip().splitlines()
    sql_lines = []
    for line in lines:
        if line.strip().upper().startswith(('SELECT', 'WITH', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'SHOW', 'DESCRIBE')):
            sql_lines = [line]
        elif sql_lines:
            sql_lines.append(line)
    if sql_lines:
        return '\n'.join(sql_lines).strip()
    return text.strip()


SQL_GENERATION_PROMPT = """You are an expert SQL query generator. Given a database schema and a natural language question, generate a valid SQL query.

SCHEMA:
{schema}

CONVERSATION HISTORY:
{history}

USER QUESTION:
{question}

Rules:
1. Generate ONLY valid SQL. Do not include any explanation in the SQL itself.
2. Use the exact table and column names from the schema.
3. For DuckDB, use standard SQL syntax.
4. Wrap the SQL in ```sql ``` code blocks.
5. After the SQL, on a new line, write "EXPLANATION:" followed by a plain English explanation of what the query does.
6. Keep the explanation concise (2-3 sentences).

Response format:
```sql
<your SQL query here>
```
EXPLANATION: <plain English explanation>"""


INSIGHTS_PROMPT = """You are a business data analyst. Analyze the following query results and provide business insights.

Question asked: {question}
SQL query: {sql}
Dataset: {dataset_name}

Results summary:
- Columns: {columns}
- Row count: {row_count}
- Sample data (first 5 rows): {sample_data}

Provide:
1. A 2-3 sentence executive summary
2. 3-5 specific insights (trends, outliers, highest/lowest values, anomalies)
3. 2-3 actionable recommendations

Format your response as JSON:
{{
  "summary": "...",
  "insights": [
    {{"type": "trend|outlier|highest|lowest|summary|anomaly", "title": "...", "description": "...", "value": "..."}}
  ],
  "recommendations": ["...", "..."]
}}"""


EXPLAIN_PROMPT = """Explain the following SQL query in simple, plain English.

SQL:
{sql}

Provide:
1. A clear explanation of what the query does (2-3 sentences)
2. A breakdown in JSON format:

{{
  "explanation": "...",
  "breakdown": {{
    "tables": ["list of tables used"],
    "columns": ["list of columns selected"],
    "filters": ["list of WHERE conditions"],
    "joins": ["list of JOIN operations"],
    "groupBy": ["list of GROUP BY columns"],
    "orderBy": ["list of ORDER BY columns"]
  }}
}}

Return ONLY the JSON, no other text."""
