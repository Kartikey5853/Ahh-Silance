"""
Stage 7 Schema: JEE Scoring Engine Execution.

Defines schemas for question-level evaluation verdicts, JEE Mains marking rules,
and strict enforcement of Section B 'First-5 Attempt' overflow discarding.
"""

from enum import Enum
from typing import List, Optional, Any
from pydantic import BaseModel, Field, model_validator


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
    question_type: str = Field(default="MCQ", description="Question format: MCQ or NUMERICAL")
    verdict: ScoringVerdict = Field(..., description="Scoring verdict")
    marks_awarded: float = Field(..., description="Marks given: +4, -1, 0, etc.")
    student_answer: Optional[str] = Field(None, description="Extracted answer from student")
    candidate_response: Optional[str] = Field(None, description="Extracted candidate response (alias for student_answer)")
    correct_answer: str = Field(..., description="Official correct answer description")
    is_ignored_by_first_5_rule: bool = Field(default=False, description="True if skipped due to >5 Section B attempts")
    audit_note: Optional[str] = Field(None, description="Explanation or rule note")

    @model_validator(mode="before")
    @classmethod
    def sync_candidate_fields(cls, data: Any):
        if isinstance(data, dict):
            # Sync candidate_response and student_answer
            ans = data.get("student_answer") if data.get("student_answer") is not None else data.get("candidate_response")
            if data.get("student_answer") is None:
                data["student_answer"] = ans
            if data.get("candidate_response") is None:
                data["candidate_response"] = ans

            # Infer question_type if missing
            if not data.get("question_type"):
                q_no = data.get("question_no", 0)
                if (21 <= q_no <= 30) or (51 <= q_no <= 60) or (81 <= q_no <= 90):
                    data["question_type"] = "NUMERICAL"
                else:
                    data["question_type"] = "MCQ"
        return data


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
