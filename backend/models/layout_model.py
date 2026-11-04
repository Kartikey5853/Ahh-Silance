"""
Layout persistence model.

Stores detected structural geometry, column boundaries, and subject
block locations for an exam page.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field


class LayoutModel(BaseModel):
    """
    Entity representing detected geometry and section partitions of a document.
    """
    document_id: str = Field(..., description="Target document ID")
    page_index: int = Field(default=0, description="Page index")
    column_count: int = Field(default=3, description="Number of detected vertical columns")
    section_bounds: Dict[str, Any] = Field(default={}, description="Subject bounding box coordinates")

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts layout entity to a dictionary representation.
        """
        return self.model_dump()
