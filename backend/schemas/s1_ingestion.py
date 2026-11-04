"""
Stage 1 Schema: Document Ingestion and Format Routing.

Defines payloads for uploading test sheets (PDF, PNG, JPEG),
validating file headers, and routing between digital vector and raster CV pipelines.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class IngestionSourceType(str, Enum):
    """
    Supported document source formats.
    """
    DIGITAL_VECTOR_PDF = "digital_vector_pdf"
    SCANNED_RASTER_PDF = "scanned_raster_pdf"
    MOBILE_CAMERA_IMAGE = "mobile_camera_image"
    FLATBED_SCAN_IMAGE = "flatbed_scan_image"


class DocumentIngestionRequest(BaseModel):
    """
    Payload for initiating a document ingestion job.
    """
    file_name: str = Field(..., description="Original filename of the uploaded sheet")
    mime_type: str = Field(..., description="MIME type e.g. application/pdf, image/png")
    file_size_bytes: int = Field(..., gt=0, description="Size of uploaded document in bytes")


class DocumentIngestionResponse(BaseModel):
    """
    Output metadata after validating and routing the ingested document.
    """
    document_id: str = Field(..., description="Unique generated identifier for the document")
    file_name: str = Field(..., description="Original filename")
    source_type: IngestionSourceType = Field(..., description="Classified ingestion stream type")
    page_count: int = Field(default=1, description="Number of pages in the document")
    can_vector_bypass: bool = Field(..., description="True if digital vector stream can bypass raster CV")
    message: str = Field(..., description="Ingestion status description")
