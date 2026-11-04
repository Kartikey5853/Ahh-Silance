"""
Stage 6 Router: Response-to-Key Alignment Endpoint.

Pairs candidate extracted answers with master key items using a sparse hash
map across all 90 questions, eliminating indexing drift.
"""

from fastapi import APIRouter
from backend.schemas.s4_extraction import ExtractedSheetData
from backend.schemas.s6_alignment import AlignmentResult
from backend.services.s5_answer_key_service import AnswerKeyService
from backend.services.s6_alignment_service import AlignmentService

router = APIRouter(prefix="/align", tags=["Stage 6: Response Alignment"])


@router.post("", response_model=AlignmentResult)
async def align_sheet_responses(sheet_data: ExtractedSheetData, exam_id: str = "JEE_Main_2025_Jan_22_Shift1") -> AlignmentResult:
    """
    Constructs a 1-to-1 sparse hash map alignment between candidate answers and key.
    """
    booklet_code = sheet_data.booklet_code or "SET A"
    master_key = AnswerKeyService.get_or_create_default_key(exam_id, booklet_code)
    return AlignmentService.align_responses_with_key(sheet_data.document_id, sheet_data, master_key)
