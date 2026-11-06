"""
Stage 5 Schema: Master Answer Key Ingestion.

Defines schemas for official master answer keys, supporting single-choice,
multi-correct options, floating-point numerical tolerance intervals [min, max],
and dropped/bonus questions.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from backend.schemas.s4_extraction import QuestionType


class MasterKeyItem(BaseModel):
    """
    Official correct answer definition for a single question.
    """
    question_no: int = Field(..., ge=1, le=90, description="Question number 1 to 90")
    subject: str = Field(..., description="CHEMISTRY, PHYSICS, or MATHEMATICS")
    question_type: QuestionType = Field(..., description="MCQ or NUMERICAL")
    correct_options: Optional[List[str]] = Field(default=[], description="List of accepted options for MCQ")
    numerical_exact: Optional[float] = Field(None, description="Exact expected numerical value")
    numerical_min: Optional[float] = Field(None, description="Lower bound of accepted tolerance range")
    numerical_max: Optional[float] = Field(None, description="Upper bound of accepted tolerance range")
    is_dropped: bool = Field(default=False, description="True if NTA dropped the question (bonus to all)")


class MasterAnswerKey(BaseModel):
    """
    Complete master answer key for a specific exam shift and booklet code.
    """
    exam_id: str = Field(..., description="Unique exam identifier e.g. JEE_Main_2025_Jan_22_Shift1 or JEE_Advanced_2025_Paper1")
    exam_title: str = Field(..., description="Human-readable exam name")
    exam_type: str = Field(default="JEE_MAIN", description="Detected exam classification: JEE_MAIN or JEE_ADVANCED")
    booklet_code: str = Field(default="SET A", description="Booklet set code")
    total_questions: int = Field(default=90, description="Number of questions in paper")
    items: List[MasterKeyItem] = Field(..., description="List of answer key items")
