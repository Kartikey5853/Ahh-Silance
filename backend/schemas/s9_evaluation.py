"""
Stage 9 Schema: Result Delivery and Instant Scorecard.

Defines schemas for the final client-facing scorecard payload, verification
audit flags, question review status badges, and lightweight JSON delivery.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from backend.schemas.s7_scoring import QuestionScoreResult, ScoringSummary
from backend.schemas.s8_analytics import ExamAnalyticsReport


class CandidateInfo(BaseModel):
    """
    Candidate identification metadata.
    """
    candidate_name: Optional[str] = Field(None, description="Candidate name")
    roll_number: Optional[str] = Field(None, description="Roll number from OMR")
    booklet_code: Optional[str] = Field(None, description="Booklet set code")
    exam_title: str = Field(..., description="Exam title")
    exam_type: str = Field(default="JEE_MAIN", description="Detected exam classification: JEE_MAIN or JEE_ADVANCED")


class AuditVerificationFlags(BaseModel):
    """
    Quality control flags signaling ambiguous student markings or anomalies.
    """
    has_double_marks: bool = Field(default=False, description="True if any MCQ had multiple bubbles shaded")
    has_digit_bubble_mismatches: bool = Field(default=False, description="True if any Section B box != bubble")
    has_faint_marks: bool = Field(default=False, description="True if faint pencil was detected")
    has_section_b_overflow: bool = Field(default=False, description="True if student attempted >5 in Section B")


class EvaluationScorecardResponse(BaseModel):
    """
    Complete instant scorecard delivered to student or teacher.
    """
    evaluation_id: str = Field(..., description="Unique evaluation identifier")
    candidate: CandidateInfo = Field(..., description="Candidate details")
    scoring: ScoringSummary = Field(..., description="Overall and per-question score breakdown")
    analytics: ExamAnalyticsReport = Field(..., description="Subject performance analytics")
    audit_flags: AuditVerificationFlags = Field(..., description="Anomalies and verification badges")
    processed_in_milliseconds: float = Field(..., description="Total pipeline latency in ms")
