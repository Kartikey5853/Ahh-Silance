"""
Stage 2 Schema: Image Preprocessing and Normalization.

Defines schemas for deskewing angle correction, Sauvola adaptive
illumination normalization, and perspective warp geometric verification.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class PreprocessingConfig(BaseModel):
    """
    Tunable parameters for computer vision image cleanup.
    """
    enable_deskew: bool = Field(default=True, description="Whether to apply automated skew angle correction")
    enable_sauvola: bool = Field(default=True, description="Whether to apply Sauvola adaptive thresholding")
    sauvola_window: int = Field(default=25, description="Local pixel neighborhood window size")
    sauvola_k: float = Field(default=0.2, description="Sauvola formula standard deviation weight")
    target_dpi: int = Field(default=300, description="Normalized rendering resolution")


class PreprocessingResult(BaseModel):
    """
    Output metadata and geometric correction metrics for a preprocessed page.
    """
    document_id: str = Field(..., description="Target document identifier")
    page_index: int = Field(default=0, description="Zero-based page index")
    detected_skew_degrees: float = Field(..., description="Estimated rotation tilt in degrees")
    is_perspective_warped: bool = Field(..., description="True if 4-point corner rectification was applied")
    normalized_width: int = Field(..., description="Width of rectified image in pixels")
    normalized_height: int = Field(..., description="Height of rectified image in pixels")
    illumination_normalized: bool = Field(..., description="True if shadow removal was completed")
