"""
Stage 6 Schema: Response-to-Key Alignment.

Defines schemas for sparse hash map pairing between candidate extracted
responses and master key entries, eliminating index drift and handling skipped questions.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from backend.schemas.s4_extraction import ExtractedQuestionResponse
from backend.schemas.s5_answer_key import MasterKeyItem


class AlignedQuestionPair(BaseModel):
    """
    Matched student response and master key item for a single question index.
    """
    question_no: int = Field(..., ge=1, le=90, description="Normalized question index")
    student_response: Optional[ExtractedQuestionResponse] = Field(None, description="Student attempt if any")
    master_key: MasterKeyItem = Field(..., description="Target master key item")
    is_attempted: bool = Field(..., description="True if student marked any response")


class AlignmentResult(BaseModel):
    """
    Overall alignment structure for an exam sheet against the designated answer key.
    """
    document_id: str = Field(..., description="Target document identifier")
    exam_id: str = Field(..., description="Matched master key exam identifier")
    matched_booklet_code: str = Field(..., description="Booklet code used for alignment")
    total_aligned_questions: int = Field(default=90, description="Number of aligned questions")
    aligned_pairs: List[AlignedQuestionPair] = Field(..., description="Sparse hash-map aligned pairs")
