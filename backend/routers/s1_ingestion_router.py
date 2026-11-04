"""
Stage 1 Router: Document Ingestion and Classification Endpoint.

Receives file uploads, performs format classification between vector PDF and
raster scan, and initializes document tracking.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from backend.schemas.s1_ingestion import DocumentIngestionResponse
from backend.services.s1_ingestion_service import DocumentIngestionService

router = APIRouter(prefix="/ingest", tags=["Stage 1: Document Ingestion"])


@router.post("", response_model=DocumentIngestionResponse)
async def ingest_document(file: UploadFile = File(...)) -> DocumentIngestionResponse:
    """
    Ingests an exam sheet PDF or image, validates headers, and classifies stream.
    """
    try:
        content = await file.read()
        filename = file.filename or "upload.bin"
        mime_type = file.content_type or "application/octet-stream"
        return DocumentIngestionService.inspect_and_route_file(filename, content, mime_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to ingest document: {str(e)}")
