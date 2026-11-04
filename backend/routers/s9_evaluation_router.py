"""
Stage 9 Router: Unified Evaluation and Instant Scorecard Endpoints.

Coordinates end-to-end evaluation orchestration and retrieves stored
scorecards with quality control audit flags.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.schemas.s4_extraction import ExtractedSheetData
from backend.schemas.s9_evaluation import EvaluationScorecardResponse
from backend.services.s9_evaluation_service import EvaluationOrchestratorService
from backend.core.database import db

router = APIRouter(prefix="/evaluate", tags=["Stage 9: Instant Scorecard Delivery"])


@router.post("", response_model=EvaluationScorecardResponse)
async def evaluate_sheet(
    sheet_data: ExtractedSheetData,
    exam_id: str = Query("JEE_Main_2025_Jan_22_Shift1"),
    candidate_name: Optional[str] = Query("Candidate")
) -> EvaluationScorecardResponse:
    """
    Evaluates complete extracted sheet data and delivers instant scorecard.
    """
    try:
        return EvaluationOrchestratorService.evaluate_sheet_data(
            document_id=sheet_data.document_id,
            sheet_data=sheet_data,
            exam_id=exam_id,
            candidate_name=candidate_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.get("/scorecard/{evaluation_id}", response_model=dict)
async def get_saved_scorecard(evaluation_id: str) -> dict:
    """
    Retrieves a previously computed student scorecard by evaluation ID.
    """
    card = db.get_scorecard(evaluation_id)
    if not card:
        raise HTTPException(status_code=404, detail="Scorecard not found")
    return card
