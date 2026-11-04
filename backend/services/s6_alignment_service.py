"""
Stage 6 Service: Response-to-Key Alignment.

Pairs extracted candidate responses with master answer key records using
a sparse hash map indexed by normalized question number (1 <= Q <= 90),
completely eliminating index drift from unattempted questions.
"""

from typing import Dict, List, Optional
from backend.schemas.s4_extraction import ExtractedQuestionResponse, ExtractedSheetData
from backend.schemas.s5_answer_key import MasterAnswerKey, MasterKeyItem
from backend.schemas.s6_alignment import AlignedQuestionPair, AlignmentResult


class AlignmentService:
    """
    Implements sparse hash map alignment for robust question matching.
    """

    @staticmethod
    def align_responses_with_key(
        document_id: str,
        sheet_data: ExtractedSheetData,
        master_key: MasterAnswerKey
    ) -> AlignmentResult:
        """
        Builds a 1-to-1 sparse hash map alignment between student responses and key.
        """
        # Index student responses by question number
        student_map: Dict[int, ExtractedQuestionResponse] = {
            r.question_no: r for r in sheet_data.responses
        }

        # Index master key items by question number
        key_map: Dict[int, MasterKeyItem] = {
            k.question_no: k for k in master_key.items
        }

        aligned_pairs: List[AlignedQuestionPair] = []

        for q_no in range(1, 91):
            key_item = key_map.get(q_no)
            if not key_item:
                continue

            student_resp = student_map.get(q_no)
            is_attempted = bool(student_resp and student_resp.is_attempted)

            aligned_pairs.append(AlignedQuestionPair(
                question_no=q_no,
                student_response=student_resp,
                master_key=key_item,
                is_attempted=is_attempted
            ))

        return AlignmentResult(
            document_id=document_id,
            exam_id=master_key.exam_id,
            matched_booklet_code=master_key.booklet_code,
            total_aligned_questions=len(aligned_pairs),
            aligned_pairs=aligned_pairs
        )
