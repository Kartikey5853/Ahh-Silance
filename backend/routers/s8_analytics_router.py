"""
Stage 8 Router: Performance Analytics Compilation Endpoint.

Calculates subject-level scores, accuracy rates, attempt statistics, and
Section B overflow audit figures from scoring summaries.
"""

from fastapi import APIRouter
from backend.schemas.s7_scoring import ScoringSummary
from backend.schemas.s8_analytics import ExamAnalyticsReport
from backend.services.s8_analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Stage 8: Performance Analytics"])


@router.post("", response_model=ExamAnalyticsReport)
async def compile_scoring_analytics(evaluation_id: str, scoring: ScoringSummary) -> ExamAnalyticsReport:
    """
    Compiles subject breakdowns and accuracy percentages from question scores.
    """
    return AnalyticsService.compile_analytics(evaluation_id, scoring)
