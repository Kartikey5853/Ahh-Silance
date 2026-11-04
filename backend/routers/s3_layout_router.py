"""
Stage 3 Router: Layout Analysis and Section Bounding Endpoint.

Analyzes page dimensions, detects column gutters, and returns bounding
boxes for Chemistry, Physics, and Mathematics Section A and Section B blocks.
"""

from fastapi import APIRouter
from backend.schemas.s3_layout import DocumentLayoutResponse
from backend.services.s3_layout_service import LayoutService

router = APIRouter(prefix="/layout", tags=["Stage 3: Layout Detection"])


@router.post("", response_model=DocumentLayoutResponse)
async def analyze_layout(document_id: str, width: int = 2400, height: int = 3200) -> DocumentLayoutResponse:
    """
    Computes structural layout bounds for 90-question JEE exam sheets.
    """
    return LayoutService.analyze_document_layout(document_id, width, height)
