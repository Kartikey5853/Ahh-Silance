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


def test_2prompt_unpacks_multi_answer_block_and_real_pages(monkeypatch, tmp_path):
    """
    Verifies Prompt 1 + Prompt 2 flow unpacks multiple answers crammed under a single
    student heading ('Q1'), links multi-page continuations cleanly, and NEVER invents
    fake page numbers for unattempted questions.
    """
    import asyncio
    from backend.services import magic_ink_service as mis_mod

    p1 = tmp_path / "page_01.jpg"
    p2 = tmp_path / "page_02.jpg"
    Image.new("RGB", (800, 1100), color=(255, 255, 255)).save(p1, format="JPEG")
    Image.new("RGB", (800, 1100), color=(255, 255, 255)).save(p2, format="JPEG")

    page_records = [
        {"page_num": 1, "path": str(p1), "width": 800, "height": 1100},
        {"page_num": 2, "path": str(p2), "width": 800, "height": 1100},
    ]

    exam = {
        "id": "exam_nlp_2prompt",
        "subject_id": "subj_nlp",
        "title": "NLP Unit Test",
        "max_marks": 20.0,
        "answer_key_text": "Q1 Tokenization, Q2 Lemmatization, Q3 Stopwords, Q4 TF-IDF",
        "questions": [
            {"q_no": "Q1", "text": "Define tokenization.", "marks": 5.0, "rubric": "Word & subword split."},
            {"q_no": "Q2", "text": "Explain lemmatization vs stemming.", "marks": 5.0, "rubric": "Dictionary root form."},
            {"q_no": "Q3", "text": "What is stopword removal?", "marks": 5.0, "rubric": "Filter high-frequency words."},
            {"q_no": "Q4", "text": "Derive TF-IDF formula.", "marks": 5.0, "rubric": "TF * log(N/df)."},
        ],
    }

    prompt1_payload = {
        "blocks": [
            {
                "block_id": "blk-p1-1",
                "page": 1,
                "box_2d": [80, 50, 910, 940],
                "written_heading": "Q1.",
                "transcript_markdown": (
                    "### Answer 1 & Combined Concepts\n"
                    "- **Tokenization** splits raw text into word or subword tokens.\n"
                    "- **Lemmatization** reduces words to dictionary lemma using POS & morphology, unlike crude stemming.\n"
                    "- **Stopwords** are frequent functional words like 'the', 'is' filtered before indexing..."
                ),
            },
            {
                "block_id": "blk-p2-1",
                "page": 2,
                "box_2d": [65, 55, 360, 935],
                "written_heading": "(continued)",
                "transcript_markdown": "...Stopword filtering lowers vector dimensionality and improves IR precision.",
            },
        ]
    }

    prompt2_payload = {
        "teacher_feedback": "Clear conceptual writing across Q1-Q3; Q4 was not attempted.",
        "breakdown": [
            {
                "q_no": "Q1",
                "source_block_ids": ["blk-p1-1"],
                "answer_regions": [
                    {
                        "page": 1,
                        "box_2d": [95, 55, 290, 930],
                        "start_marker": "Tokenization splits raw text",
                        "end_marker": "word or subword tokens.",
                        "is_start": True,
                        "is_end": True,
                    }
                ],
                "ocr_extracted_text": "**Tokenization** splits raw text into word or subword tokens.",
                "status": "CORRECT",
                "awarded_marks": 5.0,
                "rubric_checks": [{"criterion": "Word & subword split", "awarded": 5.0, "max": 5.0, "status": "MET"}],
                "feedback": "Accurate definition.",
            },
            {
                "q_no": "Q2",
                "source_block_ids": ["blk-p1-1"],
                "answer_regions": [
                    {
                        "page": 1,
                        "box_2d": [300, 55, 610, 930],
                        "start_marker": "Lemmatization reduces words",
                        "end_marker": "unlike crude stemming.",
                        "is_start": True,
                        "is_end": True,
                    }
                ],
                "ocr_extracted_text": "**Lemmatization** reduces words to dictionary lemma using POS & morphology, unlike crude stemming.",
                "status": "CORRECT",
                "awarded_marks": 5.0,
                "rubric_checks": [{"criterion": "Dictionary root form", "awarded": 5.0, "max": 5.0, "status": "MET"}],
                "feedback": "Unpacked from mixed Q1 block accurately.",
            },
            {
                "q_no": "Q3",
                "source_block_ids": ["blk-p1-1", "blk-p2-1"],
                "answer_regions": [
                    {
                        "page": 1,
                        "box_2d": [620, 55, 905, 935],
                        "start_marker": "Stopwords are frequent",
                        "end_marker": "before indexing...",
                        "is_start": True,
                        "is_end": False,
                    },
                    {
                        "page": 2,
                        "box_2d": [65, 55, 360, 935],
                        "start_marker": "...Stopword filtering lowers",
                        "end_marker": "improves IR precision.",
                        "is_start": False,
                        "is_end": True,
                    },
                ],
                "ocr_extracted_text": "**Stopwords** are frequent functional words... Stopword filtering lowers vector dimensionality.",
                "status": "CORRECT",
                "awarded_marks": 5.0,
                "rubric_checks": [{"criterion": "Filter high-frequency words", "awarded": 5.0, "max": 5.0, "status": "MET"}],
                "feedback": "Matched multi-page continuation cleanly.",
            },
            {
                "q_no": "Q4",
                "source_block_ids": [],
                "answer_regions": [],
                "ocr_extracted_text": "*No handwritten answer detected across submitted pages.*",
                "status": "UNATTEMPTED",
                "awarded_marks": 0.0,
                "rubric_checks": [{"criterion": "TF * log(N/df)", "awarded": 0.0, "max": 5.0, "status": "MISSED"}],
                "feedback": "Not attempted.",
            },
        ],
    }

    call_count = {"n": 0}

    async def fake_call_gemini_json(*args, **kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return prompt1_payload, "gemini-mock-2.5", None
        return prompt2_payload, "gemini-mock-2.5", None

    monkeypatch.setattr(MagicInkService, "get_gemini_client", classmethod(lambda cls, key=None: object()))
    monkeypatch.setattr(mis_mod, "_call_gemini_json", fake_call_gemini_json)

    stages = []
    res = asyncio.run(
        MagicInkService.evaluate_submission(
            eval_id="eval_test_2p",
            exam=exam,
            student_name="Ananya",
            roll_number="24CS001",
            page_records=page_records,
            user_api_key="dummy-key",
            on_stage_update=lambda s, m: stages.append(s),
        )
    )

    assert call_count["n"] == 2
    assert "prompt1_ocr" in stages and "prompt2_evaluate" in stages
    assert res["total_score"] == 15.0
    assert res["max_score"] == 20.0

    by_q = {b["q_no"]: b for b in res["breakdown"]}
    assert by_q["Q1"]["start_page"] == 1 and by_q["Q1"]["end_page"] == 1
    assert by_q["Q2"]["awarded_marks"] == 5.0 and "Lemmatization" in by_q["Q2"]["ocr_extracted_text"]
    assert by_q["Q3"]["start_page"] == 1 and by_q["Q3"]["end_page"] == 2
    assert len(by_q["Q3"]["answer_regions"]) == 2
    assert by_q["Q3"]["answer_regions"][0]["is_start"] is True
    assert by_q["Q3"]["answer_regions"][1]["is_end"] is True
    # Q4 must NEVER have a fake page number or fake annotation overlay
    assert by_q["Q4"]["page"] is None
    assert by_q["Q4"]["start_page"] is None
    assert by_q["Q4"]["answer_regions"] == []
    assert by_q["Q4"]["status"] == "UNATTEMPTED"
    annotated_qs = {a["q_no"] for a in res["magic_ink"]["question_annotations"]}
    assert "Q4" not in annotated_qs


def test_background_eval_file_serving_and_inline_update(monkeypatch):
    """
    Verifies POST /exams/{id}/evaluate?background=true, GET /evaluations/{id}/file (inline PDF),
    and PUT /evaluations/{id} inline score/markdown persistence.
    """
    import time
    import uuid
    import pymupdf
    from fastapi.testclient import TestClient
    from backend.main import app

    monkeypatch.setattr(MagicInkService, "get_gemini_client", classmethod(lambda cls, key=None: None))
    client = TestClient(app)
    unique_exam_id = f"exam_bg_{uuid.uuid4().hex[:8]}"

    subjs = db.list_subjects()
    subj_id = subjs[0]["id"] if subjs else "subj_test_tmp"

    exam_rec = db.create_exam({
        "id": unique_exam_id,
        "subject_id": subj_id,
        "title": "Compiler Design Background Eval Test",
        "exam_type": "Assignment",
        "max_marks": 20.0,
        "passing_marks": 8.0,
        "questions": [
            {"id": "q1", "q_no": "1", "text": "Construct SLR Parsing Table.", "marks": 5.0, "rubric": "SLR table"},
            {"id": "q2", "q_no": "2", "text": "Differentiate SLR vs LALR.", "marks": 5.0, "rubric": "Comparison"},
        ],
        "answer_key_text": "[1] SLR table\n[2] Comparison",
    })
    stud_rec = db.add_student(subject_id=subj_id, name="Test Bg", roll_number=f"24BG{uuid.uuid4().hex[:4]}")

    try:
        doc = pymupdf.open()
        p = doc.new_page(width=595, height=842)
        p.insert_text((50, 70), "Student handwritten simulation page 1", fontsize=12)
        pdf_bytes = doc.tobytes()
        doc.close()

        bg_res = client.post(
            f"/api/v1/academic/exams/{unique_exam_id}/evaluate?background=true",
            data={"student_id": stud_rec["id"]},
            files={"sheet_file": ("answer_script.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        )
        assert bg_res.status_code == 200, bg_res.text
        accepted = bg_res.json()
        assert accepted["status"] == "accepted"
        eval_id = accepted["eval_id"]
        job_id = accepted["job_id"]

        # Original raw PDF must ALREADY be downloadable/viewable immediately while evaluating
        raw_resp = client.get(f"/api/v1/academic/evaluations/{eval_id}/file")
        assert raw_resp.status_code == 200
        assert raw_resp.headers["content-type"].startswith("application/pdf")
        assert "inline" in raw_resp.headers.get("content-disposition", "")

        final_job = None
        for _ in range(40):
            jr = client.get(f"/api/v1/academic/jobs/{job_id}")
            assert jr.status_code == 200
            final_job = jr.json()
            if final_job["status"] in ("completed", "failed"):
                break
            time.sleep(0.25)
        assert final_job is not None and final_job["status"] == "completed", final_job

        saved_card = final_job["result"]
        assert saved_card["id"] == eval_id

        # Professor double-tap edit & rubric adjustment via PUT /evaluations/{eval_id}
        edited_breakdown = list(saved_card["breakdown"])
        edited_breakdown[0]["ocr_extracted_text"] = "Edited clean markdown transcription."
        edited_breakdown[0]["awarded_marks"] = 5.0
        upd_resp = client.put(
            f"/api/v1/academic/evaluations/{eval_id}",
            json={"breakdown": edited_breakdown, "teacher_feedback": "Verified manually."},
        )
        assert upd_resp.status_code == 200, upd_resp.text
        updated = upd_resp.json()
        assert updated["teacher_feedback"] == "Verified manually."
        assert updated["breakdown"][0]["ocr_extracted_text"] == "Edited clean markdown transcription."
    finally:
        # Clean up test records so local evaluation.db stays tidy
        with db.get_connection() as conn:
            conn.execute("DELETE FROM academic_evaluations WHERE exam_id = ?", (unique_exam_id,))
            conn.execute("DELETE FROM students WHERE id = ?", (stud_rec["id"],))
            conn.commit()
        db.delete_exam(unique_exam_id)
