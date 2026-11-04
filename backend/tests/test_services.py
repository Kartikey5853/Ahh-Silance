"""
Unit tests for core image processing algorithms and analytical services.
"""

import numpy as np
import cv2
import pytest
from backend.services.s2_preprocessing_service import PreprocessingService
from backend.services.s3_layout_service import LayoutService
from backend.services.s4_extraction_service import ExtractionService
from backend.services.s8_analytics_service import AnalyticsService
from backend.schemas.s7_scoring import ScoringSummary, QuestionScoreResult, ScoringVerdict


def test_sauvola_adaptive_thresholding():
    """
    Tests that Sauvola thresholding properly handles illumination gradients.
    """
    # Create an artificial shadow gradient across an image
    grad = np.tile(np.linspace(50, 240, 200, dtype=np.uint8), (200, 1))
    # Draw a simulated dark bubble
    cv2.circle(grad, (100, 100), 15, 10, -1)

    binary = PreprocessingService.apply_sauvola_threshold(grad, window_size=25, k=0.2)
    assert binary.shape == (200, 200)
    # The bubble center should be detected as black (0)
    assert binary[100, 100] == 0


def test_inner_bubble_core_sampling():
    """
    Tests inner 60% circle sampling to isolate core ink from printed border.
    """
    img = np.ones((100, 100), dtype=np.uint8) * 255
    # Draw outer ring only (simulating an empty pre-printed bubble)
    cv2.circle(img, (50, 50), 20, 0, 2)
    empty_fill = ExtractionService.sample_bubble_core_fill(img, 50, 50, 20)
    assert empty_fill < 0.15, "Empty bubble with outer border should have low core fill"

    # Fill the core (simulating marked bubble)
    cv2.circle(img, (50, 50), 16, 0, -1)
    filled_fill = ExtractionService.sample_bubble_core_fill(img, 50, 50, 20)
    assert filled_fill > 0.80, "Filled bubble should have high core fill"


def test_layout_partitions():
    """
    Tests calculation of Chemistry, Physics, and Mathematics layout sections.
    """
    sections = LayoutService.detect_subject_sections(2400, 3200)
    assert len(sections) == 3
    assert sections[0].subject == "CHEMISTRY"
    assert sections[0].start_question == 1
    assert sections[0].end_question == 30
    assert sections[1].subject == "PHYSICS"
    assert sections[2].subject == "MATHEMATICS"
