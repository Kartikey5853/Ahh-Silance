"""
Scorecard persistence model.

Stores finalized candidate evaluation records, total marks, subject-wise
breakdown, and audit verification flags.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class ScorecardModel(BaseModel):
    """
    Entity representing a saved evaluation scorecard.
    """
    evaluation_id: str = Field(..., description="Unique evaluation identifier")
    document_id: str = Field(..., description="Source document identifier")
    candidate_name: Optional[str] = Field(None, description="Candidate name")
    roll_number: Optional[str] = Field(None, description="Candidate roll number")
    exam_id: str = Field(..., description="Evaluated exam identifier")
    total_score: float = Field(..., description="Net total marks scored")
    payload: Dict[str, Any] = Field(..., description="Full serialized scorecard JSON")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Evaluation timestamp")

    def is_passing(self, cutoff: float = 90.0) -> bool:
        """
        Evaluates whether the candidate meets a given score threshold.
        """
        return self.total_score >= cutoff
