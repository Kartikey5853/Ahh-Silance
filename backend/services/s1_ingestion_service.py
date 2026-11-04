"""
Stage 1 Service: Document Ingestion and Format Routing.

Inspects uploaded files, identifies format (PDF vs Image), detects whether
a PDF contains digital vector text for fast-path extraction, and creates
document tracking records.
"""

import uuid
from typing import Tuple
import pymupdf as fitz
from backend.schemas.s1_ingestion import (
    DocumentIngestionRequest,
    DocumentIngestionResponse,
    IngestionSourceType
)
from backend.models.document_model import DocumentModel
from backend.core.database import db


class DocumentIngestionService:
    """
    Handles file ingestion, format detection, and vector PDF verification.
    """

    @staticmethod
    def inspect_and_route_file(filename: str, file_bytes: bytes, mime_type: str) -> DocumentIngestionResponse:
        """
        Inspects file payload to detect digital vector streams and route processing.
        """
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
        is_pdf = mime_type == "application/pdf" or filename.lower().endswith(".pdf")
        page_count = 1
        can_vector_bypass = False
        source_type = IngestionSourceType.FLATBED_SCAN_IMAGE

        if is_pdf:
            try:
                pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
                page_count = len(pdf_doc)
                # Check for vector text content
                total_text_len = sum(len(page.get_text()) for page in pdf_doc)
                if total_text_len > 100:
                    can_vector_bypass = True
                    source_type = IngestionSourceType.DIGITAL_VECTOR_PDF
                else:
                    source_type = IngestionSourceType.SCANNED_RASTER_PDF
                pdf_doc.close()
            except Exception:
                source_type = IngestionSourceType.SCANNED_RASTER_PDF
        else:
            source_type = IngestionSourceType.MOBILE_CAMERA_IMAGE

        # Store model in database
        doc_model = DocumentModel(
            id=doc_id,
            filename=filename,
            mime_type=mime_type,
            file_size_bytes=len(file_bytes),
            is_vector_pdf=can_vector_bypass,
            status="INGESTED"
        )
        db.documents[doc_id] = doc_model.model_dump()

        return DocumentIngestionResponse(
            document_id=doc_id,
            file_name=filename,
            source_type=source_type,
            page_count=page_count,
            can_vector_bypass=can_vector_bypass,
            message="Document successfully ingested and classified"
        )
