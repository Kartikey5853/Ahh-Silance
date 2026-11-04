"""
Stage 3 Schema: Question and Section Structure Layout Detection.

Defines schemas for bounding column gutters, isolating subject blocks
(Chemistry, Physics, Mathematics), and reading-order partitioning.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class SubjectSection(str, Enum):
    """
    Standard JEE subjects.
    """
    CHEMISTRY = "CHEMISTRY"
    PHYSICS = "PHYSICS"
    MATHEMATICS = "MATHEMATICS"


class BoundingBox(BaseModel):
    """
    Rectangular region in normalized image pixel space.
    """
    x_min: int = Field(..., description="Left coordinate")
    y_min: int = Field(..., description="Top coordinate")
    x_max: int = Field(..., description="Right coordinate")
    y_max: int = Field(..., description="Bottom coordinate")


class SectionLayout(BaseModel):
    """
    Layout bounds and question range for an individual subject block.
    """
    subject: SubjectSection = Field(..., description="Subject name")
    start_question: int = Field(..., ge=1, le=90, description="First question index in section")
    end_question: int = Field(..., ge=1, le=90, description="Last question index in section")
    section_a_mcq_box: BoundingBox = Field(..., description="Bounding box of Section A MCQ bubble grid")
    section_b_numerical_box: BoundingBox = Field(..., description="Bounding box of Section B numerical grid")


class DocumentLayoutResponse(BaseModel):
    """
    Complete detected structure of an exam page.
    """
    document_id: str = Field(..., description="Target document identifier")
    column_count: int = Field(default=3, description="Detected vertical column sections")
    has_header_metadata: bool = Field(default=True, description="True if Roll Number/Booklet grid is present")
    sections: List[SectionLayout] = Field(..., description="Detected subject blocks with coordinates")
