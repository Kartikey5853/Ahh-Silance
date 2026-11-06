"""
Stage 4 Schema: Student Response Extraction.

Defines schemas for extracted student markings, including Section A MCQ
bubble fill metrics, Section B numerical digit bubbles and write-in values,
and candidate roll number decoding.
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class QuestionType(str, Enum):
    """
    JEE Main and Advanced question classification.
    """
    MCQ = "MCQ"
    MULTI_MCQ = "MULTI_MCQ"
    NUMERICAL = "NUMERICAL"
    INTEGER = "INTEGER"
    MATCH = "MATCH"


class ExtractedOptionMark(BaseModel):
    """
    Fill ratio and marking verdict for an individual option bubble.
    """
    option: str = Field(..., description="Option letter: A, B, C, or D")
    fill_ratio: float = Field(..., ge=0.0, le=1.0, description="Inner 60% core pixel density")
    is_marked: bool = Field(..., description="True if marked above threshold")
    is_faint: bool = Field(default=False, description="True if marked lightly with pencil")


class ExtractedQuestionResponse(BaseModel):
    """
    Extracted student response for a single question.
    """
    question_no: int = Field(..., ge=1, le=90, description="Question number 1 to 90")
    question_type: QuestionType = Field(..., description="MCQ, MULTI_MCQ, or NUMERICAL")
    selected_option: Optional[str] = Field(None, description="Marked MCQ option or None if blank")
    selected_options: Optional[List[str]] = Field(default=None, description="List of marked options for Multi-Correct MCQs")
    numerical_value: Optional[str] = Field(None, description="Extracted numerical answer string")
    has_multiple_marks: bool = Field(default=False, description="True if student shaded >1 bubble in Single Choice Section")
    digit_bubble_mismatch: bool = Field(default=False, description="True if Section B written box != shaded bubble")
    is_attempted: bool = Field(..., description="True if student marked any answer")


class ExtractedSheetData(BaseModel):
    """
    Complete extracted payload from an OMR answer sheet.
    """
    document_id: str = Field(..., description="Target document identifier")
    exam_type: str = Field(default="JEE_MAIN", description="Detected exam type: JEE_MAIN or JEE_ADVANCED")
    roll_number: Optional[str] = Field(None, description="Extracted candidate roll number")
    booklet_code: Optional[str] = Field(None, description="Extracted booklet set code e.g. SET A")
    responses: List[ExtractedQuestionResponse] = Field(..., description="Responses for questions 1 to 90")
