"""
Unit and Integration tests for MagicInk 3-Stage Academic Evaluation Pipeline,
Page Rasterization Service, Database Persistence, and SVG Overlay Generation.
"""

import os
import io
import json
import pytest
from PIL import Image

from backend.core.database import db
from backend.services.page_storage_service import PageStorageService
from backend.services.magic_ink_service import MagicInkService


def create_dummy_sheet_image_bytes() -> bytes:
    """Generates a sample in-memory JPEG notebook sheet for test evaluation."""
    img = Image.new("RGB", (1000, 1400), color=(250, 248, 242))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def sample_exam():
    return {
        "id": "exam_test_magicink_101",
        "subject_id": "subj_cs_301",
        "title": "Compiler Design - Assignment 2",
        "exam_type": "Assignment",
        "max_marks": 20.0,
        "passing_marks": 8.0,
        "questions": [
            {
                "id": "q1",
                "q_no": "1",
                "text": "Construct an SLR Parsing Table for the Grammar: S -> (L) | a; L -> L, S | S.",
                "marks": 5.0,
                "rubric": "Augmented grammar, LR(0) items, FOLLOW sets, and ACTION/GOTO parsing table."
            },
            {
                "id": "q2",
                "q_no": "2",
                "text": "Differentiate between SLR, LALR, and CLR Parsers.",
                "marks": 5.0,
                "rubric": "Comparison across state complexity, parsing power, and conflict resolution."
            },
            {
                "id": "q3",
                "q_no": "3",
                "text": "Explain Syntax-Directed Translation and S-attributed vs L-attributed definitions.",
                "marks": 5.0,
                "rubric": "Dependency graph, evaluation order, and syntax tree construction."
            },
            {
                "id": "q4",
                "q_no": "4",
                "text": "Describe Three-Address Code representations and Basic Block partitioning.",
                "marks": 5.0,
                "rubric": "Quadruples, triples, indirect triples, and leader statements."
            }
        ],
        "answer_key_text": "SLR parsing table with augmented grammar S' -> S, LR(0) items I0-I8, FOLLOW(S) = {), ,, $}."
    }


def test_page_storage_rasterization():
    """Verifies image and text submission rasterization to 200 DPI JPEG images."""
    eval_id = "test_eval_storage_01"
    img_bytes = create_dummy_sheet_image_bytes()
    
    raster = PageStorageService.save_and_rasterize_submission(
        eval_id=eval_id,
        file_bytes=img_bytes,
        filename="handwritten_submission.jpg",
        target_dpi=200
    )

    assert raster["eval_id"] == eval_id
    assert raster["page_count"] == 1
    assert len(raster["pages"]) == 1
    
    page_1 = raster["pages"][0]
    assert page_1["page_num"] == 1
    assert os.path.isfile(page_1["path"])
    assert page_1["width"] == 1000
    assert page_1["height"] == 1400

    # Test retrieval helper
    retrieved_path = PageStorageService.get_page_image_path(eval_id, 1)
    assert retrieved_path is not None
    assert os.path.abspath(retrieved_path) == os.path.abspath(page_1["path"])


def test_magicink_evaluation_and_svg_generation(sample_exam, monkeypatch):
    """
    Verifies that MagicInk evaluation produces exact partial score (19.5/20),
    SLR table improvement advice, normalized 0-1000 bounding boxes, and SVG overlay markup.
    """
    import asyncio
    monkeypatch.setattr(MagicInkService, "get_gemini_client", classmethod(lambda cls, key=None: None))
    eval_id = "test_eval_magicink_02"
    img_bytes = create_dummy_sheet_image_bytes()
    
    raster = PageStorageService.save_and_rasterize_submission(
        eval_id=eval_id,
        file_bytes=img_bytes,
        filename="compiler_assignment.jpg"
    )

    result = asyncio.run(MagicInkService.evaluate_submission(
        eval_id=eval_id,
        exam=sample_exam,
        student_name="Kartikey",
        roll_number="24CS0192",
        page_records=raster["pages"],
        raw_text=""
    ))

    assert result["status"] == "success"
    assert result["total_score"] == 19.5
    assert result["max_score"] == 20.0
    assert result["percentage"] == 97.5
    assert "Outstanding" in result["grade"]

    # Verify Granular Breakdown
    breakdown = result["breakdown"]
    assert len(breakdown) == 4
    
    # Question 1: Partial 4.5/5 on SLR Parsing Table
    q1 = breakdown[0]
    assert q1["q_no"] == "1"
    assert q1["awarded_marks"] == 4.5
    assert q1["status"] == "PARTIAL"
    assert "SLR Parsing Table Action Placement" in q1["improvement_title"]
    assert "endmarker" in q1["improvement_tip"].lower()

    # Verify MagicInk Spatial Annotations
    magic_ink = result["magic_ink"]
    assert magic_ink["overall_score_text"] == "19.5 / 20"
    assert magic_ink["total_stamp"]["page"] == 1
    assert len(magic_ink["total_stamp"]["box_2d"]) == 4

    # Verify SVG Overlays
    svg_overlays = magic_ink.get("svg_overlays", {})
    assert 1 in svg_overlays
    page_1_svg = svg_overlays[1]
    
    # Must have normalized viewBox 0 0 1000 1000
    assert 'viewBox="0 0 1000 1000"' in page_1_svg
    # Must have total score stamp
    assert "magicink-total-stamp" in page_1_svg
    assert "19.5" in page_1_svg
    # Must have circled question score
    assert "magicink-score-circle" in page_1_svg
    # Must have question badge Q1
    assert "magicink-q-badge" in page_1_svg


def test_database_persistence_with_magicink(sample_exam):
    """Verifies storing and retrieving MagicInk evaluations from SQLite database."""
    eval_id = "test_eval_db_persistence_03"
    
    data = {
        "id": eval_id,
        "exam_id": sample_exam["id"],
        "student_id": "stud_001",
        "roll_number": "24CS0192",
        "student_name": "Kartikey",
        "answer_sheet_filename": "assignment_02.jpg",
        "total_score": 19.5,
        "max_score": 20.0,
        "percentage": 97.5,
        "grade": "Outstanding (A+)",
        "breakdown": [{"q_no": "1", "awarded_marks": 4.5, "max_marks": 5.0, "status": "PARTIAL"}],
        "teacher_feedback": "Excellent work with thorough derivations.",
        "page_count": 1,
        "pages_dir": f"uploads/evaluations/{eval_id}",
        "magic_ink": {
            "total_stamp": {"page": 1, "box_2d": [48, 865, 142, 976]},
            "overall_score_text": "19.5 / 20",
            "questions_count": 4
        }
    }

    saved = db.save_academic_evaluation(data)
    assert saved["id"] == eval_id

    retrieved = db.get_academic_evaluation(eval_id)
    assert retrieved is not None
    assert retrieved["id"] == eval_id
    assert retrieved["total_score"] == 19.5
    assert retrieved["page_count"] == 1
    assert retrieved["magic_ink"]["overall_score_text"] == "19.5 / 20"
    assert retrieved["magic_ink"]["total_stamp"]["box_2d"] == [48, 865, 142, 976]


def test_magicink_router_endpoints(sample_exam, monkeypatch):
    """Verifies FastAPI evaluation, page streaming, and magicink endpoints."""
    import uuid
    from fastapi.testclient import TestClient
    from backend.main import app

    monkeypatch.setattr(MagicInkService, "get_gemini_client", classmethod(lambda cls, key=None: None))
    client = TestClient(app)
    unique_exam_id = f"exam_{uuid.uuid4().hex[:8]}"

    # 1. Create student and exam in db
    exam_rec = db.create_exam({
        "id": unique_exam_id,
        "subject_id": sample_exam["subject_id"],
        "title": sample_exam["title"],
        "exam_type": sample_exam["exam_type"],
        "max_marks": sample_exam["max_marks"],
        "passing_marks": sample_exam["passing_marks"],
        "questions": sample_exam["questions"],
        "answer_key_text": sample_exam["answer_key_text"]
    })

    # Add student
    stud_rec = db.add_student(
        subject_id=sample_exam["subject_id"],
        name="Kartikey",
        roll_number=f"24CS{uuid.uuid4().hex[:4]}"
    )

    # 2. Call POST /api/v1/academic/exams/{exam_id}/evaluate with image file
    img_bytes = create_dummy_sheet_image_bytes()
    resp = client.post(
        f"/api/v1/academic/exams/{unique_exam_id}/evaluate",
        data={"student_id": stud_rec["id"]},
        files={"sheet_file": ("student_submission.jpg", img_bytes, "image/jpeg")}
    )

    assert resp.status_code == 200
    res_data = resp.json()
    eval_id = res_data["id"]
    assert res_data["total_score"] == 19.5
    assert res_data["page_count"] == 1
    assert "magic_ink" in res_data
    assert res_data["magic_ink"]["overall_score_text"] == "19.5 / 20"

    # 3. Call GET /api/v1/academic/evaluations/{eval_id}/pages/1
    page_resp = client.get(f"/api/v1/academic/evaluations/{eval_id}/pages/1")
    assert page_resp.status_code == 200
    assert page_resp.headers["content-type"] == "image/jpeg"
    assert len(page_resp.content) > 0

    # 4. Call GET /api/v1/academic/evaluations/{eval_id}/magicink
    ink_resp = client.get(f"/api/v1/academic/evaluations/{eval_id}/magicink")
    assert ink_resp.status_code == 200
    ink_data = ink_resp.json()
    assert ink_data["eval_id"] == eval_id
    assert ink_data["total_score"] == 19.5
    assert "svg_overlays" in ink_data["magic_ink"]
