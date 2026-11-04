"""
Stage 7 Schema: JEE Scoring Engine Execution.

Defines schemas for question-level evaluation verdicts, JEE Mains marking rules,
and strict enforcement of Section B 'First-5 Attempt' overflow discarding.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ScoringVerdict(str, Enum):
    """
    Evaluation verdict for a student's answer.
    """
    CORRECT = "CORRECT"
    INCORRECT = "INCORRECT"
    UNATTEMPTED = "UNATTEMPTED"
    IGNORED_BY_FIRST_5_RULE = "IGNORED_BY_FIRST_5_RULE"
    DROPPED_BONUS = "DROPPED_BONUS"


class QuestionScoreResult(BaseModel):
    """
    Scoring outcome for a single question.
    """
    question_no: int = Field(..., ge=1, le=90, description="Question number 1 to 90")
    subject: str = Field(..., description="Subject block: CHEMISTRY, PHYSICS, or MATHEMATICS")
    verdict: ScoringVerdict = Field(..., description="Scoring verdict")
    marks_awarded: float = Field(..., description="Marks given: +4, -1, 0, etc.")
    student_answer: Optional[str] = Field(None, description="Extracted answer from student")
    correct_answer: str = Field(..., description="Official correct answer description")
    is_ignored_by_first_5_rule: bool = Field(default=False, description="True if skipped due to >5 Section B attempts")
    audit_note: Optional[str] = Field(None, description="Explanation or rule note")


class ScoringSummary(BaseModel):
    """
    Aggregate score details across all 90 questions.
    """
    total_score: float = Field(..., description="Net total marks scored out of 300")
    max_possible_score: float = Field(default=300.0, description="Maximum possible marks")
    correct_count: int = Field(..., description="Count of correctly answered questions")
    incorrect_count: int = Field(..., description="Count of wrong answers penalized")
    unattempted_count: int = Field(..., description="Count of unattempted questions")
    overflow_ignored_count: int = Field(..., description="Section B questions dropped by first-5 rule")
    question_scores: List[QuestionScoreResult] = Field(..., description="Per-question scores")
