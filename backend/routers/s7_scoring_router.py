"""
Stage 7 Router: JEE Scoring Engine Execution Endpoint.

Scores an aligned exam payload under official JEE rules, strictly enforcing
the Section B First-5 Attempt rule.
"""

from fastapi import APIRouter
from backend.schemas.s6_alignment import AlignmentResult
from backend.schemas.s7_scoring import ScoringSummary
from backend.services.s7_scoring_service import JEEScoringEngine

router = APIRouter(prefix="/score", tags=["Stage 7: Scoring Engine"])


@router.post("", response_model=ScoringSummary)
async def score_aligned_responses(alignment: AlignmentResult) -> ScoringSummary:
    """
    Executes scoring rules and awards marks with Section B overflow discarded.
    """
    return JEEScoringEngine.score_aligned_exam(alignment)
