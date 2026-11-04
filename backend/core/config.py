"""
Core configuration and constants for the JEE evaluation backend.

This module defines operational parameters, bubble detection thresholds,
Sauvola local window constants, and standard JEE Mains exam structures.
"""

from typing import List, Dict
from pydantic import BaseModel


class Settings(BaseModel):
    """
    Global application settings and CV threshold constants.
    """
    app_name: str = "Ahh-Silance JEE Evaluation Engine"
    api_prefix: str = "/api/v1"
    debug: bool = True

    # OMR Bubble detection parameters
    bubble_fill_threshold: float = 0.50  # Relative fill >= 50% counts as marked
    bubble_empty_threshold: float = 0.15 # Relative fill <= 15% counts as clean/unmarked
    bubble_inner_radius_ratio: float = 0.60 # Sample inner 60% core to avoid printed border rings
    faint_pencil_threshold: float = 0.35 # Faint mark flag for student review

    # Sauvola illumination normalization defaults
    sauvola_window_size: int = 25
    sauvola_k_factor: float = 0.2
    sauvola_r_constant: float = 128.0

    # Standard JEE Main Exam Configuration
    jee_total_questions: int = 90
    jee_total_marks: int = 300
    jee_marks_correct: float = 4.0
    jee_marks_incorrect: float = -1.0
    jee_marks_unattempted: float = 0.0

    # Section B rule: Attempt any 5 out of 10 per subject
    section_b_max_allowed_attempts: int = 5


settings = Settings()
