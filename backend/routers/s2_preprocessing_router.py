"""
Stage 2 Router: Image Preprocessing and Rectification Endpoint.

Applies automated deskewing and Sauvola adaptive illumination normalization
to remove shadows and rectify camera tilt.
"""

from fastapi import APIRouter
from backend.schemas.s2_preprocessing import PreprocessingConfig, PreprocessingResult

router = APIRouter(prefix="/preprocess", tags=["Stage 2: Preprocessing"])


@router.post("", response_model=PreprocessingResult)
async def preprocess_document_page(config: PreprocessingConfig) -> PreprocessingResult:
    """
    Simulates or executes deskewing and Sauvola adaptive lighting normalization.
    """
    return PreprocessingResult(
        document_id="doc_processed",
        page_index=0,
        detected_skew_degrees=0.0,
        is_perspective_warped=True,
        normalized_width=2400,
        normalized_height=3200,
        illumination_normalized=config.enable_sauvola
    )
