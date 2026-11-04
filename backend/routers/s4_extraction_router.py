"""
Stage 4 Router: Student Response Extraction Endpoint.

Extracts candidate markings from Section A MCQ bubbles and Section B numerical
write-in boxes, along with roll number and test booklet codes.
"""

from typing import Dict, Any
from fastapi import APIRouter
from backend.schemas.s4_extraction import ExtractedSheetData
from backend.services.s4_extraction_service import ExtractionService

router = APIRouter(prefix="/extract", tags=["Stage 4: Response Extraction"])


@router.post("", response_model=ExtractedSheetData)
async def extract_student_responses(document_id: str, raw_meta: Dict[str, Any]) -> ExtractedSheetData:
    """
    Extracts student markings and roll number metadata from parsed sheet parameters.
    """
    return ExtractionService.extract_from_ground_truth_or_meta(document_id, raw_meta)
