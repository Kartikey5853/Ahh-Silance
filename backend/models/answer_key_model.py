"""
Master answer key persistence model.

Stores official correct answer keys, numerical tolerance intervals,
and question-type definitions for standard JEE exam sessions.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AnswerKeyModel(BaseModel):
    """
    Entity representing an official answer key stored in the system.
    """
    exam_id: str = Field(..., description="Unique exam identifier")
    title: str = Field(..., description="Exam title")
    booklet_code: str = Field(default="SET A", description="Booklet set code")
    total_questions: int = Field(default=90, description="Total questions")
    key_items: List[Dict[str, Any]] = Field(default=[], description="List of correct answers")

    def get_item(self, question_no: int) -> Optional[Dict[str, Any]]:
        """
        Retrieves answer key entry for a specific question number.
        """
        for item in self.key_items:
            if item.get("question_no") == question_no:
                return item
        return None
