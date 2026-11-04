"""
Stage 8 Schema: Performance Analytics and Subject Statistics.

Defines schemas for subject-wise performance breakdown, accuracy ratios,
attempt counts, and candidate time/speed statistics.
"""

from typing import Dict, List
from pydantic import BaseModel, Field


class SubjectAnalytics(BaseModel):
    """
    Summary performance metrics for a single subject block.
    """
    subject_name: str = Field(..., description="CHEMISTRY, PHYSICS, or MATHEMATICS")
    score: float = Field(..., description="Net score in subject out of 100")
    total_marks: float = Field(default=100.0, description="Maximum marks for subject")
    attempted: int = Field(..., description="Questions attempted in subject")
    correct: int = Field(..., description="Correctly answered questions")
    incorrect: int = Field(..., description="Wrongly answered questions")
    accuracy_percentage: float = Field(..., ge=0.0, le=100.0, description="Correct / Attempted * 100")
    section_b_attempts: int = Field(..., description="Total Section B questions marked")
    section_b_ignored: int = Field(..., description="Section B questions discarded past first 5")


class ExamAnalyticsReport(BaseModel):
    """
    Comprehensive analytical breakdown for an evaluated test.
    """
    evaluation_id: str = Field(..., description="Target evaluation identifier")
    overall_accuracy_percentage: float = Field(..., ge=0.0, le=100.0, description="Overall accuracy")
    total_attempted: int = Field(..., description="Total questions attempted out of 75 allowed")
    subject_breakdown: List[SubjectAnalytics] = Field(..., description="Subject-wise breakdown")
