"""
Integration tests for document upload, mandatory answer key evaluation,
and pure computer vision OMR verification.

Validates:
1. Rejection of uploads missing an answer key file (HTTP 400).
2. Rejection of random/blank non-OMR images (HTTP 422 Unprocessable Entity).
3. Pure pixel-level extraction of external_test OMR sheets with JSON and CSV answer keys.
4. End-to-end evaluation of 10-page marked question paper PDF.
5. Enforcement of the NTA Section B First-5 attempt rule.
"""

import os
import io
import cv2
import numpy as np
import pytest
from starlette.testclient import TestClient
from backend.main import app

client = TestClient(app)

EXTERNAL_TEST_DIR = r"f:\neira\Dataset\external_test"


def test_missing_answer_key_rejected():
    """
    Validates that attempting evaluation without an answer key file is rejected with HTTP 400.
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


def test_random_image_rejected_with_422():
    """
    Validates that uploading a random non-OMR image (e.g. noise or photo) is rejected with 422.
    """
    # Create random noise image
    rand_img = np.random.randint(50, 180, (600, 600, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".png", rand_img)
    fake_bytes = io.BytesIO(buf.tobytes())

    key_path = os.path.join(EXTERNAL_TEST_DIR, "answer_key_01.json")
    if not os.path.exists(key_path):
        pytest.skip("Answer key file not found")

    with open(key_path, "rb") as f_key:
        response = client.post(
            "/api/v1/evaluate/upload",
            files={
                "sheet_file": ("random_photo.png", fake_bytes, "image/png"),
                "answer_key_file": ("answer_key_01.json", f_key, "application/json")
            },
            data={"mode": "omr", "exam_id": "TEST_EXAM"}
        )

    assert response.status_code == 422
    assert "not a recognizable OMR sheet" in response.json()["detail"]


def test_blank_image_rejected_with_422():
    """
    Validates that uploading a completely blank image is rejected with 422.
    """
    blank_img = np.full((800, 600, 3), 255, dtype=np.uint8)
    _, buf = cv2.imencode(".png", blank_img)
    blank_bytes = io.BytesIO(buf.tobytes())

    key_path = os.path.join(EXTERNAL_TEST_DIR, "answer_key_01.json")
    if not os.path.exists(key_path):
        pytest.skip("Answer key file not found")

    with open(key_path, "rb") as f_key:
        response = client.post(
            "/api/v1/evaluate/upload",
            files={
                "sheet_file": ("blank_sheet.png", blank_bytes, "image/png"),
                "answer_key_file": ("answer_key_01.json", f_key, "application/json")
            },
            data={"mode": "omr", "exam_id": "TEST_EXAM"}
        )

    assert response.status_code == 422
    assert "not a recognizable OMR sheet" in response.json()["detail"]


def test_omr_evaluation_with_json_key():
    """
    Validates evaluation of omr_sheet_01.png against answer_key_01.json using pure pixel vision.
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
    assert card["candidate"]["roll_number"] == "2403102288"
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


def test_omr_evaluation_with_printed_image_answer_key():
    """
    Validates end-to-end evaluation when the master answer key is uploaded as a computer-generated/printed image.
    """
    sheet_path = os.path.join(EXTERNAL_TEST_DIR, "omr_sheet_01.png")
    key_img_path = os.path.join(EXTERNAL_TEST_DIR, "answer_key_01_printed.png")
    if not os.path.exists(sheet_path) or not os.path.exists(key_img_path):
        pytest.skip("External test files missing")

    with open(sheet_path, "rb") as f_sheet, open(key_img_path, "rb") as f_key:
        response = client.post(
            "/api/v1/evaluate/upload",
            files={
                "sheet_file": ("omr_sheet_01.png", f_sheet, "image/png"),
                "answer_key_file": ("answer_key_01_printed.png", f_key, "image/png")
            },
            data={"mode": "omr", "exam_id": "PRINTED_KEY_EXAM", "candidate_name": "Image Key Student"}
        )

    assert response.status_code == 200, f"Evaluation failed: {response.text}"
    card = response.json()
    assert card["candidate"]["exam_type"] == "JEE_MAIN"
    assert len(card["scoring"]["question_scores"]) == 90
    assert card["scoring"]["total_score"] > 50.0


def test_omr_evaluation_with_handwritten_image_answer_key():
    """
    Validates end-to-end evaluation when the master answer key is uploaded as a handwritten image.
    """
    sheet_path = os.path.join(EXTERNAL_TEST_DIR, "omr_sheet_01.png")
    key_img_path = os.path.join(EXTERNAL_TEST_DIR, "answer_key_01_handwritten.png")
    if not os.path.exists(sheet_path) or not os.path.exists(key_img_path):
        pytest.skip("External test files missing")

    with open(sheet_path, "rb") as f_sheet, open(key_img_path, "rb") as f_key:
        response = client.post(
            "/api/v1/evaluate/upload",
            files={
                "sheet_file": ("omr_sheet_01.png", f_sheet, "image/png"),
                "answer_key_file": ("answer_key_01_handwritten.png", f_key, "image/png")
            },
            data={"mode": "omr", "exam_id": "HANDWRITTEN_KEY_EXAM", "candidate_name": "Handwritten Student"}
        )

    assert response.status_code == 200, f"Evaluation failed: {response.text}"
    card = response.json()
    assert card["candidate"]["exam_type"] == "JEE_MAIN"
    assert len(card["scoring"]["question_scores"]) == 90
    assert card["scoring"]["total_score"] > 50.0
