"""
Extraction persistence model.

Stores raw extracted student markings, fill ratios, decoded candidate
roll number, and test booklet set code.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ExtractionModel(BaseModel):
    """
    Entity holding extracted responses and student identification.
    """
    document_id: str = Field(..., description="Target document ID")
    candidate_name: Optional[str] = Field(None, description="Candidate name")
    roll_number: Optional[str] = Field(None, description="Decoded roll number")
    booklet_code: str = Field(default="SET A", description="Identified booklet set code")
    extracted_responses: List[Dict[str, Any]] = Field(default=[], description="List of 90 extracted items")

    def get_attempted_count(self) -> int:
        """
        Calculates total number of questions attempted by candidate.
        """
        return sum(1 for r in self.extracted_responses if r.get("is_attempted"))
