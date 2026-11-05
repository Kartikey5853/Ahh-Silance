"""
Integration tests for document upload and mandatory answer key evaluation.

Validates:
1. Rejection of uploads missing an answer key file (HTTP 400/422).
2. End-to-end evaluation of external_test OMR sheets with JSON and CSV answer keys.
3. End-to-end evaluation of 10-page marked question paper PDF.
4. Enforcement of the NTA Section B First-5 attempt rule.
"""

import os
import pytest
from starlette.testclient import TestClient
from backend.main import app

client = TestClient(app)

EXTERNAL_TEST_DIR = r"f:\neira\Dataset\external_test"


def test_missing_answer_key_rejected():
    """
    Validates that attempting evaluation without an answer key file is rejected.
    """
    sheet_path = os.path.join(EXTERNAL_TEST_DIR, "omr_sheet_01.png")
    if not os.path.exists(sheet_path):
        pytest.skip("External test dataset not found")

    with open(sheet_path, "rb") as f_sheet:
        response = client.post(
            "/api/v1/evaluate/upload",
            files={"sheet_file": ("omr_sheet_01.png", f_sheet, "image/png")},
            data={"mode": "omr", "exam_id": "TEST_EXAM"}
        )
    assert response.status_code in [400, 422]


def test_omr_evaluation_with_json_key():
    """
    Validates evaluation of omr_sheet_01.png against answer_key_01.json.
    """
    sheet_path = os.path.join(EXTERNAL_TEST_DIR, "omr_sheet_01.png")
    key_path = os.path.join(EXTERNAL_TEST_DIR, "answer_key_01.json")
    if not os.path.exists(sheet_path) or not os.path.exists(key_path):
        pytest.skip("External test dataset files not found")

    with open(sheet_path, "rb") as f_sheet, open(key_path, "rb") as f_key:
        response = client.post(
            "/api/v1/evaluate/upload",
            files={
                "sheet_file": ("omr_sheet_01.png", f_sheet, "image/png"),
                "answer_key_file": ("answer_key_01.json", f_key, "application/json")
            },
            data={"mode": "omr", "exam_id": "EXTERNAL_TEST_01", "candidate_name": "Test Student 1"}
        )

    assert response.status_code == 200
    card = response.json()
    assert "evaluation_id" in card
    assert card["candidate"]["candidate_name"] == "Test Student 1"
    assert card["candidate"]["roll_number"] == "2403101155"
    assert isinstance(card["scoring"]["total_score"], (int, float))
    assert len(card["scoring"]["question_scores"]) == 90


def test_omr_evaluation_with_csv_key_and_first5_rule():
    """
    Validates evaluation of omr_sheet_02.png with answer_key_02.csv, verifying First-5 rule overflow discard.
    """
    sheet_path = os.path.join(EXTERNAL_TEST_DIR, "omr_sheet_02.png")
    key_path = os.path.join(EXTERNAL_TEST_DIR, "answer_key_02.csv")
    if not os.path.exists(sheet_path) or not os.path.exists(key_path):
        pytest.skip("External test dataset files not found")

    with open(sheet_path, "rb") as f_sheet, open(key_path, "rb") as f_key:
        response = client.post(
            "/api/v1/evaluate/upload",
            files={
                "sheet_file": ("omr_sheet_02.png", f_sheet, "image/png"),
                "answer_key_file": ("answer_key_02.csv", f_key, "text/csv")
            },
            data={"mode": "omr", "exam_id": "EXTERNAL_TEST_02", "candidate_name": "Test Student 2"}
        )

    assert response.status_code == 200
    card = response.json()
    # Verified Section B overflow discard
    assert card["scoring"]["overflow_ignored_count"] == 2
    assert card["audit_flags"]["has_section_b_overflow"] is True


def test_marked_question_paper_10pages_pdf():
    """
    Validates evaluation of 10-page marked question paper PDF against marked_paper_answer_key.json.
    """
    pdf_path = os.path.join(EXTERNAL_TEST_DIR, "marked_question_paper_10pages.pdf")
    key_path = os.path.join(EXTERNAL_TEST_DIR, "marked_paper_answer_key.json")
    if not os.path.exists(pdf_path) or not os.path.exists(key_path):
        pytest.skip("Marked question paper PDF not found")

    with open(pdf_path, "rb") as f_pdf, open(key_path, "rb") as f_key:
        response = client.post(
            "/api/v1/evaluate/upload",
            files={
                "sheet_file": ("marked_question_paper_10pages.pdf", f_pdf, "application/pdf"),
                "answer_key_file": ("marked_paper_answer_key.json", f_key, "application/json")
            },
            data={"mode": "marked_paper", "exam_id": "MARKED_10PAGE_EXAM", "candidate_name": "PDF Student"}
        )

    assert response.status_code == 200
    card = response.json()
    assert card["candidate"]["roll_number"] == "2403109988"
    assert card["scoring"]["total_score"] > 0
    assert len(card["scoring"]["question_scores"]) == 90
