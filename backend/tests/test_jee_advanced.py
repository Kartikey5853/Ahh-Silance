"""
Automated Verification Tests for JEE Advanced Pipeline & Numerical Bubble Fix.

Validates:
1. Auto-detection of JEE Advanced vs JEE Main via Answer Key and OMR layout.
2. Official JEE Advanced Multi-Correct Partial Marking logic (+4, +3, +2, +1, -2, 0).
3. Critical Glitch Fix: Unbubbled numerical answers (written in box without darkened bubbles)
   receive strictly 0 marks (UNATTEMPTED), preventing false mark awards.
4. End-to-end evaluation of JEE Advanced OMR sheets (51 questions).
"""

import os
import pytest
from starlette.testclient import TestClient
from backend.main import create_app
from backend.services.s7_scoring_service import JEEScoringEngine
from backend.services.s5_answer_key_service import AnswerKeyService
from backend.schemas.s7_scoring import ScoringVerdict

app = create_app()
client = TestClient(app)

JEE_ADV_DIR = r"f:\neira\Dataset\jee_advanced"


def test_auto_detection_jee_advanced_by_key():
    """
    Confirms AnswerKeyService correctly classifies 51-question key as JEE_ADVANCED.
    """
    csv_path = os.path.join(JEE_ADV_DIR, "jee_advanced_answer_key_01.csv")
    assert os.path.exists(csv_path), "Missing JEE Advanced test key"

    with open(csv_path, "rb") as f:
        key_bytes = f.read()

    master_key = AnswerKeyService.parse_uploaded_answer_key(
        file_bytes=key_bytes,
        filename="jee_advanced_answer_key_01.csv",
        exam_id="JEE_Advanced_2025_Paper1"
    )

    assert master_key.exam_type == "JEE_ADVANCED"
    assert master_key.total_questions == 51


def test_auto_detection_jee_main_by_key():
    """
    Confirms AnswerKeyService classifies 90-question key as JEE_MAIN.
    """
    csv_path = r"f:\neira\Dataset\external_test\answer_key_01.csv"
    assert os.path.exists(csv_path), "Missing JEE Main test key"

    with open(csv_path, "rb") as f:
        key_bytes = f.read()

    master_key = AnswerKeyService.parse_uploaded_answer_key(
        file_bytes=key_bytes,
        filename="answer_key_01.csv",
        exam_id="JEE_Main_2025"
    )

    assert master_key.exam_type == "JEE_MAIN"
    assert master_key.total_questions == 90


def test_jee_advanced_multi_correct_partial_marking():
    """
    Tests official IIT JEE Advanced partial marking formula:
    - All correct: +4
    - 3 of 4: +3
    - 2 of 3: +2
    - 1 of 2: +1
    - Any wrong option chosen: -2
    - Blank: 0
    """
    # 1. Full correct (+4)
    v, m, _ = JEEScoringEngine.evaluate_jee_advanced_multi_correct(["A", "C"], ["A", "C"])
    assert v == ScoringVerdict.CORRECT and m == 4.0

    # 2. Partial: 3 of 4 (+3)
    v, m, _ = JEEScoringEngine.evaluate_jee_advanced_multi_correct(["A", "B", "C"], ["A", "B", "C", "D"])
    assert v == ScoringVerdict.PARTIALLY_CORRECT and m == 3.0

    # 3. Partial: 2 of 3 (+2)
    v, m, _ = JEEScoringEngine.evaluate_jee_advanced_multi_correct(["A", "C"], ["A", "B", "C"])
    assert v == ScoringVerdict.PARTIALLY_CORRECT and m == 2.0

    # 4. Partial: 1 of 2 (+1)
    v, m, _ = JEEScoringEngine.evaluate_jee_advanced_multi_correct(["A"], ["A", "C"])
    assert v == ScoringVerdict.PARTIALLY_CORRECT and m == 1.0

    # 5. Wrong option chosen (-2 penalty)
    v, m, _ = JEEScoringEngine.evaluate_jee_advanced_multi_correct(["A", "B"], ["A", "C"])
    assert v == ScoringVerdict.INCORRECT and m == -2.0

    # 6. Unattempted (0)
    v, m, _ = JEEScoringEngine.evaluate_jee_advanced_multi_correct([], ["A", "C"])
    assert v == ScoringVerdict.UNATTEMPTED and m == 0.0


def test_end_to_end_jee_advanced_omr_upload_and_evaluation():
    """
    Uploads authentic 51-question JEE Advanced OMR and verifies full scorecard generation.
    """
    sheet_path = os.path.join(JEE_ADV_DIR, "jee_advanced_omr_01.png")
    key_path = os.path.join(JEE_ADV_DIR, "jee_advanced_answer_key_01.csv")

    assert os.path.exists(sheet_path), "Missing JEE Advanced OMR image"
    assert os.path.exists(key_path), "Missing JEE Advanced key"

    with open(sheet_path, "rb") as s_file, open(key_path, "rb") as k_file:
        files = {
            "sheet_file": ("jee_advanced_omr_01.png", s_file, "image/png"),
            "answer_key_file": ("jee_advanced_answer_key_01.csv", k_file, "text/csv")
        }
        data = {
            "exam_id": "JEE_Advanced_2025_Paper1",
            "candidate_name": "JEE Advanced Aspirant"
        }
        res = client.post("/api/v1/evaluate/upload", files=files, data=data)

    assert res.status_code == 200, f"Evaluation failed: {res.text}"
    result = res.json()

    assert result["candidate"]["exam_type"] == "JEE_ADVANCED"
    assert result["scoring"]["exam_type"] == "JEE_ADVANCED"
    assert len(result["scoring"]["question_scores"]) == 51
    assert result["scoring"]["total_score"] > 50.0


def test_unbubbled_numerical_receives_zero_marks():
    """
    CRITICAL BUG VERIFICATION:
    In sheet 02, question 13 has '42' written in the top box BUT NO BUBBLES ARE SHADED.
    Verifies that the engine marks Q13 as UNATTEMPTED with 0 marks (not +4 or +3).
    """
    sheet_path = os.path.join(JEE_ADV_DIR, "jee_advanced_omr_02.png")
    key_path = os.path.join(JEE_ADV_DIR, "jee_advanced_answer_key_02.csv")

    assert os.path.exists(sheet_path), "Missing JEE Advanced OMR 02"
    assert os.path.exists(key_path), "Missing JEE Advanced key 02"

    with open(sheet_path, "rb") as s_file, open(key_path, "rb") as k_file:
        files = {
            "sheet_file": ("jee_advanced_omr_02.png", s_file, "image/png"),
            "answer_key_file": ("jee_advanced_answer_key_02.csv", k_file, "text/csv")
        }
        data = {
            "exam_id": "JEE_Advanced_2025_Paper1",
            "candidate_name": "Unbubbled Test Student"
        }
        res = client.post("/api/v1/evaluate/upload", files=files, data=data)

    assert res.status_code == 200, f"Upload failed: {res.text}"
    scorecard = res.json()

    # Find question 13 (the unbubbled numerical)
    q13 = next((q for q in scorecard["scoring"]["question_scores"] if q["question_no"] == 13), None)
    assert q13 is not None, "Q13 missing from scorecard"

    # Confirms zero marks were awarded
    assert q13["marks_awarded"] == 0.0, f"Expected 0.0 marks for unbubbled numerical, got {q13['marks_awarded']}"
    assert q13["verdict"] == "UNATTEMPTED", f"Expected UNATTEMPTED, got {q13['verdict']}"
