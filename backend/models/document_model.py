"""
Document persistence model.

Stores ingested file metadata, storage paths, processing state,
and classification between vector PDF and raster image modes.
"""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class DocumentModel(BaseModel):
    """
    Entity representing an uploaded test document in the evaluation pipeline.
    """
    id: str = Field(..., description="Unique document ID")
    filename: str = Field(..., description="Original file name")
    mime_type: str = Field(..., description="MIME type")
    file_size_bytes: int = Field(..., description="File size in bytes")
    file_path: Optional[str] = Field(None, description="Local or temp storage path on disk")
    is_vector_pdf: bool = Field(default=False, description="Whether digital PDF bypass is enabled")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Upload timestamp")
    status: str = Field(default="INGESTED", description="Lifecycle state: INGESTED, PREPROCESSED, EXTRACTED, EVALUATED")

    def mark_processed(self, new_status: str) -> None:
        """
        Updates the processing lifecycle state of the document.
        """
        self.status = new_status
