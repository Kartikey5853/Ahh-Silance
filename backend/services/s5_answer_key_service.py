"""
Stage 5 Service: Master Answer Key Ingestion and Lookup.

Manages official pre-loaded answer keys, parses custom teacher key specifications,
and defines numerical tolerance windows [numerical_min, numerical_max] and dropped questions.
"""

from typing import Dict, List, Optional, Any
from backend.schemas.s4_extraction import QuestionType
from backend.schemas.s5_answer_key import MasterAnswerKey, MasterKeyItem
from backend.core.database import db


class AnswerKeyService:
    """
    Provides answer key retrieval, validation, and tolerance matching.
    """

    @classmethod
    def get_or_create_default_key(cls, exam_id: str, booklet_code: str = "SET A") -> MasterAnswerKey:
        """
        Retrieves an existing master key or synthesizes a canonical standard JEE answer key.
        """
        cached = db.get_master_key(f"{exam_id}_{booklet_code}")
        if cached:
            return MasterAnswerKey.model_validate(cached)

        # Generate a standard 90-question JEE Mains master key
        items = []
        for q_idx in range(1, 91):
            if 1 <= q_idx <= 30:
                subj = "CHEMISTRY"
                is_num = 21 <= q_idx <= 30
            elif 31 <= q_idx <= 60:
                subj = "PHYSICS"
                is_num = 51 <= q_idx <= 60
            else:
                subj = "MATHEMATICS"
                is_num = 81 <= q_idx <= 90

            q_type = QuestionType.NUMERICAL if is_num else QuestionType.MCQ
            correct_opts = []
            num_exact = None
            num_min = None
            num_max = None
            is_dropped = (q_idx == 17) # Question 17 dropped as a realistic bonus test case

            if not is_num:
                # Deterministic option cycling for testing: A, B, C, D
                opts_cycle = ["A", "B", "C", "D"]
                correct_opts = [opts_cycle[(q_idx * 3 + 1) % 4]]
            else:
                # Deterministic numerical value between 5 and 85
                base_val = float((q_idx * 7) % 75 + 10)
                num_exact = base_val
                num_min = base_val - 0.5
                num_max = base_val + 0.5

            items.append(MasterKeyItem(
                question_no=q_idx,
                subject=subj,
                question_type=q_type,
                correct_options=correct_opts,
                numerical_exact=num_exact,
                numerical_min=num_min,
                numerical_max=num_max,
                is_dropped=is_dropped
            ))

        master_key = MasterAnswerKey(
            exam_id=exam_id,
            exam_title=exam_id.replace("_", " "),
            booklet_code=booklet_code,
            total_questions=90,
            items=items
        )
        db.save_master_key(f"{exam_id}_{booklet_code}", master_key.model_dump())
        return master_key

    @classmethod
    def register_custom_key(cls, key_data: MasterAnswerKey) -> None:
        """
        Registers a new teacher-provided or official NTA master key into database.
        """
        key_id = f"{key_data.exam_id}_{key_data.booklet_code}"
        db.save_master_key(key_id, key_data.model_dump())
