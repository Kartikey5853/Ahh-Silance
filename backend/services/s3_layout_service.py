"""
Stage 3 Service: Question and Section Layout Detection.

Segments OMR sheets and test papers into vertical columns, isolates candidate
roll number/booklet headers, and calculates coordinates for Chemistry,
Physics, and Mathematics MCQ and Numerical blocks.
"""

from typing import List, Tuple
from backend.schemas.s3_layout import (
    BoundingBox,
    SectionLayout,
    SubjectSection,
    DocumentLayoutResponse
)


class LayoutService:
    """
    Computes structural layout geometry and section coordinates for JEE sheets.
    """

    @staticmethod
    def detect_subject_sections(img_width: int, img_height: int) -> List[SectionLayout]:
        """
        Calculates canonical subject partitions for JEE Main 3-column sheets.
        """
        col_width = (img_width - 120) // 3
        top_y = int(img_height * 0.17)
        mcq_bottom_y = int(img_height * 0.65)
        num_top_y = int(img_height * 0.69)
        num_bottom_y = int(img_height * 0.95)

        sections = []
        specs = [
            (SubjectSection.CHEMISTRY, 1, 30, 0),
            (SubjectSection.PHYSICS, 31, 60, 1),
            (SubjectSection.MATHEMATICS, 61, 90, 2)
        ]

        for subj, start_q, end_q, col_idx in specs:
            col_x1 = 60 + col_idx * col_width
            col_x2 = col_x1 + col_width

            sec_layout = SectionLayout(
                subject=subj,
                start_question=start_q,
                end_question=end_q,
                section_a_mcq_box=BoundingBox(
                    x_min=col_x1,
                    y_min=top_y,
                    x_max=col_x2,
                    y_max=mcq_bottom_y
                ),
                section_b_numerical_box=BoundingBox(
                    x_min=col_x1,
                    y_min=num_top_y,
                    x_max=col_x2,
                    y_max=num_bottom_y
                )
            )
            sections.append(sec_layout)

        return sections

    @classmethod
    def analyze_document_layout(cls, document_id: str, width: int, height: int) -> DocumentLayoutResponse:
        """
        Analyzes page geometry and returns structured coordinate partitions.
        """
        sections = cls.detect_subject_sections(width, height)
        return DocumentLayoutResponse(
            document_id=document_id,
            column_count=3,
            has_header_metadata=True,
            sections=sections
        )
