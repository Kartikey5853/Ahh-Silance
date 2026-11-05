"""
Stage 9 Router: Unified Evaluation and Instant Scorecard Endpoints.

Coordinates end-to-end evaluation orchestration and retrieves stored
scorecards with quality control audit flags and SQLite persistence.
Enforces pure computer vision extraction without synthetic fallbacks,
strictly rejecting non-OMR documents and mandating user-provided answer keys.
"""

import os
import json
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse
import cv2
import numpy as np

from backend.schemas.s4_extraction import ExtractedSheetData, QuestionType
from backend.schemas.s9_evaluation import EvaluationScorecardResponse
from backend.services.s9_evaluation_service import EvaluationOrchestratorService
from backend.services.s4_extraction_service import ExtractionService
from backend.services.s5_answer_key_service import AnswerKeyService
from backend.services.s2_omr_vision_detector import OMRVisionDetector
from backend.core.database import db
from backend.core.auth import get_optional_current_user

router = APIRouter(prefix="/evaluate", tags=["Stage 9: Instant Scorecard Delivery"])


@router.get("/samples")
async def list_available_samples() -> List[Dict[str, str]]:
    """
    Returns available demonstration files in external_test directory.
    """
    sample_dir = r"f:\neira\Dataset\external_test"
    if not os.path.exists(sample_dir):
        return []
    items = []
    for f in os.listdir(sample_dir):
        fp = os.path.join(sample_dir, f)
        if os.path.isfile(fp):
            items.append({"name": f, "size": str(os.path.getsize(fp))})
    return items


@router.get("/sample-file")
async def get_sample_file(filename: str):
    """
    Streams a sample dataset file for testing.
    """
    search_dirs = [
        r"f:\neira\Dataset\external_test",
        r"f:\neira\Dataset\synthetically_generated\jee_main_authentic_omrs"
    ]
    for d in search_dirs:
        fp = os.path.join(d, filename)
        if os.path.exists(fp) and os.path.isfile(fp):
            return FileResponse(fp, filename=filename)
    raise HTTPException(status_code=404, detail=f"Sample file '{filename}' not found.")


@router.post("", response_model=EvaluationScorecardResponse)
async def evaluate_sheet(
    sheet_data: ExtractedSheetData,
    exam_id: str = Query("JEE_Main_2025_Jan_22_Shift1"),
    candidate_name: Optional[str] = Query("Candidate")
) -> EvaluationScorecardResponse:
    """
    Evaluates complete extracted sheet data and delivers instant scorecard.
    """
    try:
        return EvaluationOrchestratorService.evaluate_sheet_data(
            document_id=sheet_data.document_id,
            sheet_data=sheet_data,
            exam_id=exam_id,
            candidate_name=candidate_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.post("/upload", response_model=EvaluationScorecardResponse)
async def evaluate_uploaded_file(
    sheet_file: UploadFile = File(..., description="Uploaded OMR sheet or marked question paper"),
    answer_key_file: UploadFile = File(..., description="Mandatory master answer key (JSON, CSV, or TXT)"),
    exam_id: str = Form("JEE_Main_2025_Jan_22_Shift1"),
    mode: str = Form("omr"), # 'omr' or 'marked_paper'
    candidate_name: str = Form("Student Candidate"),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
) -> EvaluationScorecardResponse:
    """
    Processes an uploaded student document alongside the mandatory user-provided answer key,
    evaluates responses with strict NTA scoring, and returns a verified scorecard.
    Rejects non-OMR files with HTTP 422 if no bubble grid structure is detected.
    """
    # 1. Validate that both files were submitted
    if not sheet_file or not sheet_file.filename:
        raise HTTPException(
            status_code=400,
            detail="Student document file is missing. Please select an OMR sheet image or marked question paper PDF."
        )

    if not answer_key_file or not answer_key_file.filename:
        raise HTTPException(
            status_code=400,
            detail="Answer key file is required. There are no assumed default answers; please upload the master key file."
        )

    try:
        sheet_bytes = await sheet_file.read()
        key_bytes = await answer_key_file.read()
        doc_id = f"doc_{uuid.uuid4().hex[:10]}"

        # 2. Parse mandatory user-provided answer key
        try:
            master_key = AnswerKeyService.parse_uploaded_answer_key(
                file_bytes=key_bytes,
                filename=answer_key_file.filename,
                exam_id=exam_id,
                booklet_code="SET A"
            )
        except Exception as key_err:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid Answer Key format: {str(key_err)}"
            )

        # 3. Pure Computer Vision Extraction (Zero Mocking)
        sheet_data: Optional[ExtractedSheetData] = None
        fname_lower = sheet_file.filename.lower()

        # Case A: PDF Document (e.g. 10-page marked question paper)
        if fname_lower.endswith(".pdf"):
            sheet_data = OMRVisionDetector.extract_marked_paper_from_pdf(
                document_id=doc_id,
                pdf_bytes=sheet_bytes,
                booklet_code=master_key.booklet_code
            )

        # Case B: JSON explicit payload (for automated JSON-based unit tests)
        elif fname_lower.endswith(".json"):
            meta = json.loads(sheet_bytes.decode("utf-8-sig"))
            sheet_data = ExtractionService.extract_from_ground_truth_or_meta(doc_id, meta)

        # Case C: Image file (OMR sheet photo or scan)
        elif fname_lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")):
            nparr = np.frombuffer(sheet_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                raise HTTPException(
                    status_code=400,
                    detail="Uploaded file could not be decoded as an image. Please verify file integrity."
                )

            # STRICT CV VERIFICATION: Check whether image actually has an OMR bubble grid
            is_omr, bubble_cnt, verify_msg = OMRVisionDetector.verify_is_omr_document(img)
            if not is_omr:
                raise HTTPException(
                    status_code=422,
                    detail=f"Uploaded image is not a recognizable OMR sheet. {verify_msg}"
                )

            # Pure pixel extraction: measure bubble darkness and run OCR on Section B boxes
            sheet_data = OMRVisionDetector.extract_omr_from_pixels(
                document_id=doc_id,
                img_bgr=img,
                booklet_code=master_key.booklet_code
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{sheet_file.filename}'. Allowed formats: PNG, JPG, JPEG, PDF, JSON."
            )

        # 4. Evaluate extracted sheet data strictly against the user's master key
        scorecard = EvaluationOrchestratorService.evaluate_sheet_data(
            document_id=doc_id,
            sheet_data=sheet_data,
            exam_id=exam_id,
            candidate_name=candidate_name,
            master_key=master_key
        )

        # 5. Persist to SQLite database with user binding
        user_id = current_user["id"] if current_user else None
        db.save_scorecard(scorecard.evaluation_id, scorecard.model_dump(mode="json"), user_id=user_id)

        return scorecard

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate upload: {str(e)}")


@router.get("/scorecard/{evaluation_id}", response_model=dict)
async def get_saved_scorecard(evaluation_id: str) -> dict:
    """
    Retrieves a previously computed student scorecard by evaluation ID.
    """
    card = db.get_scorecard(evaluation_id)
    if not card:
        raise HTTPException(status_code=404, detail="Scorecard not found")
    return card
