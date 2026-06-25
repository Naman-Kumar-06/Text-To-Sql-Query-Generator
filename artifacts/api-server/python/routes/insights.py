from __future__ import annotations
import json
import re
from fastapi import APIRouter, HTTPException

from models.schemas import InsightsInput, InsightsResult, Insight
from services.ai_provider import generate_text, INSIGHTS_PROMPT

router = APIRouter()


@router.post("/insights")
async def generate_insights(body: InsightsInput):
    sample_data = body.rows[:5]
    sample_str = json.dumps(sample_data, default=str)[:1000]

    prompt = INSIGHTS_PROMPT.format(
        question=body.question,
        sql=body.sql,
        dataset_name=body.datasetName or "Unknown",
        columns=", ".join(body.columns),
        row_count=len(body.rows),
        sample_data=sample_str
    )

    try:
        response_text, _ = await generate_text(prompt)

        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            data = json.loads(json_match.group())
            summary = data.get("summary", "Analysis complete.")
            raw_insights = data.get("insights", [])
            recommendations = data.get("recommendations", [])

            insights = []
            valid_types = {"trend", "outlier", "highest", "lowest", "summary", "anomaly"}
            for item in raw_insights:
                insight_type = item.get("type", "summary")
                if insight_type not in valid_types:
                    insight_type = "summary"
                insights.append(Insight(
                    type=insight_type,
                    title=item.get("title", "Insight"),
                    description=item.get("description", ""),
                    value=item.get("value")
                ))
        else:
            summary = response_text.strip()[:500]
            insights = []
            recommendations = []

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI provider error: {str(e)}")

    return InsightsResult(
        summary=summary,
        insights=insights,
        recommendations=recommendations
    ).model_dump()
