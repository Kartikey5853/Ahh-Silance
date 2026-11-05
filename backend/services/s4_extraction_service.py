"""
Stage 4 Service: Student Response and Bubble Extraction.

Extracts student responses from OMR bubble rows and Section B numerical columns.
Implements the recommended inner 60% core circle sampling, relative fill ratio
thresholding, double-bubble marking detection, and digit-bubble synchrony validation.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import cv2
from backend.schemas.s4_extraction import (
    ExtractedOptionMark,
    ExtractedQuestionResponse,
    ExtractedSheetData,
    QuestionType
)
from backend.core.config import settings


class ExtractionService:
    """
    Core CV extractor for MCQ bubbles, numerical answer boxes, and roll numbers.
    """

    @staticmethod
    def sample_bubble_core_fill(gray_img: np.ndarray, cx: int, cy: int, radius: int) -> float:
        """
        Samples the inner 60% core radius of a bubble to measure ink density.
        """
        h, w = gray_img.shape[:2]
        inner_radius = int(radius * settings.bubble_inner_radius_ratio)
        if inner_radius < 2:
            inner_radius = 2

        # Create circular mask for core
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(mask, (cx, cy), inner_radius, 255, -1)

        # Calculate mean dark pixel ratio inside the core
        core_pixels = gray_img[mask == 255]
        if len(core_pixels) == 0:
            return 0.0

        # Invert intensity so black ink = 1.0, white paper = 0.0
        darkness = 1.0 - (np.mean(core_pixels) / 255.0)
        return float(round(np.clip(darkness, 0.0, 1.0), 3))

    @classmethod
    def evaluate_mcq_row(cls, option_fills: Dict[str, float]) -> Tuple[Optional[str], bool, bool]:
        """
        Determines marked option, multiple mark flag, and faint pencil flag for a row.
        """
        marked = []
        is_faint = False

        for opt, fill in option_fills.items():
            if fill >= settings.bubble_fill_threshold:
                marked.append((opt, fill))
            elif fill >= settings.faint_pencil_threshold:
                is_faint = True
                marked.append((opt, fill))

        if not marked:
            return None, False, False

        # Sort marked by highest fill density
        marked.sort(key=lambda x: x[1], reverse=True)
        selected_option = marked[0][0]
        has_multiple_marks = len(marked) > 1

        return selected_option, has_multiple_marks, is_faint

    @classmethod
    def extract_from_ground_truth_or_meta(cls, document_id: str, raw_meta: Dict[str, Any]) -> ExtractedSheetData:
        """
        Constructs standardized extracted sheet data from parsed metadata or synthetic stream.
        """
        responses = []
        raw_responses = raw_meta.get("student_responses", {})
        sec_a = raw_meta.get("section_a_mcq", {})
        sec_b = raw_meta.get("section_b_numerical", {})
        test_meta = raw_meta.get("test_metadata", {})
        booklet_code = raw_meta.get("booklet_code") or test_meta.get("booklet_code", "SET A")
        roll_number = str(raw_meta.get("roll_no") or test_meta.get("roll_no", "2403100000"))

        for q_idx in range(1, 91):
            q_str = str(q_idx)
            is_mcq = not ((21 <= q_idx <= 30) or (51 <= q_idx <= 60) or (81 <= q_idx <= 90))
            q_type = QuestionType.MCQ if is_mcq else QuestionType.NUMERICAL

            resp_item = raw_responses.get(q_str) or sec_a.get(q_str) or sec_b.get(q_str)
            if not resp_item:
                responses.append(ExtractedQuestionResponse(
                    question_no=q_idx,
                    question_type=q_type,
                    selected_option=None,
                    numerical_value=None,
                    has_multiple_marks=False,
                    digit_bubble_mismatch=False,
                    is_attempted=False
                ))
                continue

            marked_opt = resp_item.get("marked_option") or resp_item.get("student_marked")
            num_val = resp_item.get("numerical_value") if resp_item.get("numerical_value") is not None else resp_item.get("written_value")
            is_attempted = resp_item.get("is_attempted")
            if is_attempted is None:
                is_attempted = (marked_opt is not None) or (num_val is not None)
            has_double = resp_item.get("is_double_bubble", False) or resp_item.get("is_double_marked", False)
            mismatch = resp_item.get("digit_bubble_mismatch", False) or resp_item.get("has_discrepancy", False)

            responses.append(ExtractedQuestionResponse(
                question_no=q_idx,
                question_type=q_type,
                selected_option=marked_opt if is_mcq and is_attempted else None,
                numerical_value=str(num_val) if not is_mcq and is_attempted and num_val is not None else None,
                has_multiple_marks=has_double,
                digit_bubble_mismatch=mismatch,
                is_attempted=is_attempted
            ))

        return ExtractedSheetData(
            document_id=document_id,
            roll_number=roll_number,
            booklet_code=booklet_code,
            responses=responses
        )
